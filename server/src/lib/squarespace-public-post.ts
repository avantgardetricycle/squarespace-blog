/**
 * Squarespace's collection ?format=json often omits gated post bodies.
 * The post page's own public ?format=json can still include item.body.
 * Preview uses that text without the visitor's Squarespace session.
 */

function asRecord (value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function htmlField (value: unknown): string {
  return typeof value === 'string' ? value : ''
}

export function plainTextLength (html: string): number {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .length
}

const EXPLICIT_PUBLIC_PREVIEW_KEYS = [
  'bbPaywallPublicPreview',
  'bbIsPublicPreview',
  'publicPreview',
  'isPublicPreview',
  'memberAreaPublicPreview',
  'enablePublicPreview'
] as const

export function isExplicitPublicPreview (item: Record<string, unknown>): boolean {
  return EXPLICIT_PUBLIC_PREVIEW_KEYS.some((key) => item[key] === true)
}

/** Pathname on the site origin, or null when the value points somewhere else. */
export function pathnameOnOrigin (value: string, origin: string): string | null {
  const trimmed = value.trim()
  if (!trimmed || trimmed.startsWith('//') || trimmed.includes('..')) return null
  try {
    const url = new URL(trimmed, origin)
    if (url.origin !== origin) return null
    return url.pathname.replace(/\/+$/, '') || '/'
  } catch {
    return null
  }
}

export function publicPostJsonUrl (siteUrl: string, postPath: string): string | null {
  const site = new URL(siteUrl)
  const path = pathnameOnOrigin(postPath, site.origin)
  if (!path || path === '/') return null
  return `${site.origin}${path}?format=json`
}

/** Body HTML from a post-page ?format=json payload, when Squarespace included it. */
export function publicPostBody (json: unknown): string {
  const root = asRecord(json)
  if (!root) return ''
  const item = asRecord(root.item)
  const fromItem = htmlField(item?.body).trim()
  if (fromItem) return htmlField(item?.body)
  const items = Array.isArray(root.items) ? root.items : []
  for (const raw of items) {
    const entry = asRecord(raw)
    const body = htmlField(entry?.body).trim()
    if (body) return htmlField(entry?.body)
  }
  return ''
}

function itemPath (item: Record<string, unknown>, origin: string): string | null {
  const fullUrl = htmlField(item.fullUrl)
  if (fullUrl) return pathnameOnOrigin(fullUrl, origin)
  const urlId = htmlField(item.urlId).replace(/^\/+|\/+$/g, '')
  if (!urlId) return null
  return pathnameOnOrigin(`/${urlId}`, origin)
}

/**
 * Copy a longer public post body onto the matching collection item.
 * When the collection listing did not already expose a public preview,
 * mark the item so logged-out preview still gates it.
 */
export function mergePublicPostBody (
  items: unknown[],
  postPath: string,
  postJson: unknown,
  origin: string
): boolean {
  const path = pathnameOnOrigin(postPath, origin)
  const body = publicPostBody(postJson)
  if (!path || !body.trim()) return false

  const postItem = asRecord(asRecord(postJson)?.item)
  const tail = path.split('/').filter(Boolean).pop() ?? ''
  let match: Record<string, unknown> | null = null
  for (const raw of items) {
    const item = asRecord(raw)
    if (item && itemPath(item, origin) === path) {
      match = item
      break
    }
  }
  if (!match && tail) {
    for (const raw of items) {
      const item = asRecord(raw)
      if (item && htmlField(item.urlId) === tail) {
        match = item
        break
      }
    }
  }
  if (!match) return false
  const current = htmlField(match.body)
  if (plainTextLength(body) <= plainTextLength(current)) return false
  const listingWasPublic = isExplicitPublicPreview(match) || plainTextLength(current) >= 40
  const postIsPublic = postItem ? isExplicitPublicPreview(postItem) : false
  match.body = body
  if (!listingWasPublic && !postIsPublic) match.bbCollectionBodyGated = true
  return true
}
