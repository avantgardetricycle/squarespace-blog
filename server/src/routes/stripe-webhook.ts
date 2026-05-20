import { Router, type Request, type Response } from 'express'
import { processStripeWebhook } from '../stripe/webhook.js'

const router = Router()

/**
 * POST /api/webhooks/stripe
 * Local dev / non-Vercel: raw body via express.raw() on mount.
 */
router.post('/', async (req: Request, res: Response) => {
  const rawBody = req.body
  if (!Buffer.isBuffer(rawBody) && typeof rawBody !== 'string') {
    res.status(400).json({ error: 'Invalid webhook body' })
    return
  }

  const result = await processStripeWebhook(
    rawBody,
    req.headers['stripe-signature'] as string | undefined
  )
  res.status(result.status).json(result.body)
})

export default router
