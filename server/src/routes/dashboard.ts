import { Router, Request, Response } from 'express'
import prisma from '../db/index.js'
import { requireSession, SessionUser } from '../middleware/session.js'
import { randomBytes } from 'crypto'

const router = Router()

function generateSiteKey(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let key = ''
  for (let i = 0; i < 16; i++) {
    key += chars[randomBytes(1)[0] % chars.length]
  }
  return key
}

// GET /api/dashboard/me - Current user, plan, sites
router.get('/me', requireSession, async (req: Request, res: Response) => {
  const { user } = req as Request & { user: SessionUser }

  try {
    const [userWithRelations, siteCount] = await Promise.all([
      prisma.user.findUnique({
        where: { id: user.id },
        include: {
          subscriptions: {
            where: { status: { in: ['trialing', 'active'] } },
            orderBy: { createdAt: 'desc' },
            take: 1
          },
          sites: {
            where: { status: 'active' },
            orderBy: { createdAt: 'desc' }
          }
        }
      }),
      prisma.site.count({ where: { userId: user.id, status: 'active' } })
    ])

    if (!userWithRelations) {
      res.status(404).json({ error: 'User not found' })
      return
    }

    const subscription = userWithRelations.subscriptions[0] ?? null
    const maxSites = subscription?.maxSites ?? 1 // default 1 site for users without subscription

    res.json({
      user: {
        id: userWithRelations.id,
        email: userWithRelations.email,
        createdAt: userWithRelations.createdAt
      },
      subscription: subscription
        ? {
            plan: subscription.plan,
            status: subscription.status,
            maxSites: subscription.maxSites,
            currentPeriodEnd: subscription.currentPeriodEnd
          }
        : null,
      sites: userWithRelations.sites.map((s) => ({
        id: s.id,
        siteKey: s.siteKey,
        name: s.name,
        status: s.status,
        createdAt: s.createdAt
      })),
      canCreateSite: maxSites === null || siteCount < maxSites
    })
  } catch (err) {
    console.error('Dashboard me error:', err)
    res.status(500).json({ error: 'Failed to load dashboard' })
  }
})

// POST /api/dashboard/sites - Create new site
router.post('/sites', requireSession, async (req: Request, res: Response) => {
  const { user } = req as Request & { user: SessionUser }
  const { name } = req.body ?? {}

  try {
    const [subscription, siteCount] = await Promise.all([
      prisma.subscription.findFirst({
        where: { userId: user.id, status: { in: ['trialing', 'active'] } },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.site.count({ where: { userId: user.id, status: 'active' } })
    ])

    const maxSites = subscription?.maxSites ?? 1
    if (maxSites !== null && siteCount >= maxSites) {
      res.status(403).json({ error: 'Site limit reached for your plan' })
      return
    }

    let siteKey: string
    let attempts = 0
    const maxAttempts = 10

    do {
      siteKey = generateSiteKey()
      const existing = await prisma.site.findUnique({ where: { siteKey } })
      if (!existing) break
      attempts++
    } while (attempts < maxAttempts)

    if (attempts >= maxAttempts) {
      res.status(500).json({ error: 'Failed to generate unique site key' })
      return
    }

    const siteName = typeof name === 'string' && name.trim() ? name.trim() : null

    const site = await prisma.site.create({
      data: {
        userId: user.id,
        siteKey,
        name: siteName,
        status: 'active',
        channel: 'stable'
      }
    })

    const defaultConfig = JSON.stringify({
      showAuthor: false,
      showDate: true,
      showTableOfContents: false,
      tableOfContentsPosition: 'left',
      showProgressBar: false,
      showRecentPostsSidebar: false,
      recentPostsCount: 5,
      sidebarPosition: 'left',
      rendererUrl: 'https://avantgardetricycle.github.io/squarespace-blog/renderer.js'
    })

    await prisma.siteConfig.create({
      data: {
        siteId: site.id,
        version: 1,
        configJson: defaultConfig,
        isActive: true
      }
    })

    res.status(201).json({
      id: site.id,
      siteKey: site.siteKey,
      name: site.name,
      status: site.status,
      createdAt: site.createdAt
    })
  } catch (err) {
    console.error('Create site error:', err)
    res.status(500).json({ error: 'Failed to create site' })
  }
})

export default router
