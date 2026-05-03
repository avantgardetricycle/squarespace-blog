import { Router, Request, Response } from 'express'
import prisma from '../db/index.js'
import { requireSession, SessionUser } from '../middleware/session.js'
import { sendCommentNotificationEmail } from '../lib/email.js'
import { ensureSquarespaceThreadImportedForModeration } from '../lib/squarespace-comments-import.js'

const router = Router()

async function getSiteForUser(siteKey: string, userId: number) {
  return prisma.site.findFirst({
    where: { siteKey, userId, deletedAt: null },
  })
}

async function getCommentWithAuth(commentId: string, userId: number) {
  const comment = await prisma.comment.findFirst({
    where: { id: commentId },
    include: { site: { select: { userId: true } } },
  })
  if (!comment || comment.site.userId !== userId) return null
  return comment
}

// GET /api/dashboard/comments?siteKey=xxx&statuses=pending,approved&status=approved (legacy)&auth=all|authenticated|anonymous&postId=&page=&per_page=&search=
router.get('/', requireSession, async (req: Request, res: Response) => {
  const { user } = req as Request & { user: SessionUser }
  const siteKey = typeof req.query.siteKey === 'string' ? req.query.siteKey.trim() : null
  if (!siteKey) {
    res.status(400).json({ error: 'siteKey is required' })
    return
  }

  const site = await getSiteForUser(siteKey, user.id)
  if (!site) {
    res.status(404).json({ error: 'Site not found' })
    return
  }

  const validStatuses = ['pending', 'approved', 'spam', 'hidden'] as const
  const statusesRaw = typeof req.query.statuses === 'string' ? req.query.statuses.trim() : ''
  const legacyStatus = typeof req.query.status === 'string' ? req.query.status.trim() : ''

  let statusIn: string[] | null = null
  if (statusesRaw) {
    const parsed = statusesRaw
      .split(',')
      .map((s) => s.trim())
      .filter((s): s is (typeof validStatuses)[number] => validStatuses.includes(s as (typeof validStatuses)[number]))
    const unique = [...new Set(parsed)]
    if (unique.length === validStatuses.length) {
      statusIn = null
    } else if (unique.length > 0) {
      statusIn = unique
    } else {
      statusIn = null
    }
  } else if (validStatuses.includes(legacyStatus as (typeof validStatuses)[number])) {
    statusIn = [legacyStatus]
  } else if (legacyStatus === 'all' || !legacyStatus) {
    statusIn = null
  } else {
    statusIn = ['pending']
  }

  const authRaw = typeof req.query.auth === 'string' ? req.query.auth.trim().toLowerCase() : 'all'
  const authFilter = authRaw === 'authenticated' || authRaw === 'anonymous' ? authRaw : 'all'

  const page = Math.max(1, parseInt(String(req.query.page || 1), 10))
  const perPage = Math.min(50, Math.max(1, parseInt(String(req.query.per_page || 20), 10)))
  const postIdRaw = typeof req.query.postId === 'string' ? req.query.postId.trim() : ''
  const postIdsRaw = typeof req.query.postIds === 'string' ? req.query.postIds.trim() : ''
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : null

  const where: Record<string, unknown> = {
    siteId: site.id,
  }
  if (statusIn && statusIn.length > 0) {
    where.status = statusIn.length === 1 ? statusIn[0] : { in: statusIn }
  } else {
    where.status = { not: 'deleted' }
  }
  if (postIdsRaw) {
    const ids = postIdsRaw
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
    if (ids.length === 1) where.postId = ids[0]
    else if (ids.length > 1) where.postId = { in: ids }
  } else if (postIdRaw) {
    where.postId = postIdRaw
  }
  if (authFilter === 'authenticated') where.verifiedSubscriber = true
  if (authFilter === 'anonymous') where.verifiedSubscriber = false
  if (search) {
    where.OR = [
      { displayName: { contains: search, mode: 'insensitive' } },
      { body: { contains: search, mode: 'insensitive' } },
    ]
  }

  const [comments, total, cachedPosts] = await Promise.all([
    prisma.comment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
      include: {
        _count: { select: { commentLikes: true } },
      },
    }),
    prisma.comment.count({ where }),
    prisma.cachedPost.findMany({
      where: { siteId: site.id },
      select: { externalPostId: true, title: true },
    }),
  ])

  const postTitleMap = new Map(cachedPosts.map((p) => [p.externalPostId, p.title]))
  console.log('[dashboard-comments] list', {
    userId: user.id,
    siteKey,
    siteId: site.id,
    statuses: statusIn ?? 'all',
    auth: authFilter,
    postIds: postIdsRaw || postIdRaw || null,
    search: search ?? null,
    total,
    returned: comments.length,
  })

  res.json({
    comments: comments.map((c) => ({
      id: c.id,
      postId: c.postId,
      postTitle: postTitleMap.get(c.postId) ?? c.postId,
      parentId: c.parentId,
      displayName: c.displayName,
      email: c.email,
      verifiedSubscriber: c.verifiedSubscriber,
      squarespaceProfileId: c.squarespaceProfileId,
      body: c.body,
      status: c.status,
      ipAddress: c.ipAddress,
      createdAt: c.createdAt,
      likeCount: c._count.commentLikes,
    })),
    total,
    page,
  })
})

