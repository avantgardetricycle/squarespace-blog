export type PaywallDetectionState = 'unknown' | 'detected_paywalled' | 'detected_unpaywalled'

export type PaywallProbeResult = {
  state: PaywallDetectionState
  signals: string[]
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function nonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const t = value.trim()
  return t ? t : null
}

function truthyFlag(value: unknown): boolean {
  if (value === true || value === 1) return true
  if (typeof value === 'string') {
    const s = value.trim().toLowerCase()
    return s === 'true' || s === '1' || s === 'yes'
  }
  return false
}

function looksLikeBlogJson(json: Record<string, unknown>): boolean {
  if (Array.isArray(json.items)) return true
  const collection = asRecord(json.collection)
  if (collection && (Array.isArray(collection.items) || collection.typeName === 'blog' || collection.type === 1)) {
    return true
  }
  return Boolean(json.website || json.websiteSettings)
}

/**
 * Best-effort read of whether Squarespace currently gates this blog.
 * Conservative: unknown when the JSON is missing or the signals conflict with a failed parse.
 */
export function inferPaywallFromSquarespaceJson(json: unknown): PaywallProbeResult {
  const root = asRecord(json)
  if (!root) return { state: 'unknown', signals: [] }

  const signals: string[] = []
  const collection = asRecord(root.collection)
  const website = asRecord(root.website)
  const websiteSettings = asRecord(root.websiteSettings)
  const pagePreview = asRecord(root.pagePreviewContext)
  const collectionSettings = asRecord(collection?.settings)

  const memberAccessUrl =
    nonEmptyString(pagePreview?.memberAccessUrl) ||
    nonEmptyString(root.memberAccessUrl) ||
    nonEmptyString(collection?.memberAccessUrl)
  if (memberAccessUrl) signals.push('memberAccessUrl')

  if (Array.isArray(root.pricingPlans) && root.pricingPlans.length > 0) {
    signals.push('pricingPlans')
  }

  const memberAreaFlags = [
    ['collection.memberArea', collection?.memberArea],
    ['collection.isMemberArea', collection?.isMemberArea],
    ['collection.memberAreaId', collection?.memberAreaId],
    ['collection.memberAreas', collection?.memberAreas],
    ['collectionSettings.memberArea', collectionSettings?.memberArea],
    ['website.memberAreasEnabled', website?.memberAreasEnabled],
    ['websiteSettings.memberAreasEnabled', websiteSettings?.memberAreasEnabled]
  ] as const
  for (const [name, value] of memberAreaFlags) {
    if (truthyFlag(value) || (typeof value === 'string' && value.trim()) || (Array.isArray(value) && value.length > 0)) {
      signals.push(name)
    }
  }

  const items = Array.isArray(root.items)
    ? root.items
    : collection && Array.isArray(collection.items)
      ? collection.items
      : null
  if (items && items.some((item) => item == null)) {
    signals.push('nullGatedItems')
  }

  if (signals.length > 0) {
    return { state: 'detected_paywalled', signals }
  }

  if (looksLikeBlogJson(root)) {
    return { state: 'detected_unpaywalled', signals: ['noPaywallSignals'] }
  }

  return { state: 'unknown', signals: [] }
}

export function buildBlogJsonUrl(url: string, blogPath: string | null): string {
  const parsed = new URL(url)
  const hasPath = parsed.pathname && parsed.pathname !== '/'
  const base = url.replace(/\/+$/, '')
  return hasPath ? base + '?format=json' : parsed.origin + (blogPath || '/blog') + '?format=json'
}

function appendPasswordToUrl(url: string, password: string | null | undefined): string {
  if (!password || !password.trim()) return url
  try {
    const u = new URL(url)
    u.searchParams.set('password', password.trim())
    return u.toString()
  } catch {
    return url
  }
}

export async function fetchSquarespaceBlogJson(
  url: string,
  blogPath: string | null,
  blogPassword?: string | null
): Promise<unknown | null> {
  const jsonUrl = appendPasswordToUrl(buildBlogJsonUrl(url, blogPath), blogPassword)
  try {
    const res = await fetch(jsonUrl, {
      signal: AbortSignal.timeout(8000),
      headers: { Accept: 'application/json' }
    })
    if (!res.ok) return null
    const contentType = res.headers.get('content-type') || ''
    if (contentType.includes('text/html')) return null
    return await res.json()
  } catch {
    return null
  }
}
