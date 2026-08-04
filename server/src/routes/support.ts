import { Router, Request, Response } from 'express'
import { sendSupportRequestEmail } from '../lib/email.js'

const router = Router()

const SUPPORT_SUBJECTS = new Set([
  'Installation',
  'Billing & plans',
  'Feature question',
  "Bug — something's broken",
  'Other',
])

const MAX_SCREENSHOT_BYTES = 10 * 1024 * 1024
const ALLOWED_SCREENSHOT_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg'])

interface SupportRequestBody {
  name?: string
  email?: string
  mode?: string
  subject?: string
  message?: string
  pageUrl?: string
  screenshot?: {
    filename?: string
    contentType?: string
    data?: string
  }
}

router.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body as SupportRequestBody

    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const mode = body.mode === 'problem' ? 'problem' : 'question'
    const subject = typeof body.subject === 'string' ? body.subject.trim() : ''
    const message = typeof body.message === 'string' ? body.message.trim() : ''
    const pageUrl = typeof body.pageUrl === 'string' ? body.pageUrl.trim() : undefined

    if (!name) {
      res.status(400).json({ error: 'Name is required' })
      return
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: 'A valid email is required' })
      return
    }
    if (!subject || !SUPPORT_SUBJECTS.has(subject)) {
      res.status(400).json({ error: 'Please select a valid topic' })
      return
    }
    if (!message) {
      res.status(400).json({ error: 'Message is required' })
      return
    }

    let screenshot: { filename: string; contentType: string; data: string } | undefined
    if (body.screenshot && typeof body.screenshot === 'object') {
      const filename = typeof body.screenshot.filename === 'string' ? body.screenshot.filename.trim() : ''
      const contentType = typeof body.screenshot.contentType === 'string' ? body.screenshot.contentType.trim().toLowerCase() : ''
      const data = typeof body.screenshot.data === 'string' ? body.screenshot.data.trim() : ''

      if (filename && data) {
        if (!ALLOWED_SCREENSHOT_TYPES.has(contentType)) {
          res.status(400).json({ error: 'Screenshot must be a PNG or JPG image' })
          return
        }

        const base64 = data.includes(',') ? data.split(',')[1] ?? '' : data
        const byteLength = Buffer.from(base64, 'base64').byteLength
        if (byteLength > MAX_SCREENSHOT_BYTES) {
          res.status(400).json({ error: 'Screenshot must be 10MB or smaller' })
          return
        }

        screenshot = { filename, contentType, data: base64 }
      }
    }

    await sendSupportRequestEmail({
      name,
      email,
      mode,
      subject,
      message,
      pageUrl: pageUrl || undefined,
      screenshot,
    })

    res.status(201).json({ ok: true })
  } catch (err) {
    console.error('[support] POST error:', err)
    res.status(500).json({ error: 'Failed to send message' })
  }
})

export default router
