/**
 * Public comment API - reader-facing endpoints for viewing and submitting comments.
 * Mounted at /api/comments with permissive CORS (called from reader blogs on arbitrary domains).
 */
import { Router, Request, Response } from 'express'
import crypto from 'crypto'
import prisma from '../db/index.js'
import { decrypt } from '../lib/encryption.js'
import { sendCommentNotificationEmail } from '../lib/email.js'
import {
  clampParentIdsForThreadDepth,
  resolveParentIdForReply,
} from '../lib/comment-thread-depth.js'
import { resolveSquarespaceParentForReply } from '../lib/squarespace-comments-import.js'

const router = Router()

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000 // 1 hour
const RATE_LIMIT_COMMENTS_PER_IP = 5
const MAX_DISPLAY_NAME = 100
const MAX_BODY = 5000
const MAX_EMAIL = 254

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
  const site = await prisma.site.findFirst({
    where: { siteKey: siteToken, deletedAt: null },
    select: {
      id: true,
      userId: true,
      siteKey: true,
      url: true,
      blogPassword: true,
      squarespaceApiKeyEnc: true,
      user: {
        select: {
          id: true,
          subscriptions: {
            where: { status: { in: ['trialing', 'active'] } },
            orderBy: { updatedAt: 'desc' },
            take: 1,
            select: { id: true, status: true, updatedAt: true },
          },
        },
      },
      blogCommentSettings: true,
    },
  })
  if (!site || !site.user?.subscriptions?.[0]) return null
  return site
}

type CommentSettingsRow = {
  commentsEnabled: boolean
  allowNewComments: boolean
  allowAnonymousComments: boolean
  subscriberCommentsEnabled: boolean
  requireApproval: boolean
  autoCloseAfterDays: number | null
  notifyEmail: boolean
  notificationEmail: string | null
  allowLikes: boolean
  allowThreadedReplies: boolean
  sortOrder: string
}

