import Stripe from 'stripe'
import { boss, stripeEventToQueueName } from './index.js'
import prisma from '../db/index.js'
import { hashToken, generateToken } from '../lib/auth.js'
import { sendInviteEmailViaSendGrid } from '../lib/email.js'
import { getAppUrl } from '../lib/url.js'
import { normalizePlanKey } from '../lib/planKeys.js'

const TOKEN_EXPIRY_HOURS = 24

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set')
  return new Stripe(key)
}

/** Register all Stripe webhook workers. Call after boss.start(). */
export async function registerStripeWorkers(): Promise<void> {
  const checkoutQueue = stripeEventToQueueName('checkout.session.completed')
  await boss.createQueue(checkoutQueue)
  console.log('[worker] Subscribed to queue:', checkoutQueue)
  await boss.work<CheckoutSessionCompletedPayload>(checkoutQueue, async (jobs) => {
    for (const job of jobs) {
      await handleCheckoutSessionCompleted(job.data)
    }
  })

  const subUpdatedQueue = stripeEventToQueueName('customer.subscription.updated')
  await boss.createQueue(subUpdatedQueue)
  console.log('[worker] Subscribed to queue:', subUpdatedQueue)
  await boss.work<SubscriptionUpdatedPayload>(subUpdatedQueue, async (jobs) => {
    for (const job of jobs) {
      console.log('[worker] customer.subscription.updated job received', {
        jobId: job.id,
        stripeEventId: job.data?.stripeEventId
      })
      await handleSubscriptionUpdated(job.data)
    }
  })
}

interface CheckoutSessionCompletedPayload {
  stripeEventId: string
  type: string
  data: {
    id?: string
    customer_email?: string
    customer_details?: { email?: string; name?: string }
    customer?: string
    subscription?: string
    metadata?: Record<string, string>
    [key: string]: unknown
  }
}

interface SubscriptionUpdatedPayload {
  stripeEventId: string
  type: string
  data: {
    id?: string
    customer?: string
    status?: string
    current_period_end?: number
    items?: { data?: Array<{ price?: { id?: string } }> }
    [key: string]: unknown
  }
}

