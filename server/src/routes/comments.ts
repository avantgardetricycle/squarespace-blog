/**
 * Public comment API - reader-facing endpoints for viewing and submitting comments.
 * Mounted at /api/comments with permissive CORS (called from reader blogs on arbitrary domains).
 */
import { Router, Request, Response } from 'express'
import crypto from 'crypto'
import prisma from '../db/index.js'
import { decrypt } from '../lib/encryption.js'
import { sendCommentNotificationEmail } from '../lib/email.js'
import { markSquarespaceApiKeyInvalid } from '../lib/profiles-api-alert.js'
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
      name: true,
      url: true,
      blogPassword: true,
      squarespaceApiKeyEnc: true,
      user: {
        select: {
          id: true,
          email: true,
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

function emailLookupMeta(email: string | null) {
  if (!email) return { hasEmail: false, emailHasPlus: false, emailDomain: null as string | null }
  const at = email.lastIndexOf('@')
  return {
    hasEmail: true,
    emailHasPlus: email.includes('+'),
    emailDomain: at >= 0 ? email.slice(at + 1) : null,
  }
}

function debugCommentsIngest(
  hypothesisId: string,
  location: string,
  message: string,
  data: Record<string, unknown>
) {
  // #region agent log
  fetch('http://127.0.0.1:7454/ingest/babef855-2138-46ca-93cf-7acd45e00ee4', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'd05d9c' },
    body: JSON.stringify({
      sessionId: 'd05d9c',
      runId: 'pre-fix',
      hypothesisId,
      location,
      message,
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => {})
  // #endregion
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
    const emailNorm = c.email && typeof c.email === 'string' ? c.email.trim() : ''
    if (emailNorm) out.email = emailNorm
    if (ext) out.external_comment_id = ext
    if (c.importedFromSquarespace) out.imported_from_squarespace = true
    return out
  }

  const formatted = pageRoots.map((r) => formatNode(r))
  const identityDebug: Array<{
    id: unknown
    display_name: unknown
    verified_subscriber: unknown
    hasEmail: boolean
    email: unknown
  }> = []
  const walkIdentity = (nodes: Record<string, unknown>[]) => {
    for (const n of nodes) {
      identityDebug.push({
        id: n.id,
        display_name: n.display_name,
        verified_subscriber: n.verified_subscriber,
        hasEmail: Boolean(n.email),
        email: n.email ?? null,
      })
      const replies = n.replies
      if (Array.isArray(replies)) walkIdentity(replies as Record<string, unknown>[])
    }
  }
  walkIdentity(formatted)
  console.log('[comments] GET list', {
    siteId: site.id,
    siteKey: site.siteKey,
    postId,
    total,
    page,
    verifiedCount: identityDebug.filter((c) => c.verified_subscriber === true).length,
    anonymousCount: identityDebug.filter((c) => c.verified_subscriber !== true).length,
    comments: identityDebug,
  })

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

  const settings = effectiveCommentSettings(site.blogCommentSettings)
  const legacyApiKey = (site.blogCommentSettings as unknown as { squarespaceApiKeyEnc?: string | null } | null)?.squarespaceApiKeyEnc ?? null
  const siteApiKey = site.squarespaceApiKeyEnc ?? null
  const effectiveSquarespaceApiKeyEnc = siteApiKey || legacyApiKey
  console.log('[comments] POST start', {
    siteId: site.id,
    siteKey: site.siteKey,
    postId: typeof req.body?.post_id === 'string' ? req.body.post_id : null,
    allowAnonymousComments: settings.allowAnonymousComments,
    subscriberCommentsEnabled: settings.subscriberCommentsEnabled,
    hasSquarespaceApiKey: Boolean(effectiveSquarespaceApiKeyEnc),
    squarespaceApiKeySource: siteApiKey ? 'site' : legacyApiKey ? 'blogCommentSettings(legacy)' : 'none',
    hasSiteApiKeyRaw: Boolean(site.squarespaceApiKeyEnc),
    hasLegacyApiKeyRaw: Boolean(legacyApiKey),
    requireApproval: settings.requireApproval,
    incomingHasEmail:
      typeof req.body?.email === 'string' && Boolean(String(req.body.email).trim()),
    incomingEmail:
      typeof req.body?.email === 'string' ? String(req.body.email).trim().toLowerCase() : null,
    incomingHasDisplayName:
      typeof req.body?.display_name === 'string' && Boolean(String(req.body.display_name).trim()),
    incomingDisplayName:
      typeof req.body?.display_name === 'string' ? String(req.body.display_name).trim() : '',
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
  const memberEmailAttempt = !displayNameRaw && !!email
  const verifyDebug: Record<string, unknown> = {
    ...emailLookupMeta(email),
    memberEmailAttempt,
    allowAnonymousComments: settings.allowAnonymousComments,
    subscriberCommentsEnabled: settings.subscriberCommentsEnabled,
    hasSquarespaceApiKey: Boolean(effectiveSquarespaceApiKeyEnc),
    attempted: false,
    skipReason: null,
    profilesStatus: null,
    profilesCount: null,
    hasProfile: false,
    hasAccount: null,
    topLevelKeys: [],
    verifiedSubscriber: false,
    fallbackAnonymous: false,
    verificationFailureReason: null,
  }
  console.log('[comments] identity incoming', {
    siteId: site.id,
    postId,
    displayNameRaw: displayNameRaw || '',
    email,
    memberEmailAttempt,
    allowAnonymousComments: settings.allowAnonymousComments,
    subscriberCommentsEnabled: settings.subscriberCommentsEnabled,
    hasSquarespaceApiKey: Boolean(effectiveSquarespaceApiKeyEnc),
  })

  // Subscriber verification for paywalled posts - spec says check if subscriber_comments_enabled
  // For MVP we simplify: if they have API key and subscriber_comments_enabled, verify when email provided
  if (settings.subscriberCommentsEnabled && email && effectiveSquarespaceApiKeyEnc) {
    verifyDebug.attempted = true
    try {
      const apiKey = decrypt(effectiveSquarespaceApiKeyEnc)
      const profilesUrl = `https://api.squarespace.com/1.0/profiles?filter=email,${encodeURIComponent(email)}`
      debugCommentsIngest('H4', 'comments.ts:profiles-start', 'profiles verify start', {
        ...emailLookupMeta(email),
        hasApiKey: Boolean(apiKey),
        filterUsesPlusEncoding: Boolean(email && email.includes('+')),
      })
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
        const hasAccountRaw =
          profile && typeof profile === 'object' ? (profile.hasAccount ?? null) : null
        const hasAccountSnake =
          profile && typeof profile === 'object' ? (profile.has_account ?? null) : null
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
        verifyDebug.profilesStatus = resProfiles.status
        verifyDebug.profilesCount = profiles.length
        verifyDebug.hasProfile = Boolean(profile)
        verifyDebug.hasAccount = hasAccount
        verifyDebug.topLevelKeys =
          data && typeof data === 'object' ? Object.keys(data).slice(0, 20) : []
        verifyDebug.verifiedSubscriber = verifiedSubscriber
        debugCommentsIngest('H2', 'comments.ts:profiles-decision', 'profiles verify decision', {
          ...emailLookupMeta(email),
          profilesStatus: resProfiles.status,
          profilesCount: profiles.length,
          hasProfile: Boolean(profile),
          hasAccount,
          hasAccountRaw,
          hasAccountSnake,
          verifiedSubscriber,
          hasProfileId: Boolean(squarespaceProfileId),
          displayNameSetFromProfile: Boolean(displayName),
        })
        console.log('[comments] Profiles verify decision', {
          siteId: site.id,
          postId,
          email,
          profilesCount: profiles.length,
          hasProfile: Boolean(profile),
          hasAccount,
          hasAccountRaw,
          hasAccountSnake,
          verifiedSubscriber,
          squarespaceProfileId,
          displayNameAfterVerify: displayName || null,
        })
        if (!verifiedSubscriber) {
          verifyDebug.verificationFailureReason = 'profile_not_found'
        }
      } else {
        const errText = await resProfiles.text().catch(() => '')
        const errSnippet = errText ? errText.slice(0, 300) : null
        console.error('[comments] Profiles API non-200', {
          status: resProfiles.status,
          statusText: resProfiles.statusText,
          requestId: sqReqId,
          body: errText ? errText.slice(0, 1000) : null,
        })
        verifyDebug.profilesStatus = resProfiles.status
        verifyDebug.skipReason = 'profiles-api-non-200'
        verifyDebug.profilesErrorBody = errSnippet
        verifyDebug.verificationFailureReason =
          resProfiles.status === 401
            ? 'profiles_unauthorized'
            : resProfiles.status === 403
              ? 'profiles_forbidden'
              : 'profiles_http_error'
        debugCommentsIngest('H6', 'comments.ts:profiles-non-200', 'profiles API non-200', {
          ...emailLookupMeta(email),
          status: resProfiles.status,
          errorBodyLen: errText ? errText.length : 0,
          errorBodySnippet: errSnippet,
        })
        console.log('[comments] Profiles verify decision', {
          siteId: site.id,
          postId,
          email,
          verifiedSubscriber: false,
          reason: 'profiles-api-non-200',
          status: resProfiles.status,
        })
        if (resProfiles.status === 401 || resProfiles.status === 403) {
          markSquarespaceApiKeyInvalid({
            siteId: site.id,
            siteKey: site.siteKey,
            siteName: site.name ?? null,
            siteUrl: site.url ?? null,
            status: resProfiles.status,
            reason: resProfiles.status === 403 ? 'profiles_forbidden' : 'profiles_unauthorized',
            errorBodySnippet: errSnippet,
            ownerEmails: [site.user?.email, settings.notificationEmail],
          }).catch((err) => console.error('[comments] Profiles API alert error:', err))
        }
      }
    } catch (err) {
      console.error('[comments] Profiles API error:', err)
      verifyDebug.skipReason = 'profiles-api-exception'
      debugCommentsIngest('H3', 'comments.ts:profiles-exception', 'profiles API exception', {
        ...emailLookupMeta(email),
        errorType: err instanceof Error ? err.name : typeof err,
      })
      console.log('[comments] Profiles verify decision', {
        siteId: site.id,
        postId,
        email,
        verifiedSubscriber: false,
        reason: 'profiles-api-exception',
      })
      // Graceful degradation - continue as unverified. Network/5xx is not a dead API key.
    }
  } else {
    const skipReason = !settings.subscriberCommentsEnabled
      ? 'subscriberCommentsEnabled=false'
      : !email
        ? 'no-email'
        : !effectiveSquarespaceApiKeyEnc
          ? 'no-squarespace-api-key'
          : 'unknown'
    verifyDebug.skipReason = skipReason
    debugCommentsIngest('H4', 'comments.ts:profiles-skipped', 'profiles verify skipped', {
      skipReason,
      ...emailLookupMeta(email),
      subscriberCommentsEnabled: settings.subscriberCommentsEnabled,
      hasSquarespaceApiKey: Boolean(effectiveSquarespaceApiKeyEnc),
      memberEmailAttempt,
    })
    console.log('[comments] Profiles verify skipped', {
      skipReason,
      subscriberCommentsEnabled: settings.subscriberCommentsEnabled,
      hasEmail: Boolean(email),
      email,
      hasSquarespaceApiKey: Boolean(effectiveSquarespaceApiKeyEnc),
      squarespaceApiKeySource: siteApiKey ? 'site' : legacyApiKey ? 'blogCommentSettings(legacy)' : 'none',
      allowAnonymousComments: settings.allowAnonymousComments,
      memberEmailAttempt,
    })
  }

  if (memberEmailAttempt && !settings.allowAnonymousComments) {
    if (!settings.subscriberCommentsEnabled || !effectiveSquarespaceApiKeyEnc) {
      console.log('[comments] member email rejected: verification not configured', {
        siteId: site.id,
        postId,
        email,
        subscriberCommentsEnabled: settings.subscriberCommentsEnabled,
        hasSquarespaceApiKey: Boolean(effectiveSquarespaceApiKeyEnc),
      })
      res.status(400).json({
        error:
          'Member email verification is required to comment. Enable subscriber comments and connect your Squarespace API key, or turn on anonymous comments.',
      })
      return
    }
    if (!verifiedSubscriber) {
      console.log('[comments] member email rejected: profiles lookup did not verify', {
        siteId: site.id,
        postId,
        email,
        verifiedSubscriber,
        squarespaceProfileId,
      })
      res.status(400).json({
        error:
          'We could not verify a member account for that email. Use the address tied to your site membership, or ask the site owner for help.',
      })
      return
    }
  }

  // Logged-in/member flow omits display_name; if verification fails and anonymous comments are allowed, post as Anonymous.
  const displayNameBeforeFallback = displayName
  if (!displayName) {
    displayName = 'Anonymous'
  }
  verifyDebug.verifiedSubscriber = verifiedSubscriber
  verifyDebug.fallbackAnonymous = displayName === 'Anonymous' && !verifiedSubscriber
  debugCommentsIngest('H5', 'comments.ts:identity-resolved', 'identity resolved', {
    ...emailLookupMeta(email),
    memberEmailAttempt,
    allowAnonymousComments: settings.allowAnonymousComments,
    verifiedSubscriber,
    fallbackAnonymous: verifyDebug.fallbackAnonymous,
    displayNameIsAnonymous: displayName === 'Anonymous',
    attempted: verifyDebug.attempted,
    skipReason: verifyDebug.skipReason,
    profilesCount: verifyDebug.profilesCount,
    hasProfile: verifyDebug.hasProfile,
    hasAccount: verifyDebug.hasAccount,
  })
  console.log('[comments] identity resolved', {
    siteId: site.id,
    postId,
    email,
    memberEmailAttempt,
    allowAnonymousComments: settings.allowAnonymousComments,
    subscriberCommentsEnabled: settings.subscriberCommentsEnabled,
    verifiedSubscriber,
    squarespaceProfileId,
    displayNameBeforeFallback: displayNameBeforeFallback || null,
    displayName,
    fallbackAnonymous: displayName === 'Anonymous' && !verifiedSubscriber,
  })

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
    email: comment.email,
    squarespaceProfileId: comment.squarespaceProfileId,
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
