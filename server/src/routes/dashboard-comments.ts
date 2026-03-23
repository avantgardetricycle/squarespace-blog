import { Router, Request, Response } from 'express'
import prisma from '../db/index.js'
import { requireSession, SessionUser } from '../middleware/session.js'
import { signCommentActionToken } from '../lib/comment-action-token.js'
import { sendCommentNotificationEmail } from '../lib/email.js'
import { getAppUrl } from '../lib/url.js'

const router = Router()

async function getSiteForUser(siteKey: string, userId: number) {
  return prisma.site.findFirst({
    where: { siteKey, userId },
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

// GET /api/dashboard/comments?siteKey=xxx&status=pending|approved|spam&page=1&per_page=20&postId=&search=
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

  const status = req.query.status as string
  const validStatuses = ['pending', 'approved', 'spam', 'deleted']
  const statusFilter = validStatuses.includes(status) ? status : status === 'all' ? null : 'pending'
  const page = Math.max(1, parseInt(String(req.query.page || 1), 10))
  const perPage = Math.min(50, Math.max(1, parseInt(String(req.query.per_page || 20), 10)))
  const postId = typeof req.query.postId === 'string' ? req.query.postId.trim() : null
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : null

  const where: Record<string, unknown> = {
    siteId: site.id,
    ...(statusFilter ? { status: statusFilter } : {}),
  }
  if (postId) where.postId = postId
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

  const [pending, approved, spam, deleted] = await Promise.all([
    prisma.comment.count({ where: { siteId: site.id, status: 'pending' } }),
    prisma.comment.count({ where: { siteId: site.id, status: 'approved' } }),
    prisma.comment.count({ where: { siteId: site.id, status: 'spam' } }),
    prisma.comment.count({ where: { siteId: site.id, status: 'deleted' } }),
  ])

  res.json({ pending, approved, spam, deleted })
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

  const body = req.body as { status?: string; body?: string }
  const updates: Record<string, unknown> = {}
  if (['approved', 'spam', 'deleted'].includes(body.status ?? '')) {
    updates.status = body.status
  }
  if (typeof body.body === 'string') {
    updates.body = body.body.trim().slice(0, 5000)
  }

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: 'No valid updates' })
    return
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
        if (notifyTo) {
          const appUrl = getAppUrl()
          const viewToken = signCommentActionToken(comment.id, 'view')
          const excerpt = comment.body.slice(0, 200) + (comment.body.length > 200 ? '…' : '')
          sendCommentNotificationEmail(
            notifyTo,
            comment.displayName,
            'Your post',
            excerpt,
            `${appUrl}/api/comment-actions/view?token=${viewToken}`
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
