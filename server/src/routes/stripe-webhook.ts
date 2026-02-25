import { Router, Request, Response } from 'express'
import express from 'express'
import Stripe from 'stripe'
import prisma from '../db/index.js'
import { queueStripeEvent } from '../queue/index.js'

const router = Router()

/** Stripe event types we handle (each maps to a worker) */
const HANDLED_EVENT_TYPES = new Set([
  'checkout.session.completed',
  'customer.subscription.updated'
])

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set')
  return new Stripe(key)
}

function getWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET is not set')
  return secret
}

/**
 * POST /api/webhooks/stripe
 * Stripe webhook endpoint. Must use express.raw() - do NOT use express.json() for this route.
 * Mount with: app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }), stripeWebhookRoutes)
 */
router.post('/', async (req: Request, res: Response) => {
  const signature = req.headers['stripe-signature']
  if (typeof signature !== 'string') {
    res.status(400).json({ error: 'Missing stripe-signature header' })
    return
  }

  // req.body is a Buffer when using express.raw()
  const rawBody = req.body
  if (!Buffer.isBuffer(rawBody) && typeof rawBody !== 'string') {
    res.status(400).json({ error: 'Invalid webhook body' })
    return
  }

  let event: Stripe.Event
  try {
    const stripe = getStripe()
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      getWebhookSecret()
    )
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err)
    res.status(400).json({ error: 'Invalid signature' })
    return
  }

  // Idempotency: skip if we've already seen this event
  const existing = await prisma.stripeWebhookEvent.findUnique({
    where: { stripeEventId: event.id }
  })
  if (existing) {
    res.status(200).json({ received: true })
    return
  }

  // Store event and queue job only for types we handle
  const isHandled = HANDLED_EVENT_TYPES.has(event.type)

  await prisma.stripeWebhookEvent.create({
    data: {
      stripeEventId: event.id,
      type: event.type,
      status: isHandled ? 'pending' : 'processed'
    }
  })

  if (isHandled) {
    try {
      const jobId = await queueStripeEvent(event.type, {
        stripeEventId: event.id,
        type: event.type,
        data: event.data.object as object
      })
      console.log('[webhook] Stripe event queued', {
        eventType: event.type,
        stripeEventId: event.id,
        jobId
      })
    } catch (err) {
      console.error('Failed to queue Stripe event:', err)
      await prisma.stripeWebhookEvent.update({
        where: { stripeEventId: event.id },
        data: { status: 'failed', error: String(err) }
      })
      res.status(500).json({ error: 'Failed to queue event' })
      return
    }
  }

  res.status(200).json({ received: true })
})

export default router
