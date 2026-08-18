import { Router, Request, Response } from 'express'
import prisma from '../db/index.js'
import {
  getSiteBySiteKey,
  getActiveSiteConfig,
  upsertSiteConfig,
  type SiteConfigData
} from '../db/index.js'
import { requireSession, SessionUser } from '../middleware/session.js'
import { resolveDefaultPostTemplate } from './templates.js'

const router = Router()

/** Collection-only zone keys — never copy these into synthesized postConfig (would bleed index layout into single-post view). */
const POST_CONFIG_ZONE_KEYS = new Set([
  'leftSidebar',
  'rightSidebar',
  'headerContent',
  'footerContent',
  'collectionModules'
])

type ViewerMode = 'loggedOut' | 'loggedIn'

function isRecord (value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

/** Optional payload with POST /api/config to upsert site_paywall_settings. */
function normalizePaywallSettingsPayload (raw: unknown): {
  subscribeUrl: string | null
  footerDescription: string | null
  featureItems: string[]
} | null {
  if (raw === undefined) return null
  if (raw !== null && typeof raw === 'object' && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>
    const su = o.subscribeUrl
    const subscribeUrl =
      typeof su === 'string' && su.trim() ? su.trim().slice(0, 2048) : null
    const fdRaw = o.footerDescription
    const footerDescriptionRaw = typeof fdRaw === 'string' ? fdRaw.trim().slice(0, 160) : null
    const footerDescription =
      footerDescriptionRaw && footerDescriptionRaw.length > 0 ? footerDescriptionRaw : null
    const featureItems: string[] = []
    if (Array.isArray(o.featureItems)) {
      for (const it of o.featureItems) {
        if (typeof it !== 'string') continue
        const t = it.trim().slice(0, 120)
        if (t) featureItems.push(t)
        if (featureItems.length >= 4) break
      }
    }
    return { subscribeUrl, footerDescription, featureItems }
  }
  return null
}

function parseViewerModeQuery (value: unknown): ViewerMode | null {
  if (value === 'loggedIn') return 'loggedIn'
  if (value === 'loggedOut') return 'loggedOut'
  return null
}

function isContextBucket (value: unknown): value is { loggedOut?: Record<string, unknown>; loggedIn?: Record<string, unknown> } {
  if (!isRecord(value)) return false
  return isRecord(value.loggedOut) || isRecord(value.loggedIn)
}

/**
 * Resolve the primary level bucket from a context-bucket payload.
 * Prefers loggedOut; falls back to loggedIn if loggedOut is absent.
 */
function resolvePrimaryBucket (raw: unknown): Record<string, unknown> | null {
  if (isContextBucket(raw)) {
    if (isRecord(raw.loggedOut)) return raw.loggedOut
    if (isRecord(raw.loggedIn)) return raw.loggedIn
    return null
  }
  if (isRecord(raw)) return raw
  return null
}

/** showDate / showAuthor / showReadingTime from dashboard collectionConfig (primary slice, then DB column). */
function pickMetaBooleanFromCollectionConfig (
  collectionRaw: unknown,
  key: 'showDate' | 'showAuthor' | 'showReadingTime',
  existingColumnValue: boolean | undefined,
  defaultVal: boolean
): boolean {
  const bucket = resolvePrimaryBucket(collectionRaw)
  if (bucket && typeof bucket[key] === 'boolean') return bucket[key] as boolean
  if (typeof existingColumnValue === 'boolean') return existingColumnValue
  return defaultVal
}

type ProgressBarPayload = { show: boolean; position: string | null; thickness: number; color: string }

function pickProgressBarFromPostConfig (postRaw: unknown, existing: ProgressBarPayload | null | undefined): ProgressBarPayload {
  const bucket = resolvePrimaryBucket(postRaw)
  const raw = bucket?.progressBar
  const show = raw && typeof raw === 'object' && !Array.isArray(raw)
    ? Boolean((raw as Record<string, unknown>).show ?? false)
    : Boolean(existing?.show ?? false)
  return {
    show,
    position: 'top',
    thickness: 6,
    color: '#5B4FE8'
  }
}

/** Ensure postConfig always carries progressBar for the renderer and Configure UI. */
function mergeProgressBarIntoPostConfig (
  postConfig: Record<string, unknown>,
  fallback: { show?: boolean; position?: string | null; thickness?: number; color?: string }
): Record<string, unknown> {
  const raw = postConfig.progressBar
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const pb = raw as Record<string, unknown>
    return {
      ...postConfig,
      progressBar: {
        show: Boolean(pb.show ?? fallback.show ?? false),
        position: typeof pb.position === 'string' ? pb.position : fallback.position ?? 'top',
        thickness: typeof pb.thickness === 'number' ? pb.thickness : fallback.thickness ?? 6,
        color: typeof pb.color === 'string' ? pb.color : fallback.color ?? '#5B4FE8'
      }
    }
  }
  return {
    ...postConfig,
    progressBar: {
      show: Boolean(fallback.show ?? false),
      position: fallback.position ?? 'top',
      thickness: fallback.thickness ?? 6,
      color: fallback.color ?? '#5B4FE8'
    }
  }
}