async function handleCheckoutSessionCompleted(
  payload: CheckoutSessionCompletedPayload
): Promise<void> {
  const { stripeEventId, data } = payload

  const record = await prisma.stripeWebhookEvent.findUnique({
    where: { stripeEventId }
  })
  if (record?.status === 'processed') {
    return
  }

  try {
    const email =
      data.customer_email ??
      (data.customer_details as { email?: string } | undefined)?.email
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      throw new Error('Missing or invalid customer email in checkout session')
    }

    const normalizedEmail = email.trim().toLowerCase()
    const subscriptionId = data.subscription as string | undefined
    const sessionId = data.id as string | undefined
    if (!subscriptionId) {
      throw new Error('Missing subscription ID in checkout session')
    }
    if (!sessionId) {
      throw new Error('Missing session ID in checkout session')
    }

    const stripe = getStripe()
    const [session, subscription, ourCheckoutSession] = await Promise.all([
      stripe.checkout.sessions.retrieve(sessionId),
      stripe.subscriptions.retrieve(subscriptionId, { expand: ['items.data.price'] }),
      prisma.checkoutSession.findUnique({
        where: { stripeCheckoutSessionId: sessionId }
      })
    ])

    const status = subscription.status
    const stripeCustomerId =
      typeof subscription.customer === 'string'
        ? subscription.customer
        : subscription.customer?.id
    if (!stripeCustomerId) {
      throw new Error('Missing customer ID on subscription')
    }

    const priceItem = subscription.items.data[0]
    const stripePriceId = priceItem?.price?.id ?? null

    // Get plan/cadence from Stripe metadata
    const sessionMetadata = ((session.metadata ?? data.metadata) ?? {}) as Record<string, string>
    const subMetadata = (subscription.metadata ?? {}) as Record<string, string>
    const planKey = normalizePlanKey(subMetadata.plan_key ?? sessionMetadata.plan_key)
    const cadence = subMetadata.cadence ?? sessionMetadata.cadence ?? 'monthly'

    // Customer name: prefer our CheckoutSession (stored at create-session), then Stripe metadata, then customer_details
    let ourMetadata: { customerName?: string } = {}
    if (ourCheckoutSession?.metadataJson) {
      try {
        ourMetadata = JSON.parse(ourCheckoutSession.metadataJson) as { customerName?: string }
      } catch (parseErr) {
        console.error('[worker] checkout.session.completed metadataJson parse error:', parseErr, ourCheckoutSession.metadataJson)
      }
    }

    const customerDetails = ((session.customer_details ?? data.customer_details) ?? {}) as {
      name?: string
    }
    const customerName =
      (ourMetadata.customerName ??
        subMetadata.customer_name ??
        sessionMetadata.customer_name ??
        customerDetails.name)
        ?.trim() || null

    const stripeEnv = process.env.STRIPE_ENVIRONMENT ?? 'sandbox'
    const plan = await prisma.plan.findFirst({
      where: {
        stripePriceId: stripePriceId ?? undefined,
        stripeEnvironment: stripeEnv
      }
    })
    const maxSites = plan?.maxSites ?? null

    // Stripe uses snake_case; SDK object may vary. Fallback to trial_end for trialing.
    const subRecord = subscription as unknown as Record<string, unknown>
    const periodEnd =
      (typeof subRecord.current_period_end === 'number' ? subRecord.current_period_end : null) ??
      (typeof subRecord.currentPeriodEnd === 'number' ? subRecord.currentPeriodEnd : null) ??
      (typeof subRecord.trial_end === 'number' ? subRecord.trial_end : null)
    const currentPeriodEnd =
      typeof periodEnd === 'number' ? new Date(periodEnd * 1000) : null

    // Use existing user if one exists (by email) to avoid duplicates
    const upsertPayload = {
      create: { email: normalizedEmail, name: customerName, stripeCustomerId },
      update: {
        stripeCustomerId: stripeCustomerId,
        ...(customerName ? { name: customerName } : {})
      }
    }

    const user = await prisma.user.upsert({
      where: { email: normalizedEmail },
      ...upsertPayload
    })

    const userName = (user as { name?: string | null }).name

    // Explicitly set name when we have it (handles edge cases where upsert update may not apply)
    if (customerName && userName !== customerName) {
      await prisma.user.update({
        where: { id: user.id },
        data: { name: customerName }
      })
    }

    await prisma.subscription.upsert({
      where: { stripeCustomerId },
      create: {
        userId: user.id,
        stripeCustomerId,
        stripeSubscriptionId: subscription.id,
        stripePriceId,
        plan: planKey,
        status,
        maxSites,
        currentPeriodEnd
      },
      update: {
        stripeSubscriptionId: subscription.id,
        stripePriceId,
        plan: planKey,
        status,
        maxSites,
        currentPeriodEnd
      }
    })

    const shouldSendInvite =
      status === 'trialing' || status === 'active'
    if (shouldSendInvite) {
      const rawToken = generateToken()
      const tokenHash = hashToken(rawToken)
      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + TOKEN_EXPIRY_HOURS)

      await prisma.loginToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
          purpose: 'invite'
        }
      })

      const appUrl = getAppUrl()
      const magicLink = `${appUrl}/api/auth/magic?token=${rawToken}`

      await sendInviteEmailViaSendGrid(normalizedEmail, magicLink)
    }

    await prisma.checkoutSession.updateMany({
      where: { stripeCheckoutSessionId: data.id as string },
      data: { status: 'completed', completedAt: new Date() }
    })

    await prisma.stripeWebhookEvent.update({
      where: { stripeEventId },
      data: { status: 'processed', processedAt: new Date() }
    })
  } catch (err) {
    console.error('[worker] checkout.session.completed failed:', err)
    await prisma.stripeWebhookEvent.update({
      where: { stripeEventId },
      data: {
        status: 'failed',
        processedAt: new Date(),
        error: err instanceof Error ? err.message : String(err)
      }
    })
    throw err
  }
}

