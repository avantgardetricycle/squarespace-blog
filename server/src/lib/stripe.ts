import Stripe from 'stripe'
import prisma from '../db/index.js'
import { normalizePlanKey } from './planKeys.js'
import { getStripeEnvironment } from './stripeEnvironment.js'

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
  console.log('[syncSubscriptionFromStripe] START', { userId })

  if (!process.env.STRIPE_SECRET_KEY) {
    console.log('[syncSubscriptionFromStripe] SKIP: STRIPE_SECRET_KEY not set')
    return
  }
  const stripe = getStripe()
  const stripeEnv = getStripeEnvironment()

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      subscriptions: {
        orderBy: { updatedAt: 'desc' },
        take: 1
      }
    }
  })

  if (!user) {
    console.log('[syncSubscriptionFromStripe] SKIP: user not found')
    return
  }

  const existingSub = user.subscriptions[0] ?? null
  const stripeCustomerId = existingSub?.stripeCustomerId ?? user.stripeCustomerId ?? null

  console.log('[syncSubscriptionFromStripe] user lookup', {
    userId,
    stripeCustomerId,
    existingSubId: existingSub?.id,
    existingStripeSubscriptionId: existingSub?.stripeSubscriptionId,
    existingCurrentPeriodEnd: existingSub?.currentPeriodEnd
  })

  if (!stripeCustomerId) {
    console.log('[syncSubscriptionFromStripe] SKIP: no stripeCustomerId')
    return
  }

  let stripeSubscription: Stripe.Subscription | null = null
  let source = 'none'

  if (existingSub?.stripeSubscriptionId) {
    try {
      stripeSubscription = await stripe.subscriptions.retrieve(existingSub.stripeSubscriptionId, {
        expand: ['items.data.price']
      })
      source = 'retrieve'
    } catch (err) {
      if (err instanceof Stripe.errors.StripeError && err.code === 'resource_missing_deleted') {
        stripeSubscription = null
        console.log('[syncSubscriptionFromStripe] retrieve failed: resource deleted')
      } else {
        console.error('[syncSubscriptionFromStripe] retrieve failed:', err)
        throw err
      }
    }
  }

  if (!stripeSubscription) {
    const list = await stripe.subscriptions.list({
      customer: stripeCustomerId,
      status: 'all',
      limit: 10,
      expand: ['data.items.data.price']
    })
    stripeSubscription = list.data[0] ?? null
    source = stripeSubscription ? 'list' : 'none'
  }

  if (!stripeSubscription) {
    console.log('[syncSubscriptionFromStripe] SKIP: no Stripe subscription found')
    return
  }

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

  console.log('[syncSubscriptionFromStripe] Stripe subscription', {
    source,
    stripeSubscriptionId: stripeSubscription.id,
    status,
    stripePriceId,
    periodEndRaw: periodEnd,
    currentPeriodEnd: currentPeriodEnd?.toISOString() ?? null,
    debugPeriodValues: {
      current_period_end: sub.current_period_end,
      currentPeriodEnd: sub.currentPeriodEnd,
      trial_end: sub.trial_end
    }
  })

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

  console.log('[syncSubscriptionFromStripe] upsert payload', {
    stripeCustomerId,
    planKey,
    status,
    maxSites,
    currentPeriodEnd: currentPeriodEnd?.toISOString() ?? null
  })

  const result = await prisma.subscription.upsert({
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
      cancelAtPeriodEnd
    },
    update: {
      stripeSubscriptionId: stripeSubscription.id,
      stripePriceId,
      plan: planKey,
      status,
      maxSites,
      currentPeriodEnd,
      cancelAtPeriodEnd
    }
  })

  console.log('[syncSubscriptionFromStripe] DONE', {
    subscriptionId: result.id,
    currentPeriodEnd: result.currentPeriodEnd?.toISOString() ?? null
  })
}