/** Extract legacy sidebar/header/social/featuredImage columns from the primary bucket of collectionConfig. */
function pickLegacyColumnsFromCollectionConfig (collectionRaw: unknown, existingRow: Record<string, unknown> | null) {
  const bucket = resolvePrimaryBucket(collectionRaw)
  const get = <T>(key: string, fallback: T): T => {
    if (bucket && isRecord(bucket[key])) return bucket[key] as T
    if (existingRow && isRecord(existingRow[key])) return existingRow[key] as T
    return fallback
  }
  return {
    leftSidebar: get('leftSidebar', undefined as Record<string, unknown> | undefined),
    rightSidebar: get('rightSidebar', undefined as Record<string, unknown> | undefined),
    headerContent: get('headerContent', undefined as Record<string, unknown> | undefined),
    socialMediaLinks: get('socialMediaLinks', undefined as Record<string, unknown> | undefined),
    featuredImage: get('featuredImage', undefined as Record<string, unknown> | undefined),
  }
}

function collectionFieldsForDefaultPost (cc: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const key of Object.keys(cc)) {
    if (!POST_CONFIG_ZONE_KEYS.has(key)) out[key] = cc[key]
  }
  return out
}

function buildDefaultPostConfig (
  cc: Record<string, unknown>,
  progressBar: { show?: boolean; position?: string | null; thickness?: number; color?: string | null }
): Record<string, unknown> {
  return {
    ...collectionFieldsForDefaultPost(cc),
    leftSidebar: { show: false, modules: [], moduleOrder: [], width: 240, spaceAbove: 0, sticky: false },
    rightSidebar: { show: false, modules: [], moduleOrder: [], width: 240, spaceAbove: 0, sticky: false },
    headerContent: { show: false, modules: [], moduleOrder: [], height: 48 },
    footerContent: {
      show: false,
      modules: [],
      moduleOrder: [],
      topPadding: 16
    },
    progressBar: {
      show: progressBar.show ?? false,
      position: 'top',
      thickness: 6,
      color: '#5B4FE8'
    },
    postHeader: { imagePosition: 'fullBleed', contentAlignment: 'left', contentVerticalAlignment: 'bottom' }
  }
}

function appendPasswordToUrl (url: string, password: string | null | undefined): string {
  if (!password || !password.trim()) return url
  try {
    const u = new URL(url)
    u.searchParams.set('password', password.trim())
    return u.toString()
  } catch {
    return url
  }
}

/** Squarespace blog JSON uses several shapes for “featured”; normalize to `featured: true` for our UI/renderer. */
function truthyJsonFlag (v: unknown): boolean {
  if (v === true || v === 1) return true
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase()
    return s === 'true' || s === '1' || s === 'yes'
  }
  return false
}

function itemHasSquarespaceFeaturedMarker (item: Record<string, unknown>): boolean {
  const keys = ['featured', 'isFeatured', 'Featured', 'starred', 'isStarred', 'pinned', 'isPinned', 'promoted', 'isPromoted'] as const
  for (const k of keys) {
    if (k in item && truthyJsonFlag(item[k])) return true
  }
  return false
}

function collectionFeaturedRefs (collection: Record<string, unknown> | null): string[] {
  if (!collection) return []
  const out: string[] = []
  const keyNames = ['featuredItemId', 'featuredId', 'featuredPostId', 'starredItemId', 'pinnedItemId', 'highlightedItemId', 'featuredItemRecordId'] as const
  for (const k of keyNames) {
    const v = collection[k]
    if (typeof v === 'string' && v.trim()) out.push(v.trim())
    else if (v && typeof v === 'object' && typeof (v as { id?: unknown }).id === 'string' && String((v as { id: string }).id).trim()) {
      out.push(String((v as { id: string }).id).trim())
    }
  }
  return out
}

function itemMatchesFeaturedRef (item: Record<string, unknown>, refs: string[]): boolean {
  if (refs.length === 0) return false
  const id = typeof item.id === 'string' ? item.id : ''
  const fullUrl = typeof item.fullUrl === 'string' ? item.fullUrl : ''
  const urlId = typeof item.urlId === 'string' ? item.urlId : ''
  for (const ref of refs) {
    if (!ref) continue
    if (id === ref || fullUrl === ref || urlId === ref) return true
    if (fullUrl && (fullUrl === ref || fullUrl.endsWith(ref) || fullUrl.includes('/' + ref + '/') || fullUrl.includes('/' + ref))) return true
  }
  return false
}

function annotateSquarespaceFeaturedOnItems (items: unknown[], collection: Record<string, unknown> | null): void {
  const refs = collectionFeaturedRefs(collection)
  for (const raw of items) {
    if (!raw || typeof raw !== 'object') continue
    const item = raw as Record<string, unknown>
    if (itemHasSquarespaceFeaturedMarker(item)) {
      item.featured = true
      continue
    }
    if (itemMatchesFeaturedRef(item, refs)) {
      item.featured = true
    }
  }
}

