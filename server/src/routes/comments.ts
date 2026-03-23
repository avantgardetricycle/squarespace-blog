/**
 * Public comment API - reader-facing endpoints for viewing and submitting comments.
 * Mounted at /api/comments with permissive CORS (called from reader blogs on arbitrary domains).
 */
import { Router, Request, Response } from 'express'
import crypto from 'crypto'
import prisma from '../db/index.js'
import { decrypt } from '../lib/encryption.js'
import { signCommentActionToken } from '../lib/comment-action-token.js'
import { sendCommentNotificationEmail } from '../lib/email.js'
import { getAppUrl } from '../lib/url.js'

const router = Router()

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000 // 1 hour
const RATE_LIMIT_COMMENTS_PER_IP = 5
const MAX_DISPLAY_NAME = 100
const MAX_BODY = 5000

const commentRateMap = new Map<string, number[]>()

function cleanupCommentRateLimit(): void {
  const now = Date.now()
  const cutoff = now - RATE_LIMIT_WINDOW_MS
  for (const [key, timestamps] of commentRateMap.entries()) {
    const filtered = timestamps.filter((t) => t > cutoff)
    if (filtered.length === 0) {
      commentRateMap.delete(key)
    } else {
      commentRateMap.set(key, filtered)
    }
  }
}

function checkCommentRateLimit(siteId: string, ip: string): boolean {
  cleanupCommentRateLimit()
  const key = `site:${siteId}:ip:${ip}`
  const timestamps = commentRateMap.get(key) ?? []
  if (timestamps.length >= RATE_LIMIT_COMMENTS_PER_IP) return false
  timestamps.push(Date.now())
  commentRateMap.set(key, timestamps)
  return true
}

function getSiteToken(req: Request): string | null {
  const header = req.get('X-BetterBlog-Site-Token')
  if (typeof header === 'string' && header.trim()) return header.trim()
  const query = req.query as { siteKey?: string }
  if (typeof query?.siteKey === 'string' && query.siteKey.trim()) return query.siteKey.trim()
  const body = req.body as { siteKey?: string }
  if (typeof body?.siteKey === 'string' && body.siteKey.trim()) return body.siteKey.trim()
  return null
}

async function getSiteWithSubscription(siteToken: string) {
  const site = await prisma.site.findUnique({
    where: { siteKey: siteToken },
    include: {
      user: {
        include: {
          subscriptions: {
            where: { status: { in: ['trialing', 'active'] } },
            orderBy: { updatedAt: 'desc' },
            take: 1,
          },
        },
      },
      blogCommentSettings: true,
    },
  })
  if (!site || !site.user?.subscriptions?.[0]) return null
  return site
}

async function verifyHCaptcha(token: string): Promise<boolean> {
  const secret = process.env.HCAPTCHA_SECRET_KEY
  if (!secret) {
    console.warn('[comments] HCAPTCHA_SECRET_KEY not set, skipping verification')
    return true
  }
  try {
    const res = await fetch('https://api.hcaptcha.com/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret, response: token }),
    })
    const data = (await res.json()) as { success?: boolean }
    return data.success === true
  } catch (err) {
    console.error('[comments] hCaptcha verification error:', err)
    return false
  }
}

function fingerprintHash(ip: string, userAgent: string): string {
  return crypto.createHash('sha256').update(`${ip}:${userAgent}`).digest('hex')
}

