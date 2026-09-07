import { Router, Request, Response, NextFunction } from 'express'
import multer from 'multer'
import prisma from '../db/index.js'
import { requireSession, SessionUser } from '../middleware/session.js'
import { sendSupportTicketEmail } from '../lib/email.js'
import {
  SUPPORT_SCREENSHOT_MAX_BYTES,
  detectImageMimeFromMagicBytes,
  getSupportScreenshotSignedUrl,
  isAllowedSupportScreenshotType,
  isSupportScreenshotStorageConfigured,
  uploadSupportScreenshot,
} from '../lib/support-screenshots.js'

const router = Router()

const MAX_SUBJECT = 120
const MAX_DESCRIPTION = 3000

const screenshotUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: SUPPORT_SCREENSHOT_MAX_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!isAllowedSupportScreenshotType(file.mimetype)) {
      cb(new Error('Screenshot must be a PNG, JPG, or GIF image'))
      return
    }
    cb(null, true)
  },
})

function isFileTooLarge(err: unknown): boolean {
  return Boolean(err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'LIMIT_FILE_SIZE')
}

function handleScreenshotUpload(req: Request, res: Response, next: NextFunction): void {
  const parse = screenshotUpload.single('screenshot') as (
    req: Request,
    res: Response,
    cb: (err?: unknown) => void
  ) => void
  parse(req, res, (err?: unknown) => {
    if (isFileTooLarge(err)) {
      res.status(400).json({ error: 'Screenshot must be 5MB or smaller' })
      return
    }
    if (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Upload failed' })
      return
    }
    next()
  })
}

router.post('/contact', requireSession, handleScreenshotUpload, async (req: Request, res: Response) => {
  const { user } = req as Request & { user: SessionUser }
  const subject = typeof req.body?.subject === 'string' ? req.body.subject.trim() : ''
  const description = typeof req.body?.description === 'string' ? req.body.description.trim() : ''
  const conversationId =
    typeof req.body?.conversation_id === 'string' && req.body.conversation_id.trim()
      ? req.body.conversation_id.trim()
      : null
  const siteId =
    typeof req.body?.site_id === 'string' && req.body.site_id.trim() ? req.body.site_id.trim() : null
  const file = (req as Request & { file?: { buffer: Buffer; mimetype: string } }).file

  if (!subject) {
    res.status(400).json({ error: 'Subject is required' })
    return
  }
  if (subject.length > MAX_SUBJECT) {
    res.status(400).json({ error: `Subject must be ${MAX_SUBJECT} characters or fewer` })
    return
  }
  if (!description) {
    res.status(400).json({ error: 'Description is required' })
    return
  }
  if (description.length > MAX_DESCRIPTION) {
    res.status(400).json({ error: `Description must be ${MAX_DESCRIPTION} characters or fewer` })
    return
  }

  try {
    const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
    if (!dbUser) {
      res.status(401).json({ error: 'unauthorized' })
      return
    }

    const site = siteId
      ? await prisma.site.findFirst({ where: { id: siteId, userId: user.id, deletedAt: null } })
      : await prisma.site.findFirst({
          where: { userId: user.id, status: 'active', deletedAt: null },
          orderBy: { createdAt: 'desc' },
        })

    if (siteId && !site) {
      res.status(400).json({ error: 'Unknown blog' })
      return
    }

    let conversation = null
    if (conversationId) {
      conversation = await prisma.supportConversation.findFirst({
        where: { id: conversationId, userId: user.id },
      })
      if (!conversation) {
        res.status(400).json({ error: 'Unknown conversation' })
        return
      }
    }

    let screenshotPath: string | undefined
    if (file?.buffer) {
      if (!isSupportScreenshotStorageConfigured()) {
        res.status(503).json({ error: 'Screenshot uploads are not configured' })
        return
      }
      const detected = detectImageMimeFromMagicBytes(file.buffer)
      if (!detected) {
        res.status(400).json({ error: 'Screenshot must be a PNG, JPG, or GIF image' })
        return
      }
      screenshotPath = await uploadSupportScreenshot(user.id, file.buffer, detected)
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        userId: user.id,
        siteId: site?.id ?? null,
        subject,
        description,
        screenshotUrl: screenshotPath ?? null,
        conversationId: conversation?.id ?? null,
        accountEmail: dbUser.email,
        blogUrl: site?.url ?? null,
        status: 'open',
      },
    })

    if (conversation) {
      await prisma.supportConversation.update({
        where: { id: conversation.id },
        data: { escalated: true, escalatedAt: new Date() },
      })
    }

    let screenshotLink: string | undefined
    if (screenshotPath) {
      screenshotLink = (await getSupportScreenshotSignedUrl(screenshotPath)) ?? undefined
    }

    await sendSupportTicketEmail({
      ticketId: ticket.id,
      accountEmail: dbUser.email,
      accountName: dbUser.name,
      subject,
      description,
      blogUrl: site?.url ?? null,
      conversationId: conversation?.id ?? null,
      screenshotUrl: screenshotLink,
    })

    res.status(201).json({
      ticket_id: ticket.id,
      message: `Sent! We'll reply to you at ${dbUser.email} within one business day.`,
    })
  } catch (err) {
    console.error('[support/contact] POST error:', err)
    res.status(500).json({ error: 'Failed to send message' })
  }
})

export default router
