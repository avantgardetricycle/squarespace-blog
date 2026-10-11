import { Router, Request, Response } from 'express'
import prisma from '../db/index.js'
import { requireSession, SessionUser } from '../middleware/session.js'
import { decrypt, encrypt } from '../lib/encryption.js'
import {
  listEmailCatalog,
  testEmailProvider,
  validateDestinationId,
  validateMailchimpTag,
  type EmailProviderName,
  type KitDestinationKind,
} from '../lib/email-providers.js'
import { EMAIL_MODULES, type EmailModuleKey } from '../lib/email-sync.js'

const router = Router()

const PROVIDERS = ['betterblog', 'kit', 'mailchimp'] as const
type Provider = (typeof PROVIDERS)[number]

const MODULE_LABEL: Record<EmailModuleKey, string> = {
  collection_newsletter: 'Collection email capture',
  post_newsletter: 'Post email capture',
  collection_lead_magnet: 'Collection lead magnet',
  post_lead_magnet: 'Post lead magnet',
}

type IntegrationRow = {
  module: string
  provider: string
  apiKeyEnc: string | null
  destinationId: string | null
  destinationKind: string | null
  tagId: string | null
  tagName: string | null
  lastError: string | null
  lastErrorAt: Date | null
  lastSuccessAt: Date | null
}

type CredentialRow = {
  provider: string
  apiKeyEnc: string
}

function savedKeyMap(rows: IntegrationRow[], credentials: CredentialRow[]) {
  const has = (provider: 'kit' | 'mailchimp') =>
    credentials.some((row) => row.provider === provider && row.apiKeyEnc) ||
    rows.some((row) => row.provider === provider && row.apiKeyEnc)
  return { kit: has('kit'), mailchimp: has('mailchimp') }
}

function storedKeyEnc(
  provider: 'kit' | 'mailchimp',
  rows: IntegrationRow[],
  credentials: CredentialRow[]
): string | null {
  const credential = credentials.find((row) => row.provider === provider && row.apiKeyEnc)
  if (credential) return credential.apiKeyEnc
  return rows.find((row) => row.provider === provider && row.apiKeyEnc)?.apiKeyEnc ?? null
}

function toPublic(row: IntegrationRow | null, keys: { kit: boolean; mailchimp: boolean }) {
  const provider: Provider = row?.provider === 'kit' || row?.provider === 'mailchimp' ? row.provider : 'betterblog'
  const destinationKind: KitDestinationKind | null =
    provider === 'kit' ? (row?.destinationKind === 'tag' ? 'tag' : 'form') : null
  return {
    provider,
    destinationId: row?.destinationId ?? '',
    destinationKind,
    tagId: provider === 'mailchimp' ? row?.tagId ?? '' : '',
    tagName: provider === 'mailchimp' ? row?.tagName ?? '' : '',
    hasApiKey: provider === 'kit' || provider === 'mailchimp' ? keys[provider] : false,
    lastError: row?.lastError ?? null,
    lastErrorAt: row?.lastErrorAt ? row.lastErrorAt.toISOString() : null,
    lastSuccessAt: row?.lastSuccessAt ? row.lastSuccessAt.toISOString() : null,
  }
}

function toPublicModules(rows: IntegrationRow[], credentials: CredentialRow[]) {
  const savedKeys = savedKeyMap(rows, credentials)
  const modules = {} as Record<EmailModuleKey, ReturnType<typeof toPublic>>
  for (const moduleKey of EMAIL_MODULES) {
    modules[moduleKey] = toPublic(
      rows.find((row) => row.module === moduleKey) ?? null,
      savedKeys
    )
  }
  return { savedKeys, modules }
}

type EmailState = { rows: IntegrationRow[]; credentials: CredentialRow[] }

function integrationFromRecord(record: Record<string, unknown>, module: string): IntegrationRow {
  const dateOrNull = (value: unknown) => (value instanceof Date ? value : null)
  return {
    module,
    provider: typeof record.provider === 'string' ? record.provider : 'betterblog',
    apiKeyEnc: typeof record.api_key_enc === 'string' ? record.api_key_enc : null,
    destinationId: typeof record.destination_id === 'string' ? record.destination_id : null,
    destinationKind: typeof record.destination_kind === 'string' ? record.destination_kind : null,
    tagId: typeof record.tag_id === 'string' ? record.tag_id : null,
    tagName: typeof record.tag_name === 'string' ? record.tag_name : null,
    lastError: typeof record.last_error === 'string' ? record.last_error : null,
    lastErrorAt: dateOrNull(record.last_error_at),
    lastSuccessAt: dateOrNull(record.last_success_at),
  }
}

