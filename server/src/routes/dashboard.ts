import { Router, Request, Response } from 'express'
import Stripe from 'stripe'
import prisma from '../db/index.js'
import { requireSession, SessionUser } from '../middleware/session.js'
import dashboardCommentSettingsRoutes from './dashboard-comment-settings.js'
import dashboardCommentsRoutes from './dashboard-comments.js'
import { getPlanDisplayName } from '../lib/planLabels.js'
import {
  formatPricePerMo,
  getStripePriceDisplayForPriceId,
  loadPublicPlanPrices
} from '../lib/stripePlanPrices.js'
import { DEFAULT_PLAN_KEY, normalizePlanKey } from '../lib/planKeys.js'
import { getAppUrl } from '../lib/url.js'
import { getStripeEnvironment } from '../lib/stripeEnvironment.js'
import { randomBytes } from 'crypto'
import { resolveDefaultCollectionTemplate, resolveDefaultPostTemplate } from './templates.js'

const router = Router()
const PAYWALL_MODES = ['auto', 'force_logged_out', 'force_logged_in'] as const
type PaywallMode = (typeof PAYWALL_MODES)[number]
type PaywallDetectionState = 'unknown' | 'detected_paywalled' | 'detected_unpaywalled'

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set')
  return new Stripe(key)
}

/**
 * Normalize and parse a blog URL. Handles inputs without scheme (e.g. "example.com/blog").
 * Returns normalized full URL and blog path, or null if invalid.
 */
function parseBlogUrl(input: string): { url: string; blogPath: string } | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  let toParse = trimmed
  if (!/^https?:\/\//i.test(toParse)) {
    toParse = 'https://' + toParse
  }
  try {
    const parsed = new URL(toParse)
    const path = parsed.pathname.replace(/\/+$/, '') || '/'
    const normalizedUrl = parsed.origin + path
    return { url: normalizedUrl, blogPath: path }
  } catch {
    return null
  }
}

/** Normalize visitor subscribe / pricing page URL for paywall CTAs (https if missing, max 2048). */
function normalizeSubscribeUrlInput(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const t = raw.trim()
  if (!t) return null
  let toParse = t
  if (!/^https?:\/\//i.test(toParse)) {
    toParse = 'https://' + toParse
  }
  try {
    const u = new URL(toParse)
    if (!u.hostname) return null
    return u.href.length > 2048 ? u.href.slice(0, 2048) : u.href
  } catch {
    return null
  }
}

function paywallSettingsJson(s: {
  subscribeUrl: string | null
  footerDescription: string | null
  eyebrowText: string | null
  headlineText: string | null
  featureItems: string[]
}) {
  return {
    subscribeUrl: s.subscribeUrl,
    footerDescription: s.footerDescription,
    eyebrowText: s.eyebrowText,
    headlineText: s.headlineText,
    featureItems: Array.isArray(s.featureItems) ? s.featureItems : []
  }
}

/**
 * Build the blog JSON fetch URL from site url and blogPath.
 */
function buildBlogJsonUrl(url: string, blogPath: string | null): string {
  const parsed = new URL(url)
  const hasPath = parsed.pathname && parsed.pathname !== '/'
  const base = url.replace(/\/+$/, '')
  return hasPath ? base + '?format=json' : parsed.origin + (blogPath || '/blog') + '?format=json'
}

/**
 * Verify a blog URL is reachable by fetching its `?format=json` endpoint.
 * Returns whether the blog was successfully reached and parsed.
 */
