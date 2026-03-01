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

// GET /api/config/:siteKey - Public endpoint for loader.js
// Uses internal subscription record only (no Stripe API calls) - gated on status
router.get('/:siteKey', async (req: Request, res: Response) => {
  const siteKey = req.params.siteKey as string

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

    // Build author map (id -> name) for renderer
    const authorIds = new Set<string>(authorSettings.defaultAuthorIds ?? [])
    for (const ids of Object.values(authorSettings.postAuthorOverrides ?? {})) {
      for (const id of ids) authorIds.add(id)
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

    const configData = {
      blogPath: site.blogPath ?? null,
      rendererUrl,
      showDate: siteConfig.showDate,
      showAuthor: siteConfig.showAuthor,
      defaultAuthorIds: authorSettings.defaultAuthorIds ?? [],
      postAuthorOverrides: authorSettings.postAuthorOverrides ?? {},
      authorMap,
      showProgressBar: progressBar.show ?? false,
      progressBarPosition: progressBar.position ?? 'top',
      progressBarThickness: Math.min(12, Math.max(2, progressBar.thickness ?? 6)),
      progressBarColor: (typeof progressBar.color === 'string' && /^#[0-9A-Fa-f]{6}$/.test(progressBar.color)) ? progressBar.color : '#5B4FE8',
      showTableOfContents: tableOfContents.show ?? false,
      tableOfContentsPosition: tableOfContents.position ?? 'left',
      showRecentPostsSidebar: recentPostsSidebar.show ?? false,
      sidebarPosition: recentPostsSidebar.position ?? 'left',
      recentPostsCount: 5
    }

    res.json(configData)
  } catch {
    res.status(500).json({ error: 'Invalid config data' })
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
    const data: SiteConfigData = {
      showDate: (c.showDate ?? layout.showDate ?? true) as boolean,
      showAuthor: (c.showAuthor ?? layout.showAuthor ?? false) as boolean,
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
      }
    }
    await upsertSiteConfig(site.id, data)
    res.json({ success: true })
  } catch (error) {
    console.error('Failed to save config:', error)
    res.status(500).json({ error: 'Failed to save config' })
  }
})

export default router
