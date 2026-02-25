import { Router, Request, Response } from 'express'
import prisma from '../db/index.js'
import { requireSession, SessionUser } from '../middleware/session.js'
import { randomBytes } from 'crypto'

const router = Router()

function extractBlogPath(url: string): string | null {
  try {
    const parsed = new URL(url.trim())
    const path = parsed.pathname.replace(/\/$/, '') || '/'
    return path
  } catch {
    return null
  }
}

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
        url: s.url,
        blogPath: s.blogPath,
        hasBlogPassword: Boolean(s.blogPassword),
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
  const { name, url } = req.body ?? {}

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
    const siteUrl = typeof url === 'string' && url.trim() ? url.trim() : null
    const blogPath = siteUrl ? extractBlogPath(siteUrl) : null

    const site = await prisma.site.create({
      data: {
        userId: user.id,
        siteKey,
        name: siteName,
        url: siteUrl,
        blogPath,
        status: 'active',
        channel: 'stable'
      }
    })

    await prisma.siteConfig.create({
      data: {
        siteId: site.id,
        version: 1,
        showDate: true,
        showAuthor: false,
        progressBar: { show: false, position: null },
        tableOfContents: { show: false, position: null },
        recentPostsSidebar: { show: false, position: null },
        isActive: true
      }
    })

    res.status(201).json({
      id: site.id,
      siteKey: site.siteKey,
      name: site.name,
      url: site.url,
      blogPath: site.blogPath,
      status: site.status,
      createdAt: site.createdAt
    })
  } catch (err) {
    console.error('Create site error:', err)
    res.status(500).json({ error: 'Failed to create site' })
  }
})

// PATCH /api/dashboard/sites/by-key/:siteKey - Update site by siteKey (e.g. blog password)
router.patch('/sites/by-key/:siteKey', requireSession, async (req: Request, res: Response) => {
  const { user } = req as Request & { user: SessionUser }
  const siteKey = Array.isArray(req.params.siteKey) ? req.params.siteKey[0] : req.params.siteKey ?? ''
  const { blogPassword } = req.body ?? {}

  if (!siteKey) {
    res.status(400).json({ error: 'Site key required' })
    return
  }

  try {
    const site = await prisma.site.findFirst({
      where: { siteKey, userId: user.id }
    })

    if (!site) {
      res.status(404).json({ error: 'Site not found' })
      return
    }

    const updates: { blogPassword?: string | null } = {}
    if ('blogPassword' in req.body) {
      updates.blogPassword = typeof blogPassword === 'string' && blogPassword.trim() ? blogPassword.trim() : null
    }

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: 'No valid updates provided' })
      return
    }

    await prisma.site.update({
      where: { id: site.id },
      data: updates
    })

    const updated = await prisma.site.findUnique({
      where: { id: site.id }
    })

    res.json({
      id: updated!.id,
      siteKey: updated!.siteKey,
      name: updated!.name,
      url: updated!.url,
      blogPath: updated!.blogPath,
      hasBlogPassword: Boolean(updated!.blogPassword),
      status: updated!.status,
      createdAt: updated!.createdAt
    })
  } catch (err) {
    console.error('Update site error:', err)
    res.status(500).json({ error: 'Failed to update site' })
  }
})

// PATCH /api/dashboard/sites/:id - Update site by id (e.g. blog password)
router.patch('/sites/:id', requireSession, async (req: Request, res: Response) => {
  const { user } = req as Request & { user: SessionUser }
  const siteId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id ?? ''
  const { blogPassword } = req.body ?? {}

  if (!siteId) {
    res.status(400).json({ error: 'Site ID required' })
    return
  }

  try {
    const site = await prisma.site.findFirst({
      where: { id: siteId, userId: user.id }
    })

    if (!site) {
      res.status(404).json({ error: 'Site not found' })
      return
    }

    const updates: { blogPassword?: string | null } = {}
    if ('blogPassword' in req.body) {
      updates.blogPassword = typeof blogPassword === 'string' && blogPassword.trim() ? blogPassword.trim() : null
    }

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: 'No valid updates provided' })
      return
    }

    await prisma.site.update({
      where: { id: siteId },
      data: updates
    })

    const updated = await prisma.site.findUnique({
      where: { id: siteId }
    })

    res.json({
      id: updated!.id,
      siteKey: updated!.siteKey,
      name: updated!.name,
      url: updated!.url,
      blogPath: updated!.blogPath,
      hasBlogPassword: Boolean(updated!.blogPassword),
      status: updated!.status,
      createdAt: updated!.createdAt
    })
  } catch (err) {
    console.error('Update site error:', err)
    res.status(500).json({ error: 'Failed to update site' })
  }
})

// DELETE /api/dashboard/sites/:id - Delete site
router.delete('/sites/:id', requireSession, async (req: Request, res: Response) => {
  const { user } = req as Request & { user: SessionUser }
  const siteId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id ?? ''

  if (!siteId) {
    res.status(400).json({ error: 'Site ID required' })
    return
  }

  try {
    const site = await prisma.site.findFirst({
      where: { id: siteId, userId: user.id }
    })

    if (!site) {
      res.status(404).json({ error: 'Site not found' })
      return
    }

    await prisma.site.delete({
      where: { id: siteId }
    })

    res.status(204).send()
  } catch (err) {
    console.error('Delete site error:', err)
    res.status(500).json({ error: 'Failed to delete site' })
  }
})

export default router