// GET /api/comments?post_id=xxx&page=1&per_page=20
router.get('/', async (req: Request, res: Response) => {
  const siteToken = getSiteToken(req)
  if (!siteToken) {
    res.status(400).json({ error: 'Site token required (X-BetterBlog-Site-Token or siteKey in body)' })
    return
  }

  const site = await getSiteWithSubscription(siteToken)
  if (!site) {
    res.status(404).json({ error: 'Site not found or subscription required' })
    return
  }

  const settings = site.blogCommentSettings
  if (!settings?.commentsEnabled) {
    res.status(403).json({ error: 'Comments are disabled' })
    return
  }

  const postId = typeof req.query.post_id === 'string' ? req.query.post_id.trim() : null
  if (!postId) {
    res.status(400).json({ error: 'post_id is required' })
    return
  }

  const page = Math.max(1, parseInt(String(req.query.page || 1), 10))
  const perPage = Math.min(50, Math.max(1, parseInt(String(req.query.per_page || 20), 10)))

  const where = {
    siteId: site.id,
    postId,
    status: 'approved' as const,
    parentId: null,
  }

  const [comments, total] = await Promise.all([
    prisma.comment.findMany({
      where,
      orderBy:
        settings.sortOrder === 'oldest'
          ? { createdAt: 'asc' }
          : settings.sortOrder === 'most_liked'
            ? { commentLikes: { _count: 'desc' } }
            : { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
      include: {
        replies: {
          where: { status: 'approved' },
          include: { _count: { select: { commentLikes: true } } },
          orderBy: { createdAt: 'asc' },
        },
        _count: { select: { commentLikes: true } },
      },
    }),
    prisma.comment.count({ where }),
  ])

  const formatComment = (c: {
    id: string
    displayName: string
    verifiedSubscriber: boolean
    body: string
    createdAt: Date
    replies?: Array<{
      id: string
      displayName: string
      verifiedSubscriber: boolean
      body: string
      createdAt: Date
      _count: { commentLikes: number }
    }>
    _count: { commentLikes: number }
  }) => ({
    id: c.id,
    display_name: c.displayName,
    verified_subscriber: c.verifiedSubscriber,
    body: c.body,
    like_count: c._count.commentLikes,
    created_at: c.createdAt.toISOString(),
    replies: (c.replies ?? []).map((r) => ({
      id: r.id,
      display_name: r.displayName,
      verified_subscriber: r.verifiedSubscriber,
      body: r.body,
      like_count: r._count.commentLikes,
      created_at: r.createdAt.toISOString(),
    })),
  })

  res.json({
    comments: comments.map(formatComment),
    total,
    page,
  })
})

// POST /api/comments
router.post('/', async (req: Request, res: Response) => {
  const siteToken = getSiteToken(req)
  if (!siteToken) {
    res.status(400).json({ error: 'Site token required (X-BetterBlog-Site-Token or siteKey in body)' })
    return
  }

  const site = await getSiteWithSubscription(siteToken)
  if (!site) {
    res.status(404).json({ error: 'Site not found or subscription required' })
    return
  }

  const settings = site.blogCommentSettings
  if (!settings?.commentsEnabled) {
    res.status(403).json({ error: 'Comments are disabled' })
    return
  }

  const ip = (req.ip ?? req.socket?.remoteAddress ?? '') || 'unknown'
  const userAgent = req.get('user-agent') ?? ''

  if (!checkCommentRateLimit(site.id, ip)) {
    res.status(429).json({ error: 'Rate limit exceeded. Try again later.' })
    return
  }

  const body = req.body as {
    post_id?: string
    display_name?: string
    email?: string
    body?: string
    parent_id?: string | null
    hcaptcha_token?: string
    verification_cookie_token?: string
    post_title?: string
    post_published_at?: string
    post_url?: string
  }

  const postId = typeof body.post_id === 'string' ? body.post_id.trim() : null
  if (!postId) {
    res.status(400).json({ error: 'post_id is required' })
    return
  }

  const hcaptchaSecret = process.env.HCAPTCHA_SECRET_KEY
  const hcaptchaToken = typeof body.hcaptcha_token === 'string' ? body.hcaptcha_token.trim() : null
  if (hcaptchaSecret && !hcaptchaToken) {
    res.status(400).json({ error: 'hcaptcha_token is required' })
    return
  }

  const hcaptchaValid = hcaptchaSecret ? await verifyHCaptcha(hcaptchaToken!) : true
  if (!hcaptchaValid) {
    res.status(400).json({ error: 'Captcha verification failed' })
    return
  }

  const displayNameRaw = typeof body.display_name === 'string' ? body.display_name.trim() : ''
  const commentBody = typeof body.body === 'string' ? body.body.trim() : ''
  if (!displayNameRaw || displayNameRaw.length > MAX_DISPLAY_NAME) {
    res.status(400).json({ error: 'display_name is required (max 100 characters)' })
    return
  }
  if (!commentBody || commentBody.length > MAX_BODY) {
    res.status(400).json({ error: 'body is required (max 5000 characters)' })
    return
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() || null : null
  const parentId = typeof body.parent_id === 'string' && body.parent_id ? body.parent_id : null

  // Upsert cached post for auto-close check
  const postTitle = typeof body.post_title === 'string' ? body.post_title.trim() : 'Untitled'
  const postPublishedAt = body.post_published_at ? new Date(body.post_published_at) : new Date()
  const postUrl = typeof body.post_url === 'string' ? body.post_url.trim() || null : null

  await prisma.cachedPost.upsert({
    where: { siteId_externalPostId: { siteId: site.id, externalPostId: postId } },
    create: {
      siteId: site.id,
      externalPostId: postId,
      title: postTitle,
      publishedAt: postPublishedAt,
      url: postUrl,
    },
    update: {},
  })

  if (settings.autoCloseAfterDays != null && settings.autoCloseAfterDays > 0) {
    const cached = await prisma.cachedPost.findUnique({
      where: { siteId_externalPostId: { siteId: site.id, externalPostId: postId } },
    })
    if (cached) {
      const daysSince = (Date.now() - cached.publishedAt.getTime()) / (24 * 60 * 60 * 1000)
      if (daysSince > settings.autoCloseAfterDays) {
        res.status(403).json({ error: 'comments_closed' })
        return
      }
    }
  }

  let displayName = displayNameRaw.slice(0, MAX_DISPLAY_NAME)
  let verifiedSubscriber = false
  let squarespaceProfileId: string | null = null

  // Subscriber verification for paywalled posts - spec says check if subscriber_comments_enabled
  // For MVP we simplify: if they have API key and subscriber_comments_enabled, verify when email provided
  if (settings.subscriberCommentsEnabled && email && settings.squarespaceApiKeyEnc) {
    try {
      const apiKey = decrypt(settings.squarespaceApiKeyEnc)
      // Squarespace Profiles API: GET /1.0/profiles, filter=email,{encoded} (comma-separated per docs)
      const resProfiles = await fetch(
        `https://api.squarespace.com/1.0/profiles?filter=email,${encodeURIComponent(email)}`,
        {
          headers: { Authorization: `Bearer ${apiKey}` },
        }
      )
      if (resProfiles.ok) {
        const data = (await resProfiles.json()) as { Profiles?: Array<{ id?: string; hasAccount?: boolean; firstName?: string }> }
        const profile = data?.Profiles?.[0]
        if (profile?.hasAccount) {
          verifiedSubscriber = true
          squarespaceProfileId = profile.id ?? null
          if (!displayName && profile.firstName) displayName = profile.firstName
        }
      }
    } catch (err) {
      console.error('[comments] Profiles API error:', err)
      // Graceful degradation - continue as unverified
    }
  }

  const status = settings.requireApproval ? 'pending' : 'approved'
  const autoApproved = !settings.requireApproval

  const comment = await prisma.comment.create({
    data: {
      siteId: site.id,
      postId,
      parentId,
      displayName,
      email,
      verifiedSubscriber,
      squarespaceProfileId,
      body: commentBody.slice(0, MAX_BODY),
      status,
      autoApproved,
      ipAddress: ip !== 'unknown' ? ip : null,
      userAgent: userAgent || null,
    },
  })

  if (settings.notifyEmail) {
    const siteWithUser = await prisma.site.findUnique({
      where: { id: site.id },
      include: { user: true },
    })
    const notifyTo = settings.notificationEmail || siteWithUser?.user?.email
    if (notifyTo) {
      const appUrl = getAppUrl()
      const viewToken = signCommentActionToken(comment.id, 'view')
      const excerpt = commentBody.slice(0, 200) + (commentBody.length > 200 ? '…' : '')
      sendCommentNotificationEmail(
        notifyTo,
        displayName,
        postTitle,
        excerpt,
        `${appUrl}/api/comment-actions/view?token=${viewToken}`
      ).catch((err) => console.error('[comments] Notification send error:', err))
    }
  }

  res.status(201).json({
    id: comment.id,
    display_name: comment.displayName,
    verified_subscriber: comment.verifiedSubscriber,
    body: comment.body,
    status: comment.status,
    like_count: 0,
    created_at: comment.createdAt.toISOString(),
    replies: [],
  })
})

// POST /api/comments/:id/like
router.post('/:id/like', async (req: Request, res: Response) => {
  const siteToken = getSiteToken(req)
  if (!siteToken) {
    res.status(400).json({ error: 'Site token required' })
    return
  }

  const site = await getSiteWithSubscription(siteToken)
  if (!site) {
    res.status(404).json({ error: 'Site not found' })
    return
  }

  const settings = site.blogCommentSettings
  if (!settings?.allowLikes) {
    res.status(403).json({ error: 'Likes are disabled' })
    return
  }

  const commentId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
  if (!commentId || typeof commentId !== 'string') {
    res.status(400).json({ error: 'Invalid comment id' })
    return
  }

  const ip = (req.ip ?? req.socket?.remoteAddress ?? '') || 'unknown'
  const userAgent = req.get('user-agent') ?? ''
  const fingerprint = fingerprintHash(ip, userAgent)

  const comment = await prisma.comment.findFirst({
    where: { id: commentId, siteId: site.id, status: 'approved' },
    include: { _count: { select: { commentLikes: true } } },
  })

  if (!comment) {
    res.status(404).json({ error: 'Comment not found' })
    return
  }

  const existing = await prisma.commentLike.findUnique({
    where: { commentId_fingerprint: { commentId, fingerprint } },
  })

  const likeCount = comment._count.commentLikes

  if (existing) {
    await prisma.commentLike.delete({
      where: { commentId_fingerprint: { commentId, fingerprint } },
    })
    res.json({ like_count: Math.max(0, likeCount - 1), liked: false })
  } else {
    await prisma.commentLike.create({
      data: { commentId, fingerprint },
    })
    res.json({ like_count: likeCount + 1, liked: true })
  }
})

export default router
