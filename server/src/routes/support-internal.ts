import { Router, Request, Response } from 'express'
import prisma from '../db/index.js'
import { requireTeamSession } from '../middleware/session.js'
import { getSupportScreenshotSignedUrl } from '../lib/support-screenshots.js'
import { parseSupportChatMessages } from '../lib/support-chat-types.js'

const router = Router()
const TICKET_STATUSES = ['open', 'in_progress', 'resolved', 'closed'] as const

function parsePositiveInt(value: unknown, fallback: number): number {
  const n = typeof value === 'string' ? parseInt(value, 10) : typeof value === 'number' ? value : NaN
  return Number.isFinite(n) && n > 0 ? n : fallback
}

function parseBool(value: unknown): boolean | undefined {
  if (value === 'true' || value === true) return true
  if (value === 'false' || value === false) return false
  return undefined
}

function parseDate(value: unknown): Date | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? undefined : d
}

router.get('/conversations', requireTeamSession, async (req: Request, res: Response) => {
  const page = parsePositiveInt(req.query.page, 1)
  const perPage = Math.min(parsePositiveInt(req.query.per_page, 25), 100)
  const escalated = parseBool(req.query.escalated)
  const from = parseDate(req.query.from)
  const to = parseDate(req.query.to)
  const accountIdRaw = req.query.account_id
  const accountId =
    typeof accountIdRaw === 'string' && accountIdRaw.trim() ? parseInt(accountIdRaw, 10) : undefined

  const where: {
    escalated?: boolean
    createdAt?: { gte?: Date; lte?: Date }
    userId?: number
  } = {}
  if (typeof escalated === 'boolean') where.escalated = escalated
  if (from || to) {
    where.createdAt = {}
    if (from) where.createdAt.gte = from
    if (to) where.createdAt.lte = to
  }
  if (Number.isFinite(accountId)) where.userId = accountId

  try {
    const [total, rows] = await Promise.all([
      prisma.supportConversation.count({ where }),
      prisma.supportConversation.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
        include: {
          user: { select: { email: true, name: true } },
          site: { select: { url: true, name: true } },
        },
      }),
    ])

    res.json({
      page,
      per_page: perPage,
      total,
      conversations: rows.map((row) => {
        const messages = parseSupportChatMessages(row.messages)
        return {
          id: row.id,
          created_at: row.createdAt,
          updated_at: row.updatedAt,
          account_email: row.user.email,
          account_name: row.user.name,
          blog_url: row.site?.url ?? null,
          blog_name: row.site?.name ?? null,
          message_count: messages.length,
          escalated: row.escalated,
          escalated_at: row.escalatedAt,
        }
      }),
    })
  } catch (err) {
    console.error('[support/conversations] GET error:', err)
    res.status(500).json({ error: 'Failed to load conversations' })
  }
})

router.get('/conversations/:id', requireTeamSession, async (req: Request, res: Response) => {
  const id = typeof req.params.id === 'string' ? req.params.id : ''
  try {
    const row = await prisma.supportConversation.findUnique({
      where: { id },
      include: {
        user: { select: { email: true, name: true, id: true } },
        site: { select: { url: true, name: true } },
      },
    })
    if (!row) {
      res.status(404).json({ error: 'Not found' })
      return
    }
    res.json({
      id: row.id,
      created_at: row.createdAt,
      updated_at: row.updatedAt,
      account_id: row.user.id,
      account_email: row.user.email,
      account_name: row.user.name,
      blog_url: row.site?.url ?? null,
      blog_name: row.site?.name ?? null,
      escalated: row.escalated,
      escalated_at: row.escalatedAt,
      messages: parseSupportChatMessages(row.messages),
    })
  } catch (err) {
    console.error('[support/conversations/:id] GET error:', err)
    res.status(500).json({ error: 'Failed to load conversation' })
  }
})

router.get('/tickets', requireTeamSession, async (req: Request, res: Response) => {
  const page = parsePositiveInt(req.query.page, 1)
  const perPage = Math.min(parsePositiveInt(req.query.per_page, 25), 100)
  const status = typeof req.query.status === 'string' ? req.query.status : undefined
  const where = status && TICKET_STATUSES.includes(status as (typeof TICKET_STATUSES)[number])
    ? { status }
    : {}

  try {
    const [total, rows] = await Promise.all([
      prisma.supportTicket.count({ where }),
      prisma.supportTicket.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
        include: {
          site: { select: { url: true, name: true } },
        },
      }),
    ])

    res.json({
      page,
      per_page: perPage,
      total,
      tickets: rows.map((row) => ({
        id: row.id,
        created_at: row.createdAt,
        subject: row.subject,
        status: row.status,
        account_email: row.accountEmail,
        blog_url: row.blogUrl ?? row.site?.url ?? null,
        conversation_id: row.conversationId,
      })),
    })
  } catch (err) {
    console.error('[support/tickets] GET error:', err)
    res.status(500).json({ error: 'Failed to load tickets' })
  }
})

router.get('/tickets/:id', requireTeamSession, async (req: Request, res: Response) => {
  const id = typeof req.params.id === 'string' ? req.params.id : ''
  try {
    const row = await prisma.supportTicket.findUnique({
      where: { id },
      include: {
        site: { select: { url: true, name: true } },
        conversation: { select: { id: true, messages: true, escalated: true } },
      },
    })
    if (!row) {
      res.status(404).json({ error: 'Not found' })
      return
    }

    const screenshotUrl = row.screenshotUrl
      ? await getSupportScreenshotSignedUrl(row.screenshotUrl)
      : null

    res.json({
      id: row.id,
      created_at: row.createdAt,
      updated_at: row.updatedAt,
      subject: row.subject,
      description: row.description,
      status: row.status,
      account_email: row.accountEmail,
      blog_url: row.blogUrl ?? row.site?.url ?? null,
      conversation_id: row.conversationId,
      screenshot_url: screenshotUrl,
      messages: row.conversation ? parseSupportChatMessages(row.conversation.messages) : [],
    })
  } catch (err) {
    console.error('[support/tickets/:id] GET error:', err)
    res.status(500).json({ error: 'Failed to load ticket' })
  }
})

router.patch('/tickets/:id', requireTeamSession, async (req: Request, res: Response) => {
  const id = typeof req.params.id === 'string' ? req.params.id : ''
  const status = typeof req.body?.status === 'string' ? req.body.status.trim() : ''
  if (!TICKET_STATUSES.includes(status as (typeof TICKET_STATUSES)[number])) {
    res.status(400).json({ error: 'Invalid status' })
    return
  }
  try {
    const existing = await prisma.supportTicket.findUnique({ where: { id } })
    if (!existing) {
      res.status(404).json({ error: 'Not found' })
      return
    }
    const updated = await prisma.supportTicket.update({
      where: { id },
      data: { status },
    })
    res.json({ id: updated.id, status: updated.status })
  } catch (err) {
    console.error('[support/tickets/:id] PATCH error:', err)
    res.status(500).json({ error: 'Failed to update ticket' })
  }
})

export default router
