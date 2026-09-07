import { Router, Request, Response } from 'express'
import prisma from '../db/index.js'
import { verifyCommentActionToken } from '../lib/comment-action-token.js'
import { getAppUrl } from '../lib/url.js'

const router = Router()

// GET /api/comment-actions/verify?token=xxx
router.get('/verify', (req: Request, res: Response) => {
  const token = typeof req.query.token === 'string' ? req.query.token : null
  if (!token) {
    res.status(400).json({ error: 'invalid_token' })
    return
  }

  const parsed = verifyCommentActionToken(token)
  if (!parsed) {
    res.status(400).json({ error: 'invalid_token' })
    return
  }

  res.json(parsed)
})

// GET /api/comment-actions/approve?token=xxx
router.get('/approve', async (req: Request, res: Response) => {
  const token = typeof req.query.token === 'string' ? req.query.token : null
  if (!token) {
    res.redirect(getAppUrl() + '/dashboard/comments?error=invalid_token')
    return
  }

  const parsed = verifyCommentActionToken(token)
  if (!parsed || parsed.action !== 'approve') {
    res.redirect(getAppUrl() + '/dashboard/comments?error=invalid_token')
    return
  }

  const comment = await prisma.comment.findUnique({ where: { id: parsed.commentId } })
  if (!comment) {
    res.redirect(getAppUrl() + '/dashboard/comments?error=not_found')
    return
  }

  await prisma.comment.update({
    where: { id: parsed.commentId },
    data: { status: 'approved' },
  })

  res.redirect(getAppUrl() + `/dashboard/comments?approved=${parsed.commentId}`)
})

// GET /api/comment-actions/spam?token=xxx
router.get('/spam', async (req: Request, res: Response) => {
  const token = typeof req.query.token === 'string' ? req.query.token : null
  if (!token) {
    res.redirect(getAppUrl() + '/dashboard/comments?error=invalid_token')
    return
  }

  const parsed = verifyCommentActionToken(token)
  if (!parsed || parsed.action !== 'spam') {
    res.redirect(getAppUrl() + '/dashboard/comments?error=invalid_token')
    return
  }

  const comment = await prisma.comment.findUnique({ where: { id: parsed.commentId } })
  if (!comment) {
    res.redirect(getAppUrl() + '/dashboard/comments?error=not_found')
    return
  }

  await prisma.comment.update({
    where: { id: parsed.commentId },
    data: { status: 'spam' },
  })

  res.redirect(getAppUrl() + `/dashboard/comments?spam=${parsed.commentId}`)
})

// GET /api/comment-actions/view?token=xxx
router.get('/view', async (req: Request, res: Response) => {
  const token = typeof req.query.token === 'string' ? req.query.token : null
  if (!token) {
    res.redirect(getAppUrl() + '/dashboard/comments?error=invalid_token')
    return
  }

  const parsed = verifyCommentActionToken(token)
  if (!parsed || parsed.action !== 'view') {
    res.redirect(getAppUrl() + '/dashboard/comments?error=invalid_token')
    return
  }

  res.redirect(getAppUrl() + `/dashboard/comments?highlight=${parsed.commentId}&token=${encodeURIComponent(token)}`)
})

export default router
