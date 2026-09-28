export const ACTIVE_SUBSCRIPTION_STATUSES = ['trialing', 'active'] as const

export const BETA_SUBSCRIPTION_SOURCE = 'beta'

export function isActiveSubscriptionStatus(status: string | null | undefined): boolean {
  return status === 'trialing' || status === 'active'
}

/** Fully ended subscriptions that can start a new Checkout (not past_due / unpaid). */
export function isResubscribableStatus(status: string | null | undefined): boolean {
  return status == null || status === 'canceled' || status === 'incomplete_expired'
}

/** Synthetic customer ids for beta grants. These are not Stripe customers. */
export function isBetaCustomerId(id: string | null | undefined): boolean {
  return typeof id === 'string' && id.startsWith('beta_')
}

export function usableStripeCustomerId(id: string | null | undefined): string | null {
  if (!id || isBetaCustomerId(id)) return null
  return id
}

export type SubscriptionEntitlementInput = {
  status?: string | null
  source?: string | null
  currentPeriodEnd?: Date | string | null
}

export function isBetaSubscription(
  sub: { source?: string | null } | null | undefined
): boolean {
  return sub?.source === BETA_SUBSCRIPTION_SOURCE
}

/**
 * Paid access. Stripe rows use status alone. Beta rows also require currentPeriodEnd
 * to still be in the future so a one-year grant expires without a Stripe webhook.
 */
export function isEntitledSubscription(
  sub: SubscriptionEntitlementInput | null | undefined,
  now: Date = new Date()
): boolean {
  if (!sub || !isActiveSubscriptionStatus(sub.status)) return false
  if (!isBetaSubscription(sub)) return true
  if (!sub.currentPeriodEnd) return false
  const end = sub.currentPeriodEnd instanceof Date ? sub.currentPeriodEnd : new Date(sub.currentPeriodEnd)
  return !Number.isNaN(end.getTime()) && end.getTime() > now.getTime()
}

/**
 * Status shown to the client. An expired beta grant is reported as canceled so the
 * existing resubscribe UI applies. The stored row stays active until a paid
 * subscription replaces it.
 */
export function effectiveSubscriptionStatus(
  sub: SubscriptionEntitlementInput | null | undefined,
  now: Date = new Date()
): string | null {
  if (!sub?.status) return sub?.status ?? null
  if (isBetaSubscription(sub) && sub.status === 'active' && !isEntitledSubscription(sub, now)) {
    return 'canceled'
  }
  return sub.status
}

/** Prefer a grant that still unlocks the product, otherwise the newest row. */
export function pickDisplaySubscription<T extends SubscriptionEntitlementInput>(
  subs: T[],
  now: Date = new Date()
): T | null {
  return subs.find((sub) => isEntitledSubscription(sub, now)) ?? subs[0] ?? null
}