async function queryLegacyRows(siteId: string): Promise<EmailState> {
  const statements = [
    `SELECT module, provider, api_key_enc, destination_id, destination_kind, tag_id, tag_name, last_error, last_error_at, last_success_at FROM site_email_integrations WHERE site_id = $1`,
    `SELECT provider, api_key_enc, destination_id, destination_kind, tag_id, tag_name, last_error, last_error_at, last_success_at FROM site_email_integrations WHERE site_id = $1`,
    `SELECT provider, api_key_enc, destination_id, last_error, last_error_at, last_success_at FROM site_email_integrations WHERE site_id = $1`,
  ]
  for (const statement of statements) {
    try {
      const found = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(statement, siteId)
      if (found.some((row) => typeof row.module === 'string' && row.module)) {
        return {
          rows: found.map((row) => integrationFromRecord(row, String(row.module))),
          credentials: [],
        }
      }
      const source = found[0]
      if (!source) return { rows: [], credentials: [] }
      return {
        rows: EMAIL_MODULES.map((module) => integrationFromRecord(source, module)),
        credentials: [],
      }
    } catch {
      continue
    }
  }
  return { rows: [], credentials: [] }
}

async function repairMissingModules(siteId: string, rows: IntegrationRow[]): Promise<IntegrationRow[]> {
  const present = new Set(rows.map((row) => row.module))
  if (present.size !== 1 || !present.has('collection_newsletter')) return rows
  const source = rows[0]
  const created: IntegrationRow[] = []
  for (const module of EMAIL_MODULES) {
    if (module === source.module) continue
    try {
      const row = await prisma.siteEmailIntegration.create({
        data: {
          siteId,
          module,
          provider: source.provider,
          apiKeyEnc: source.apiKeyEnc,
          destinationId: source.destinationId,
          destinationKind: source.destinationKind,
          tagId: source.tagId,
          tagName: source.tagName,
        },
      })
      created.push(row)
    } catch (err) {
      console.error('[email-integration] Could not copy destination to', module, err)
      created.push({ ...source, module })
    }
  }
  return [source, ...created]
}

async function loadEmailState(siteId: string): Promise<EmailState> {
  try {
    const [rows, credentials] = await Promise.all([
      prisma.siteEmailIntegration.findMany({ where: { siteId } }),
      prisma.siteEmailCredential.findMany({ where: { siteId } }).catch(() => []),
    ])
    return { rows: await repairMissingModules(siteId, rows), credentials }
  } catch (err) {
    console.error('[email-integration] Per-module destinations unavailable', err)
    return queryLegacyRows(siteId)
  }
}

async function getSiteForUser(siteKey: string, userId: number) {
  const site = await prisma.site.findFirst({
    where: { siteKey, userId, deletedAt: null },
  })
  if (!site) return null
  const email = await loadEmailState(site.id)
  return { ...site, emailIntegrations: email.rows, emailCredentials: email.credentials }
}

function parseProvider(value: unknown): Provider | null {
  return typeof value === 'string' && (PROVIDERS as readonly string[]).includes(value) ? (value as Provider) : null
}

function resolveApiKey(bodyKey: unknown, storedEnc: string | null): { key: string } | { error: string } {
  if (typeof bodyKey === 'string' && bodyKey.trim()) {
    const key = bodyKey.trim()
    if (key.length > 500) return { error: 'API key is too long.' }
    return { key }
  }
  if (!storedEnc) return { error: 'API key is required.' }
  try {
    return { key: decrypt(storedEnc) }
  } catch {
    return { error: 'Could not read the stored API key. Paste it again.' }
  }
}

// GET /api/dashboard/settings/email-integration?siteKey=
router.get('/', requireSession, async (req: Request, res: Response) => {
  const { user } = req as Request & { user: SessionUser }
  const siteKey = typeof req.query.siteKey === 'string' ? req.query.siteKey.trim() : ''
  if (!siteKey) {
    res.status(400).json({ error: 'siteKey is required' })
    return
  }
  try {
    const site = await getSiteForUser(siteKey, user.id)
    if (!site) {
      res.status(404).json({ error: 'Site not found' })
      return
    }
    res.json(toPublicModules(site.emailIntegrations, site.emailCredentials))
  } catch (err) {
    console.error('[email-integration] GET failed', err)
    res.status(500).json({ error: 'Could not load email destinations' })
  }
})

type ExternalCredentials = {
  provider: EmailProviderName
  apiKey: string
  destinationId: string
  destinationKind: KitDestinationKind
  tagId: string
  tagName: string
}

function parseKitKind(value: unknown): KitDestinationKind {
  return value === 'tag' ? 'tag' : 'form'
}

