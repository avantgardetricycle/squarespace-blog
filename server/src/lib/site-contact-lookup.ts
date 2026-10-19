import { decrypt } from './encryption.js'
import { redactSubscriberText } from './email-providers.js'
import { markSquarespaceApiKeyInvalid } from './profiles-api-alert.js'

export type SiteContactLookupResult =
  | { found: true; contactId: string; firstName?: string }
  | { found: false; error?: 'unauthorized' | 'rate_limited' | 'network' | 'unknown' }

type ProfileRecord = {
  id?: string
  email?: string
  hasAccount?: boolean
  has_account?: boolean
  firstName?: string
  first_name?: string
}

function profilesFromPayload(data: unknown): ProfileRecord[] {
  if (!data || typeof data !== 'object') return []
  const record = data as { Profiles?: unknown; profiles?: unknown }
  if (Array.isArray(record.Profiles)) return record.Profiles as ProfileRecord[]
  if (Array.isArray(record.profiles)) return record.profiles as ProfileRecord[]
  return []
}

export async function findSiteContactByEmail(input: {
  siteId: string
  siteKey: string
  siteName: string | null
  siteUrl: string | null
  apiKeyEnc: string
  email: string
  ownerEmails: Array<string | null | undefined>
}): Promise<SiteContactLookupResult> {
  let apiKey = ''
  try {
    apiKey = decrypt(input.apiKeyEnc)
  } catch {
    return { found: false, error: 'unknown' }
  }

  const profilesUrl = `https://api.squarespace.com/1.0/profiles?filter=email,${encodeURIComponent(input.email)}`
  let response: Response
  try {
    response = await fetch(profilesUrl, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
        'User-Agent': 'BetterBlog/1.0',
      },
    })
  } catch {
    return { found: false, error: 'network' }
  }

  if (response.status === 401 || response.status === 403) {
    const errText = await response.text().catch(() => '')
    const errSnippet = errText ? redactSubscriberText(errText) : null
    markSquarespaceApiKeyInvalid({
      siteId: input.siteId,
      siteKey: input.siteKey,
      siteName: input.siteName,
      siteUrl: input.siteUrl,
      status: response.status,
      reason: response.status === 403 ? 'profiles_forbidden' : 'profiles_unauthorized',
      errorBodySnippet: errSnippet,
      ownerEmails: input.ownerEmails,
    }).catch(() => {})
    return { found: false, error: 'unauthorized' }
  }

  if (response.status === 429) return { found: false, error: 'rate_limited' }
  if (!response.ok) return { found: false, error: 'unknown' }

  try {
    const data = (await response.json()) as unknown
    const wanted = input.email.trim().toLowerCase()
    for (const profile of profilesFromPayload(data)) {
      const email = typeof profile.email === 'string' ? profile.email.trim().toLowerCase() : ''
      if (email !== wanted) continue
      const hasAccount = profile.hasAccount ?? profile.has_account ?? true
      if (!hasAccount || !profile.id) continue
      const firstName = profile.firstName || profile.first_name
      return {
        found: true,
        contactId: profile.id,
        ...(firstName ? { firstName } : {}),
      }
    }
    return { found: false }
  } catch {
    return { found: false, error: 'unknown' }
  }
}