// GET /api/blog-preview/:siteKey - Proxy blog JSON for configure page preview
router.get('/blog-preview/:siteKey', async (req: Request, res: Response) => {
  const siteKey = req.params.siteKey as string
  const viewerMode = parseViewerModeQuery(req.query.viewerMode)

  const site = await getSiteBySiteKey(siteKey)
  if (!site) {
    res.status(404).json({ error: 'Site not found' })
    return
  }

  if (site.status === 'disabled') {
    res.status(403).json({ error: 'Site is disabled' })
    return
  }

  let blogUrl: string
  if (site.url) {
    const parsed = new URL(site.url)
    const hasPath = parsed.pathname && parsed.pathname !== '/'
    const base = site.url.replace(/\/$/, '')
    blogUrl = hasPath ? base + '?format=json' : parsed.origin + (site.blogPath || '/blog') + '?format=json'
  } else if (site.blogPath) {
    res.status(400).json({ error: 'Site has no URL configured' })
    return
  } else {
    res.status(400).json({ error: 'Site has no URL or blog path' })
    return
  }

  const urlWithPassword = appendPasswordToUrl(blogUrl, site.blogPassword)

  try {
    const allItems: unknown[] = []
    let nextUrl: string | null = urlWithPassword
    let firstJson: Record<string, unknown> | null = null
    const maxPages = 50 // safety limit
    let pageCount = 0

    while (nextUrl && pageCount < maxPages) {
      pageCount++
      const fetchRes = await fetch(nextUrl)
      if (!fetchRes.ok) {
        const isProtected = fetchRes.status === 401 || fetchRes.status === 403
        const errMsg = isProtected
          ? 'Blog may be password protected. Add your blog password in the settings below.'
          : 'Failed to fetch blog from Squarespace'
        res.status(502).json({ error: errMsg })
        return
      }
      const json = (await fetchRes.json()) as Record<string, unknown>
      if (!firstJson) firstJson = json

      const items = Array.isArray(json?.items) ? json.items : (json?.collection && typeof json.collection === 'object' && Array.isArray((json.collection as Record<string, unknown>).items) ? (json.collection as Record<string, unknown>).items : []) as unknown[]
      for (const item of items) {
        // Squarespace may return null entries for member-area-gated posts — skip them.
        if (item && typeof item === 'object') allItems.push(item)
      }

      const coll = json?.collection && typeof json.collection === 'object' ? json.collection as Record<string, unknown> : null
      const pag = (json?.pagination && typeof json.pagination === 'object' ? json.pagination : coll?.pagination && typeof coll.pagination === 'object' ? coll.pagination : null) as { nextPageUrl?: string } | null
      const nextPageUrl = (pag?.nextPageUrl ?? coll?.nextPageUrl ?? coll?.nextPage ?? json?.nextPageUrl ?? json?.nextPage) as string | undefined
      if (nextPageUrl && typeof nextPageUrl === 'string' && nextPageUrl.startsWith('http')) {
        try {
          const u = new URL(nextPageUrl)
          if (!u.searchParams.has('format')) u.searchParams.set('format', 'json')
          nextUrl = appendPasswordToUrl(u.toString(), site.blogPassword)
        } catch {
          nextUrl = appendPasswordToUrl(nextPageUrl, site.blogPassword)
        }
      } else if (nextPageUrl && typeof nextPageUrl === 'string' && nextPageUrl.startsWith('/')) {
        try {
          const base = new URL(urlWithPassword)
          const fullNext = base.origin + nextPageUrl
          const u = new URL(fullNext)
          if (!u.searchParams.has('format')) u.searchParams.set('format', 'json')
          nextUrl = appendPasswordToUrl(u.toString(), site.blogPassword)
        } catch {
          nextUrl = null
        }
      } else {
        nextUrl = null
      }
    }

    const collForFeatured =
      firstJson?.collection && typeof firstJson.collection === 'object'
        ? (firstJson.collection as Record<string, unknown>)
        : null
    annotateSquarespaceFeaturedOnItems(allItems, collForFeatured)

    const debugFeatured = String(req.query.bbFeaturedDebug ?? '') === '1'
    if (debugFeatured) {
      const refs = collectionFeaturedRefs(collForFeatured)
      console.warn('[blog-preview featured debug]', {
        siteKey,
        collectionKeys: collForFeatured ? Object.keys(collForFeatured) : [],
        collectionFeaturedRefs: refs,
        items: allItems.map((raw, i) => {
          if (!raw || typeof raw !== 'object') return { i, type: typeof raw }
          const it = raw as Record<string, unknown>
          return {
            i,
            title: it.title,
            id: it.id,
            urlId: it.urlId,
            fullUrl: it.fullUrl,
            markerHit: itemHasSquarespaceFeaturedMarker(it),
            refHit: itemMatchesFeaturedRef(it, refs),
            relevantKeys: Object.keys(it).filter((k) => /feat|star|pin|promo|highlight|record/i.test(k))
          }
        })
      })
    }

    if (firstJson) {
      if (firstJson.collection && typeof firstJson.collection === 'object') {
        (firstJson.collection as Record<string, unknown>).items = allItems
        delete (firstJson.collection as Record<string, unknown>).nextPageUrl
        delete (firstJson.collection as Record<string, unknown>).nextPage
      }
      firstJson.items = allItems
      delete (firstJson as Record<string, unknown>).nextPageUrl
      delete (firstJson as Record<string, unknown>).nextPage
      if (viewerMode) {
        ;(firstJson as Record<string, unknown>).betterBlogViewerMode = viewerMode
      }
      res.json(firstJson)
    } else {
      res.json({ items: allItems, ...(viewerMode ? { betterBlogViewerMode: viewerMode } : {}) })
    }
  } catch (err) {
    console.error('Blog preview fetch error:', err)
    res.status(502).json({ error: 'Failed to fetch blog from Squarespace' })
  }
})

/**
 * Detects headers that stop a browser from framing the site. Squarespace exposes this as
 * Settings > Developer Tools > Website Protection > Clickjack protection, which sends
 * X-Frame-Options: SAMEORIGIN and breaks the Configure live-preview iframe.
 */
