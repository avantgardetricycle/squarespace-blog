import { Router, Request, Response } from 'express'
import prisma from '../db/index.js'
import {
  getSiteBySiteKey,
  getActiveSiteConfig,
  upsertSiteConfig,
  type SiteConfigData
} from '../db/index.js'
import { requireSession, SessionUser } from '../middleware/session.js'

const router = Router()

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

// GET /api/blog-preview/:siteKey - Proxy blog JSON for configure page preview
router.get('/blog-preview/:siteKey', async (req: Request, res: Response) => {
  const siteKey = req.params.siteKey as string

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
      for (const item of items) allItems.push(item)

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

    if (firstJson) {
      if (firstJson.collection && typeof firstJson.collection === 'object') {
        (firstJson.collection as Record<string, unknown>).items = allItems
        delete (firstJson.collection as Record<string, unknown>).nextPageUrl
        delete (firstJson.collection as Record<string, unknown>).nextPage
      }
      firstJson.items = allItems
      delete (firstJson as Record<string, unknown>).nextPageUrl
      delete (firstJson as Record<string, unknown>).nextPage
      res.json(firstJson)
    } else {
      res.json({ items: allItems })
    }
  } catch (err) {
    console.error('Blog preview fetch error:', err)
    res.status(502).json({ error: 'Failed to fetch blog from Squarespace' })
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
  const reqId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  console.log(`[config] GET ${siteKey} start (${reqId})`)
  try {

  const site = await prisma.site.findUnique({
    where: { siteKey },
    include: {
      user: {
        include: {
          subscriptions: {
            where: { status: { in: ['trialing', 'active'] } },
            orderBy: { updatedAt: 'desc' },
            take: 1
          }
        }
      }
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
      ? { show: leftSidebar.show ?? false, modules: Array.isArray(leftSidebar.modules) ? leftSidebar.modules : [], width: Math.min(400, Math.max(160, leftSidebar.width ?? 240)), spaceAbove: Math.min(64, Math.max(0, Number((leftSidebar as { spaceAbove?: number }).spaceAbove) || 0)), sticky: (leftSidebar as { sticky?: boolean }).sticky !== false }
      : (tableOfContents.show && tableOfContents.position === 'left') || (recentPostsSidebar.show && recentPostsSidebar.position === 'left')
        ? { show: true, modules: [...(tableOfContents.show && tableOfContents.position === 'left' ? ['tableOfContents'] : []), ...(recentPostsSidebar.show && recentPostsSidebar.position === 'left' ? ['recentPosts'] : [])], width: 240, spaceAbove: 0, sticky: true }
        : { show: false, modules: [], width: 240, spaceAbove: 0, sticky: true }
    const rs = rightSidebar && typeof rightSidebar === 'object'
      ? { show: rightSidebar.show ?? false, modules: Array.isArray(rightSidebar.modules) ? rightSidebar.modules : [], width: Math.min(400, Math.max(160, rightSidebar.width ?? 240)), spaceAbove: Math.min(64, Math.max(0, Number((rightSidebar as { spaceAbove?: number }).spaceAbove) || 0)), sticky: (rightSidebar as { sticky?: boolean }).sticky !== false }
      : (tableOfContents.show && tableOfContents.position === 'right') || (recentPostsSidebar.show && recentPostsSidebar.position === 'right')
        ? { show: true, modules: [...(tableOfContents.show && tableOfContents.position === 'right' ? ['tableOfContents'] : []), ...(recentPostsSidebar.show && recentPostsSidebar.position === 'right' ? ['recentPosts'] : [])], width: 240, spaceAbove: 0, sticky: true }
        : { show: false, modules: [], width: 240, spaceAbove: 0, sticky: true }
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
          aspectRatio: (fi.aspectRatio === '3:2' ? '3:2' : fi.aspectRatio === '1:1' ? '1:1' : '16:9') as '16:9' | '3:2' | '1:1',
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

    const collectionConfig = (siteConfig as { collectionConfig?: object }).collectionConfig
    const postConfig = (siteConfig as { postConfig?: object }).postConfig
    const ccBase = collectionConfig && typeof collectionConfig === 'object' ? collectionConfig : {
      showDate: siteConfig.showDate,
      showAuthor: siteConfig.showAuthor,
      showReadingTime: siteConfig.showReadingTime ?? false,
      leftSidebar: ls,
      rightSidebar: rs,
      headerContent: hc,
      socialMediaLinks: sm,
      featuredImage
    }
    const ccPagination = (ccBase as { pagination?: { show?: boolean; mode?: string; postsPerPage?: number } }).pagination
    const cc = {
      ...ccBase,
      pagination: ccPagination && typeof ccPagination === 'object'
        ? {
            show: ccPagination.show ?? false,
            mode: ccPagination.mode === 'infiniteScroll' ? 'infiniteScroll' : 'pages',
            postsPerPage: [5, 10, 20].includes(Number(ccPagination.postsPerPage)) ? ccPagination.postsPerPage : 10
          }
        : { show: false, mode: 'pages', postsPerPage: 10 }
    }
    const pc = postConfig && typeof postConfig === 'object' ? postConfig : {
      ...cc,
      progressBar: {
        show: progressBar.show ?? false,
        position: progressBar.position ?? 'top',
        thickness: Math.min(12, Math.max(2, progressBar.thickness ?? 6)),
        color: (typeof progressBar.color === 'string' && /^#[0-9A-Fa-f]{6}$/.test(progressBar.color)) ? progressBar.color : '#5B4FE8'
      }
    }
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
      postConfig: pc,
      collectionTemplateId: siteConfigTyped.collectionTemplateId ?? null,
      postTemplateId: siteConfigTyped.postTemplateId ?? null,
      recentPostsCount: 5,
      baseUrl,
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
  const { siteKey, config } = req.body

  if (!siteKey || !config) {
    res.status(400).json({ error: 'siteKey and config are required' })
    return
  }

  const site = await prisma.site.findFirst({
    where: { siteKey, userId: user.id }
  })
  if (!site) {
    res.status(404).json({ error: 'Site not found' })
    return
  }

  try {
    const c = config as Record<string, unknown>
    const authorSettings = (c as { defaultAuthorIds?: string[]; postAuthorOverrides?: Record<string, string[]> })
    const cc = c.collectionConfig as object | undefined
    const pc = c.postConfig as object | undefined
    const collectionTemplateId = c.collectionTemplateId as string | null | undefined
    const postTemplateId = c.postTemplateId as string | null | undefined
    const data: SiteConfigData = {
      showDate: true,
      showAuthor: false,
      showReadingTime: false,
      authorSettings: {
        defaultAuthorIds: Array.isArray(authorSettings.defaultAuthorIds) ? authorSettings.defaultAuthorIds : [],
        postAuthorOverrides: (authorSettings.postAuthorOverrides && typeof authorSettings.postAuthorOverrides === 'object') ? authorSettings.postAuthorOverrides : {}
      },
      progressBar: { show: false, position: 'top', thickness: 6, color: '#5B4FE8' },
      tableOfContents: { show: false, position: 'left' },
      recentPostsSidebar: { show: false, position: 'left' },
      collectionConfig: cc && typeof cc === 'object' ? cc : undefined,
      postConfig: pc && typeof pc === 'object' ? pc : undefined,
      collectionTemplateId: collectionTemplateId ?? undefined,
      postTemplateId: postTemplateId ?? undefined,
    }
    await upsertSiteConfig(site.id, data)
    res.json({ success: true })
  } catch (error) {
    console.error('Failed to save config:', error)
    res.status(500).json({ error: 'Failed to save config' })
  }
})

export default router
