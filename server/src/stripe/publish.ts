import { send } from '@vercel/queue'
import {
  dispatchStripeEvent,
  type CheckoutSessionCompletedPayload,
  type SubscriptionUpdatedPayload
} from './handlers.js'
import { stripeEventToTopic } from './topics.js'

export type StripeQueuePayload = CheckoutSessionCompletedPayload | SubscriptionUpdatedPayload

/** Publish a Stripe webhook payload to Vercel Queues. */
export async function publishStripeEvent(
  eventType: string,
  payload: StripeQueuePayload
): Promise<string> {
  const topic = stripeEventToTopic(eventType)
  const { messageId } = await send(topic, payload, {
    idempotencyKey: payload.stripeEventId
  })
  return messageId ?? payload.stripeEventId
}

/**
 * Publish to Vercel Queues, or process inline when queues are unavailable (local `npm run dev`).
 */
export async function publishStripeEventWithFallback(
  eventType: string,
  payload: StripeQueuePayload
): Promise<{ mode: 'queue' | 'inline'; id: string }> {
  const inlineFallback =
    process.env.STRIPE_QUEUE_INLINE_FALLBACK === 'true' ||
    (process.env.NODE_ENV !== 'production' && process.env.VERCEL !== '1')

  if (inlineFallback) {
    await dispatchStripeEvent(eventType, payload)
    return { mode: 'inline', id: 'inline' }
  }

  try {
    const messageId = await publishStripeEvent(eventType, payload)
    return { mode: 'queue', id: messageId }
  } catch (err) {
    console.error('[stripe] Vercel Queue publish failed, processing inline:', err)
    await dispatchStripeEvent(eventType, payload)
    return { mode: 'inline', id: 'inline-fallback' }
  }
}
