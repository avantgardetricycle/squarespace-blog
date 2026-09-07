import { Router, Request, Response } from 'express'
import Anthropic from '@anthropic-ai/sdk'
import prisma from '../db/index.js'
import { requireSession, SessionUser } from '../middleware/session.js'
import { buildBlogConfigSummary } from '../lib/support-blog-config.js'
import {
  countUserMessages,
  parseSupportChatMessages,
  type SupportChatMessage,
} from '../lib/support-chat-types.js'
import {
  SUPPORT_CHAT_MAX_CONTENT_CHARS,
  SUPPORT_CHAT_MAX_MESSAGES,
  SUPPORT_CHAT_MAX_TOKENS,
  SUPPORT_CHAT_MODEL,
  SUPPORT_CHAT_RATE_LIMIT,
  SUPPORT_CHAT_RATE_WINDOW_MS,
  buildSupportSystemPrompt,
} from '../lib/support-prompt.js'

const router = Router()

function getAnthropic(): Anthropic | null {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return null
  return new Anthropic({ apiKey: key })
}

async function countRecentUserMessages(userId: number): Promise<number> {
  const since = new Date(Date.now() - SUPPORT_CHAT_RATE_WINDOW_MS)
  const rows = await prisma.supportConversation.findMany({
    where: { userId, updatedAt: { gte: since } },
    select: { messages: true },
  })
  return rows.reduce((sum, row) => sum + countUserMessages(parseSupportChatMessages(row.messages)), 0)
}

function validateIncomingMessages(raw: unknown): SupportChatMessage[] | { error: string } {
  if (!Array.isArray(raw)) {
    return { error: 'messages must be an array' }
  }
  const messages = parseSupportChatMessages(raw).slice(-SUPPORT_CHAT_MAX_MESSAGES)
  if (messages.length === 0) {
    return { error: 'messages must include at least one user message' }
  }
  if (messages[messages.length - 1]?.role !== 'user') {
    return { error: 'Last message must be from the user' }
  }
  for (const message of messages) {
    const content = message.content.trim()
    if (!content) {
      return { error: 'Message content cannot be empty' }
    }
    if (content.length > SUPPORT_CHAT_MAX_CONTENT_CHARS) {
      return { error: `Each message must be ${SUPPORT_CHAT_MAX_CONTENT_CHARS} characters or fewer` }
    }
    message.content = content
  }
  return messages
}

router.post('/chat', requireSession, async (req: Request, res: Response) => {
  const { user } = req as Request & { user: SessionUser }
  const body = req.body as { messages?: unknown; conversation_id?: unknown; site_id?: unknown }

  const messagesOrError = validateIncomingMessages(body.messages)
  if ('error' in messagesOrError) {
    res.status(400).json({ error: 'invalid_request', message: messagesOrError.error })
    return
  }
  const messages = messagesOrError

  const conversationId =
    typeof body.conversation_id === 'string' && body.conversation_id.trim()
      ? body.conversation_id.trim()
      : null
  const requestedSiteId =
    typeof body.site_id === 'string' && body.site_id.trim() ? body.site_id.trim() : null

  try {
    const recentCount = await countRecentUserMessages(user.id)
    if (recentCount >= SUPPORT_CHAT_RATE_LIMIT) {
      res.status(429).json({
        error: 'rate_limited',
        retry_after: 3600,
        message:
          "You've sent a lot of messages — take a short break or send your question directly to the team.",
      })
      return
    }

    const anthropic = getAnthropic()
    if (!anthropic) {
      res.status(503).json({ error: 'invalid_request', message: 'Support chat is not configured' })
      return
    }

    const config = await buildBlogConfigSummary(user.id, requestedSiteId)
    const siteId = config?.siteId ?? null
    const system = buildSupportSystemPrompt(config ? JSON.stringify(config.summary, null, 2) : null)

    let conversation = conversationId
      ? await prisma.supportConversation.findFirst({
          where: { id: conversationId, userId: user.id },
        })
      : null

    if (conversationId && !conversation) {
      res.status(400).json({ error: 'invalid_request', message: 'Unknown conversation' })
      return
    }

    if (!conversation) {
      conversation = await prisma.supportConversation.create({
        data: {
          userId: user.id,
          siteId,
          messages: messages as object,
        },
      })
    }

    res.status(200)
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')
    if (typeof res.flushHeaders === 'function') {
      res.flushHeaders()
    }

    let assistantText = ''
    try {
      const stream = anthropic.messages.stream({
        model: SUPPORT_CHAT_MODEL,
        max_tokens: SUPPORT_CHAT_MAX_TOKENS,
        system,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      })

      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          assistantText += event.delta.text
          res.write(`data: ${JSON.stringify({ delta: event.delta.text })}\n\n`)
        }
      }

      const fullMessages: SupportChatMessage[] = [
        ...messages,
        { role: 'assistant', content: assistantText },
      ]
      await prisma.supportConversation.update({
        where: { id: conversation.id },
        data: {
          messages: fullMessages as object,
          siteId,
        },
      })

      res.write(`data: ${JSON.stringify({ done: true, conversation_id: conversation.id })}\n\n`)
      res.end()
    } catch (err) {
      console.error('[support/chat] stream error:', err)
      if (!res.writableEnded) {
        res.write(
          `data: ${JSON.stringify({ error: 'invalid_request', message: 'Failed to generate a response' })}\n\n`
        )
        res.end()
      }
    }
  } catch (err) {
    console.error('[support/chat] POST error:', err)
    if (res.headersSent) {
      if (!res.writableEnded) res.end()
      return
    }
    res.status(500).json({ error: 'invalid_request', message: 'Failed to start chat' })
  }
})

export default router
