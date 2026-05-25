import Stripe from 'stripe'
import prisma from '../db/index.js'
import { hashToken, generateToken } from '../lib/auth.js'
import { sendInviteEmailViaSendGrid } from '../lib/email.js'
import { getAppUrl } from '../lib/url.js'
import { normalizePlanKey } from '../lib/planKeys.js'
import { getStripeEnvironment } from '../lib/stripeEnvironment.js'

const TOKEN_EXPIRY_HOURS = 24

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set')
  return new Stripe(key)
}

export interface CheckoutSessionCompletedPayload {
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

export interface SubscriptionUpdatedPayload {
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

export async function handleCheckoutSessionCompleted(
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

    const sessionMetadata = ((session.metadata ?? data.metadata) ?? {}) as Record<string, string>
    const subMetadata = (subscription.metadata ?? {}) as Record<string, string>
    const planKey = normalizePlanKey(subMetadata.plan_key ?? sessionMetadata.plan_key)
    const cadence = subMetadata.cadence ?? sessionMetadata.cadence ?? 'monthly'
    void cadence

    let ourMetadata: { customerName?: string } = {}
    if (ourCheckoutSession?.metadataJson) {
      try {
        ourMetadata = JSON.parse(ourCheckoutSession.metadataJson) as { customerName?: string }
      } catch (parseErr) {
        console.error('[stripe] checkout.session.completed metadataJson parse error:', parseErr, ourCheckoutSession.metadataJson)
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

    const stripeEnv = getStripeEnvironment()
    const plan = await prisma.plan.findFirst({
      where: {
        stripePriceId: stripePriceId ?? undefined,
        stripeEnvironment: stripeEnv
      }
    })
    const maxSites = plan?.maxSites ?? null

    const subRecord = subscription as unknown as Record<string, unknown>
    const periodEnd =
      (typeof subRecord.current_period_end === 'number' ? subRecord.current_period_end : null) ??
      (typeof subRecord.currentPeriodEnd === 'number' ? subRecord.currentPeriodEnd : null) ??
      (typeof subRecord.trial_end === 'number' ? subRecord.trial_end : null)
    const currentPeriodEnd =
      typeof periodEnd === 'number' ? new Date(periodEnd * 1000) : null

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

    const shouldSendInvite = status === 'trialing' || status === 'active'
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
    console.error('[stripe] checkout.session.completed failed:', err)
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

export async function handleSubscriptionUpdated(payload: SubscriptionUpdatedPayload): Promise<void> {
  const { stripeEventId, data } = payload

  const record = await prisma.stripeWebhookEvent.findUnique({
    where: { stripeEventId }
  })
  if (record?.status === 'processed') {
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

    if (!subscriptionId || !stripeCustomerId) {
      throw new Error('Missing subscription ID or customer ID')
    }

    const status = data.status ?? 'active'
    const priceItem = data.items?.data?.[0]
    const stripePriceId = priceItem?.price?.id ?? null

    const dataRecord = data as Record<string, unknown>
    let periodEnd: number | null =
      (typeof dataRecord.current_period_end === 'number' ? dataRecord.current_period_end : null) ??
      (typeof dataRecord.currentPeriodEnd === 'number' ? dataRecord.currentPeriodEnd : null) ??
      (typeof dataRecord.trial_end === 'number' ? dataRecord.trial_end : null)

    if (periodEnd == null) {
      try {
        const stripe = getStripe()
        const sub = await stripe.subscriptions.retrieve(subscriptionId)
        const subRecord = sub as unknown as Record<string, unknown>
        periodEnd =
          (typeof subRecord.current_period_end === 'number' ? subRecord.current_period_end : null) ??
          (typeof subRecord.currentPeriodEnd === 'number' ? subRecord.currentPeriodEnd : null) ??
          (typeof subRecord.trial_end === 'number' ? subRecord.trial_end : null)
      } catch (retrieveErr) {
        console.warn('[stripe] subscription.updated Stripe retrieve fallback failed:', retrieveErr)
      }
    }

    const currentPeriodEnd =
      typeof periodEnd === 'number' ? new Date(periodEnd * 1000) : null
    const cancelAtPeriodEnd = Boolean(
      dataRecord.cancel_at_period_end ?? dataRecord.cancelAtPeriodEnd
    )

    const stripeEnv = getStripeEnvironment()
    const plan = stripePriceId
      ? await prisma.plan.findFirst({
          where: {
            stripePriceId,
            stripeEnvironment: stripeEnv
          }
        })
      : null

    const existingSub = await prisma.subscription.findFirst({
      where: {
        OR: [{ stripeSubscriptionId: subscriptionId }, { stripeCustomerId }]
      }
    })

    const planKey = normalizePlanKey(plan?.planKey ?? existingSub?.plan)
    const maxSites = plan?.maxSites ?? existingSub?.maxSites ?? null

    if (existingSub) {
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
    } else {
      const user = await prisma.user.findFirst({
        where: { stripeCustomerId }
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
      } else {
        console.warn('[stripe] subscription.updated: no user for stripeCustomerId', stripeCustomerId)
      }
    }

    await prisma.stripeWebhookEvent.update({
      where: { stripeEventId },
      data: { status: 'processed', processedAt: new Date() }
    })
  } catch (err) {
    console.error('[stripe] customer.subscription.updated failed:', err)
    try {
      await prisma.stripeWebhookEvent.update({
        where: { stripeEventId },
        data: {
          status: 'failed',
          processedAt: new Date(),
          error: err instanceof Error ? err.message : String(err)
        }
      })
    } catch (updateErr) {
      console.error('[stripe] failed to mark event as failed:', updateErr)
    }
    throw err
  }
}

export async function dispatchStripeEvent(
  eventType: string,
  payload: CheckoutSessionCompletedPayload | SubscriptionUpdatedPayload
): Promise<void> {
  if (eventType === 'checkout.session.completed') {
    await handleCheckoutSessionCompleted(payload as CheckoutSessionCompletedPayload)
    return
  }
  if (eventType === 'customer.subscription.updated') {
    await handleSubscriptionUpdated(payload as SubscriptionUpdatedPayload)
    return
  }
  throw new Error(`Unhandled Stripe event type: ${eventType}`)
}
