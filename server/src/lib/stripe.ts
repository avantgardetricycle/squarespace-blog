import Stripe from 'stripe'
import prisma from '../db/index.js'
import { normalizePlanKey } from './planKeys.js'
import { getStripeEnvironment } from './stripeEnvironment.js'
import { isActiveSubscriptionStatus, isBetaCustomerId, isBetaSubscription, nextPaymentFailedAt, usableStripeCustomerId } from './subscriptionStatus.js'

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set')
  return new Stripe(key)
}

/**
 * Sync the user's subscription from Stripe to our database.
 * Call on login to ensure subscription status is up to date.
 */
export async function syncSubscriptionFromStripe(userId: number): Promise<void> {
  if (!process.env.STRIPE_SECRET_KEY) return
  const stripe = getStripe()
  const stripeEnv = getStripeEnvironment()

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      subscriptions: {
        orderBy: { updatedAt: 'desc' },
        take: 10
      }
    }
  })

  if (!user) return

  const stripeBackedSub =
    user.subscriptions.find(
      (sub) => !isBetaSubscription(sub) && !isBetaCustomerId(sub.stripeCustomerId)
    ) ?? null
  const existingSub = stripeBackedSub ?? user.subscriptions[0] ?? null
  if (!stripeBackedSub && (isBetaSubscription(existingSub) || isBetaCustomerId(existingSub?.stripeCustomerId))) {
    return
  }
  const stripeCustomerId =
    usableStripeCustomerId(existingSub?.stripeCustomerId) ??
    usableStripeCustomerId(user.stripeCustomerId) ??
    null

  if (!stripeCustomerId) return

  let stripeSubscription: Stripe.Subscription | null = null

  if (existingSub?.stripeSubscriptionId) {
    try {
      stripeSubscription = await stripe.subscriptions.retrieve(existingSub.stripeSubscriptionId, {
        expand: ['items.data.price']
      })
    } catch (err) {
      if (err instanceof Stripe.errors.StripeError && err.code === 'resource_missing_deleted') {
        stripeSubscription = null
      } else {
        console.error('[syncSubscriptionFromStripe] retrieve failed:', err)
        throw err
      }
    }
  }

  if (!stripeSubscription || !isActiveSubscriptionStatus(stripeSubscription.status)) {
    const list = await stripe.subscriptions.list({
      customer: stripeCustomerId,
      status: 'all',
      limit: 10,
      expand: ['data.items.data.price']
    })
    const active = list.data.find((s) => isActiveSubscriptionStatus(s.status))
    if (active) {
      stripeSubscription = active
    } else if (!stripeSubscription) {
      stripeSubscription = list.data[0] ?? null
    }
  }

  if (!stripeSubscription) return

  const status = stripeSubscription.status
  const priceItem = stripeSubscription.items.data[0]
  const stripePriceId = priceItem?.price?.id ?? null
  const cancelAtPeriodEnd = Boolean(
    (stripeSubscription as unknown as Record<string, unknown>).cancel_at_period_end ??
    stripeSubscription.cancel_at_period_end
  )

  // Stripe API uses snake_case (current_period_end). Access via bracket notation in case
  // the SDK or runtime transforms the object. Fallback to trial_end for trialing subs.
  const sub = stripeSubscription as unknown as Record<string, unknown>
  const periodEnd =
    (typeof sub.current_period_end === 'number' ? sub.current_period_end : null) ??
    (typeof sub.currentPeriodEnd === 'number' ? sub.currentPeriodEnd : null) ??
    (typeof sub.trial_end === 'number' ? sub.trial_end : null)
  const currentPeriodEnd =
    typeof periodEnd === 'number' ? new Date(periodEnd * 1000) : null

  const plan = stripePriceId
    ? await prisma.plan.findFirst({
        where: {
          stripePriceId,
          stripeEnvironment: stripeEnv
        }
      })
    : null
  const planKey = normalizePlanKey(plan?.planKey ?? existingSub?.plan)
  const maxSites = plan?.maxSites ?? existingSub?.maxSites ?? null
  const paymentFailedAt = nextPaymentFailedAt(
    { status: existingSub?.status, paymentFailedAt: existingSub?.paymentFailedAt ?? null },
    status
  )

  await prisma.subscription.upsert({
    where: { stripeCustomerId },
    create: {
      userId: user.id,
      stripeCustomerId,
      stripeSubscriptionId: stripeSubscription.id,
      stripePriceId,
      plan: planKey,
      status,
      maxSites,
      currentPeriodEnd,
      cancelAtPeriodEnd,
      paymentFailedAt
    },
    update: {
      stripeSubscriptionId: stripeSubscription.id,
      stripePriceId,
      plan: planKey,
      status,
      maxSites,
      currentPeriodEnd,
      cancelAtPeriodEnd,
      paymentFailedAt
    }
  })
}
