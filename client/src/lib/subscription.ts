export function isActiveSubscriptionStatus(status: string | null | undefined): boolean {
  return status === "trialing" || status === "active";
}

export function hasActiveSubscription(subscription: { status: string } | null | undefined): boolean {
  return isActiveSubscriptionStatus(subscription?.status);
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
