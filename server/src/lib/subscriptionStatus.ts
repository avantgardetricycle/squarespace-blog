export const ACTIVE_SUBSCRIPTION_STATUSES = ['trialing', 'active'] as const

export function isActiveSubscriptionStatus(status: string | null | undefined): boolean {
  return status === 'trialing' || status === 'active'
}
