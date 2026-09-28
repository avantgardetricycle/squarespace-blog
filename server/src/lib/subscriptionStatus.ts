export const ACTIVE_SUBSCRIPTION_STATUSES = ['trialing', 'active'] as const

export function isActiveSubscriptionStatus(status: string | null | undefined): boolean {
  return status === 'trialing' || status === 'active'
}

/** Fully ended subscriptions that can start a new Checkout (not past_due / unpaid). */
export function isResubscribableStatus(status: string | null | undefined): boolean {
  return status == null || status === 'canceled' || status === 'incomplete_expired'
}
