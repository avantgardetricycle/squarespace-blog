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
    const progressBar = (siteConfig.progressBar as { show?: boolean; position?: string | null }) ?? { show: false, position: null }
    const tableOfContents = (siteConfig.tableOfContents as { show?: boolean; position?: string | null }) ?? { show: false, position: null }
    const recentPostsSidebar = (siteConfig.recentPostsSidebar as { show?: boolean; position?: string | null }) ?? { show: false, position: null }

    const configData = {
      blogPath: site.blogPath ?? null,
      rendererUrl: `${(process.env.APP_URL ?? 'http://localhost:3001').replace(/\/$/, '')}/renderer.js`,
      showDate: siteConfig.showDate,
      showAuthor: siteConfig.showAuthor,
      showProgressBar: progressBar.show ?? false,
      progressBarPosition: progressBar.position ?? 'top',
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
    const data: SiteConfigData = {
      showDate: (c.showDate ?? layout.showDate ?? true) as boolean,
      showAuthor: (c.showAuthor ?? layout.showAuthor ?? false) as boolean,
      progressBar: {
        show: (c.showProgressBar ?? false) as boolean,
        position: ((c as { progressBarPosition?: string | null }).progressBarPosition ?? 'top') as string | null
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
