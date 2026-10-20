/**
 * Public comment API - reader-facing endpoints for viewing and submitting comments.
 * Mounted at /api/comments with permissive CORS (called from reader blogs on arbitrary domains).
 */
import { Router, Request, Response } from 'express'
import crypto from 'crypto'
import prisma, { migrateBlogPasswordAtRest } from '../db/index.js'
import { loadUserPlanContext } from '../lib/planAccess.js'
import { sendCommentNotificationEmail } from '../lib/email.js'
import {
  clampParentIdsForThreadDepth,
  resolveParentIdForReply,
} from '../lib/comment-thread-depth.js'
import { resolveSquarespaceParentForReply } from '../lib/squarespace-comments-import.js'
import {
  decideAnonymousCommentIdentity,
  finalizeCommentIdentity,
} from '../lib/anonymous-comment-identity.js'
import { deleteCommentVerificationSession } from '../lib/comment-verification-token.js'
import { createCommentAuthRouter } from './comment-auth.js'
import { commenterScope, readBearerToken } from '../lib/commenter-session.js'
import { findValidCommenterSession, touchCommenterSession } from '../lib/commenter-auth-store.js'
import { findSiteContactByEmail } from '../lib/site-contact-lookup.js'
import {
  COMMENTER_AUTH_REQUIRED_MESSAGE,
  SQUARESPACE_LOGIN_REQUIRED_MESSAGE,
  decideVerifiedCommentSubmit,
  membershipNotFoundMessage,
} from '../lib/commenter-submit.js'
import { redactSubscriberText } from '../lib/email-providers.js'
import { canRenderSubscription } from '../lib/subscriptionStatus.js'
import { stampPaymentFailure } from '../lib/paymentGrace.js'

const router = Router()

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000 // 1 hour
const RATE_LIMIT_COMMENTS_PER_IP = 5
const MAX_DISPLAY_NAME = 100
const MAX_BODY = 5000
const MAX_EMAIL = 254

const commentRateMap = new Map<string, number[]>()
const ANON_RETRY_TTL_MS = 5 * 60 * 1000
const anonymousRetryTokens = new Map<string, { siteId: string; expiresAt: number }>()

function cleanupAnonymousRetryTokens(): void {
  const now = Date.now()
  for (const [token, entry] of anonymousRetryTokens.entries()) {
    if (entry.expiresAt <= now) anonymousRetryTokens.delete(token)
  }
}

function issueAnonymousRetryToken(siteId: string): string {
  cleanupAnonymousRetryTokens()
  const token = crypto.randomBytes(16).toString('hex')
  anonymousRetryTokens.set(token, { siteId, expiresAt: Date.now() + ANON_RETRY_TTL_MS })
  return token
}

function peekAnonymousRetryToken(token: string, siteId: string): boolean {
  cleanupAnonymousRetryTokens()
  const entry = anonymousRetryTokens.get(token)
  return Boolean(entry && entry.siteId === siteId && entry.expiresAt > Date.now())
}

function consumeAnonymousRetryToken(token: string, siteId: string): boolean {
  if (!peekAnonymousRetryToken(token, siteId)) return false
  anonymousRetryTokens.delete(token)
  return true
}

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
      name: true,
      url: true,
      blogPassword: true,
      squarespaceApiKeyEnc: true,
      user: {
        select: {
          id: true,
          email: true,
          subscriptions: {
            where: { status: { in: ['trialing', 'active', 'past_due', 'unpaid'] } },
            orderBy: { updatedAt: 'desc' },
            take: 10,
            select: { id: true, status: true, source: true, currentPeriodEnd: true, paymentFailedAt: true, updatedAt: true },
          },
        },
      },
      blogCommentSettings: true,
    },
  })
  const subscriptions = site?.user?.subscriptions ?? []
  let entitled: (typeof subscriptions)[number] | undefined
  for (const sub of subscriptions) {
    const stamped = await stampPaymentFailure(sub)
    if (canRenderSubscription(stamped)) {
      entitled = stamped
      break
    }
  }
  if (!site || !entitled) return null
  await migrateBlogPasswordAtRest(site.id, site.blogPassword)
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