function frameBlockReason (headers: Headers, ownOrigin: string): 'x-frame-options' | 'frame-ancestors' | null {
  const xfo = headers.get('x-frame-options')
  if (xfo && /deny|sameorigin/i.test(xfo)) return 'x-frame-options'

  const csp = headers.get('content-security-policy')
  if (csp) {
    const directive = csp
      .split(';')
      .map((part) => part.trim())
      .find((part) => /^frame-ancestors\b/i.test(part))
    if (directive) {
      const sources = directive.split(/\s+/).slice(1)
      const allowsUs = sources.some((src) => src === '*' || (ownOrigin !== '' && src.includes(new URL(ownOrigin).hostname)))
      if (!allowsUs) return 'frame-ancestors'
    }
  }
  return null
}

// GET /api/config/preview-embeddable/:siteKey - Can the blog page be shown in the preview iframe?
router.get('/preview-embeddable/:siteKey', async (req: Request, res: Response) => {
  const siteKey = req.params.siteKey as string

  const site = await getSiteBySiteKey(siteKey)
  if (!site) {
    res.status(404).json({ error: 'Site not found' })
    return
  }
  if (!site.url) {
    res.status(400).json({ error: 'Site has no URL configured' })
    return
  }

  let pageUrl: string
  try {
    const parsed = new URL(site.url)
    const hasPath = parsed.pathname && parsed.pathname !== '/'
    pageUrl = hasPath ? site.url.replace(/\/$/, '') : parsed.origin + (site.blogPath || '/blog')
  } catch {
    res.status(400).json({ error: 'Site URL is invalid' })
    return
  }

  const ownOrigin = `${req.protocol}://${req.get('host') ?? ''}`

  try {
    const probe = await fetch(appendPasswordToUrl(pageUrl, site.blogPassword), {
      method: 'HEAD',
      redirect: 'follow',
      signal: AbortSignal.timeout(8000)
    })
    const blockedBy = frameBlockReason(probe.headers, ownOrigin)
    res.json({ embeddable: blockedBy === null, blockedBy, status: probe.status })
  } catch (err) {
    console.error('Preview embeddability probe error:', err)
    // Unknown means "let the iframe try" — never downgrade a working preview because a probe failed.
    res.json({ embeddable: true, blockedBy: null, status: null })
  }
})

