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

const router = Router()

const PROVIDERS = ['betterblog', 'kit', 'mailchimp'] as const
type Provider = (typeof PROVIDERS)[number]

type IntegrationRow = {
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

function toPublic(row: IntegrationRow | null) {
  const provider: Provider = row?.provider === 'kit' || row?.provider === 'mailchimp' ? row.provider : 'betterblog'
  const destinationKind: KitDestinationKind | null =
    provider === 'kit' ? (row?.destinationKind === 'tag' ? 'tag' : 'form') : null
  return {
    provider,
    destinationId: row?.destinationId ?? '',
    destinationKind,
    tagId: provider === 'mailchimp' ? row?.tagId ?? '' : '',
    tagName: provider === 'mailchimp' ? row?.tagName ?? '' : '',
    hasApiKey: Boolean(row?.apiKeyEnc),
    lastError: row?.lastError ?? null,
    lastErrorAt: row?.lastErrorAt ? row.lastErrorAt.toISOString() : null,
    lastSuccessAt: row?.lastSuccessAt ? row.lastSuccessAt.toISOString() : null,
  }
}

async function getSiteForUser(siteKey: string, userId: number) {
  return prisma.site.findFirst({
    where: { siteKey, userId, deletedAt: null },
    include: { emailIntegration: true },
  })
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
  const site = await getSiteForUser(siteKey, user.id)
  if (!site) {
    res.status(404).json({ error: 'Site not found' })
    return
  }
  res.json(toPublic(site.emailIntegration))
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
  stored: IntegrationRow | null
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
  const sameProvider = stored?.provider === provider
  const resolved = resolveApiKey(body.apiKey, sameProvider ? stored?.apiKeyEnc ?? null : null)
  if ('error' in resolved) return resolved
  return { provider, apiKey: resolved.key, destinationId, destinationKind, tagId, tagName }
}

async function apiKeyFromBody(
  body: { provider?: unknown; apiKey?: unknown },
  stored: IntegrationRow | null
): Promise<{ provider: EmailProviderName; apiKey: string } | { error: string }> {
  const provider = parseProvider(body.provider)
  if (provider !== 'kit' && provider !== 'mailchimp') {
    return { error: 'Choose Kit or Mailchimp to load destinations.' }
  }
  const sameProvider = stored?.provider === provider
  const resolved = resolveApiKey(body.apiKey, sameProvider ? stored?.apiKeyEnc ?? null : null)
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
  const credentials = await credentialsFromBody(body, site.emailIntegration)
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
  const credentials = await apiKeyFromBody(body, site.emailIntegration)
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

// PUT /api/dashboard/settings/email-integration
router.put('/', requireSession, async (req: Request, res: Response) => {
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
  const provider = parseProvider(body.provider)
  if (!provider) {
    res.status(400).json({ error: 'provider must be betterblog, kit, or mailchimp' })
    return
  }
  const site = await getSiteForUser(siteKey, user.id)
  if (!site) {
    res.status(404).json({ error: 'Site not found' })
    return
  }

  const existing = site.emailIntegration
  let apiKeyEnc = existing?.apiKeyEnc ?? null
  let destinationId = existing?.destinationId ?? null
  let destinationKind = existing?.destinationKind ?? null
  let tagId = existing?.tagId ?? null
  let tagName = existing?.tagName ?? null

  if (provider === 'kit' || provider === 'mailchimp') {
    const credentials = await credentialsFromBody(body, existing)
    if ('error' in credentials) {
      res.status(400).json({ error: credentials.error })
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
      res.status(400).json({ error: verified.error })
      return
    }
    destinationId = credentials.destinationId
    destinationKind = provider === 'kit' ? credentials.destinationKind : null
    tagId = provider === 'mailchimp' && credentials.tagId ? credentials.tagId : null
    tagName = provider === 'mailchimp' && credentials.tagName ? credentials.tagName : null
    const typedKey = typeof body.apiKey === 'string' && body.apiKey.trim().length > 0
    if (typedKey) {
      try {
        apiKeyEnc = encrypt(credentials.apiKey)
      } catch {
        console.error('[email-integration] Encryption failed')
        res.status(500).json({ error: 'Failed to store API key' })
        return
      }
    }
  }

  const saved = await prisma.siteEmailIntegration.upsert({
    where: { siteId: site.id },
    create: {
      siteId: site.id,
      provider,
      apiKeyEnc: provider === 'betterblog' ? null : apiKeyEnc,
      destinationId: provider === 'betterblog' ? null : destinationId,
      destinationKind: provider === 'kit' ? destinationKind : null,
      tagId: provider === 'mailchimp' ? tagId : null,
      tagName: provider === 'mailchimp' ? tagName : null,
    },
    update:
      provider === 'betterblog'
        ? { provider }
        : { provider, apiKeyEnc, destinationId, destinationKind, tagId, tagName },
  })

  res.json(toPublic(saved))
})

export default router
