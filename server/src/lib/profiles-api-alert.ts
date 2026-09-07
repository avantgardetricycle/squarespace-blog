import prisma from '../db/index.js'
import { decrypt } from './encryption.js'
import { sendProfilesApiAlertEmail } from './email.js'

export type ProfilesApiKeyInvalidReason = 'profiles_unauthorized' | 'profiles_forbidden'

const PROFILES_PING_EMAIL = '__verify_nonexistent@test.betterblog'
const PING_CHUNK_SIZE = 5

function parseOpsEmails(): string[] {
  const raw = process.env.PROFILES_API_ALERT_EMAIL ?? ''
  return raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
}

function uniqueEmails(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const value of values) {
    const email = typeof value === 'string' ? value.trim().toLowerCase() : ''
    if (!email || !email.includes('@') || seen.has(email)) continue
    seen.add(email)
    out.push(email)
  }
  return out
}

export async function pingSquarespaceProfilesApiKey(
  apiKey: string
): Promise<{ ok: boolean; status: number | null }> {
  const url = `https://api.squarespace.com/1.0/profiles?filter=email,${encodeURIComponent(PROFILES_PING_EMAIL)}`
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
      'User-Agent': 'BetterBlog/1.0',
    },
  })
  return { ok: res.ok, status: res.status }
}

export async function markSquarespaceApiKeyInvalid(opts: {
  siteId: string
  siteKey: string
  siteName: string | null
  siteUrl: string | null
  status: number | null
  reason: ProfilesApiKeyInvalidReason
  errorBodySnippet?: string | null
  ownerEmails: Array<string | null | undefined>
}): Promise<{ emailed: boolean }> {
  const payload = {
    type: 'squarespace-profiles-api',
    siteId: opts.siteId,
    siteKey: opts.siteKey,
    siteUrl: opts.siteUrl,
    status: opts.status,
    reason: opts.reason,
    errorBodySnippet: opts.errorBodySnippet ?? null,
  }
  console.error('[BetterBlog alert] squarespace-profiles-api', payload)

  await prisma.site.updateMany({
    where: { id: opts.siteId, squarespaceApiKeyInvalidAt: null },
    data: { squarespaceApiKeyInvalidAt: new Date() },
  })

  const claimed = await prisma.site.updateMany({
    where: { id: opts.siteId, squarespaceApiKeyAlertEmailSentAt: null },
    data: { squarespaceApiKeyAlertEmailSentAt: new Date() },
  })
  if (claimed.count === 0) {
    console.log('[BetterBlog alert] squarespace-profiles-api email already sent', {
      siteId: opts.siteId,
      reason: opts.reason,
    })
    return { emailed: false }
  }

  const recipients = uniqueEmails([...parseOpsEmails(), ...opts.ownerEmails])
  if (recipients.length === 0) {
    console.warn('[BetterBlog alert] squarespace-profiles-api no recipients', {
      siteId: opts.siteId,
      hint: 'Set PROFILES_API_ALERT_EMAIL or ensure the site owner has an email',
    })
    return { emailed: false }
  }

  await sendProfilesApiAlertEmail(recipients, {
    siteName: opts.siteName || opts.siteKey,
    siteUrl: opts.siteUrl,
    siteKey: opts.siteKey,
    status: opts.status,
    reason: opts.reason,
    errorBodySnippet: opts.errorBodySnippet ?? null,
    emailDomain: null,
    emailHasPlus: false,
  })
  return { emailed: true }
}

export async function pingStoredSquarespaceApiKeys(): Promise<{
  checked: number
  invalid: number
  emailed: number
  errors: number
}> {
  const sites = await prisma.site.findMany({
    where: {
      deletedAt: null,
      status: 'active',
      squarespaceApiKeyEnc: { not: null },
      squarespaceApiKeyInvalidAt: null,
    },
    select: {
      id: true,
      siteKey: true,
      name: true,
      url: true,
      squarespaceApiKeyEnc: true,
      user: { select: { email: true } },
      blogCommentSettings: { select: { notificationEmail: true } },
    },
  })

  const stats = { checked: 0, invalid: 0, emailed: 0, errors: 0 }

  for (let i = 0; i < sites.length; i += PING_CHUNK_SIZE) {
    const chunk = sites.slice(i, i + PING_CHUNK_SIZE)
    await Promise.all(
      chunk.map(async (site) => {
        const enc = site.squarespaceApiKeyEnc
        if (!enc) return
        stats.checked += 1
        let apiKey: string
        try {
          apiKey = decrypt(enc)
        } catch (err) {
          stats.errors += 1
          console.error('[BetterBlog alert] squarespace-profiles-api decrypt failed', {
            siteId: site.id,
            error: err instanceof Error ? err.message : String(err),
          })
          return
        }
        try {
          const ping = await pingSquarespaceProfilesApiKey(apiKey)
          if (ping.status !== 401 && ping.status !== 403) return
          stats.invalid += 1
          const result = await markSquarespaceApiKeyInvalid({
            siteId: site.id,
            siteKey: site.siteKey,
            siteName: site.name,
            siteUrl: site.url,
            status: ping.status,
            reason: ping.status === 403 ? 'profiles_forbidden' : 'profiles_unauthorized',
            ownerEmails: [site.user?.email, site.blogCommentSettings?.notificationEmail],
          })
          if (result.emailed) stats.emailed += 1
        } catch (err) {
          stats.errors += 1
          console.error('[BetterBlog alert] squarespace-profiles-api ping failed', {
            siteId: site.id,
            error: err instanceof Error ? err.message : String(err),
          })
        }
      })
    )
  }

  console.log('[BetterBlog alert] squarespace-profiles-api cron', stats)
  return stats
}