router.use(
  '/auth',
  createCommentAuthRouter({
    getSiteToken,
    getSite: async (token) => {
      const site = await getSiteWithSubscription(token)
      if (!site) return null
      const settings = site.blogCommentSettings
      const legacyApiKey = (settings as unknown as { squarespaceApiKeyEnc?: string | null } | null)?.squarespaceApiKeyEnc ?? null
      return {
        id: site.id,
        siteKey: site.siteKey,
        name: site.name,
        url: site.url,
        apiKeyEnc: site.squarespaceApiKeyEnc || legacyApiKey,
        ownerEmail: site.user?.email ?? null,
        notificationEmail: settings?.notificationEmail ?? null,
      }
    },
    verifyHCaptcha,
  })
)

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
  const postUrl =
    typeof req.query.post_url === 'string' && req.query.post_url.trim()
      ? req.query.post_url.trim()
      : null

  const page = Math.max(1, parseInt(String(req.query.page || 1), 10))
  const perPage = Math.min(50, Math.max(1, parseInt(String(req.query.per_page || 20), 10)))

  const postIdSet = new Set<string>([postId])
  if (postUrl) postIdSet.add(postUrl)
  const cachedMatches = await prisma.cachedPost.findMany({
    where: {
      siteId: site.id,
      OR: [
        { externalPostId: postId },
        { url: postId },
        ...(postUrl ? [{ externalPostId: postUrl }, { url: postUrl }] : []),
      ],
    },
    select: { externalPostId: true, url: true },
  })
  for (const row of cachedMatches) {
    if (row.externalPostId) postIdSet.add(row.externalPostId)
    if (row.url) postIdSet.add(row.url)
  }
  const postIds = [...postIdSet]

  const rawRows = await prisma.comment.findMany({
    where: {
      siteId: site.id,
      postId: postIds.length === 1 ? postIds[0] : { in: postIds },
      status: { in: ['approved', 'deleted'] },
    },
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
  const visibleIdSet = new Set(visibleRows.map((c) => c.id))
  const rowsForTree = clampParentIdsForThreadDepth(
    visibleRows.map((c) => ({
      ...c,
      parentId: c.parentId !== null && visibleIdSet.has(c.parentId) ? c.parentId : null,
    }))
  )

  const byParent = new Map<string | null, typeof rowsForTree>()
  for (const c of rowsForTree) {
    const k = c.parentId ?? null
    if (!byParent.has(k)) byParent.set(k, [])
    byParent.get(k)!.push(c)
  }

  const reachable = new Set<string>()
  const visitReachable = (id: string) => {
    if (reachable.has(id)) return
    reachable.add(id)
    for (const child of byParent.get(id) ?? []) visitReachable(child.id)
  }
  for (const r of byParent.get(null) ?? []) visitReachable(r.id)
  const rootList = byParent.get(null) ?? []
  for (const c of rowsForTree) {
    if (reachable.has(c.id)) continue
    if (c.parentId != null) {
      const siblings = byParent.get(c.parentId)
      if (siblings) {
        const idx = siblings.findIndex((s) => s.id === c.id)
        if (idx >= 0) siblings.splice(idx, 1)
      }
      c.parentId = null
    }
    if (!rootList.some((r) => r.id === c.id)) rootList.push(c)
    visitReachable(c.id)
  }
  byParent.set(null, rootList)

  const createdMs = (createdAt: Date | string) => {
    const t = createdAt instanceof Date ? createdAt.getTime() : new Date(createdAt).getTime()
    return Number.isNaN(t) ? 0 : t
  }
  const createdIso = (createdAt: Date | string) => {
    if (createdAt instanceof Date && !Number.isNaN(createdAt.getTime())) return createdAt.toISOString()
    const d = new Date(createdAt)
    return Number.isNaN(d.getTime()) ? new Date(0).toISOString() : d.toISOString()
  }

  const sortSiblings = (arr: typeof rowsForTree) => {
    arr.sort((a, b) => {
      if (settings.sortOrder === 'oldest') return createdMs(a.createdAt) - createdMs(b.createdAt)
      if (settings.sortOrder === 'most_liked') {
        const likesA = a._count?.commentLikes ?? 0
        const likesB = b._count?.commentLikes ?? 0
        return likesB - likesA
      }
      return createdMs(b.createdAt) - createdMs(a.createdAt)
    })
  }

  const roots = byParent.get(null) ?? []
  sortSiblings(roots)
  const total = roots.length
  const pageRoots = roots.slice((page - 1) * perPage, (page - 1) * perPage + perPage)

  const formatNode = (
    c: (typeof rowsForTree)[0],
    seen: Set<string> = new Set()
  ): Record<string, unknown> => {
    if (seen.has(c.id)) {
      return {
        id: c.id,
        display_name: c.displayName,
        verified_subscriber: false,
        body: c.body,
        like_count: 0,
        created_at: createdIso(c.createdAt),
        replies: [],
      }
    }
    const nextSeen = new Set(seen)
    nextSeen.add(c.id)
    const kids = (byParent.get(c.id) ?? []).filter((k) => !nextSeen.has(k.id))
    sortSiblings(kids)
    if (c.status === 'deleted') {
      return {
        id: c.id,
        display_name: '[deleted]',
        verified_subscriber: false,
        body: '[deleted]',
        like_count: 0,
        created_at: createdIso(c.createdAt),
        comment_deleted: true,
        replies: kids.map((k) => formatNode(k, nextSeen)),
      }
    }
    const ext = c.externalCommentId
    const out: Record<string, unknown> = {
      id: c.id,
      display_name: c.displayName,
      verified_subscriber: c.verifiedSubscriber,
      body: c.body,
      like_count: c._count?.commentLikes ?? 0,
      created_at: createdIso(c.createdAt),
      replies: kids.map((k) => formatNode(k, nextSeen)),
    }
    if (ext) out.external_comment_id = ext
    if (c.importedFromSquarespace) out.imported_from_squarespace = true
    return out
  }

  const formatted = pageRoots.map((r) => formatNode(r))

  res.json({
    comments: formatted,
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

  const ownerPlan = await loadUserPlanContext(site.userId)
  if (!ownerPlan.entitlements.features.comments) {
    res.status(403).json({ error: 'Comments require the Professional plan.' })
    return
  }

  const settings = effectiveCommentSettings(site.blogCommentSettings)
  const legacyApiKey = (site.blogCommentSettings as unknown as { squarespaceApiKeyEnc?: string | null } | null)?.squarespaceApiKeyEnc ?? null
  const siteApiKey = site.squarespaceApiKeyEnc ?? null
  const effectiveSquarespaceApiKeyEnc = siteApiKey || legacyApiKey
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
    subscriber_display_name?: string
    email?: string
    body?: string
    parent_id?: string | null
    squarespace_record_type?: number | string
    hcaptcha_token?: string
    verification_cookie_token?: string
    post_as_anonymous?: boolean
    anonymous_retry_token?: string
    anonymous_handle?: string
    squarespace_logged_in?: boolean
    post_title?: string
    post_published_at?: string
    post_url?: string
  }

  const postId = typeof body.post_id === 'string' ? body.post_id.trim() : null
  if (!postId) {
    res.status(400).json({ error: 'post_id is required' })
    return
  }

  const postAsAnonymous = body.post_as_anonymous === true
  const anonymousRetryToken =
    typeof body.anonymous_retry_token === 'string' ? body.anonymous_retry_token.trim() : ''
  const skipCaptchaForAnonymousRetry =
    postAsAnonymous && !!anonymousRetryToken && peekAnonymousRetryToken(anonymousRetryToken, site.id)
  const verifiedSubmit = settings.subscriberCommentsEnabled && !postAsAnonymous

  const hcaptchaSecret = process.env.HCAPTCHA_SECRET_KEY
  const hcaptchaToken = typeof body.hcaptcha_token === 'string' ? body.hcaptcha_token.trim() : null
  if (!verifiedSubmit && hcaptchaSecret && !hcaptchaToken && !skipCaptchaForAnonymousRetry) {
    res.status(400).json({ error: 'hcaptcha_token is required' })
    return
  }

  const hcaptchaValid =
    !verifiedSubmit && hcaptchaSecret && !skipCaptchaForAnonymousRetry ? await verifyHCaptcha(hcaptchaToken!) : true
  if (!hcaptchaValid) {
    res.status(400).json({ error: 'Captcha verification failed' })
    return
  }

  const displayNameRaw = typeof body.display_name === 'string' ? body.display_name.trim() : ''
  // Optional name from the member email modal. Kept off display_name so a typed
  // name still counts as a member verification attempt when the form name is blank.
  const subscriberDisplayNameRaw =
    typeof body.subscriber_display_name === 'string' ? body.subscriber_display_name.trim() : ''
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
  if (displayNameRaw.length > MAX_DISPLAY_NAME || subscriberDisplayNameRaw.length > MAX_DISPLAY_NAME) {
    res.status(400).json({ error: 'display_name must be at most 100 characters' })
    return
  }

  if (postAsAnonymous && !settings.allowAnonymousComments) {
    res.status(403).json({
      error:
        'Anonymous comments are disabled. Sign in with your site member account and confirm your member email to comment.',
    })
    return
  }
  if (!verifiedSubmit && !settings.allowAnonymousComments) {
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
  let commenterSessionId: string | null = null
  let clientReportedLoggedIn: boolean | null = null

  if (verifiedSubmit) {
    const hostname = commenterScope(site)
    const session = await findValidCommenterSession(readBearerToken(req), hostname)
    if (session) await touchCommenterSession(session)
    const squarespaceLoggedIn = body.squarespace_logged_in === true
    let contact: { found: true; contactId: string } | { found: false; error?: string } | null = null
    if (session && squarespaceLoggedIn && effectiveSquarespaceApiKeyEnc) {
      const result = await findSiteContactByEmail({
        siteId: site.id,
        siteKey: site.siteKey,
        siteName: site.name ?? null,
        siteUrl: site.url ?? null,
        apiKeyEnc: effectiveSquarespaceApiKeyEnc,
        email: session.email,
        ownerEmails: [site.user?.email, settings.notificationEmail],
      })
      if (!result.found && result.error) {
        console.warn('[comments] contact_lookup_failed', { siteId: site.id, kind: result.error })
      }
      contact = result.found
        ? { found: true, contactId: result.contactId }
        : { found: false, error: result.error }
    }
    const decision = decideVerifiedCommentSubmit({
      hasValidSession: Boolean(session),
      squarespaceLoggedIn,
      hasApiKey: Boolean(effectiveSquarespaceApiKeyEnc),
      contact,
      allowAnonymousComments: settings.allowAnonymousComments,
    })
    if (decision.action === 'reject') {
      const anonymousRetry =
        decision.code !== 'commenter_auth_required' && settings.allowAnonymousComments
          ? { anonymous_retry_token: issueAnonymousRetryToken(site.id) }
          : {}
      const message =
        decision.code === 'squarespace_login_required'
          ? SQUARESPACE_LOGIN_REQUIRED_MESSAGE
          : decision.code === 'commenter_auth_required'
            ? COMMENTER_AUTH_REQUIRED_MESSAGE
            : membershipNotFoundMessage(session?.email ?? '')
      res.status(decision.status).json({
        code: decision.code,
        error: message,
        ...anonymousRetry,
      })
      return
    }
    displayName = (session?.displayName || 'Anonymous').slice(0, MAX_DISPLAY_NAME)
    email = session?.email ?? null
    verifiedSubscriber = true
    squarespaceProfileId = decision.contactId
    commenterSessionId = session?.id ?? null
    clientReportedLoggedIn = true
  } else {
    const { generatedHandle, useAnonymousIdentity, memberEmailAttempt } = decideAnonymousCommentIdentity({
      allowAnonymousComments: settings.allowAnonymousComments,
      subscriberCommentsEnabled: settings.subscriberCommentsEnabled,
      displayNameRaw,
      anonymousHandleRaw: typeof body.anonymous_handle === 'string' ? body.anonymous_handle : '',
      email,
      postAsAnonymous,
    })
    if (!useAnonymousIdentity && memberEmailAttempt && !verifiedSubscriber) {
      res.status(400).json({
        error: 'Email verification failed. Please try again.',
      })
      return
    }

    // Unverified comments never keep a caller-chosen name or email. Generated handles
    // (Anonymous1234) are the only custom anonymous identity. Verified members keep both.
    const finalizedIdentity = finalizeCommentIdentity({
      useAnonymousIdentity,
      generatedHandle,
      displayName,
      email,
      verifiedSubscriber,
      squarespaceProfileId,
    })
    displayName = finalizedIdentity.displayName
    email = finalizedIdentity.email
    verifiedSubscriber = finalizedIdentity.verifiedSubscriber
    squarespaceProfileId = finalizedIdentity.squarespaceProfileId
  }

  const status = settings.requireApproval ? 'pending' : 'approved'
  const autoApproved = !settings.requireApproval

  if (skipCaptchaForAnonymousRetry && anonymousRetryToken) {
    consumeAnonymousRetryToken(anonymousRetryToken, site.id)
  }

  const comment = await prisma.comment.create({
    data: {
      siteId: site.id,
      postId,
      parentId: resolvedParentId,
      displayName,
      email,
      verifiedSubscriber,
      squarespaceProfileId,
      commenterSessionId,
      clientReportedLoggedIn,
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
      const excerpt = commentBody.slice(0, 200) + (commentBody.length > 200 ? '…' : '')
      sendCommentNotificationEmail(
        notifyTo,
        displayName,
        postTitle,
        excerpt,
        site.siteKey,
        comment.id,
        comment.status === 'pending' ? 'pending' : 'approved'
      ).catch((err) =>
        console.error(
          '[comments] Notification send error:',
          redactSubscriberText(err instanceof Error ? err.message : String(err))
        )
      )
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

// POST /api/comments/verification/logout
router.post('/verification/logout', async (req: Request, res: Response) => {
  const siteToken = getSiteToken(req)
  if (!siteToken) {
    res.status(400).json({ error: 'Site token required' })
    return
  }
  const site = await prisma.site.findFirst({
    where: { siteKey: siteToken, deletedAt: null },
    select: { id: true },
  })
  if (!site) {
    res.status(404).json({ error: 'Site not found' })
    return
  }
  const token =
    typeof req.body?.verification_cookie_token === 'string' ? req.body.verification_cookie_token.trim() : ''
  if (token) await deleteCommentVerificationSession(token, site.id)
  res.status(204).end()
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