async function credentialsFromBody(
  body: {
    provider?: unknown
    apiKey?: unknown
    destinationId?: unknown
    destinationKind?: unknown
    tagId?: unknown
    tagName?: unknown
  },
  rows: IntegrationRow[],
  credentials: CredentialRow[]
): Promise<ExternalCredentials | { error: string }> {
  const provider = parseProvider(body.provider)
  if (provider !== 'kit' && provider !== 'mailchimp') {
    return { error: 'Choose Kit or Mailchimp to test a connection.' }
  }
  const destinationKind = provider === 'kit' ? parseKitKind(body.destinationKind) : 'form'
  const destinationId = typeof body.destinationId === 'string' ? body.destinationId.trim() : ''
  const destinationError = validateDestinationId(provider, destinationId, destinationKind)
  if (destinationError) return { error: destinationError }
  const tagId = provider === 'mailchimp' && typeof body.tagId === 'string' ? body.tagId.trim() : ''
  const tagName = provider === 'mailchimp' && typeof body.tagName === 'string' ? body.tagName.trim().slice(0, 100) : ''
  const tagError = provider === 'mailchimp' ? validateMailchimpTag(tagId, tagName) : null
  if (tagError) return { error: tagError }
  const resolved = resolveApiKey(body.apiKey, storedKeyEnc(provider, rows, credentials))
  if ('error' in resolved) return resolved
  return { provider, apiKey: resolved.key, destinationId, destinationKind, tagId, tagName }
}

async function apiKeyFromBody(
  body: { provider?: unknown; apiKey?: unknown },
  rows: IntegrationRow[],
  credentials: CredentialRow[]
): Promise<{ provider: EmailProviderName; apiKey: string } | { error: string }> {
  const provider = parseProvider(body.provider)
  if (provider !== 'kit' && provider !== 'mailchimp') {
    return { error: 'Choose Kit or Mailchimp to load destinations.' }
  }
  const resolved = resolveApiKey(body.apiKey, storedKeyEnc(provider, rows, credentials))
  if ('error' in resolved) return resolved
  return { provider, apiKey: resolved.key }
}

// POST /api/dashboard/settings/email-integration/test
router.post('/test', requireSession, async (req: Request, res: Response) => {
  const { user } = req as Request & { user: SessionUser }
  const body = req.body as {
    siteKey?: unknown
    provider?: unknown
    apiKey?: unknown
    destinationId?: unknown
    destinationKind?: unknown
    tagId?: unknown
    tagName?: unknown
  }
  const siteKey = typeof body.siteKey === 'string' ? body.siteKey.trim() : ''
  if (!siteKey) {
    res.status(400).json({ error: 'siteKey is required' })
    return
  }
  const site = await getSiteForUser(siteKey, user.id)
  if (!site) {
    res.status(404).json({ error: 'Site not found' })
    return
  }
  const credentials = await credentialsFromBody(body, site.emailIntegrations, site.emailCredentials)
  if ('error' in credentials) {
    res.status(400).json({ error: credentials.error })
    return
  }
  const result = await testEmailProvider({
    provider: credentials.provider,
    apiKey: credentials.apiKey,
    destinationId: credentials.destinationId,
    destinationKind: credentials.destinationKind,
    tagId: credentials.tagId,
  })
  if (!result.ok) {
    res.status(400).json({ error: result.error })
    return
  }
  res.json({ ok: true })
})

// POST /api/dashboard/settings/email-integration/options
router.post('/options', requireSession, async (req: Request, res: Response) => {
  const { user } = req as Request & { user: SessionUser }
  const body = req.body as {
    siteKey?: unknown
    provider?: unknown
    apiKey?: unknown
    audienceId?: unknown
  }
  const siteKey = typeof body.siteKey === 'string' ? body.siteKey.trim() : ''
  if (!siteKey) {
    res.status(400).json({ error: 'siteKey is required' })
    return
  }
  const site = await getSiteForUser(siteKey, user.id)
  if (!site) {
    res.status(404).json({ error: 'Site not found' })
    return
  }
  const credentials = await apiKeyFromBody(body, site.emailIntegrations, site.emailCredentials)
  if ('error' in credentials) {
    res.status(400).json({ error: credentials.error })
    return
  }
  const audienceId = typeof body.audienceId === 'string' ? body.audienceId.trim() : ''
  const catalog = await listEmailCatalog({
    provider: credentials.provider,
    apiKey: credentials.apiKey,
    audienceId,
  })
  if (!catalog.ok) {
    res.status(400).json({ error: catalog.error })
    return
  }
  if (catalog.provider === 'kit') {
    res.json({ forms: catalog.forms, tags: catalog.tags })
    return
  }
  res.json({
    audiences: catalog.audiences,
    tags: catalog.tags,
    ...(catalog.tagsError ? { tagsError: catalog.tagsError } : {}),
  })
})