async function verifyBlogUrl(blogJsonUrl: string): Promise<boolean> {
  try {
    const res = await fetch(blogJsonUrl, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return false
    const json = await res.json()
    return Array.isArray(json?.items) || (json?.collection && Array.isArray(json.collection?.items))
  } catch {
    return false
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

router.use('/settings/comments', dashboardCommentSettingsRoutes)
router.use('/comments', dashboardCommentsRoutes)

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
            where: { status: 'active', deletedAt: null },
            orderBy: { createdAt: 'desc' },
            include: { sitePaywallSettings: true }
          }
        }
      }),
      prisma.site.count({ where: { userId: user.id, status: 'active', deletedAt: null } })
    ])

    if (!userWithRelations) {
      res.status(404).json({ error: 'User not found' })
      return
    }

    const subscription = userWithRelations.subscriptions[0] ?? null
    const maxSites = subscription?.maxSites ?? 1 // default 1 site for users without subscription

    const stripeEnv = getStripeEnvironment()
    const planRecord =
      subscription?.stripePriceId
        ? await prisma.plan.findFirst({
            where: {
              stripePriceId: subscription.stripePriceId,
              stripeEnvironment: stripeEnv
            }
          })
        : null
    const cadence = planRecord?.cadence ?? 'monthly'

    let priceDisplay = '—'
    if (subscription) {
      try {
        if (subscription.stripePriceId) {
          priceDisplay = await getStripePriceDisplayForPriceId(subscription.stripePriceId)
        } else {
          const pub = await loadPublicPlanPrices()
          const tier =
            pub.plans[normalizePlanKey(subscription.plan)] ?? pub.plans[DEFAULT_PLAN_KEY]
          const perMonth = cadence === 'annual' ? tier.annual.perMonth : tier.monthly.perMonth
          priceDisplay = formatPricePerMo(perMonth, pub.currency)
        }
      } catch (err) {
        console.error('Subscription price display error:', err)
        priceDisplay = '—'
      }
    }

    res.json({
      user: {
        id: userWithRelations.id,
        email: userWithRelations.email,
        name: userWithRelations.name,
        createdAt: userWithRelations.createdAt
      },
      subscription: subscription
        ? {
            plan: subscription.plan,
            planDisplay: getPlanDisplayName(subscription.plan),
            cadence,
            priceDisplay,
            status: subscription.status,
            maxSites: subscription.maxSites,
            currentPeriodEnd: subscription.currentPeriodEnd,
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd
          }
        : null,
      sites: userWithRelations.sites.map((s) => ({
        id: s.id,
        siteKey: s.siteKey,
        name: s.name,
        url: s.url,
        blogPath: s.blogPath,
        hasBlogPassword: Boolean(s.blogPassword),
        paywallMode: s.paywallMode,
        paywallDetectionState: s.paywallDetectionState,
        paywallDetectionSource: s.paywallDetectionSource,
        status: s.status,
        verificationStatus: s.verificationStatus,
        createdAt: s.createdAt,
        paywallSettings: s.sitePaywallSettings
          ? paywallSettingsJson(s.sitePaywallSettings)
          : null
      })),
      canCreateSite: maxSites === null || siteCount < maxSites
    })
  } catch (err) {
    console.error('Dashboard me error:', err)
    res.status(500).json({ error: 'Failed to load dashboard' })
  }
})

// PATCH /api/dashboard/me - Update user profile
router.patch('/me', requireSession, async (req: Request, res: Response) => {
  const { user } = req as Request & { user: SessionUser }
  const { name } = req.body ?? {}

  try {
    const updateData: { name?: string | null } = {}
    if (name !== undefined) {
      updateData.name = typeof name === 'string' ? (name.trim() || null) : null
    }
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: updateData
    })
    res.json({
      id: updated.id,
      email: updated.email,
      name: updated.name,
      createdAt: updated.createdAt
    })
  } catch (err) {
    console.error('Dashboard me patch error:', err)
    res.status(500).json({ error: 'Failed to update profile' })
  }
})

// POST /api/dashboard/subscription/cancel - Cancel subscription at period end
router.post('/subscription/cancel', requireSession, async (req: Request, res: Response) => {
  const { user } = req as Request & { user: SessionUser }

  try {
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId: user.id,
        status: { in: ['trialing', 'active'] }
      },
      orderBy: { createdAt: 'desc' }
    })

    if (!subscription?.stripeSubscriptionId) {
      res.status(404).json({ error: 'No active subscription found' })
      return
    }

    const stripe = getStripe()
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: true
    })

    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { cancelAtPeriodEnd: true }
    })

    res.json({
      success: true,
      message: 'Your subscription will cancel at the end of your billing period',
      currentPeriodEnd: subscription.currentPeriodEnd
    })
  } catch (err) {
    console.error('Subscription cancel error:', err)
    const message = err instanceof Error ? err.message : 'Failed to cancel subscription'
    res.status(500).json({ error: message })
  }
})