/** When no blog_comment_settings row exists, match Prisma @default and dashboard GET defaults */
function effectiveCommentSettings(s: CommentSettingsRow | null) {
  if (!s) {
    return {
      commentsEnabled: true,
      allowNewComments: true,
      allowAnonymousComments: true,
      subscriberCommentsEnabled: false,
      requireApproval: false,
      autoCloseAfterDays: null as number | null,
      notifyEmail: true,
      notificationEmail: null as string | null,
      allowLikes: true,
      allowThreadedReplies: true,
      sortOrder: 'newest',
    }
  }
  return s
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

  const settings = effectiveCommentSettings(site.blogCommentSettings)
  if (!settings.commentsEnabled) {
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

  const rawRows = await prisma.comment.findMany({
    where: { siteId: site.id, postId, status: { in: ['approved', 'deleted'] } },
    include: { _count: { select: { commentLikes: true } } },
  })

  const byId = new Map(rawRows.map((c) => [c.id, c]))
  const keepIds = new Set<string>()
  for (const c of rawRows) {
    if (c.status !== 'approved') continue
    keepIds.add(c.id)
    let pid: string | null = c.parentId
    const ancestorGuard = new Set<string>()
    while (pid) {
      if (ancestorGuard.has(pid)) break
      ancestorGuard.add(pid)
      keepIds.add(pid)
      const p = byId.get(pid)
      pid = p?.parentId ?? null
    }
  }

  const visibleRows = rawRows.filter((c) => keepIds.has(c.id))
  const rowsForTree = clampParentIdsForThreadDepth(
    visibleRows.map((c) => ({
      ...c,
      parentId: c.parentId !== null && keepIds.has(c.parentId) ? c.parentId : null,
    }))
  )

  const byParent = new Map<string | null, typeof rowsForTree>()
  for (const c of rowsForTree) {
    const k = c.parentId
    if (!byParent.has(k)) byParent.set(k, [])
    byParent.get(k)!.push(c)
  }

  const sortSiblings = (arr: typeof rowsForTree) => {
    arr.sort((a, b) => {
      if (settings.sortOrder === 'oldest') return a.createdAt.getTime() - b.createdAt.getTime()
      if (settings.sortOrder === 'most_liked')
        return b._count.commentLikes - a._count.commentLikes
      return b.createdAt.getTime() - a.createdAt.getTime()
    })
  }

  const roots = byParent.get(null) ?? []
  sortSiblings(roots)
  const total = roots.length
  const pageRoots = roots.slice((page - 1) * perPage, (page - 1) * perPage + perPage)

  const formatNode = (c: (typeof rowsForTree)[0]): Record<string, unknown> => {
    const kids = byParent.get(c.id) ?? []
    sortSiblings(kids)
    if (c.status === 'deleted') {
      return {
        id: c.id,
        display_name: '[deleted]',
        verified_subscriber: false,
        body: '[deleted]',
        like_count: 0,
        created_at: c.createdAt.toISOString(),
        comment_deleted: true,
        replies: kids.map((k) => formatNode(k)),
      }
    }
    const ext = c.externalCommentId
    const out: Record<string, unknown> = {
      id: c.id,
      display_name: c.displayName,
      verified_subscriber: c.verifiedSubscriber,
      body: c.body,
      like_count: c._count.commentLikes,
      created_at: c.createdAt.toISOString(),
      replies: kids.map((k) => formatNode(k)),
    }
    const emailNorm = c.email && typeof c.email === 'string' ? c.email.trim() : ''
    if (emailNorm) out.email = emailNorm
    if (ext) out.external_comment_id = ext
    if (c.importedFromSquarespace) out.imported_from_squarespace = true
    return out
  }

  res.json({
    comments: pageRoots.map((r) => formatNode(r)),
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

  const settings = effectiveCommentSettings(site.blogCommentSettings)
  const legacyApiKey = (site.blogCommentSettings as unknown as { squarespaceApiKeyEnc?: string | null } | null)?.squarespaceApiKeyEnc ?? null
  const siteApiKey = site.squarespaceApiKeyEnc ?? null
  const effectiveSquarespaceApiKeyEnc = siteApiKey || legacyApiKey
  console.log('[comments] POST start', {
    siteId: site.id,
    siteKey: site.siteKey,
    postId: typeof req.body?.post_id === 'string' ? req.body.post_id : null,
    subscriberCommentsEnabled: settings.subscriberCommentsEnabled,
    hasSquarespaceApiKey: Boolean(effectiveSquarespaceApiKeyEnc),
    squarespaceApiKeySource: siteApiKey ? 'site' : legacyApiKey ? 'blogCommentSettings(legacy)' : 'none',
    hasSiteApiKeyRaw: Boolean(site.squarespaceApiKeyEnc),
    hasLegacyApiKeyRaw: Boolean(legacyApiKey),
    requireApproval: settings.requireApproval,
  })
  if (!settings.commentsEnabled) {
    res.status(403).json({ error: 'Comments are disabled' })
    return
  }
  if (!settings.allowNewComments) {
    res.status(403).json({ error: 'New comments are disabled' })
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
    squarespace_record_type?: number | string
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
  if (!commentBody || commentBody.length > MAX_BODY) {
    res.status(400).json({ error: 'body is required (max 5000 characters)' })
    return
  }

  let email: string | null = null
  if (typeof body.email === 'string') {
    const t = body.email.trim().toLowerCase()
    if (t) email = t.length > MAX_EMAIL ? t.slice(0, MAX_EMAIL) : t
  }
  if (displayNameRaw.length > MAX_DISPLAY_NAME) {
    res.status(400).json({ error: 'display_name must be at most 100 characters' })
    return
  }
  if (!settings.allowAnonymousComments) {
    const guestNameOnly = !!displayNameRaw && !email
    const guestNoCredentials = !displayNameRaw && !email
    if (guestNameOnly || guestNoCredentials) {
      res.status(403).json({
        error:
          'Anonymous comments are disabled. Sign in with your site member account and confirm your member email to comment.',
      })
      return
    }
  }
  let resolvedParentId: string | null =
    typeof body.parent_id === 'string' && body.parent_id.trim() ? body.parent_id.trim() : null

  if (resolvedParentId?.startsWith('sq:')) {
    const ssExt = resolvedParentId.slice(3).trim()
    if (!ssExt) {
      res.status(400).json({ error: 'Invalid parent comment' })
      return
    }
    let recordType = 1
    const rawRt = body.squarespace_record_type
    if (typeof rawRt === 'number' && Number.isFinite(rawRt)) recordType = Math.trunc(rawRt)
    else if (typeof rawRt === 'string' && /^\d+$/.test(rawRt)) recordType = parseInt(rawRt, 10)

    const importedId = await resolveSquarespaceParentForReply(prisma, {
      siteId: site.id,
      postId,
      siteUrl: site.url,
      blogPassword: site.blogPassword,
      squarespaceParentId: ssExt,
      recordType,
    })
    if (!importedId) {
      res.status(400).json({
        error:
          'Could not load Squarespace comment for reply. Check that your Site URL in BetterBlog matches the live site, and try again.',
      })
      return
    }
    resolvedParentId = importedId
  }

  if (resolvedParentId) {
    if (!settings.allowThreadedReplies) {
      res.status(403).json({ error: 'Threaded replies are disabled' })
      return
    }
    const parent = await prisma.comment.findFirst({
      where: { id: resolvedParentId, siteId: site.id, postId, status: 'approved' },
    })
    if (!parent) {
      res.status(400).json({ error: 'Invalid parent comment' })
      return
    }
    resolvedParentId = await resolveParentIdForReply(prisma, {
      siteId: site.id,
      postId,
      requestedParentId: parent.id,
    })
  }

  // Upsert cached post for auto-close check
  const postTitle = typeof body.post_title === 'string' ? body.post_title.trim() : 'Untitled'
  const postPublishedAtRaw = body.post_published_at
  const parsedPostPublishedAt =
    postPublishedAtRaw != null && postPublishedAtRaw !== ''
      ? new Date(postPublishedAtRaw)
      : null
  const postPublishedAt =
    parsedPostPublishedAt && !isNaN(parsedPostPublishedAt.getTime())
      ? parsedPostPublishedAt
      : new Date()
  if (!parsedPostPublishedAt || isNaN(parsedPostPublishedAt.getTime())) {
    console.warn('[comments] Missing/invalid post_published_at; defaulting to now', {
      siteId: site.id,
      postId,
      raw: postPublishedAtRaw ?? null,
    })
  }
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
  if (settings.subscriberCommentsEnabled && email && effectiveSquarespaceApiKeyEnc) {
    try {
      const apiKey = decrypt(effectiveSquarespaceApiKeyEnc)
      const profilesUrl = `https://api.squarespace.com/1.0/profiles?filter=email,${encodeURIComponent(email)}`
      console.log('[comments] Profiles verify start', {
        siteId: site.id,
        postId,
        email,
        hasApiKey: !!apiKey,
        url: profilesUrl,
      })
      // Squarespace Profiles API: GET /1.0/profiles, filter=email,{encoded} (comma-separated per docs)
      const resProfiles = await fetch(profilesUrl, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: 'application/json',
          'User-Agent': 'BetterBlog/1.0',
        },
      })
      const sqReqId =
        resProfiles.headers.get('x-request-id') ||
        resProfiles.headers.get('x-squarespace-request-id') ||
        null
      console.log('[comments] Profiles verify response', {
        status: resProfiles.status,
        statusText: resProfiles.statusText,
        requestId: sqReqId,
      })
      if (resProfiles.ok) {
        const data = (await resProfiles.json()) as
          | { Profiles?: Array<{ id?: string; hasAccount?: boolean; has_account?: boolean; firstName?: string; first_name?: string }> }
          | { profiles?: Array<{ id?: string; hasAccount?: boolean; has_account?: boolean; firstName?: string; first_name?: string }> }
          | Record<string, unknown>
        const profiles =
          (Array.isArray((data as { Profiles?: unknown[] }).Profiles) ? (data as { Profiles: Array<{ id?: string; hasAccount?: boolean; has_account?: boolean; firstName?: string; first_name?: string }> }).Profiles : null)
          || (Array.isArray((data as { profiles?: unknown[] }).profiles) ? (data as { profiles: Array<{ id?: string; hasAccount?: boolean; has_account?: boolean; firstName?: string; first_name?: string }> }).profiles : null)
          || []
        console.log('[comments] Profiles verify parsed', {
          topLevelKeys: data && typeof data === 'object' ? Object.keys(data).slice(0, 20) : [],
          profilesCount: profiles.length,
          firstProfile: profiles[0]
            ? {
                id: profiles[0].id ?? null,
                hasAccount: profiles[0].hasAccount ?? null,
                has_account: profiles[0].has_account ?? null,
                firstName: profiles[0].firstName ?? null,
                first_name: profiles[0].first_name ?? null,
              }
            : null,
        })
        const profile = profiles[0]
        const hasAccount =
          profile && typeof profile === 'object'
            ? (profile.hasAccount ?? profile.has_account ?? true)
            : false
        if (profile && hasAccount) {
          verifiedSubscriber = true
          squarespaceProfileId = profile.id ?? null
          if (!displayName && (profile.firstName || profile.first_name)) {
            displayName = String(profile.firstName || profile.first_name)
          }
        }
      } else {
        const errText = await resProfiles.text().catch(() => '')
        console.error('[comments] Profiles API non-200', {
          status: resProfiles.status,
          statusText: resProfiles.statusText,
          requestId: sqReqId,
          body: errText ? errText.slice(0, 1000) : null,
        })
      }
    } catch (err) {
      console.error('[comments] Profiles API error:', err)
      // Graceful degradation - continue as unverified
    }
  } else {
    console.log('[comments] Profiles verify skipped', {
      subscriberCommentsEnabled: settings.subscriberCommentsEnabled,
      hasEmail: Boolean(email),
        hasSquarespaceApiKey: Boolean(effectiveSquarespaceApiKeyEnc),
        squarespaceApiKeySource: siteApiKey ? 'site' : legacyApiKey ? 'blogCommentSettings(legacy)' : 'none',
    })
  }

  const memberEmailAttempt = !displayNameRaw && !!email
  if (memberEmailAttempt && !settings.allowAnonymousComments) {
    if (!settings.subscriberCommentsEnabled || !effectiveSquarespaceApiKeyEnc) {
      res.status(400).json({
        error:
          'Member email verification is required to comment. Enable subscriber comments and connect your Squarespace API key, or turn on anonymous comments.',
      })
      return
    }
    if (!verifiedSubscriber) {
      res.status(400).json({
        error:
          'We could not verify a member account for that email. Use the address tied to your site membership, or ask the site owner for help.',
      })
      return
    }
  }

  // Logged-in/member flow omits display_name; if verification fails and anonymous comments are allowed, post as Anonymous.
  if (!displayName) {
    displayName = 'Anonymous'
  }

  const status = settings.requireApproval ? 'pending' : 'approved'
  const autoApproved = !settings.requireApproval

  const comment = await prisma.comment.create({
    data: {
      siteId: site.id,
      postId,
      parentId: resolvedParentId,
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
  console.log('[comments] POST created', {
    commentId: comment.id,
    siteId: comment.siteId,
    postId: comment.postId,
    status: comment.status,
    verifiedSubscriber: comment.verifiedSubscriber,
    displayName: comment.displayName,
    hasEmail: Boolean(comment.email),
  })

  if (settings.notifyEmail) {
    const siteWithUser = await prisma.site.findUnique({
      where: { id: site.id },
      include: { user: true },
    })
    const notifyTo = settings.notificationEmail || siteWithUser?.user?.email
    if (notifyTo) {
      const excerpt = commentBody.slice(0, 200) + (commentBody.length > 200 ? '…' : '')
      sendCommentNotificationEmail(
        notifyTo,
        displayName,
        postTitle,
        excerpt,
        site.siteKey,
        comment.id,
        comment.status === 'pending' ? 'pending' : 'approved'
      ).catch((err) => console.error('[comments] Notification send error:', err))
    }
  }

  const createdEmailNorm =
    comment.email && typeof comment.email === 'string' ? comment.email.trim() : ''
  res.status(201).json({
    id: comment.id,
    display_name: comment.displayName,
    verified_subscriber: comment.verifiedSubscriber,
    body: comment.body,
    status: comment.status,
    like_count: 0,
    created_at: comment.createdAt.toISOString(),
    replies: [],
    ...(createdEmailNorm ? { email: createdEmailNorm } : {}),
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

  const settings = effectiveCommentSettings(site.blogCommentSettings)
  if (!settings.allowLikes) {
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