type ModuleWrite = {
  module: EmailModuleKey
  provider: Provider
  apiKeyEnc: string | null
  destinationId: string | null
  destinationKind: string | null
  tagId: string | null
  tagName: string | null
}

// PUT /api/dashboard/settings/email-integration
router.put('/', requireSession, async (req: Request, res: Response) => {
  const { user } = req as Request & { user: SessionUser }
  const body = req.body as { siteKey?: unknown; modules?: unknown }
  const siteKey = typeof body.siteKey === 'string' ? body.siteKey.trim() : ''
  if (!siteKey) {
    res.status(400).json({ error: 'siteKey is required' })
    return
  }
  const modulesBody = body.modules && typeof body.modules === 'object' ? (body.modules as Record<string, unknown>) : null
  if (!modulesBody) {
    res.status(400).json({ error: 'modules is required' })
    return
  }
  const moduleKeys = EMAIL_MODULES.filter((key) => modulesBody[key] && typeof modulesBody[key] === 'object')
  const site = await getSiteForUser(siteKey, user.id)
  if (!site) {
    res.status(404).json({ error: 'Site not found' })
    return
  }

  const writes: ModuleWrite[] = []
  const freshKeys: Partial<Record<'kit' | 'mailchimp', string>> = {}
  for (const moduleKey of moduleKeys) {
    const moduleBody = modulesBody[moduleKey] as Record<string, unknown>
    const provider = parseProvider(moduleBody.provider) ?? 'betterblog'
    if (provider === 'betterblog') {
      writes.push({
        module: moduleKey,
        provider,
        apiKeyEnc: null,
        destinationId: null,
        destinationKind: null,
        tagId: null,
        tagName: null,
      })
      continue
    }
    const credentials = await credentialsFromBody(moduleBody, site.emailIntegrations, site.emailCredentials)
    if ('error' in credentials) {
      res.status(400).json({ error: `${MODULE_LABEL[moduleKey]}: ${credentials.error}` })
      return
    }
    const verified = await testEmailProvider({
      provider: credentials.provider,
      apiKey: credentials.apiKey,
      destinationId: credentials.destinationId,
      destinationKind: credentials.destinationKind,
      tagId: credentials.tagId,
    })
    if (!verified.ok) {
      res.status(400).json({ error: `${MODULE_LABEL[moduleKey]}: ${verified.error}` })
      return
    }
    const typed = typeof moduleBody.apiKey === 'string' && moduleBody.apiKey.trim().length > 0
    let apiKeyEnc = storedKeyEnc(provider, site.emailIntegrations, site.emailCredentials)
    if (typed) {
      try {
        freshKeys[provider] = encrypt(credentials.apiKey)
      } catch {
        console.error('[email-integration] Encryption failed')
        res.status(500).json({ error: 'Failed to store API key' })
        return
      }
      apiKeyEnc = freshKeys[provider] ?? null
    }
    writes.push({
      module: moduleKey,
      provider,
      apiKeyEnc,
      destinationId: credentials.destinationId,
      destinationKind: provider === 'kit' ? credentials.destinationKind : null,
      tagId: provider === 'mailchimp' && credentials.tagId ? credentials.tagId : null,
      tagName: provider === 'mailchimp' && credentials.tagName ? credentials.tagName : null,
    })
  }

  try {
    await prisma.$transaction(async (tx) => {
      for (const write of writes) {
        const data = {
          provider: write.provider,
          apiKeyEnc: write.apiKeyEnc,
          destinationId: write.destinationId,
          destinationKind: write.destinationKind,
          tagId: write.tagId,
          tagName: write.tagName,
        }
        await tx.siteEmailIntegration.upsert({
          where: { siteId_module: { siteId: site.id, module: write.module } },
          create: { siteId: site.id, module: write.module, ...data },
          update: data,
        })
      }
      for (const provider of ['kit', 'mailchimp'] as const) {
        const enc = freshKeys[provider]
        if (!enc) continue
        await tx.siteEmailCredential.upsert({
          where: { siteId_provider: { siteId: site.id, provider } },
          create: { siteId: site.id, provider, apiKeyEnc: enc },
          update: { apiKeyEnc: enc },
        })
      }
    })
  } catch (err) {
    console.error('[email-integration] Save failed', err)
    res.status(500).json({ error: 'Failed to save email destinations' })
    return
  }

  const saved = await getSiteForUser(siteKey, user.id)
  res.json(toPublicModules(saved?.emailIntegrations ?? [], saved?.emailCredentials ?? []))
})

export default router
