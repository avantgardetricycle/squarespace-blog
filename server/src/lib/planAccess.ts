import prisma from '../db/index.js'
import { resolveEntitlements, type PublicEntitlements, type StoredCapacity } from './planEntitlements.js'
import { isEntitledSubscription, pickDisplaySubscription } from './subscriptionStatus.js'

type SubscriptionRow = {
  id: string
  plan: string
  status: string
  source: string
  stripeSubscriptionId: string | null
  stripePriceId: string | null
  maxSites: number | null
  maxWebsites: number | null
  maxBlogsPerWebsite: number | null
}

export type UserPlanContext = {
  entitlements: PublicEntitlements
  subscription: SubscriptionRow | null
  active: boolean
}

function storedOf (subscription: SubscriptionRow): StoredCapacity {
  return {
    maxSites: subscription.maxSites,
    maxWebsites: subscription.maxWebsites,
    maxBlogsPerWebsite: subscription.maxBlogsPerWebsite
  }
}

export async function loadUserPlanContext (userId: number): Promise<UserPlanContext> {
  const subscriptions = await prisma.subscription.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    take: 10
  })
  const entitled = subscriptions.find((sub) => isEntitledSubscription(sub)) ?? null
  const display = pickDisplaySubscription(subscriptions)
  const subscription = (entitled ?? display) as SubscriptionRow | null
  if (!subscription) {
    return {
      entitlements: resolveEntitlements({ plan: null }),
      subscription: null,
      active: false
    }
  }
  return {
    entitlements: resolveEntitlements({
      plan: subscription.plan,
      stored: storedOf(subscription)
    }),
    subscription,
    active: entitled != null
  }
}
