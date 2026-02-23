import { PgBoss } from 'pg-boss'
import { getDatabaseUrl, getSslConfig } from '../lib/db-connection.js'

export const boss = new PgBoss({
  connectionString: getDatabaseUrl(),
  ssl: getSslConfig(),
  schema: 'pgboss'
})

boss.on('error', (err: Error) => console.error('[pg-boss]', err))

/** Queue name prefix for Stripe webhook events */
export const STRIPE_QUEUE_PREFIX = 'stripe.'

/** Convert Stripe event type to queue name, e.g. checkout.session.completed -> stripe.checkout.session.completed */
export function stripeEventToQueueName(eventType: string): string {
  return `${STRIPE_QUEUE_PREFIX}${eventType}`
}

/** Send a Stripe webhook event to the appropriate queue */
export async function queueStripeEvent(
  eventType: string,
  payload: { stripeEventId: string; type: string; data: object }
): Promise<string | null> {
  const queueName = stripeEventToQueueName(eventType)
  await boss.createQueue(queueName)
  return boss.send(queueName, payload)
}

export async function startQueue(): Promise<void> {
  await boss.start()
}

export async function stopQueue(): Promise<void> {
  await boss.stop()
}