// GET /api/dashboard/comments/count?siteKey=xxx
router.get('/count', requireSession, async (req: Request, res: Response) => {
  const { user } = req as Request & { user: SessionUser }
  const siteKey = typeof req.query.siteKey === 'string' ? req.query.siteKey.trim() : null
  if (!siteKey) {
    res.status(400).json({ error: 'siteKey is required' })
    return
  }

  const site = await getSiteForUser(siteKey, user.id)
  if (!site) {
    res.status(404).json({ error: 'Site not found' })
    return
  }

  const [pending, approved, spam, hidden] = await Promise.all([
    prisma.comment.count({ where: { siteId: site.id, status: 'pending' } }),
    prisma.comment.count({ where: { siteId: site.id, status: 'approved' } }),
    prisma.comment.count({ where: { siteId: site.id, status: 'spam' } }),
    prisma.comment.count({ where: { siteId: site.id, status: 'hidden' } }),
  ])

  res.json({ pending, approved, spam, hidden })
})

// GET /api/dashboard/comments/posts?siteKey=xxx — posts with comments (titles from cache when available)
router.get('/posts', requireSession, async (req: Request, res: Response) => {
  const { user } = req as Request & { user: SessionUser }
  const siteKey = typeof req.query.siteKey === 'string' ? req.query.siteKey.trim() : null
  if (!siteKey) {
    res.status(400).json({ error: 'siteKey is required' })
    return
  }

  const site = await getSiteForUser(siteKey, user.id)
  if (!site) {
    res.status(404).json({ error: 'Site not found' })
    return
  }

  const [cached, distinctPosts] = await Promise.all([
    prisma.cachedPost.findMany({
      where: { siteId: site.id },
      select: { externalPostId: true, title: true },
    }),
    prisma.comment.findMany({
      where: { siteId: site.id, status: { not: 'deleted' } },
      distinct: ['postId'],
      select: { postId: true },
    }),
  ])

  const titleById = new Map(cached.map((p) => [p.externalPostId, p.title || p.externalPostId]))
  const rows: { postId: string; title: string }[] = []
  const seen = new Set<string>()
  for (const c of distinctPosts) {
    if (!c.postId || seen.has(c.postId)) continue
    seen.add(c.postId)
    rows.push({
      postId: c.postId,
      title: titleById.get(c.postId) ?? c.postId,
    })
  }
  rows.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }))

  res.json({ posts: rows })
})

// PATCH /api/dashboard/comments/:id
router.patch('/:id', requireSession, async (req: Request, res: Response) => {
  const { user } = req as Request & { user: SessionUser }
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
  if (!id) {
    res.status(400).json({ error: 'Comment id required' })
    return
  }

  const comment = await getCommentWithAuth(id, user.id)
  if (!comment) {
    res.status(404).json({ error: 'Comment not found' })
    return
  }

  const siteRow = await prisma.site.findUnique({
    where: { id: comment.siteId },
    select: { id: true, url: true, blogPassword: true },
  })

  const body = req.body as { status?: string; body?: string }
  const updates: Record<string, unknown> = {}
  if (['approved', 'spam', 'deleted', 'hidden'].includes(body.status ?? '')) {
    updates.status = body.status
  }
  if (typeof body.body === 'string') {
    updates.body = body.body.trim().slice(0, 5000)
  }

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: 'No valid updates' })
    return
  }

  if (siteRow && (updates.status === 'spam' || updates.status === 'deleted' || updates.status === 'hidden')) {
    await ensureSquarespaceThreadImportedForModeration(prisma, siteRow, {
      postId: comment.postId,
      parentId: comment.parentId,
      externalCommentId: comment.externalCommentId,
    })
  }

  if (updates.status === 'approved') {
    const wasPending = comment.status === 'pending'
    if (wasPending) {
      const settings = await prisma.blogCommentSettings.findUnique({
        where: { siteId: comment.siteId },
      })
      if (settings?.notifyEmail) {
        const siteWithUser = await prisma.site.findUnique({
          where: { id: comment.siteId },
          include: { user: true },
        })
        const notifyTo = settings.notificationEmail || siteWithUser?.user?.email
        if (notifyTo && siteWithUser?.siteKey) {
          const excerpt = comment.body.slice(0, 200) + (comment.body.length > 200 ? '…' : '')
          sendCommentNotificationEmail(
            notifyTo,
            comment.displayName,
            'Your post',
            excerpt,
            siteWithUser.siteKey,
            comment.id,
            'approved'
          ).catch((err) => console.error('[dashboard-comments] Notification send error:', err))
        }
      }
    }
  }

  const updated = await prisma.comment.update({
    where: { id },
    data: updates,
  })

  res.json(updated)
})

// POST /api/dashboard/comments/:id/reply
router.post('/:id/reply', requireSession, async (req: Request, res: Response) => {
  const { user } = req as Request & { user: SessionUser }
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
  if (!id) {
    res.status(400).json({ error: 'Comment id required' })
    return
  }

  const parent = await getCommentWithAuth(id, user.id)
  if (!parent) {
    res.status(404).json({ error: 'Comment not found' })
    return
  }

  const body = req.body as { body?: string; displayName?: string }
  const replyBody = typeof body.body === 'string' ? body.body.trim() : ''
  if (!replyBody || replyBody.length > 5000) {
    res.status(400).json({ error: 'body is required (max 5000 chars)' })
    return
  }

  const site = await prisma.site.findUnique({
    where: { id: parent.siteId },
  })
  const displayName = typeof body.displayName === 'string' && body.displayName.trim()
    ? body.displayName.trim().slice(0, 100)
    : (site?.name || 'Blog author')

  const reply = await prisma.comment.create({
    data: {
      siteId: parent.siteId,
      postId: parent.postId,
      parentId: parent.id,
      displayName,
      body: replyBody,
      status: 'approved',
      autoApproved: true,
      verifiedSubscriber: false,
    },
  })

  res.status(201).json(reply)
})

export default router
