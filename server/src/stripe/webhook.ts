import Stripe from 'stripe'
import prisma from '../db/index.js'
import { publishStripeEventWithFallback, type StripeQueuePayload } from './publish.js'

/** Stripe event types processed asynchronously via Vercel Queues */
export const HANDLED_STRIPE_EVENT_TYPES = new Set([
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

export type StripeWebhookResult =
  | { status: 200; body: { received: true } }
  | { status: 400; body: { error: string } }
  | { status: 500; body: { error: string } }

/**
 * Verify and persist a Stripe webhook, then enqueue (or inline-process) handled events.
 */
export async function processStripeWebhook(
  rawBody: Buffer | string,
  signature: string | undefined
): Promise<StripeWebhookResult> {
  if (typeof signature !== 'string') {
    return { status: 400, body: { error: 'Missing stripe-signature header' } }
  }

  let event: Stripe.Event
  try {
    const stripe = getStripe()
    event = stripe.webhooks.constructEvent(rawBody, signature, getWebhookSecret())
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err)
    return { status: 400, body: { error: 'Invalid signature' } }
  }

  const existing = await prisma.stripeWebhookEvent.findUnique({
    where: { stripeEventId: event.id }
  })
  if (existing) {
    return { status: 200, body: { received: true } }
  }

  const isHandled = HANDLED_STRIPE_EVENT_TYPES.has(event.type)

  await prisma.stripeWebhookEvent.create({
    data: {
      stripeEventId: event.id,
      type: event.type,
      status: isHandled ? 'pending' : 'processed'
    }
  })

  if (isHandled) {
    try {
      const queuePayload: StripeQueuePayload = {
        stripeEventId: event.id,
        type: event.type,
        data: event.data.object as unknown as StripeQueuePayload['data']
      }
      const result = await publishStripeEventWithFallback(event.type, queuePayload)
      console.log('[webhook] Stripe event dispatched', {
        eventType: event.type,
        stripeEventId: event.id,
        mode: result.mode,
        id: result.id
      })
    } catch (err) {
      console.error('Failed to dispatch Stripe event:', err)
      await prisma.stripeWebhookEvent.update({
        where: { stripeEventId: event.id },
        data: { status: 'failed', error: String(err) }
      })
      return { status: 500, body: { error: 'Failed to queue event' } }
    }
  }

  return { status: 200, body: { received: true } }
}