// GET /api/config/share/:siteKey/:postIndex - Share redirect with OG meta for link previews
router.get('/share/:siteKey/:postIndex', async (req: Request, res: Response) => {
  const siteKey = req.params.siteKey as string
  const postIndex = parseInt(String(req.params.postIndex ?? '0'), 10)
  if (isNaN(postIndex) || postIndex < 0) {
    res.status(400).send('Invalid post index')
    return
  }

  const site = await getSiteBySiteKey(siteKey)
  if (!site) {
    res.status(404).send('Site not found')
    return
  }

  let blogUrl: string
  if (site.url) {
    const parsed = new URL(site.url)
    const hasPath = parsed.pathname && parsed.pathname !== '/'
    const base = site.url.replace(/\/$/, '')
    blogUrl = hasPath ? base : parsed.origin + (site.blogPath || '/blog')
  } else {
    res.status(400).send('Site has no URL configured')
    return
  }

  const targetUrl = blogUrl.replace(/\/+$/, '') + '#post-' + postIndex

  let ogImage = ''
  let ogTitle = ''
  let ogDescription = ''

  try {
    const jsonUrl = blogUrl + (blogUrl.includes('?') ? '&' : '?') + 'format=json'
    const urlWithPassword = appendPasswordToUrl(jsonUrl, site.blogPassword)
    const fetchRes = await fetch(urlWithPassword)
    if (fetchRes.ok) {
      const json = await fetchRes.json()
      const items = Array.isArray(json?.items) ? json.items : (json?.collection?.items ?? [])
      const post = items[postIndex]
      if (post) {
        ogTitle = (post.title || 'Untitled').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        ogDescription = (post.excerpt || post.body || '').replace(/<[^>]*>/g, '').slice(0, 200).replace(/</g, '&lt;').replace(/>/g, '&gt;')
        ogImage = post.assetUrl || post.thumbnailUrl || (post.assets?.[0]?.assetUrl) || ''
        if (ogImage && ogImage.indexOf('http') !== 0) {
          try {
            const u = new URL(blogUrl)
            ogImage = u.origin + (ogImage.charAt(0) === '/' ? '' : '/') + ogImage
          } catch {
            ogImage = ''
          }
        }
      }
    }
  } catch {
    /* use defaults */
  }

  const title = ogTitle || 'Blog Post'
  const description = ogDescription || ''
  const image = ogImage || ''

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta http-equiv="refresh" content="0;url=${targetUrl.replace(/"/g, '&quot;')}">
  <meta property="og:type" content="article">
  <meta property="og:url" content="${targetUrl.replace(/"/g, '&quot;')}">
  <meta property="og:title" content="${title.replace(/"/g, '&quot;')}">
  <meta property="og:description" content="${description.replace(/"/g, '&quot;')}">
  ${image ? `<meta property="og:image" content="${image.replace(/"/g, '&quot;')}">` : ''}
  <meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}">
  <meta name="twitter:title" content="${title.replace(/"/g, '&quot;')}">
  <meta name="twitter:description" content="${description.replace(/"/g, '&quot;')}">
  ${image ? `<meta name="twitter:image" content="${image.replace(/"/g, '&quot;')}">` : ''}
  <title>${title.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</title>
</head>
<body><p>Redirecting to <a href="${targetUrl.replace(/"/g, '&quot;')}">${title.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</a>…</p></body>
</html>`

  res.type('html').send(html)
})

// POST /api/config/check-placeholder-images - Batch check image URLs for Squarespace placeholder (no CORS)
router.post('/check-placeholder-images', async (req: Request, res: Response) => {
  const body = req.body as { urls?: string[] }
  const raw = Array.isArray(body?.urls) ? body.urls : []
  const urls = raw.slice(0, 100)
  if (urls.length === 0) {
    res.json({ placeholders: {} })
    return
  }
  const placeholders: Record<string, boolean> = {}
  const PLACEHOLDER_MARKERS = ['no-image.png', 'configuration/no-image']

  function isPlaceholderUrl (url: string): boolean {
    const u = url.toLowerCase()
    return PLACEHOLDER_MARKERS.some((m) => u.includes(m))
  }

  await Promise.all(
    urls.map(async (url) => {
      if (!url || typeof url !== 'string') {
        placeholders[url] = true
        return
      }
      if (isPlaceholderUrl(url)) {
        placeholders[url] = true
        return
      }
      try {
        const r = await fetch(url, { method: 'HEAD', redirect: 'follow' })
        const finalUrl = r.url || url
        placeholders[url] = isPlaceholderUrl(finalUrl)
      } catch {
        placeholders[url] = false
      }
    })
  )

  res.json({ placeholders })
})

// GET /api/config/:siteKey - Public endpoint for loader.js
// Uses internal subscription record only (no Stripe API calls) - gated on status
router.get('/:siteKey', async (req: Request, res: Response) => {
  const siteKey = req.params.siteKey as string
  const viewerMode = parseViewerModeQuery(req.query.viewerMode)
  const reqId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  console.log(`[config] GET ${siteKey} start (${reqId})`)
  try {

  const site = await prisma.site.findFirst({
    where: { siteKey, deletedAt: null },
    include: {
      user: {
        include: {
          subscriptions: {
            where: { status: { in: ['trialing', 'active'] } },
            orderBy: { updatedAt: 'desc' },
            take: 1
          }
        }
      },
      blogCommentSettings: true,
      sitePaywallSettings: true
    }
  })

  if (!site) {
    res.status(404).json({ error: 'Site not found' })
    return
  }

  if (site.status === 'disabled') {
    res.status(403).json({ error: 'Site is disabled' })
    return
  }

  const activeSubscription = site.user?.subscriptions?.[0] ?? null
  if (!activeSubscription) {
    res.status(403).json({ error: 'Subscription required' })
    return
  }

  const siteConfig = await getActiveSiteConfig(site.id)
  if (!siteConfig) {
    res.status(404).json({ error: 'Config not found' })
    return
  }

  try {
    const progressBar = (siteConfig.progressBar as { show?: boolean; position?: string | null; thickness?: number; color?: string }) ?? { show: false, position: null, thickness: 6, color: '#5B4FE8' }
    const tableOfContents = (siteConfig.tableOfContents as { show?: boolean; position?: string | null }) ?? { show: false, position: null }
    const recentPostsSidebar = (siteConfig.recentPostsSidebar as { show?: boolean; position?: string | null }) ?? { show: false, position: null }
    const authorSettings = (siteConfig.authorSettings as { defaultAuthorIds?: string[]; postAuthorOverrides?: Record<string, string[]> }) ?? { defaultAuthorIds: [], postAuthorOverrides: {} }
    const leftSidebar = (siteConfig as { leftSidebar?: { show?: boolean; modules?: string[]; width?: number } }).leftSidebar ?? null
    const rightSidebar = (siteConfig as { rightSidebar?: { show?: boolean; modules?: string[]; width?: number } }).rightSidebar ?? null
    const headerContent = (siteConfig as { headerContent?: { show?: boolean; tableOfContents?: boolean; breadcrumbs?: boolean; modules?: string[]; height?: number } }).headerContent ?? null
    const socialMediaLinks = (siteConfig as { socialMediaLinks?: { show?: boolean; platforms?: string[] } }).socialMediaLinks ?? null

    // Build author map (id -> name) for renderer
    let defaultAuthorIds = authorSettings.defaultAuthorIds ?? []
    const authorIds = new Set<string>(defaultAuthorIds)
    for (const ids of Object.values(authorSettings.postAuthorOverrides ?? {})) {
      for (const id of ids) authorIds.add(id)
    }
    // When no default authors are configured, use authors marked as default (e.g. ingested from Squarespace)
    if (defaultAuthorIds.length === 0) {
      const defaultAuthors = await prisma.blogAuthor.findMany({
        where: { siteId: site.id, isDefault: true },
        orderBy: { name: 'asc' }
      })
      defaultAuthorIds = defaultAuthors.map((a) => a.id)
      for (const a of defaultAuthors) authorIds.add(a.id)
    }
    const authors = authorIds.size > 0
      ? await prisma.blogAuthor.findMany({
          where: { siteId: site.id, id: { in: Array.from(authorIds) } }
        })
      : []
    const authorMap: Record<string, string> = {}
    const authorProfiles: Record<string, { name: string; imageUrl: string | null; bio: string | null; email: string | null; socialLinks: Record<string, string> }> = {}
    for (const a of authors) {
      authorMap[a.id] = a.name
      authorProfiles[a.id] = {
        name: a.name,
        imageUrl: a.imageUrl ?? null,
        bio: a.bio ?? null,
        email: a.email ?? null,
        socialLinks: (a.socialLinks as Record<string, string>) ?? {}
      }
    }

    // Derive renderer URL from request host so loader gets a URL it can fetch (avoids
    // localhost/loopback when API is reached via tunnel - Private Network Access blocks
    // public pages loading scripts from loopback)
    const protocol = req.get('x-forwarded-proto') || req.protocol || 'https'
    const host = req.get('x-forwarded-host') || req.get('host') || ''
    const baseUrl = host ? `${protocol}://${host}`.replace(/\/$/, '') : (process.env.APP_URL ?? 'http://localhost:3001').replace(/\/$/, '')
    const rendererUrl = `${baseUrl}/renderer.js`

    const ls = leftSidebar && typeof leftSidebar === 'object'
      ? { show: leftSidebar.show ?? false, modules: Array.isArray(leftSidebar.modules) ? leftSidebar.modules : [], width: Math.min(400, Math.max(160, leftSidebar.width ?? 240)), spaceAbove: 0, sticky: (leftSidebar as { sticky?: boolean }).sticky === true }
      : (tableOfContents.show && tableOfContents.position === 'left') || (recentPostsSidebar.show && recentPostsSidebar.position === 'left')
        ? { show: true, modules: [...(tableOfContents.show && tableOfContents.position === 'left' ? ['tableOfContents'] : []), ...(recentPostsSidebar.show && recentPostsSidebar.position === 'left' ? ['recentPosts'] : [])], width: 240, spaceAbove: 0, sticky: false }
        : { show: false, modules: [], width: 240, spaceAbove: 0, sticky: false }
    const rs = rightSidebar && typeof rightSidebar === 'object'
      ? { show: rightSidebar.show ?? false, modules: Array.isArray(rightSidebar.modules) ? rightSidebar.modules : [], width: Math.min(400, Math.max(160, rightSidebar.width ?? 240)), spaceAbove: 0, sticky: (rightSidebar as { sticky?: boolean }).sticky === true }
      : (tableOfContents.show && tableOfContents.position === 'right') || (recentPostsSidebar.show && recentPostsSidebar.position === 'right')
        ? { show: true, modules: [...(tableOfContents.show && tableOfContents.position === 'right' ? ['tableOfContents'] : []), ...(recentPostsSidebar.show && recentPostsSidebar.position === 'right' ? ['recentPosts'] : [])], width: 240, spaceAbove: 0, sticky: false }
        : { show: false, modules: [], width: 240, spaceAbove: 0, sticky: false }
    const hc = headerContent && typeof headerContent === 'object'
      ? (() => {
          const modules = Array.isArray(headerContent.modules) ? headerContent.modules : [];
          const migrated = modules.length > 0 ? modules : [
            ...(headerContent.tableOfContents ? ['tableOfContents'] : []),
            ...(headerContent.breadcrumbs ? ['breadcrumbs'] : []),
          ];
          return {
            show: headerContent.show ?? false,
            modules: migrated,
            height: Math.min(120, Math.max(32, Number(headerContent.height) || 48)),
          };
        })()
      : { show: false, modules: [], height: 48 }
    const sm = socialMediaLinks && typeof socialMediaLinks === 'object'
      ? { show: socialMediaLinks.show ?? false, platforms: Array.isArray(socialMediaLinks.platforms) ? socialMediaLinks.platforms : [] }
      : { show: false, platforms: [] }
    const fi = (siteConfig as { featuredImage?: Record<string, unknown> }).featuredImage
    const featuredImage = fi && typeof fi === 'object'
      ? {
          show: fi.show ?? true,
          layoutMode: (fi.layoutMode === 'fullBleed' ? 'fullBleed' : fi.layoutMode === 'rightJustified' ? 'rightJustified' : 'leftJustified') as 'fullBleed' | 'leftJustified' | 'rightJustified',
          imageWidthPercent: Math.min(60, Math.max(25, Number(fi.imageWidthPercent) || 40)),
          aspectBehavior: (fi.aspectBehavior === 'cropped' ? 'cropped' : 'original') as 'original' | 'cropped',
          aspectRatio: (fi.aspectRatio === '4:3' ? '4:3' : fi.aspectRatio === '3:2' ? '3:2' : fi.aspectRatio === '2:3' ? '2:3' : fi.aspectRatio === '1:1' ? '1:1' : '16:9') as '16:9' | '4:3' | '3:2' | '2:3' | '1:1',
          roundedCorners: (fi.roundedCorners === 'small' ? 'small' : fi.roundedCorners === 'large' ? 'large' : 'off') as 'off' | 'small' | 'large',
          shadow: Boolean(fi.shadow),
          showCaption: Boolean(fi.showCaption ?? true),
          verticalSpacing: (fi.verticalSpacing === 'tight' ? 'tight' : fi.verticalSpacing === 'spacious' ? 'spacious' : 'normal') as 'tight' | 'normal' | 'spacious',
        }
      : {
          show: true,
          layoutMode: 'leftJustified' as const,
          aspectBehavior: 'original' as const,
          aspectRatio: '16:9' as const,
          roundedCorners: 'off' as const,
          shadow: false,
          showCaption: true,
          verticalSpacing: 'normal' as const,
        }

    const collectionConfig = (siteConfig as { collectionConfig?: unknown }).collectionConfig
    const postConfig = (siteConfig as { postConfig?: unknown }).postConfig
    const legacyCollectionFallback = {
      showDate: siteConfig.showDate,
      showAuthor: siteConfig.showAuthor,
      showReadingTime: siteConfig.showReadingTime ?? false,
      leftSidebar: ls,
      rightSidebar: rs,
      headerContent: hc,
      socialMediaLinks: sm,
      featuredImage
    }
    const normalizeCollectionLevel = (ccLevelRaw: Record<string, unknown>): Record<string, unknown> => {
      const ccPagination = (ccLevelRaw as { pagination?: { show?: boolean; mode?: string; postsPerPage?: number } }).pagination
      return {
        ...ccLevelRaw,
        pagination: ccPagination && typeof ccPagination === 'object'
          ? {
              show: true,
              mode: ccPagination.mode === 'infiniteScroll' ? 'infiniteScroll' : 'pages',
              postsPerPage: [5, 10, 20].includes(Number(ccPagination.postsPerPage)) ? ccPagination.postsPerPage : 10
            }
          : { show: true, mode: 'pages', postsPerPage: 10 }
      }
    }
    const primaryCollection = resolvePrimaryBucket(collectionConfig) ?? legacyCollectionFallback
    const cc = normalizeCollectionLevel(primaryCollection as Record<string, unknown>)
    const primaryPost = resolvePrimaryBucket(postConfig)
    const pc =
      primaryPost && isRecord(primaryPost)
        ? primaryPost
        : buildDefaultPostConfig(cc, progressBar)
    // When postSort is "popularity", fetch post view counts from analytics for the renderer
    let postViewCounts: Record<string, number> = {}
    const ccPostSort = (cc as { postSort?: string }).postSort
    if (ccPostSort === 'popularity') {
      const since = new Date()
      since.setDate(since.getDate() - 30)
      const pageViews = await prisma.analyticsEvent.findMany({
        where: { siteId: site.id, eventType: 'page_view', occurredAt: { gte: since }, postId: { not: null } },
        select: { postId: true }
      })
      for (const e of pageViews) {
        if (e.postId) {
          postViewCounts[e.postId] = (postViewCounts[e.postId] ?? 0) + 1
        }
      }
    }

    const siteConfigTyped = siteConfig as { collectionTemplateId?: string | null; postTemplateId?: string | null }
    let postTemplateId: string | null =
      typeof siteConfigTyped.postTemplateId === 'string' ? siteConfigTyped.postTemplateId : null
    let resolvedPostConfig: Record<string, unknown> = pc as Record<string, unknown>
    // Post configs are always tied to a template; default missing assignments to Reporter.
    if (!postTemplateId) {
      const defaultPostTemplate = await resolveDefaultPostTemplate()
      if (defaultPostTemplate) {
        postTemplateId = defaultPostTemplate.id
        // Only replace synthesized empty defaults — keep existing customized post configs.
        if (!(primaryPost && isRecord(primaryPost))) {
          resolvedPostConfig = defaultPostTemplate.postConfig
        }
      }
    }
    resolvedPostConfig = mergeProgressBarIntoPostConfig(resolvedPostConfig, progressBar)
    const cs = site.blogCommentSettings
    const commentsTurnedOff = cs != null && cs.commentsEnabled === false
    const sortOrder =
      cs?.sortOrder === 'oldest' || cs?.sortOrder === 'most_liked' ? cs.sortOrder : 'newest'
    const commentSettings = commentsTurnedOff
      ? { commentsEnabled: false }
      : {
          commentsEnabled: true,
          allowNewComments: cs?.allowNewComments ?? true,
          allowAnonymousComments: cs?.allowAnonymousComments ?? true,
          subscriberCommentsEnabled: cs?.subscriberCommentsEnabled ?? false,
          requireApproval: cs?.requireApproval ?? false,
          autoCloseAfterDays: cs?.autoCloseAfterDays ?? null,
          allowLikes: cs?.allowLikes ?? true,
          allowThreadedReplies: cs?.allowThreadedReplies ?? true,
          sortOrder,
          hcaptchaSiteKey: process.env.HCAPTCHA_SITE_KEY || null,
        }

    const pw = site.sitePaywallSettings
    const paywallSettings = pw
      ? {
          subscribeUrl: pw.subscribeUrl,
          footerDescription: pw.footerDescription,
          featureItems: pw.featureItems
        }
      : null

    const configData = {
      siteKey,
      siteId: site.id,
      blogPath: site.blogPath ?? null,
      rendererUrl,
      defaultAuthorIds,
      postAuthorOverrides: authorSettings.postAuthorOverrides ?? {},
      authorMap,
      authorProfiles,
      collectionConfig: cc,
      postConfig: resolvedPostConfig,
      paywallMode: site.paywallMode,
      paywallDetectionState: site.paywallDetectionState,
      paywallDetectionSource: site.paywallDetectionSource ?? null,
      paywallSettings,
      ...(viewerMode ? { viewerMode } : {}),
      collectionTemplateId: siteConfigTyped.collectionTemplateId ?? null,
      postTemplateId,
      recentPostsCount: 3,
      baseUrl,
      commentSettings,
      ...(Object.keys(postViewCounts).length > 0 ? { postViewCounts } : {})
    }

    console.log(`[config] GET ${siteKey} ok (${reqId})`)
    res.json(configData)
  } catch (err) {
    console.error(`[config] GET ${siteKey} error (${reqId}):`, err)
    res.status(500).json({ error: 'Invalid config data' })
  }
  } catch (err) {
    console.error(`[config] GET ${siteKey} unhandled (${reqId}):`, err)
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to load config' })
    }
  }
})

