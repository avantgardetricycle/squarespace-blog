export const ACTIVE_SUBSCRIPTION_STATUSES = ['trialing', 'active'] as const

export const PAYMENT_FAILED_STATUSES = ['past_due', 'unpaid'] as const

/** Live blog keeps rendering this long after the first failed payment. Settings stay locked. */
export const PAYMENT_GRACE_PERIOD_MS = 7 * 24 * 60 * 60 * 1000

export const BETA_SUBSCRIPTION_SOURCE = 'beta'

export function isActiveSubscriptionStatus(status: string | null | undefined): boolean {
  return status === 'trialing' || status === 'active'
}

export function isPaymentFailedStatus(status: string | null | undefined): boolean {
  return status === 'past_due' || status === 'unpaid'
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
  paymentFailedAt?: Date | string | null
}

export function isBetaSubscription(
  sub: { source?: string | null } | null | undefined
): boolean {
  return sub?.source === BETA_SUBSCRIPTION_SOURCE
}

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

/**
 * End of the render-only window. The clock starts at paymentFailedAt and is not
 * reset by later past_due or unpaid updates.
 */
export function paymentGraceEndsAt(
  sub: SubscriptionEntitlementInput | null | undefined
): Date | null {
  if (!sub || isBetaSubscription(sub) || !isPaymentFailedStatus(sub.status)) return null
  const start = toDate(sub.paymentFailedAt)
  if (!start) return null
  return new Date(start.getTime() + PAYMENT_GRACE_PERIOD_MS)
}

export function isInPaymentGrace(
  sub: SubscriptionEntitlementInput | null | undefined,
  now: Date = new Date()
): boolean {
  const ends = paymentGraceEndsAt(sub)
  return ends != null && ends.getTime() > now.getTime()
}

/** Public blog rendering. Full subscribers and in-grace failed payments. */
export function canRenderSubscription(
  sub: SubscriptionEntitlementInput | null | undefined,
  now: Date = new Date()
): boolean {
  return isEntitledSubscription(sub, now) || isInPaymentGrace(sub, now)
}

/**
 * Keep the original failure time while the subscription stays past_due or unpaid.
 * A later return to a failed status starts a new window. Recovery clears it.
 */
export function nextPaymentFailedAt(
  existing: { status?: string | null; paymentFailedAt?: Date | null },
  nextStatus: string,
  now: Date = new Date()
): Date | null {
  if (isPaymentFailedStatus(nextStatus)) {
    if (isPaymentFailedStatus(existing.status) && existing.paymentFailedAt) {
      return existing.paymentFailedAt
    }
    return now
  }
  if (
    nextStatus === 'active' ||
    nextStatus === 'trialing' ||
    nextStatus === 'canceled' ||
    nextStatus === 'incomplete_expired'
  ) {
    return null
  }
  return existing.paymentFailedAt ?? null
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
