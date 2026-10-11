/**
 * Save a lead locally, then forward it to Kit or Mailchimp.
 * Forwarding never throws: a provider failure is recorded on the integration row
 * so the public form can still confirm the BetterBlog signup.
 */

import prisma from '../db/index.js'
import { decrypt } from './encryption.js'
import {
  forwardSubscriber,
  redactSubscriberText,
  type EmailProviderName,
  type ProviderResult,
} from './email-providers.js'

export const EMAIL_MODULES = [
  'collection_newsletter',
  'post_newsletter',
  'collection_lead_magnet',
  'post_lead_magnet',
] as const

export type EmailModuleKey = (typeof EMAIL_MODULES)[number]

export function isEmailModuleKey(value: string): value is EmailModuleKey {
  return (EMAIL_MODULES as readonly string[]).includes(value)
}

export function emailModuleForLead(
  type: 'newsletter' | 'lead_magnet',
  surface: 'collection' | 'post'
): EmailModuleKey {
  const level = surface === 'post' ? 'post' : 'collection'
  const kind = type === 'lead_magnet' ? 'lead_magnet' : 'newsletter'
  return `${level}_${kind}` as EmailModuleKey
}

export type CapturedLead = {
  siteId: string
  email: string
  name: string | null
  type: 'newsletter' | 'lead_magnet'
  resourceTitle: string
  surface?: 'collection' | 'post'
}

export type StoredEmailIntegration = {
  provider: string
  apiKeyEnc: string | null
  destinationId: string | null
  destinationKind?: string | null
  tagId?: string | null
  tagName?: string | null
}

export type EmailForwardStatus = {
  lastError: string | null
  lastErrorAt: Date | null
  lastSuccessAt?: Date
}

export type EmailSyncDeps = {
  upsertLead: (lead: CapturedLead) => Promise<void>
  loadIntegration: (siteId: string, module: EmailModuleKey) => Promise<StoredEmailIntegration | null>
  saveStatus: (siteId: string, module: EmailModuleKey, status: EmailForwardStatus) => Promise<void>
  forward: typeof forwardSubscriber
  decryptKey: (ciphertext: string) => string
  log?: (fields: Record<string, unknown>) => void
}

function failureMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : 'Email provider request failed.'
  return redactSubscriberText(raw) || 'Email provider request failed.'
}

async function recordStatus(
  deps: EmailSyncDeps,
  siteId: string,
  module: EmailModuleKey,
  provider: string,
  status: EmailForwardStatus,
  logError: string | null
): Promise<void> {
  if (logError) {
    deps.log?.({ siteId, module, provider, error: logError })
  }
  try {
    await deps.saveStatus(siteId, module, status)
  } catch (err) {
    deps.log?.({
      siteId,
      provider,
      error: 'Could not record email forward status',
      cause: failureMessage(err),
    })
  }
}