// POST /api/dashboard/subscription/resume - Undo scheduled cancellation
router.post('/subscription/resume', requireSession, async (req: Request, res: Response) => {
  const { user } = req as Request & { user: SessionUser }

  try {
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId: user.id,
        status: { in: ['trialing', 'active'] },
        cancelAtPeriodEnd: true
      },
      orderBy: { createdAt: 'desc' }
    })

    if (!subscription?.stripeSubscriptionId) {
      res.status(404).json({ error: 'No scheduled cancellation found' })
      return
    }

    const stripe = getStripe()
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: false
    })

    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { cancelAtPeriodEnd: false }
    })

    res.json({
      success: true,
      message: 'Your subscription will renew on your next billing date',
      currentPeriodEnd: subscription.currentPeriodEnd
    })
  } catch (err) {
    console.error('Subscription resume error:', err)
    const message = err instanceof Error ? err.message : 'Failed to restore subscription'
    res.status(500).json({ error: message })
  }
})

// POST /api/dashboard/subscription/portal - Create Stripe Customer Portal session
router.post('/subscription/portal', requireSession, async (req: Request, res: Response) => {
  const { user } = req as Request & { user: SessionUser }

  try {
    const subscription = await prisma.subscription.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' }
    })

    let stripeCustomerId: string | null = subscription?.stripeCustomerId ?? null
    if (!stripeCustomerId) {
      const u = await prisma.user.findUnique({
        where: { id: user.id },
        select: { stripeCustomerId: true }
      })
      stripeCustomerId = u?.stripeCustomerId ?? null
    }
    if (!stripeCustomerId) {
      res.status(404).json({ error: 'No Stripe customer found. Subscribe to a plan first.' })
      return
    }

    const stripe = getStripe()
    const appUrl = getAppUrl()
    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${appUrl}/dashboard/account`
    })

    res.json({ url: session.url })
  } catch (err) {
    console.error('Portal session error:', err)
    const message = err instanceof Error ? err.message : 'Failed to create portal session'
    res.status(500).json({ error: message })
  }
})

// POST /api/dashboard/sites - Create new site
router.post('/sites', requireSession, async (req: Request, res: Response) => {
  const { user } = req as Request & { user: SessionUser }
  const { name, url, paywallDetectionState: rawPaywallState, subscribeUrl: rawSubscribeTop } = req.body ?? {}
  const rawSubscribeFromNested =
    req.body &&
    typeof req.body === 'object' &&
    'paywallSettings' in req.body &&
    req.body.paywallSettings !== null &&
    typeof (req.body as { paywallSettings?: unknown }).paywallSettings === 'object'
      ? (req.body as { paywallSettings: { subscribeUrl?: unknown } }).paywallSettings.subscribeUrl
      : undefined
  const rawSubscribeForCreate = rawSubscribeTop !== undefined ? rawSubscribeTop : rawSubscribeFromNested

  try {
    const [subscription, siteCount] = await Promise.all([
      prisma.subscription.findFirst({
        where: { userId: user.id, status: { in: ['trialing', 'active'] } },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.site.count({ where: { userId: user.id, status: 'active', deletedAt: null } })
    ])

    const maxSites = subscription?.maxSites ?? 1
    if (maxSites !== null && siteCount >= maxSites) {
      res.status(403).json({ error: 'Site limit reached for your plan' })
      return
    }

    const siteName = typeof name === 'string' && name.trim() ? name.trim() : null
    const siteUrlInput = typeof url === 'string' && url.trim() ? url.trim() : null
    const parsed = siteUrlInput ? parseBlogUrl(siteUrlInput) : null
    if (!parsed) {
      res.status(400).json({ error: 'Please enter a valid blog URL (e.g. example.com/blog or https://example.com/blog)' })
      return
    }
    const { url: siteUrl, blogPath } = parsed

    const activeSameUrl = await prisma.site.findFirst({
      where: {
        userId: user.id,
        url: siteUrl,
        deletedAt: null
      },
      include: { sitePaywallSettings: true }
    })
    if (activeSameUrl) {
      const pw = activeSameUrl.sitePaywallSettings
      res.status(409).json({
        error: 'duplicate_blog_url',
        message:
          'You already have an active BetterBlog site for this blog URL. Open that site in the list below to keep customizing. Two active sites cannot use the same Squarespace blog URL.',
        existingSite: {
          id: activeSameUrl.id,
          siteKey: activeSameUrl.siteKey,
          name: activeSameUrl.name,
          url: activeSameUrl.url,
          blogPath: activeSameUrl.blogPath,
          paywallMode: activeSameUrl.paywallMode,
          paywallDetectionState: activeSameUrl.paywallDetectionState,
          paywallDetectionSource: activeSameUrl.paywallDetectionSource,
          status: activeSameUrl.status,
          verificationStatus: activeSameUrl.verificationStatus,
          createdAt: activeSameUrl.createdAt,
          paywallSettings: pw ? paywallSettingsJson(pw) : null
        }
      })
      return
    }

    const blogJsonUrl = buildBlogJsonUrl(siteUrl, blogPath)
    const verified = await verifyBlogUrl(blogJsonUrl)
    if (!verified) {
      res.status(400).json({
        error: 'blog_url_unreachable',
        message:
          "We couldn't reach your blog at the URL you provided. Make sure you entered the full URL (e.g. https://yoursite.squarespace.com/blog) and try again."
      })
      return
    }

    const purgeDeletedSiteIdRaw =
      req.body &&
      typeof req.body === 'object' &&
      typeof (req.body as { purgeDeletedSiteId?: unknown }).purgeDeletedSiteId === 'string'
        ? (req.body as { purgeDeletedSiteId: string }).purgeDeletedSiteId.trim()
        : ''
    if (purgeDeletedSiteIdRaw) {
      const toPurge = await prisma.site.findFirst({
        where: {
          id: purgeDeletedSiteIdRaw,
          userId: user.id,
          deletedAt: { not: null },
          url: siteUrl
        }
      })
      if (!toPurge) {
        res.status(400).json({
          error: 'Invalid purgeDeletedSiteId',
          message: 'The removed blog could not be cleared for a fresh install. Refresh and try again.'
        })
        return
      }
      await prisma.site.delete({ where: { id: toPurge.id } })
    }

    const deletedSameUrl = await prisma.site.findFirst({
      where: {
        userId: user.id,
        url: siteUrl,
        deletedAt: { not: null }
      },
      orderBy: { deletedAt: 'desc' },
      include: { sitePaywallSettings: true }
    })
    if (deletedSameUrl) {
      const pw = deletedSameUrl.sitePaywallSettings
      res.status(409).json({
        error: 'deleted_blog_url_match',
        message:
          'You previously removed a BetterBlog site with this same blog URL. You can restore it (all layout and settings history returns) or permanently clear it and add a brand-new site.',
        existingSite: {
          id: deletedSameUrl.id,
          siteKey: deletedSameUrl.siteKey,
          name: deletedSameUrl.name,
          url: deletedSameUrl.url,
          blogPath: deletedSameUrl.blogPath,
          paywallMode: deletedSameUrl.paywallMode,
          paywallDetectionState: deletedSameUrl.paywallDetectionState,
          paywallDetectionSource: deletedSameUrl.paywallDetectionSource,
          status: deletedSameUrl.status,
          verificationStatus: deletedSameUrl.verificationStatus,
          createdAt: deletedSameUrl.createdAt,
          deletedAt: deletedSameUrl.deletedAt ? deletedSameUrl.deletedAt.toISOString() : null,
          paywallSettings: pw ? paywallSettingsJson(pw) : null
        }
      })
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

    const VALID_PAYWALL_STATES: PaywallDetectionState[] = ['unknown', 'detected_paywalled', 'detected_unpaywalled']
    const userPaywallState: PaywallDetectionState =
      VALID_PAYWALL_STATES.includes(rawPaywallState) ? rawPaywallState : 'unknown'

    const subscribeNormalized = normalizeSubscribeUrlInput(rawSubscribeForCreate)

    const updatedSite = await prisma.site.create({
      data: {
        userId: user.id,
        siteKey,
        name: siteName,
        url: siteUrl,
        blogPath,
        status: 'active',
        verificationStatus: 'verified',
        paywallMode: 'auto',
        paywallDetectionState: userPaywallState,
        paywallDetectionSource: userPaywallState !== 'unknown' ? 'manual' : null,
        channel: 'stable'
      }
    })

    const [defaultPostTemplate, defaultCollectionTemplate] = await Promise.all([
      resolveDefaultPostTemplate(),
      resolveDefaultCollectionTemplate()
    ])
    const collectionCfg = defaultCollectionTemplate?.collectionConfig
    const asObject = (value: unknown): object | undefined =>
      value && typeof value === 'object' && !Array.isArray(value) ? (value as object) : undefined
    const asBool = (value: unknown, fallback: boolean): boolean =>
      typeof value === 'boolean' ? value : fallback
    const templateProgressBar =
      defaultPostTemplate?.postConfig?.progressBar &&
      typeof defaultPostTemplate.postConfig.progressBar === 'object' &&
      !Array.isArray(defaultPostTemplate.postConfig.progressBar)
        ? (defaultPostTemplate.postConfig.progressBar as { show?: boolean })
        : null
    await prisma.siteConfig.create({
      data: {
        siteId: updatedSite.id,
        version: 1,
        showDate: asBool(collectionCfg?.showDate, true),
        showAuthor: asBool(collectionCfg?.showAuthor, false),
        showReadingTime: asBool(collectionCfg?.showReadingTime, false),
        progressBar: {
          show: Boolean(templateProgressBar?.show ?? false),
          position: 'top',
          thickness: 6,
          color: '#5B4FE8'
        },
        tableOfContents: { show: false, position: null },
        recentPostsSidebar: { show: false, position: null },
        leftSidebar: asObject(collectionCfg?.leftSidebar) ?? { show: false, modules: [], width: 240 },
        rightSidebar: asObject(collectionCfg?.rightSidebar) ?? { show: false, modules: [], width: 240 },
        headerContent: asObject(collectionCfg?.headerContent) ?? { show: false, modules: [], height: 48 },
        socialMediaLinks: asObject(collectionCfg?.socialMediaLinks) ?? { show: false, platforms: [] },
        ...(asObject(collectionCfg?.featuredImage)
          ? { featuredImage: asObject(collectionCfg?.featuredImage) }
          : {}),
        ...(defaultCollectionTemplate
          ? {
              collectionConfig: defaultCollectionTemplate.collectionConfig as object,
              collectionTemplateId: defaultCollectionTemplate.id,
            }
          : {}),
        ...(defaultPostTemplate
          ? {
              postConfig: defaultPostTemplate.postConfig as object,
              postTemplateId: defaultPostTemplate.id,
            }
          : {}),
        isActive: true
      }
    })

    let createdPaywall: ReturnType<typeof paywallSettingsJson> | null =
      null
    if (userPaywallState === 'detected_paywalled' && subscribeNormalized) {
      await prisma.sitePaywallSettings.create({
        data: {
          siteId: updatedSite.id,
          subscribeUrl: subscribeNormalized,
          footerDescription: null,
          eyebrowText: null,
          headlineText: null,
          featureItems: []
        }
      })
      createdPaywall = paywallSettingsJson({
        subscribeUrl: subscribeNormalized,
        footerDescription: null,
        eyebrowText: null,
        headlineText: null,
        featureItems: []
      })
    }

    res.status(201).json({
      id: updatedSite.id,
      siteKey: updatedSite.siteKey,
      name: updatedSite.name,
      url: updatedSite.url,
      blogPath: updatedSite.blogPath,
      paywallMode: updatedSite.paywallMode,
      paywallDetectionState: updatedSite.paywallDetectionState,
      paywallDetectionSource: updatedSite.paywallDetectionSource,
      status: updatedSite.status,
      verificationStatus: updatedSite.verificationStatus,
      createdAt: updatedSite.createdAt,
      paywallSettings: createdPaywall
    })
  } catch (err) {
    console.error('Create site error:', err)
    res.status(500).json({ error: 'Failed to create site' })
  }
})

// POST /api/dashboard/sites/:id/restore - Bring back a soft-deleted site (same siteKey + config history)
router.post('/sites/:id/restore', requireSession, async (req: Request, res: Response) => {
  const { user } = req as Request & { user: SessionUser }
  const siteId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id ?? ''

  if (!siteId) {
    res.status(400).json({ error: 'Site ID required' })
    return
  }

  try {
    const target = await prisma.site.findFirst({
      where: { id: siteId, userId: user.id, deletedAt: { not: null } },
      include: { sitePaywallSettings: true }
    })
    if (!target) {
      res.status(404).json({ error: 'No removed site found to restore' })
      return
    }

    const [subscription, activeCount] = await Promise.all([
      prisma.subscription.findFirst({
        where: { userId: user.id, status: { in: ['trialing', 'active'] } },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.site.count({ where: { userId: user.id, status: 'active', deletedAt: null } })
    ])
    const maxSites = subscription?.maxSites ?? 1
    if (maxSites !== null && activeCount >= maxSites) {
      res.status(403).json({ error: 'Site limit reached for your plan' })
      return
    }

    const bodyName =
      req.body && typeof (req.body as { name?: unknown }).name === 'string'
        ? (req.body as { name: string }).name.trim()
        : ''
    await prisma.site.update({
      where: { id: siteId },
      data: {
        deletedAt: null,
        ...(bodyName ? { name: bodyName } : {})
      }
    })

    const restored = await prisma.site.findUnique({
      where: { id: siteId },
      include: { sitePaywallSettings: true }
    })
    if (!restored) {
      res.status(500).json({ error: 'Failed to load restored site' })
      return
    }

    const pw = restored.sitePaywallSettings
    res.json({
      id: restored.id,
      siteKey: restored.siteKey,
      name: restored.name,
      url: restored.url,
      blogPath: restored.blogPath,
      paywallMode: restored.paywallMode,
      paywallDetectionState: restored.paywallDetectionState,
      paywallDetectionSource: restored.paywallDetectionSource,
      status: restored.status,
      verificationStatus: restored.verificationStatus,
      createdAt: restored.createdAt,
      paywallSettings: pw ? paywallSettingsJson(pw) : null
    })
  } catch (err) {
    console.error('Restore site error:', err)
    res.status(500).json({ error: 'Failed to restore site' })
  }
})

// PATCH /api/dashboard/sites/by-key/:siteKey - Update site by siteKey (e.g. blog password)
router.patch('/sites/by-key/:siteKey', requireSession, async (req: Request, res: Response) => {
  const { user } = req as Request & { user: SessionUser }
  const siteKey = Array.isArray(req.params.siteKey) ? req.params.siteKey[0] : req.params.siteKey ?? ''
  const { blogPassword, paywallMode, paywallDetectionState, name } = req.body ?? {}

  if (!siteKey) {
    res.status(400).json({ error: 'Site key required' })
    return
  }

  try {
    const site = await prisma.site.findFirst({
      where: { siteKey, userId: user.id, deletedAt: null },
      include: { sitePaywallSettings: true }
    })

    if (!site) {
      res.status(404).json({ error: 'Site not found' })
      return
    }

    let normalizedSubscribePatch: string | null | undefined
    if ('subscribeUrl' in req.body) {
      const su = (req.body as { subscribeUrl?: unknown }).subscribeUrl
      if (su !== null && typeof su !== 'string') {
        res.status(400).json({ error: 'subscribeUrl must be a string' })
        return
      }
      if (su === null || (typeof su === 'string' && !su.trim())) {
        normalizedSubscribePatch = null
      } else {
        normalizedSubscribePatch = normalizeSubscribeUrlInput(su)
        if (normalizedSubscribePatch === null) {
          res.status(400).json({
            error: 'Invalid signup page URL. Use a full address like https://yoursite.com/subscribe'
          })
          return
        }
      }
    }

    const updates: {
      name?: string | null
      blogPassword?: string | null
      paywallMode?: PaywallMode
      paywallDetectionState?: PaywallDetectionState
      paywallDetectionSource?: string | null
    } = {}
    if ('name' in req.body) {
      updates.name = typeof name === 'string' && name.trim() ? name.trim() : null
    }
    if ('blogPassword' in req.body) {
      updates.blogPassword = typeof blogPassword === 'string' && blogPassword.trim() ? blogPassword.trim() : null
    }
    if ('paywallMode' in req.body) {
      if (typeof paywallMode !== 'string' || !PAYWALL_MODES.includes(paywallMode as PaywallMode)) {
        res.status(400).json({ error: 'Invalid paywallMode' })
        return
      }
      updates.paywallMode = paywallMode as PaywallMode
      updates.paywallDetectionSource = 'manual'
    }
    if ('paywallDetectionState' in req.body) {
      if (paywallDetectionState !== 'unknown' && paywallDetectionState !== 'detected_paywalled' && paywallDetectionState !== 'detected_unpaywalled') {
        res.status(400).json({ error: 'Invalid paywallDetectionState' })
        return
      }
      updates.paywallDetectionState = paywallDetectionState as PaywallDetectionState
      updates.paywallDetectionSource = 'manual'
    }

    if (Object.keys(updates).length === 0 && normalizedSubscribePatch === undefined) {
      res.status(400).json({ error: 'No valid updates provided' })
      return
    }

    if (Object.keys(updates).length > 0) {
      await prisma.site.update({
        where: { id: site.id },
        data: updates
      })
    }

    const afterSite = await prisma.site.findUnique({
      where: { id: site.id },
      include: { sitePaywallSettings: true }
    })

    if (afterSite!.paywallDetectionState === 'detected_paywalled') {
      const existingPw = afterSite!.sitePaywallSettings
      const nextSubscribeUrl =
        normalizedSubscribePatch !== undefined
          ? normalizedSubscribePatch
          : existingPw?.subscribeUrl ?? null
      if (existingPw || normalizedSubscribePatch !== undefined) {
        await prisma.sitePaywallSettings.upsert({
          where: { siteId: site.id },
          create: { siteId: site.id, subscribeUrl: nextSubscribeUrl, featureItems: [] },
          update:
            normalizedSubscribePatch !== undefined ? { subscribeUrl: normalizedSubscribePatch } : {}
        })
      }
    }

    const updated = await prisma.site.findUnique({
      where: { id: site.id },
      include: { sitePaywallSettings: true }
    })

    res.json({
      id: updated!.id,
      siteKey: updated!.siteKey,
      name: updated!.name,
      url: updated!.url,
      blogPath: updated!.blogPath,
      hasBlogPassword: Boolean(updated!.blogPassword),
      paywallMode: updated!.paywallMode,
      paywallDetectionState: updated!.paywallDetectionState,
      paywallDetectionSource: updated!.paywallDetectionSource,
      status: updated!.status,
      verificationStatus: updated!.verificationStatus,
      createdAt: updated!.createdAt,
      paywallSettings: updated!.sitePaywallSettings
        ? paywallSettingsJson(updated!.sitePaywallSettings)
        : null
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
  const { blogPassword, paywallMode, paywallDetectionState, name } = req.body ?? {}

  if (!siteId) {
    res.status(400).json({ error: 'Site ID required' })
    return
  }

  try {
    const site = await prisma.site.findFirst({
      where: { id: siteId, userId: user.id, deletedAt: null }
    })

    if (!site) {
      res.status(404).json({ error: 'Site not found' })
      return
    }

    const updates: {
      name?: string | null
      blogPassword?: string | null
      paywallMode?: PaywallMode
      paywallDetectionState?: PaywallDetectionState
      paywallDetectionSource?: string | null
    } = {}
    if ('name' in req.body) {
      updates.name = typeof name === 'string' && name.trim() ? name.trim() : null
    }
    if ('blogPassword' in req.body) {
      updates.blogPassword = typeof blogPassword === 'string' && blogPassword.trim() ? blogPassword.trim() : null
    }
    if ('paywallMode' in req.body) {
      if (typeof paywallMode !== 'string' || !PAYWALL_MODES.includes(paywallMode as PaywallMode)) {
        res.status(400).json({ error: 'Invalid paywallMode' })
        return
      }
      updates.paywallMode = paywallMode as PaywallMode
      updates.paywallDetectionSource = 'manual'
    }
    if ('paywallDetectionState' in req.body) {
      if (paywallDetectionState !== 'unknown' && paywallDetectionState !== 'detected_paywalled' && paywallDetectionState !== 'detected_unpaywalled') {
        res.status(400).json({ error: 'Invalid paywallDetectionState' })
        return
      }
      updates.paywallDetectionState = paywallDetectionState as PaywallDetectionState
      updates.paywallDetectionSource = 'manual'
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
      paywallMode: updated!.paywallMode,
      paywallDetectionState: updated!.paywallDetectionState,
      paywallDetectionSource: updated!.paywallDetectionSource,
      status: updated!.status,
      verificationStatus: updated!.verificationStatus,
      createdAt: updated!.createdAt
    })
  } catch (err) {
    console.error('Update site error:', err)
    res.status(500).json({ error: 'Failed to update site' })
  }
})

// DELETE /api/dashboard/sites/:id - Soft-delete site (keeps row for optional restore / URL matching)
router.delete('/sites/:id', requireSession, async (req: Request, res: Response) => {
  const { user } = req as Request & { user: SessionUser }
  const siteId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id ?? ''

  if (!siteId) {
    res.status(400).json({ error: 'Site ID required' })
    return
  }

  try {
    const site = await prisma.site.findFirst({
      where: { id: siteId, userId: user.id, deletedAt: null }
    })

    if (!site) {
      res.status(404).json({ error: 'Site not found' })
      return
    }

    await prisma.site.update({
      where: { id: siteId },
      data: { deletedAt: new Date() }
    })

    res.status(204).send()
  } catch (err) {
    console.error('Delete site error:', err)
    res.status(500).json({ error: 'Failed to delete site' })
  }
})

export default router
