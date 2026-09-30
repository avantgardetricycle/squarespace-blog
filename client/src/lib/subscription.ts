export function isActiveSubscriptionStatus(status: string | null | undefined): boolean {
  return status === "trialing" || status === "active";
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