// POST /api/config - Save/update site config (requires auth, must own site)
router.post('/', requireSession, async (req: Request, res: Response) => {
  const { user } = req as Request & { user: SessionUser }
  const body = req.body as { siteKey?: string; config?: unknown; paywallSettings?: unknown }
  const { siteKey, config } = body

  if (!siteKey || !config) {
    res.status(400).json({ error: 'siteKey and config are required' })
    return
  }

  const site = await prisma.site.findFirst({
    where: { siteKey, userId: user.id, deletedAt: null }
  })
  if (!site) {
    res.status(404).json({ error: 'Site not found' })
    return
  }

  try {
    const c = config as Record<string, unknown>
    const collectionRaw = c.collectionConfig
    const postRaw = c.postConfig

    // collectionTemplateId / postTemplateId are top-level fields sent by the dashboard.
    // Preserve null explicitly so clearing a template is correctly persisted.
    const collectionTemplateId: string | null =
      typeof c.collectionTemplateId === 'string' ? c.collectionTemplateId : null
    const postTemplateId: string | null =
      typeof c.postTemplateId === 'string' ? c.postTemplateId : null

    const existing = await getActiveSiteConfig(site.id)
    const existingRow = existing as Record<string, unknown> | null

    // Extract booleans from the primary slice of collectionConfig (flat or legacy bucket),
    // falling back to the existing DB column value, then to a sensible default.
    const showDate = pickMetaBooleanFromCollectionConfig(collectionRaw, 'showDate', existing?.showDate, true)
    const showAuthor = pickMetaBooleanFromCollectionConfig(collectionRaw, 'showAuthor', existing?.showAuthor, false)
    const showReadingTime = pickMetaBooleanFromCollectionConfig(collectionRaw, 'showReadingTime', existing?.showReadingTime, false)

    // progressBar lives inside postConfig (flat) under progressBar
    const existingPb = existing?.progressBar as ProgressBarPayload | null | undefined
    const progressBar = pickProgressBarFromPostConfig(postRaw, existingPb ?? undefined)

    // Legacy sidebar/zone columns — read from the incoming payload first, then the existing row.
    const legacy = pickLegacyColumnsFromCollectionConfig(collectionRaw, existingRow)

    // tableOfContents / recentPostsSidebar are truly legacy (not sent by the dashboard anymore);
    // preserve the existing values so they aren't wiped out.
    const tableOfContents = (existing?.tableOfContents as SiteConfigData['tableOfContents']) ?? { show: false, position: 'left' }
    const recentPostsSidebar = (existing?.recentPostsSidebar as SiteConfigData['recentPostsSidebar']) ?? { show: false, position: 'left' }

    const authorSettingsRaw = c as { defaultAuthorIds?: unknown; postAuthorOverrides?: unknown }
    const authorSettings = {
      defaultAuthorIds: Array.isArray(authorSettingsRaw.defaultAuthorIds) ? authorSettingsRaw.defaultAuthorIds as string[] : [],
      postAuthorOverrides: (authorSettingsRaw.postAuthorOverrides && typeof authorSettingsRaw.postAuthorOverrides === 'object' && !Array.isArray(authorSettingsRaw.postAuthorOverrides))
        ? authorSettingsRaw.postAuthorOverrides as Record<string, string[]>
        : {}
    }

    const data: SiteConfigData = {
      showDate,
      showAuthor,
      showReadingTime,
      authorSettings,
      progressBar,
      tableOfContents,
      recentPostsSidebar,
      leftSidebar: legacy.leftSidebar as SiteConfigData['leftSidebar'],
      rightSidebar: legacy.rightSidebar as SiteConfigData['rightSidebar'],
      headerContent: legacy.headerContent as SiteConfigData['headerContent'],
      socialMediaLinks: legacy.socialMediaLinks as SiteConfigData['socialMediaLinks'],
      featuredImage: legacy.featuredImage as SiteConfigData['featuredImage'],
      collectionConfig: isRecord(collectionRaw) ? collectionRaw : undefined,
      postConfig: isRecord(postRaw) ? postRaw : undefined,
      collectionTemplateId,
      postTemplateId,
    }

    console.log('[config] POST save', {
      siteKey,
      collectionTemplateId,
      postTemplateId,
      showDate,
      showAuthor,
      showReadingTime,
    })

    await upsertSiteConfig(site.id, data)

    const paywallNorm = normalizePaywallSettingsPayload(body.paywallSettings)
    if (paywallNorm) {
      await prisma.sitePaywallSettings.upsert({
        where: { siteId: site.id },
        create: {
          siteId: site.id,
          subscribeUrl: paywallNorm.subscribeUrl,
          footerDescription: paywallNorm.footerDescription,
          featureItems: paywallNorm.featureItems
        },
        update: {
          subscribeUrl: paywallNorm.subscribeUrl,
          footerDescription: paywallNorm.footerDescription,
          featureItems: paywallNorm.featureItems
        }
      })
    }

    res.json({ success: true })
  } catch (error) {
    console.error('Failed to save config:', error)
    res.status(500).json({ error: 'Failed to save config' })
  }
})

export default router
