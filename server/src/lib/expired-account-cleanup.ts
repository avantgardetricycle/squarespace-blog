import prisma from '../db/index.js'
import { deleteUserAccount } from './delete-account.js'
import {
  isActiveSubscriptionStatus,
  isBetaSubscription,
  isEntitledSubscription,
  isInPaymentGrace,
  isPaymentFailedStatus,
  type SubscriptionEntitlementInput,
} from './subscriptionStatus.js'

const MS_PER_DAY = 24 * 60 * 60 * 1000

/** Delete an account only after access has been gone this long. */
export const EXPIRED_ACCOUNT_RETENTION_DAYS = 90

export const EXPIRED_ACCOUNT_RETENTION_MS = EXPIRED_ACCOUNT_RETENTION_DAYS * MS_PER_DAY

const ENDED_STRIPE_STATUSES = new Set(['canceled', 'incomplete_expired'])

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

/**
 * When this subscription stopped granting access.
 * A missing date means the row cannot justify deletion.
 */
export function subscriptionAccessEndedAt(
  sub: SubscriptionEntitlementInput,
  now: Date = new Date()
): Date | null {
  const end = toDate(sub.currentPeriodEnd)
  if (!end) return null
  if (isBetaSubscription(sub)) {
    if (isEntitledSubscription(sub, now)) return null
    return end.getTime() < now.getTime() ? end : null
  }
  if (sub.status && ENDED_STRIPE_STATUSES.has(sub.status)) return end
  return null
}

/**
 * True when every subscription has ended and the latest end is more than 90 days ago.
 * A still-active, trialing, past-due, or in-grace subscription keeps the account.
 */
export function accountReadyForDeletion(
  subscriptions: SubscriptionEntitlementInput[],
  now: Date = new Date()
): boolean {
  if (subscriptions.length === 0) return false
  for (const sub of subscriptions) {
    if (isEntitledSubscription(sub, now) || isInPaymentGrace(sub, now)) return false
    if (isPaymentFailedStatus(sub.status)) return false
    if (isActiveSubscriptionStatus(sub.status) && !isBetaSubscription(sub)) return false
  }

  let latestEnd: number | null = null
  for (const sub of subscriptions) {
    const ended = subscriptionAccessEndedAt(sub, now)
    if (!ended) return false
    if (latestEnd == null || ended.getTime() > latestEnd) latestEnd = ended.getTime()
  }
  return latestEnd != null && latestEnd < now.getTime() - EXPIRED_ACCOUNT_RETENTION_MS
}

export type ExpiredAccountCleanupStats = {
  matched: number
  deleted: number
  errors: number
}

export async function deleteExpiredAccounts(now = new Date()): Promise<ExpiredAccountCleanupStats> {
  const cutoff = new Date(now.getTime() - EXPIRED_ACCOUNT_RETENTION_MS)
  const users = await prisma.user.findMany({
    where: {
      subscriptions: {
        some: {
          currentPeriodEnd: { lt: cutoff },
          OR: [
            { status: { in: ['canceled', 'incomplete_expired'] } },
            { source: 'beta' },
          ],
        },
      },
    },
    select: {
      id: true,
      email: true,
      subscriptions: {
        select: {
          status: true,
          source: true,
          currentPeriodEnd: true,
          paymentFailedAt: true,
        },
      },
    },
  })

  const stats: ExpiredAccountCleanupStats = { matched: 0, deleted: 0, errors: 0 }
  for (const user of users) {
    if (!accountReadyForDeletion(user.subscriptions, now)) continue
    stats.matched += 1
    try {
      await deleteUserAccount({ userId: user.id, confirmEmail: user.email })
      stats.deleted += 1
      console.log('[expired-account-cleanup] deleted user', user.id)
    } catch (err) {
      stats.errors += 1
      console.error('[expired-account-cleanup] failed', { userId: user.id, err })
    }
  }
  console.log('[expired-account-cleanup] cron', stats)
  return stats
}