export async function forwardSavedLead(lead: CapturedLead, deps: EmailSyncDeps): Promise<void> {
  const module = emailModuleForLead(lead.type, lead.surface === 'post' ? 'post' : 'collection')
  let integration: StoredEmailIntegration | null
  try {
    integration = await deps.loadIntegration(lead.siteId, module)
  } catch (err) {
    deps.log?.({ siteId: lead.siteId, module, provider: 'unknown', error: failureMessage(err) })
    return
  }
  if (!integration || integration.provider === 'betterblog') return
  if (integration.provider !== 'kit' && integration.provider !== 'mailchimp') return

  const provider = integration.provider
  if (!integration.apiKeyEnc || !integration.destinationId) {
    const error =
      provider === 'kit'
        ? integration.destinationKind === 'tag'
          ? 'Kit is missing an API key or tag.'
          : 'Kit is missing an API key or form.'
        : 'Mailchimp is missing an API key or audience.'
    await recordStatus(deps, lead.siteId, module, provider, { lastError: error, lastErrorAt: new Date() }, error)
    return
  }

  let apiKey: string
  try {
    apiKey = deps.decryptKey(integration.apiKeyEnc)
  } catch {
    const error = 'Could not read the stored API key.'
    await recordStatus(deps, lead.siteId, module, provider, { lastError: error, lastErrorAt: new Date() }, error)
    return
  }

  let result: ProviderResult
  try {
    result = await deps.forward({
      provider: provider as EmailProviderName,
      apiKey,
      destinationId: integration.destinationId,
      destinationKind: integration.destinationKind === 'tag' ? 'tag' : 'form',
      tagName: integration.tagName,
      email: lead.email,
      leadMagnetTitle: lead.type === 'lead_magnet' ? lead.resourceTitle : null,
    })
  } catch (err) {
    const error = failureMessage(err)
    await recordStatus(deps, lead.siteId, module, provider, { lastError: error, lastErrorAt: new Date() }, error)
    return
  }

  if (!result.ok) {
    await recordStatus(
      deps,
      lead.siteId,
      module,
      provider,
      { lastError: result.error, lastErrorAt: new Date() },
      result.error
    )
    return
  }

  await recordStatus(
    deps,
    lead.siteId,
    module,
    provider,
    {
      lastError: result.warning ?? null,
      lastErrorAt: result.warning ? new Date() : null,
      lastSuccessAt: new Date(),
    },
    result.warning ?? null
  )
}

/** Upsert the BetterBlog lead first. Provider failures do not reject. */
export async function persistAndForwardLead(lead: CapturedLead, deps: EmailSyncDeps): Promise<void> {
  await deps.upsertLead(lead)
  await forwardSavedLead(lead, deps)
}

export function createEmailSyncDeps(): EmailSyncDeps {
  return {
    upsertLead: async (lead) => {
      await prisma.leadCapture.upsert({
        where: {
          siteId_email_type_resourceTitle: {
            siteId: lead.siteId,
            email: lead.email,
            type: lead.type,
            resourceTitle: lead.resourceTitle,
          },
        },
        create: {
          siteId: lead.siteId,
          email: lead.email,
          name: lead.name,
          type: lead.type,
          resourceTitle: lead.resourceTitle,
        },
        update: { name: lead.name },
      })
    },
    loadIntegration: async (siteId, module) => {
      const row = await prisma.siteEmailIntegration.findUnique({
        where: { siteId_module: { siteId, module } },
      })
      if (!row) return null
      let apiKeyEnc = row.apiKeyEnc
      if (!apiKeyEnc && (row.provider === 'kit' || row.provider === 'mailchimp')) {
        const credential = await prisma.siteEmailCredential.findUnique({
          where: { siteId_provider: { siteId, provider: row.provider } },
        })
        apiKeyEnc = credential?.apiKeyEnc ?? null
        if (!apiKeyEnc) {
          const sibling = await prisma.siteEmailIntegration.findFirst({
            where: { siteId, provider: row.provider, apiKeyEnc: { not: null } },
            select: { apiKeyEnc: true },
          })
          apiKeyEnc = sibling?.apiKeyEnc ?? null
        }
      }
      return {
        provider: row.provider,
        apiKeyEnc,
        destinationId: row.destinationId,
        destinationKind: row.destinationKind,
        tagId: row.tagId,
        tagName: row.tagName,
      }
    },
    saveStatus: async (siteId, module, status) => {
      await prisma.siteEmailIntegration.update({
        where: { siteId_module: { siteId, module } },
        data: {
          lastError: status.lastError,
          lastErrorAt: status.lastErrorAt,
          ...(status.lastSuccessAt ? { lastSuccessAt: status.lastSuccessAt } : {}),
        },
      })
    },
    forward: forwardSubscriber,
    decryptKey: decrypt,
    log: (fields) => {
      console.error('[capture] email forward failed', fields)
    },
  }
}
