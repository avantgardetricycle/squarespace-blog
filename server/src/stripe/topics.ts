/** Vercel Queue topic names (match former pg-boss queue names). */
export const STRIPE_TOPIC_CHECKOUT_COMPLETED = 'stripe.checkout.session.completed'
export const STRIPE_TOPIC_SUBSCRIPTION_UPDATED = 'stripe.customer.subscription.updated'

export function stripeEventToTopic(eventType: string): string {
  return `stripe.${eventType}`
}

export function topicToStripeEventType(topic: string): string | null {
  if (!topic.startsWith('stripe.')) return null
  return topic.slice('stripe.'.length)
}
