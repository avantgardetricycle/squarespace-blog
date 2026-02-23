import Stripe from 'stripe'
import { boss, stripeEventToQueueName } from './index.js'
import prisma from '../db/index.js'
import { hashToken, generateToken } from '../lib/auth.js'
import { sendInviteEmailViaSendGrid } from '../lib/email.js'
import { getAppUrl } from '../lib/url.js'

const TOKEN_EXPIRY_HOURS = 24

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set')
  return new Stripe(key)
}

/** Register all Stripe webhook workers. Call after boss.start(). */
export async function registerStripeWorkers(): Promise<void> {
  const queueName = stripeEventToQueueName('checkout.session.completed')
  await boss.createQueue(queueName)
  await boss.work<CheckoutSessionCompletedPayload>(queueName, async (jobs) => {
    for (const job of jobs) {
      await handleCheckoutSessionCompleted(job.data)
    }
  })
}

interface CheckoutSessionCompletedPayload {
  stripeEventId: string
  type: string
  data: {
    id?: string
    customer_email?: string
    customer_details?: { email?: string }
    customer?: string
    subscription?: string
    metadata?: Record<string, string>
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
    if (!subscriptionId) {
      throw new Error('Missing subscription ID in checkout session')
    }

    const stripe = getStripe()
    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['items.data.price']
    })

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
    const metadata = (data.metadata ?? {}) as Record<string, string>
    const planKey = metadata.plan_key ?? 'pro'
    const cadence = metadata.cadence ?? 'monthly'

    const stripeEnv = process.env.STRIPE_ENVIRONMENT ?? 'sandbox'
    const plan = await prisma.plan.findFirst({
      where: {
        stripePriceId: stripePriceId ?? undefined,
        stripeEnvironment: stripeEnv
      }
    })
    const maxSites = plan?.maxSites ?? null
    const currentPeriodEnd =
      'current_period_end' in subscription && typeof subscription.current_period_end === 'number'
        ? new Date(subscription.current_period_end * 1000)
        : null

    const user = await prisma.user.upsert({
      where: { email: normalizedEmail },
      create: { email: normalizedEmail, stripeCustomerId },
      update: {
        stripeCustomerId: stripeCustomerId
      }
    })

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
