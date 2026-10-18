export function isActiveSubscriptionStatus(status: string | null | undefined): boolean {
  return status === "trialing" || status === "active";
}

export function isPaymentFailedStatus(status: string | null | undefined): boolean {
  return status === "past_due" || status === "unpaid";
}

/** Must match server PAYMENT_GRACE_PERIOD_MS. */
export const PAYMENT_GRACE_PERIOD_MS = 7 * 24 * 60 * 60 * 1000;

/** Must match server BETA_CONVERSION_MIN_TRIAL_MS. Stripe needs trial_end at least 48 hours out. */
const BETA_CONVERSION_MIN_TRIAL_MS = 48 * 60 * 60 * 1000 + 5 * 60 * 1000;

/** True when subscribing now bills at the end of beta access instead of today. */
export function betaChargeWaitsUntilAccessEnds(
  currentPeriodEnd: string | null | undefined,
  now: Date = new Date()
): boolean {
  if (!currentPeriodEnd) return false;
  const end = new Date(currentPeriodEnd);
  if (Number.isNaN(end.getTime())) return false;
  return end.getTime() >= now.getTime() + BETA_CONVERSION_MIN_TRIAL_MS;
}

export function paymentGraceEndsAt(
  subscription:
    | {
        status?: string | null;
        source?: string | null;
        paymentFailedAt?: string | null;
      }
    | null
    | undefined
): Date | null {
  if (!subscription || subscription.source === "beta" || !isPaymentFailedStatus(subscription.status)) {
    return null;
  }
  if (!subscription.paymentFailedAt) return null;
  const start = new Date(subscription.paymentFailedAt);
  if (Number.isNaN(start.getTime())) return null;
  return new Date(start.getTime() + PAYMENT_GRACE_PERIOD_MS);
}

export function isInPaymentGrace(
  subscription:
    | {
        status?: string | null;
        source?: string | null;
        paymentFailedAt?: string | null;
      }
    | null
    | undefined,
  now: Date = new Date()
): boolean {
  const ends = paymentGraceEndsAt(subscription);
  return ends != null && ends.getTime() > now.getTime();
}

export function hasActiveSubscription(
  subscription:
    | {
        status: string;
        source?: string | null;
        currentPeriodEnd?: string | null;
      }
    | null
    | undefined
): boolean {
  if (!isActiveSubscriptionStatus(subscription?.status)) return false;
  if (subscription?.source === "beta") {
    if (!subscription.currentPeriodEnd) return false;
    const end = new Date(subscription.currentPeriodEnd);
    return !Number.isNaN(end.getTime()) && end.getTime() > Date.now();
  }
  return true;
}

/** Fully ended subscriptions that can start a new Checkout (not past_due / unpaid). */
export function isResubscribableStatus(status: string | null | undefined): boolean {
  return status == null || status === "canceled" || status === "incomplete_expired";
}

export function formatSubscriptionDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
