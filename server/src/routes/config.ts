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
    const fetchRes = await fetch(urlWithPassword)
    if (!fetchRes.ok) {
      const isProtected = fetchRes.status === 401 || fetchRes.status === 403
      const errMsg = isProtected
        ? 'Blog may be password protected. Add your blog password in the settings below.'
        : 'Failed to fetch blog from Squarespace'
      res.status(502).json({ error: errMsg })
      return
    }
    const json = await fetchRes.json()
    res.json(json)
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
    for (const a of authors) authorMap[a.id] = a.name

    // Derive renderer URL from request host so loader gets a URL it can fetch (avoids
    // localhost/loopback when API is reached via tunnel - Private Network Access blocks
    // public pages loading scripts from loopback)
    const protocol = req.get('x-forwarded-proto') || req.protocol || 'https'
    const host = req.get('x-forwarded-host') || req.get('host') || ''
    const baseUrl = host ? `${protocol}://${host}`.replace(/\/$/, '') : (process.env.APP_URL ?? 'http://localhost:3001').replace(/\/$/, '')
    const rendererUrl = `${baseUrl}/renderer.js`

    const ls = leftSidebar && typeof leftSidebar === 'object'
      ? { show: leftSidebar.show ?? false, modules: Array.isArray(leftSidebar.modules) ? leftSidebar.modules : [], width: Math.min(400, Math.max(160, leftSidebar.width ?? 240)) }
      : (tableOfContents.show && tableOfContents.position === 'left') || (recentPostsSidebar.show && recentPostsSidebar.position === 'left')
        ? { show: true, modules: [...(tableOfContents.show && tableOfContents.position === 'left' ? ['tableOfContents'] : []), ...(recentPostsSidebar.show && recentPostsSidebar.position === 'left' ? ['recentPosts'] : [])], width: 240 }
        : { show: false, modules: [], width: 240 }
    const rs = rightSidebar && typeof rightSidebar === 'object'
      ? { show: rightSidebar.show ?? false, modules: Array.isArray(rightSidebar.modules) ? rightSidebar.modules : [], width: Math.min(400, Math.max(160, rightSidebar.width ?? 240)) }
      : (tableOfContents.show && tableOfContents.position === 'right') || (recentPostsSidebar.show && recentPostsSidebar.position === 'right')
        ? { show: true, modules: [...(tableOfContents.show && tableOfContents.position === 'right' ? ['tableOfContents'] : []), ...(recentPostsSidebar.show && recentPostsSidebar.position === 'right' ? ['recentPosts'] : [])], width: 240 }
        : { show: false, modules: [], width: 240 }
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

    const configData = {
      siteKey,
      blogPath: site.blogPath ?? null,
      rendererUrl,
      showDate: siteConfig.showDate,
      showAuthor: siteConfig.showAuthor,
      showReadingTime: siteConfig.showReadingTime ?? false,
      defaultAuthorIds,
      postAuthorOverrides: authorSettings.postAuthorOverrides ?? {},
      authorMap,
      showProgressBar: progressBar.show ?? false,
      progressBarPosition: progressBar.position ?? 'top',
      progressBarThickness: Math.min(12, Math.max(2, progressBar.thickness ?? 6)),
      progressBarColor: (typeof progressBar.color === 'string' && /^#[0-9A-Fa-f]{6}$/.test(progressBar.color)) ? progressBar.color : '#5B4FE8',
      leftSidebar: ls,
      rightSidebar: rs,
      headerContent: hc,
      socialMediaLinks: sm,
      featuredImage,
      recentPostsCount: 5,
      baseUrl
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
    const layout = (c.layout as Record<string, unknown>) ?? {}
    const authorSettings = (c as { defaultAuthorIds?: string[]; postAuthorOverrides?: Record<string, string[]> })
    const ls = c.leftSidebar as { show?: boolean; modules?: string[]; width?: number } | undefined
    const rs = c.rightSidebar as { show?: boolean; modules?: string[]; width?: number } | undefined
    const hc = c.headerContent as { show?: boolean; modules?: string[]; height?: number } | undefined
    const sm = c.socialMediaLinks as { show?: boolean; platforms?: string[] } | undefined
    const fi = c.featuredImage as {
      show?: boolean; layoutMode?: string; imageWidthPercent?: number; aspectBehavior?: string; aspectRatio?: string;
      roundedCorners?: string; shadow?: boolean; showCaption?: boolean; verticalSpacing?: string;
    } | undefined
    const data: SiteConfigData = {
      showDate: (c.showDate ?? layout.showDate ?? true) as boolean,
      showAuthor: (c.showAuthor ?? layout.showAuthor ?? false) as boolean,
      showReadingTime: (c.showReadingTime ?? false) as boolean,
      authorSettings: {
        defaultAuthorIds: Array.isArray(authorSettings.defaultAuthorIds) ? authorSettings.defaultAuthorIds : [],
        postAuthorOverrides: (authorSettings.postAuthorOverrides && typeof authorSettings.postAuthorOverrides === 'object') ? authorSettings.postAuthorOverrides : {}
      },
      progressBar: {
        show: (c.showProgressBar ?? false) as boolean,
        position: ((c as { progressBarPosition?: string | null }).progressBarPosition ?? 'top') as string | null,
        thickness: Math.min(12, Math.max(2, Number((c as { progressBarThickness?: number }).progressBarThickness) || 6)),
        color: (typeof (c as { progressBarColor?: string }).progressBarColor === 'string' && /^#[0-9A-Fa-f]{6}$/.test((c as { progressBarColor: string }).progressBarColor))
          ? (c as { progressBarColor: string }).progressBarColor
          : '#5B4FE8'
      },
      tableOfContents: {
        show: (c.showTableOfContents ?? false) as boolean,
        position: (c.tableOfContentsPosition ?? 'left') as string
      },
      recentPostsSidebar: {
        show: (c.showRecentPostsSidebar ?? false) as boolean,
        position: (c.sidebarPosition ?? 'left') as string
      },
      leftSidebar: ls && typeof ls === 'object' ? { show: ls.show ?? false, modules: Array.isArray(ls.modules) ? ls.modules : [], width: Math.min(400, Math.max(160, ls.width ?? 240)) } : undefined,
      rightSidebar: rs && typeof rs === 'object' ? { show: rs.show ?? false, modules: Array.isArray(rs.modules) ? rs.modules : [], width: Math.min(400, Math.max(160, rs.width ?? 240)) } : undefined,
      headerContent: hc && typeof hc === 'object' ? { show: hc.show ?? false, modules: Array.isArray(hc.modules) ? hc.modules : [], height: Math.min(120, Math.max(32, Number(hc.height) || 48)) } : undefined,
      socialMediaLinks: sm && typeof sm === 'object' ? { show: sm.show ?? false, platforms: Array.isArray(sm.platforms) ? sm.platforms : [] } : undefined,
      featuredImage: fi && typeof fi === 'object' ? {
        show: fi.show ?? true,
        layoutMode: (fi.layoutMode === 'fullBleed' ? 'fullBleed' : fi.layoutMode === 'rightJustified' ? 'rightJustified' : 'leftJustified') as 'fullBleed' | 'leftJustified' | 'rightJustified',
        imageWidthPercent: Math.min(60, Math.max(25, Number(fi.imageWidthPercent) || 40)),
        aspectBehavior: (fi.aspectBehavior === 'cropped' ? 'cropped' : 'original') as 'original' | 'cropped',
        aspectRatio: (fi.aspectRatio === '3:2' ? '3:2' : fi.aspectRatio === '1:1' ? '1:1' : '16:9') as '16:9' | '3:2' | '1:1',
        roundedCorners: (fi.roundedCorners === 'small' ? 'small' : fi.roundedCorners === 'large' ? 'large' : 'off') as 'off' | 'small' | 'large',
        shadow: Boolean(fi.shadow),
        showCaption: Boolean(fi.showCaption ?? true),
        verticalSpacing: (fi.verticalSpacing === 'tight' ? 'tight' : fi.verticalSpacing === 'spacious' ? 'spacious' : 'normal') as 'tight' | 'normal' | 'spacious',
      } : undefined
    }
    await upsertSiteConfig(site.id, data)
    res.json({ success: true })
  } catch (error) {
    console.error('Failed to save config:', error)
    res.status(500).json({ error: 'Failed to save config' })
  }
})

export default router
