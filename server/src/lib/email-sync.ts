/**
 * Save a lead locally, then forward it to Kit or Mailchimp.
 * Forwarding never throws: a provider failure is recorded on the integration row
 * so the public form can still confirm the BetterBlog signup.
 */

import prisma, { executeSql, queryRows } from '../db/index.js'
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

function textOrNull(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

/** The encrypted key saved for this platform on any module. */
export function platformKeyFromRows(rows: Array<Record<string, unknown>>, provider: string): string | null {
  for (const row of rows) {
    if (row.provider !== provider) continue
    if (typeof row.api_key_enc === 'string' && row.api_key_enc.length > 0) return row.api_key_enc
  }
  return null
}

/** Pick the row for this module. A legacy table has one row and no module column. */
export function selectStoredIntegration(
  rows: Array<Record<string, unknown>>,
  module: EmailModuleKey
): StoredEmailIntegration | null {
  if (rows.length === 0) return null
  const hasModule = rows.some((row) => typeof row.module === 'string' && row.module.length > 0)
  const record = hasModule ? rows.find((row) => row.module === module) : rows[0]
  if (!record) return null
  return {
    provider: typeof record.provider === 'string' ? record.provider : 'betterblog',
    apiKeyEnc: textOrNull(record.api_key_enc),
    destinationId: textOrNull(record.destination_id),
    destinationKind: textOrNull(record.destination_kind),
    tagId: textOrNull(record.tag_id),
    tagName: textOrNull(record.tag_name),
  }
}

const INTEGRATION_COLUMNS = [
  'module',
  'provider',
  'api_key_enc',
  'destination_id',
  'destination_kind',
  'tag_id',
  'tag_name',
  'last_error',
  'last_error_at',
  'last_success_at',
] as const

let integrationTable: { schema: string; columns: Set<string> } | null = null

export async function ensureEmailIntegrationModules(): Promise<{ moduleReady: boolean; error: string | null }> {
  const before = await describeIntegrationTable()
  if (before.columns.has('module')) return { moduleReady: true, error: null }
  const rel = `${quotedIdent(before.schema)}.${quotedIdent('site_email_integrations')}`
  try {
    await queryRows(
      `ALTER TABLE ${rel} ADD COLUMN IF NOT EXISTS ${quotedIdent('module')} TEXT NOT NULL DEFAULT 'collection_newsletter'`
    )
    await queryRows(`DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_index i
    JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY (i.indkey)
    WHERE i.indrelid = '${before.schema}.site_email_integrations'::regclass
      AND i.indisprimary
      AND a.attname = 'module'
  ) THEN
    ALTER TABLE ${rel} DROP CONSTRAINT ${quotedIdent('site_email_integrations_pkey')};
    ALTER TABLE ${rel} ADD CONSTRAINT ${quotedIdent('site_email_integrations_pkey')} PRIMARY KEY (${quotedIdent('site_id')}, ${quotedIdent('module')});
  END IF;
END $$`)
    await queryRows(`CREATE TABLE IF NOT EXISTS ${quotedIdent(before.schema)}.${quotedIdent('site_email_credentials')} (
      ${quotedIdent('site_id')} TEXT NOT NULL,
      ${quotedIdent('provider')} TEXT NOT NULL,
      ${quotedIdent('api_key_enc')} TEXT NOT NULL,
      ${quotedIdent('updated_at')} TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT ${quotedIdent('site_email_credentials_pkey')} PRIMARY KEY (${quotedIdent('site_id')}, ${quotedIdent('provider')})
    )`)
    integrationTable = null
    const after = await describeIntegrationTable()
    return { moduleReady: after.columns.has('module'), error: null }
  } catch (err) {
    integrationTable = null
    const message = err instanceof Error ? err.message : 'schema upgrade failed'
    console.error('[email-integration] Could not add per-module destination column', message)
    return { moduleReady: false, error: message }
  }
}

export async function propagatePlatformKeys(
  siteId: string,
  writes: Array<{ provider: string; apiKeyEnc: string | null }>
): Promise<void> {
  const table = await describeIntegrationTable()
  if (!table.columns.has('api_key_enc') || !table.columns.has('provider')) return
  const rel = `${quotedIdent(table.schema)}.${quotedIdent('site_email_integrations')}`
  const seen = new Set<string>()
  for (const write of writes) {
    if ((write.provider !== 'kit' && write.provider !== 'mailchimp') || !write.apiKeyEnc || seen.has(write.provider)) continue
    seen.add(write.provider)
    await executeSql(
      `UPDATE ${rel} SET ${quotedIdent('api_key_enc')} = $3 WHERE ${quotedIdent('site_id')} = $1 AND ${quotedIdent('provider')} = $2 AND (${quotedIdent('api_key_enc')} IS NULL OR ${quotedIdent('api_key_enc')} = '')`,
      [siteId, write.provider, write.apiKeyEnc]
    )
    try {
      await executeSql(
        `INSERT INTO ${quotedIdent(table.schema)}.${quotedIdent('site_email_credentials')} (${quotedIdent('site_id')}, ${quotedIdent('provider')}, ${quotedIdent('api_key_enc')}) VALUES ($1, $2, $3) ON CONFLICT (${quotedIdent('site_id')}, ${quotedIdent('provider')}) DO UPDATE SET ${quotedIdent('api_key_enc')} = EXCLUDED.${quotedIdent('api_key_enc')}`,
        [siteId, write.provider, write.apiKeyEnc]
      )
    } catch {
      // The platform key still lives on the integration rows when this table is absent.
    }
  }
}

export async function writeLegacyEmailDestination(
  siteId: string,
  write: {
    module: string
    provider: string
    apiKeyEnc: string | null
    destinationId: string | null
    destinationKind: string | null
    tagId: string | null
    tagName: string | null
  }
): Promise<void> {
  const table = await describeIntegrationTable()
  const rel = `${quotedIdent(table.schema)}.${quotedIdent('site_email_integrations')}`
  const values: unknown[] = [siteId]
  const sets: string[] = []
  const add = (column: string, value: unknown) => {
    if (!table.columns.has(column)) return
    values.push(value)
    sets.push(`${quotedIdent(column)} = $${values.length}`)
  }
  add('provider', write.provider)
  add('api_key_enc', write.apiKeyEnc)
  add('destination_id', write.destinationId)
  add('destination_kind', write.destinationKind)
  add('tag_id', write.tagId)
  add('tag_name', write.tagName)
  if (table.columns.has('updated_at')) sets.push(`${quotedIdent('updated_at')} = CURRENT_TIMESTAMP`)
  if (!table.columns.has('module')) {
    if (sets.length === 0) return
    await queryRows(`UPDATE ${rel} SET ${sets.join(', ')} WHERE ${quotedIdent('site_id')} = $1`, values)
    return
  }
  const insertCols = ['site_id', 'module']
  const insertVals: unknown[] = [siteId, write.module]
  const updates: string[] = []
  const include = (column: string, value: unknown) => {
    if (!table.columns.has(column)) return
    insertCols.push(column)
    insertVals.push(value)
    updates.push(`${quotedIdent(column)} = EXCLUDED.${quotedIdent(column)}`)
  }
  include('provider', write.provider)
  include('api_key_enc', write.apiKeyEnc)
  include('destination_id', write.destinationId)
  include('destination_kind', write.destinationKind)
  include('tag_id', write.tagId)
  include('tag_name', write.tagName)
  if (table.columns.has('updated_at')) updates.push(`${quotedIdent('updated_at')} = CURRENT_TIMESTAMP`)
  const placeholders = insertVals.map((_, index) => `$${index + 1}`).join(', ')
  try {
    await queryRows(
      `INSERT INTO ${rel} (${insertCols.map(quotedIdent).join(', ')}) VALUES (${placeholders}) ON CONFLICT (${quotedIdent('site_id')}, ${quotedIdent('module')}) DO UPDATE SET ${updates.join(', ')}`,
      insertVals
    )
  } catch {
    const moduleValues = [...values, write.module]
    const updated = await executeSql(
      `UPDATE ${rel} SET ${sets.join(', ')} WHERE ${quotedIdent('site_id')} = $1 AND ${quotedIdent('module')} = $${moduleValues.length}`,
      moduleValues
    )
    if (updated === 0) {
      await executeSql(`UPDATE ${rel} SET ${sets.join(', ')} WHERE ${quotedIdent('site_id')} = $1`, values)
    }
  }
}

async function describeIntegrationTable(): Promise<{ schema: string; columns: Set<string> }> {
  if (integrationTable) return integrationTable
  const found = await queryRows(
    `SELECT table_schema, column_name FROM information_schema.columns WHERE table_name = 'site_email_integrations'`
  )
  const schema = found.some((row) => row.table_schema === 'public')
    ? 'public'
    : typeof found[0]?.table_schema === 'string'
      ? found[0].table_schema
      : 'public'
  integrationTable = {
    schema,
    columns: new Set(found.filter((row) => row.table_schema === schema).map((row) => String(row.column_name))),
  }
  return integrationTable
}

function quotedIdent(value: string): string {
  if (!/^[a-z_][a-z0-9_]*$/i.test(value)) throw new Error('Unexpected database identifier')
  return `"${value}"`
}

async function loadStoredIntegration(siteId: string, module: EmailModuleKey): Promise<StoredEmailIntegration | null> {
  await ensureEmailIntegrationModules()
  const table = await describeIntegrationTable()
  const selected = INTEGRATION_COLUMNS.filter((name) => table.columns.has(name) && name !== 'last_error' && name !== 'last_error_at' && name !== 'last_success_at')
  if (!selected.includes('provider')) return null
  const rows = await queryRows(
    `SELECT ${selected.map(quotedIdent).join(', ')} FROM ${quotedIdent(table.schema)}.${quotedIdent('site_email_integrations')} WHERE ${quotedIdent('site_id')} = $1`,
    [siteId]
  )
  const stored = selectStoredIntegration(rows, module)
  if (!stored || (stored.provider !== 'kit' && stored.provider !== 'mailchimp')) return stored
  if (!stored.apiKeyEnc) stored.apiKeyEnc = platformKeyFromRows(rows, stored.provider)
  if (stored.apiKeyEnc) return stored
  try {
    const credentials = await queryRows(
      `SELECT ${quotedIdent('api_key_enc')} FROM ${quotedIdent(table.schema)}.${quotedIdent('site_email_credentials')} WHERE ${quotedIdent('site_id')} = $1 AND ${quotedIdent('provider')} = $2 LIMIT 1`,
      [siteId, stored.provider]
    )
    const credential = credentials[0]?.api_key_enc
    if (typeof credential === 'string' && credential) stored.apiKeyEnc = credential
  } catch {
    // The platform key still lives on the integration rows when this table is absent.
  }
  return stored
}

async function saveStoredStatus(siteId: string, module: EmailModuleKey, status: EmailForwardStatus): Promise<void> {
  const table = await describeIntegrationTable()
  if (!table.columns.has('last_error') || !table.columns.has('site_id')) return
  const assignments = [`${quotedIdent('last_error')} = $2`, `${quotedIdent('last_error_at')} = $3`]
  const values: unknown[] = [siteId, status.lastError, status.lastErrorAt]
  if (status.lastSuccessAt && table.columns.has('last_success_at')) {
    values.push(status.lastSuccessAt)
    assignments.push(`${quotedIdent('last_success_at')} = $${values.length}`)
  }
  if (table.columns.has('updated_at')) assignments.push(`${quotedIdent('updated_at')} = CURRENT_TIMESTAMP`)
  let where = `${quotedIdent('site_id')} = $1`
  if (table.columns.has('module')) {
    values.push(module)
    where += ` AND ${quotedIdent('module')} = $${values.length}`
  }
  await queryRows(
    `UPDATE ${quotedIdent(table.schema)}.${quotedIdent('site_email_integrations')} SET ${assignments.join(', ')} WHERE ${where}`,
    values
  )
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
  if (!integration || integration.provider === 'betterblog' || (integration.provider !== 'kit' && integration.provider !== 'mailchimp')) {
    return
  }

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
    loadIntegration: (siteId, module) => loadStoredIntegration(siteId, module),
    saveStatus: (siteId, module, status) => saveStoredStatus(siteId, module, status),
    forward: forwardSubscriber,
    decryptKey: decrypt,
    log: (fields) => {
      console.error('[capture] email forward failed', fields)
    },
  }
}