async function handleSubscriptionUpdated(payload: SubscriptionUpdatedPayload): Promise<void> {
  const { stripeEventId, data } = payload

  console.log('[worker] handleSubscriptionUpdated START', {
    stripeEventId,
    dataKeys: data ? Object.keys(data) : [],
    dataId: data?.id,
    dataCustomer: typeof data?.customer === 'string' ? data.customer : (data?.customer as { id?: string } | undefined)?.id
  })

  const record = await prisma.stripeWebhookEvent.findUnique({
    where: { stripeEventId }
  })
  console.log('[worker] handleSubscriptionUpdated record lookup', {
    stripeEventId,
    found: !!record,
    status: record?.status
  })
  if (record?.status === 'processed') {
    console.log('[worker] handleSubscriptionUpdated SKIP: already processed')
    return
  }

  try {
    const subscriptionId = data.id as string | undefined
    const stripeCustomerId =
      typeof data.customer === 'string'
        ? data.customer
        : data.customer != null && typeof data.customer === 'object'
          ? (data.customer as { id?: string }).id
          : undefined

    console.log('[worker] handleSubscriptionUpdated extracted', {
      subscriptionId,
      stripeCustomerId
    })

    if (!subscriptionId || !stripeCustomerId) {
      throw new Error('Missing subscription ID or customer ID')
    }

    const status = data.status ?? 'active'
    const priceItem = data.items?.data?.[0]
    const stripePriceId = priceItem?.price?.id ?? null

    // Stripe uses snake_case; webhook payload may vary. Use bracket notation and fallback to trial_end for trialing.
    const dataRecord = data as Record<string, unknown>
    let periodEnd: number | null =
      (typeof dataRecord.current_period_end === 'number' ? dataRecord.current_period_end : null) ??
      (typeof dataRecord.currentPeriodEnd === 'number' ? dataRecord.currentPeriodEnd : null) ??
      (typeof dataRecord.trial_end === 'number' ? dataRecord.trial_end : null)

    // Fallback: fetch from Stripe if period not in payload (some webhook payloads omit expanded fields)
    if (periodEnd == null) {
      try {
        const stripe = getStripe()
        const sub = await stripe.subscriptions.retrieve(subscriptionId)
        const subRecord = sub as unknown as Record<string, unknown>
        periodEnd =
          (typeof subRecord.current_period_end === 'number' ? subRecord.current_period_end : null) ??
          (typeof subRecord.currentPeriodEnd === 'number' ? subRecord.currentPeriodEnd : null) ??
          (typeof subRecord.trial_end === 'number' ? subRecord.trial_end : null)
        if (periodEnd != null) {
          console.log('[worker] handleSubscriptionUpdated fetched period from Stripe API:', periodEnd)
        }
      } catch (retrieveErr) {
        console.warn('[worker] handleSubscriptionUpdated Stripe retrieve fallback failed:', retrieveErr)
      }
    }

    const currentPeriodEnd =
      typeof periodEnd === 'number' ? new Date(periodEnd * 1000) : null
    const cancelAtPeriodEnd = Boolean(
      dataRecord.cancel_at_period_end ?? dataRecord.cancelAtPeriodEnd
    )

    console.log('[worker] handleSubscriptionUpdated parsed', {
      status,
      stripePriceId,
      periodEndRaw: periodEnd,
      currentPeriodEnd: currentPeriodEnd?.toISOString(),
      cancelAtPeriodEnd,
      debugPeriodValues: {
        current_period_end: dataRecord.current_period_end,
        currentPeriodEnd: dataRecord.currentPeriodEnd,
        trial_end: dataRecord.trial_end
      }
    })

    const stripeEnv = process.env.STRIPE_ENVIRONMENT ?? 'sandbox'
    const plan = stripePriceId
      ? await prisma.plan.findFirst({
          where: {
            stripePriceId,
            stripeEnvironment: stripeEnv
          }
        })
      : null

    console.log('[worker] handleSubscriptionUpdated plan lookup', {
      stripePriceId,
      stripeEnv,
      planFound: !!plan,
      planKey: plan?.planKey
    })

    const existingSub = await prisma.subscription.findFirst({
      where: {
        OR: [
          { stripeSubscriptionId: subscriptionId },
          { stripeCustomerId }
        ]
      }
    })

    console.log('[worker] handleSubscriptionUpdated existingSub', {
      found: !!existingSub,
      existingSubId: existingSub?.id
    })

    const planKey = normalizePlanKey(plan?.planKey ?? existingSub?.plan)
    const maxSites = plan?.maxSites ?? existingSub?.maxSites ?? null

    if (existingSub) {
      console.log('[worker] handleSubscriptionUpdated updating subscription', existingSub.id)
      await prisma.subscription.update({
        where: { id: existingSub.id },
        data: {
          stripeSubscriptionId: subscriptionId,
          stripePriceId,
          plan: planKey,
          status,
          maxSites,
          currentPeriodEnd,
          cancelAtPeriodEnd
        }
      })
      console.log('[worker] handleSubscriptionUpdated subscription updated')
    } else {
      const user = await prisma.user.findFirst({
        where: { stripeCustomerId }
      })
      console.log('[worker] handleSubscriptionUpdated no existingSub, user lookup', {
        stripeCustomerId,
        userFound: !!user,
        userId: user?.id
      })
      if (user) {
        await prisma.subscription.create({
          data: {
            userId: user.id,
            stripeCustomerId,
            stripeSubscriptionId: subscriptionId,
            stripePriceId,
            plan: planKey,
            status,
            maxSites,
            currentPeriodEnd,
            cancelAtPeriodEnd
          }
        })
        console.log('[worker] handleSubscriptionUpdated subscription created')
      } else {
        console.log('[worker] handleSubscriptionUpdated WARN: no user found for stripeCustomerId, skipping create')
      }
    }

    console.log('[worker] handleSubscriptionUpdated marking event processed', stripeEventId)
    await prisma.stripeWebhookEvent.update({
      where: { stripeEventId },
      data: { status: 'processed', processedAt: new Date() }
    })
    console.log('[worker] handleSubscriptionUpdated DONE', stripeEventId)
  } catch (err) {
    console.error('[worker] customer.subscription.updated failed:', err)
    console.error('[worker] customer.subscription.updated error stack:', err instanceof Error ? err.stack : 'no stack')
    try {
      await prisma.stripeWebhookEvent.update({
        where: { stripeEventId },
        data: {
          status: 'failed',
          processedAt: new Date(),
          error: err instanceof Error ? err.message : String(err)
        }
      })
      console.log('[worker] handleSubscriptionUpdated marked event as failed')
    } catch (updateErr) {
      console.error('[worker] handleSubscriptionUpdated FAILED to update event status:', updateErr)
    }
    throw err
  }
}
