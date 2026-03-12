import { Router, Request, Response } from 'express'
import prisma from '../db/index.js'
import { getSiteBySiteKey } from '../db/index.js'
import { sendNewSubscriberNotification, sendNewLeadMagnetNotification } from '../lib/email.js'

const router = Router()

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_EMAIL_LENGTH = 254
const MAX_NAME_LENGTH = 200
const MAX_RESOURCE_TITLE_LENGTH = 200

// Simple in-memory rate limiter: { key: [timestamps] }
const rateLimitMap = new Map<string, number[]>()
const RATE_LIMIT_WINDOW_MS = 60 * 1000 // 1 minute
const RATE_LIMIT_PER_SITE = 10
const RATE_LIMIT_PER_IP = 20

function cleanupRateLimit(): void {
  const now = Date.now()
  const cutoff = now - RATE_LIMIT_WINDOW_MS
  for (const [key, timestamps] of rateLimitMap.entries()) {
    const filtered = timestamps.filter((t) => t > cutoff)
    if (filtered.length === 0) {
      rateLimitMap.delete(key)
    } else {
      rateLimitMap.set(key, filtered)
    }
  }
}

function checkRateLimit(siteKey: string, ip: string): boolean {
  cleanupRateLimit()
  const siteKey2 = `site:${siteKey}`
  const ipKey = `ip:${ip}`
  const now = Date.now()
  const siteTimestamps = rateLimitMap.get(siteKey2) ?? []
  const ipTimestamps = rateLimitMap.get(ipKey) ?? []

  if (siteTimestamps.length >= RATE_LIMIT_PER_SITE || ipTimestamps.length >= RATE_LIMIT_PER_IP) {
    return false
  }

  siteTimestamps.push(now)
  ipTimestamps.push(now)
  rateLimitMap.set(siteKey2, siteTimestamps)
  rateLimitMap.set(ipKey, ipTimestamps)
  return true
}

// POST /api/capture - Submit email capture (public, no auth, called from Squarespace)
router.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body as {
      siteKey?: string
      type?: string
      email?: string
      name?: string
      resourceTitle?: string
    }

    const siteKey = typeof body.siteKey === 'string' ? body.siteKey.trim() : null
    const type = body.type === 'newsletter' || body.type === 'lead_magnet' ? body.type : null
    const emailRaw = typeof body.email === 'string' ? body.email.trim() : null

    if (!siteKey || !type || !emailRaw) {
      res.status(400).json({ error: 'siteKey, type, and email are required' })
      return
    }

    if (!EMAIL_REGEX.test(emailRaw) || emailRaw.length > MAX_EMAIL_LENGTH) {
      res.status(400).json({ error: 'Invalid email address' })
      return
    }

    const email = emailRaw.toLowerCase()
    const name =
      typeof body.name === 'string' && body.name.trim().length > 0
        ? body.name.trim().slice(0, MAX_NAME_LENGTH)
        : null

    const resourceTitle =
      type === 'lead_magnet' && typeof body.resourceTitle === 'string' && body.resourceTitle.trim().length > 0
        ? body.resourceTitle.trim().slice(0, MAX_RESOURCE_TITLE_LENGTH)
        : type === 'newsletter'
          ? ''
          : null

    if (type === 'lead_magnet' && !resourceTitle) {
      res.status(400).json({ error: 'resourceTitle is required for lead_magnet' })
      return
    }

    const ip = (req.ip ?? req.socket.remoteAddress ?? 'unknown').toString()
    if (!checkRateLimit(siteKey, ip)) {
      res.status(429).json({ error: 'Too many requests. Please try again later.' })
      return
    }

    const site = await getSiteBySiteKey(siteKey)
    if (!site || site.status !== 'active') {
      res.status(404).json({ error: 'Site not found or inactive' })
      return
    }

    const resourceTitleForDb = type === 'newsletter' ? '' : (resourceTitle ?? '')

    await prisma.leadCapture.upsert({
      where: {
        siteId_email_type_resourceTitle: {
          siteId: site.id,
          email,
          type,
          resourceTitle: resourceTitleForDb,
        },
      },
      create: {
        siteId: site.id,
        email,
        name,
        type,
        resourceTitle: resourceTitleForDb,
      },
      update: { name },
    })

    const siteOwner = await prisma.user.findUnique({
      where: { id: site.userId },
      select: { email: true },
    })
    const ownerEmail = siteOwner?.email
    const siteName = site.name || site.url || 'your blog'

    if (ownerEmail) {
      if (type === 'newsletter') {
        await sendNewSubscriberNotification(ownerEmail, siteName, email, name ?? undefined)
      } else {
        await sendNewLeadMagnetNotification(
          ownerEmail,
          siteName,
          email,
          resourceTitle ?? 'Lead magnet',
          name ?? undefined
        )
      }
    }

    res.status(201).json({ ok: true })
  } catch (err) {
    console.error('[capture] POST error:', err)
    res.status(500).json({ error: 'Failed to submit' })
  }
})

export default router
