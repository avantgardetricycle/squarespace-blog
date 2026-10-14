import Stripe from 'stripe'
import prisma from '../db/index.js'
import { hashToken, generateToken } from '../lib/auth.js'
import { sendInviteEmailViaSendGrid } from '../lib/email.js'
import { getAppUrl } from '../lib/url.js'
import { normalizePlanKey } from '../lib/planKeys.js'
import { getStripeEnvironment } from '../lib/stripeEnvironment.js'
import { isActiveSubscriptionStatus, nextPaymentFailedAt } from '../lib/subscriptionStatus.js'

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
    customer?: string | { id?: string }
    status?: string
    current_period_end?: number
    cancel_at_period_end?: boolean
    items?: { data?: Array<{ price?: { id?: string } | string; current_period_end?: number }> }
    [key: string]: unknown
  }
}

export interface InvoiceSubscriptionPayload {
  stripeEventId: string
  type: string
  data: {
    id?: string
    subscription?: string | { id?: string } | null
    parent?: {
      subscription_details?: {
        subscription?: string | { id?: string } | null
      } | null
    } | null
    [key: string]: unknown
  }
}

/** Statuses that may replace the subscription id stored for a customer. */
const BILLABLE_SUBSCRIPTION_STATUSES = new Set(['trialing', 'active', 'past_due', 'unpaid'])

/**
 * A row is keyed by customer, so a late event for a previous subscription must not
 * overwrite a newer one. Billable events may replace the stored subscription id.
 */
export function shouldApplySubscriptionEvent(
  existingSubscriptionId: string | null | undefined,
  eventSubscriptionId: string,
  eventStatus: string
): boolean {
  if (!existingSubscriptionId || existingSubscriptionId === eventSubscriptionId) {
    return true
  }
  return BILLABLE_SUBSCRIPTION_STATUSES.has(eventStatus)
}

function readStripeId(value: unknown): string | null {
  if (typeof value === 'string' && value.length > 0) return value
  if (value && typeof value === 'object' && 'id' in value) {
    const id = (value as { id?: unknown }).id
    if (typeof id === 'string' && id.length > 0) return id
  }
  return null
}

function readInvoiceSubscriptionId(data: InvoiceSubscriptionPayload['data']): string | null {
  const legacy = readStripeId(data.subscription)
  if (legacy) return legacy
  return readStripeId(data.parent?.subscription_details?.subscription)
}

function readPriceId(items: unknown): string | null {
  if (!items || typeof items !== 'object' || !('data' in items)) return null
  const data = (items as { data?: unknown }).data
  const first = Array.isArray(data) ? data[0] : undefined
  if (!first || typeof first !== 'object') return null
  const price = (first as { price?: unknown }).price
  if (typeof price === 'string' && price.length > 0) return price
  return readStripeId(price)
}

/**
 * Legacy webhook payloads put current_period_end on the subscription. Current Stripe
 * API versions put it on the subscription item. trial_end is only a last resort.
 */
function readPeriodEndSeconds(record: Record<string, unknown>): number | null {
  const topLevel =
    (typeof record.current_period_end === 'number' ? record.current_period_end : null) ??
    (typeof record.currentPeriodEnd === 'number' ? record.currentPeriodEnd : null)
  if (topLevel != null) return topLevel

  const itemEnd = (() => {
    const items = record.items
    if (!items || typeof items !== 'object' || !('data' in items)) return null
    const data = (items as { data?: unknown }).data
    const first = Array.isArray(data) ? data[0] : undefined
    if (!first || typeof first !== 'object') return null
    const item = first as Record<string, unknown>
    return (
      (typeof item.current_period_end === 'number' ? item.current_period_end : null) ??
      (typeof item.currentPeriodEnd === 'number' ? item.currentPeriodEnd : null)
    )
  })()
  if (itemEnd != null) return itemEnd

  return typeof record.trial_end === 'number' ? record.trial_end : null
}

function periodEndToDate(periodEnd: number | null): Date | null {
  return typeof periodEnd === 'number' ? new Date(periodEnd * 1000) : null
}

async function resolvePeriodEnd(
  subscriptionId: string,
  record: Record<string, unknown>
): Promise<Date | null> {
  let periodEnd = readPeriodEndSeconds(record)
  if (periodEnd == null) {
    try {
      const stripe = getStripe()
      const sub = await stripe.subscriptions.retrieve(subscriptionId, {
        expand: ['items.data.price']
      })
      periodEnd = readPeriodEndSeconds(sub as unknown as Record<string, unknown>)
    } catch (retrieveErr) {
      console.warn('[stripe] subscription period end retrieve failed:', retrieveErr)
    }
  }
  return periodEndToDate(periodEnd)
}

type SubscriptionSyncInput = {
  subscriptionId: string
  stripeCustomerId: string
  status: string
  stripePriceId: string | null
  currentPeriodEnd: Date | null
  cancelAtPeriodEnd: boolean
}

type SubscriptionSyncResult = 'applied' | 'stale' | 'no_user'

async function syncSubscriptionRow(input: SubscriptionSyncInput): Promise<SubscriptionSyncResult> {
  const stripeEnv = getStripeEnvironment()
  const plan = input.stripePriceId
    ? await prisma.plan.findFirst({
        where: {
          stripePriceId: input.stripePriceId,
          stripeEnvironment: stripeEnv
        }
      })
    : null

  const existingSub = await prisma.subscription.findFirst({
    where: {
      OR: [{ stripeSubscriptionId: input.subscriptionId }, { stripeCustomerId: input.stripeCustomerId }]
    }
  })

  if (
    existingSub &&
    !shouldApplySubscriptionEvent(existingSub.stripeSubscriptionId, input.subscriptionId, input.status)
  ) {
    return 'stale'
  }

  const planKey = normalizePlanKey(plan?.planKey ?? existingSub?.plan)
  const maxSites = plan?.maxSites ?? existingSub?.maxSites ?? null
  const paymentFailedAt = nextPaymentFailedAt(
    { status: existingSub?.status, paymentFailedAt: existingSub?.paymentFailedAt ?? null },
    input.status
  )

  if (existingSub) {
    await prisma.subscription.update({
      where: { id: existingSub.id },
      data: {
        stripeSubscriptionId: input.subscriptionId,
        stripePriceId: input.stripePriceId,
        plan: planKey,
        status: input.status,
        maxSites,
        currentPeriodEnd: input.currentPeriodEnd,
        cancelAtPeriodEnd: input.cancelAtPeriodEnd,
        paymentFailedAt
      }
    })
    return 'applied'
  }

  const user = await prisma.user.findFirst({
    where: { stripeCustomerId: input.stripeCustomerId }
  })
  if (!user) return 'no_user'

  await prisma.subscription.create({
    data: {
      userId: user.id,
      stripeCustomerId: input.stripeCustomerId,
      stripeSubscriptionId: input.subscriptionId,
      stripePriceId: input.stripePriceId,
      plan: planKey,
      status: input.status,
      maxSites,
      currentPeriodEnd: input.currentPeriodEnd,
      cancelAtPeriodEnd: input.cancelAtPeriodEnd,
      paymentFailedAt
    }
  })
  return 'applied'
}

async function isStripeEventProcessed(stripeEventId: string): Promise<boolean> {
  const record = await prisma.stripeWebhookEvent.findUnique({
    where: { stripeEventId }
  })
  return record?.status === 'processed'
}

async function markStripeEventProcessed(stripeEventId: string): Promise<void> {
  await prisma.stripeWebhookEvent.update({
    where: { stripeEventId },
    data: { status: 'processed', processedAt: new Date(), error: null }
  })
}

async function markStripeEventFailed(stripeEventId: string, err: unknown): Promise<void> {
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

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    })

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
        currentPeriodEnd,
        source: 'stripe'
      },
      update: {
        stripeSubscriptionId: subscription.id,
        stripePriceId,
        plan: planKey,
        status,
        maxSites,
        currentPeriodEnd,
        cancelAtPeriodEnd: false,
        paymentFailedAt: null,
        source: 'stripe'
      }
    })

    if (isActiveSubscriptionStatus(status)) {
      await prisma.subscription.updateMany({
        where: { userId: user.id, source: 'beta' },
        data: { status: 'canceled' }
      })
    }

    const shouldSendInvite =
      (status === 'trialing' || status === 'active') && !existingUser
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

  if (await isStripeEventProcessed(stripeEventId)) {
    return
  }

  try {
    const subscriptionId = readStripeId(data.id)
    const stripeCustomerId = readStripeId(data.customer)

    if (!subscriptionId || !stripeCustomerId) {
      throw new Error('Missing subscription ID or customer ID')
    }

    const isDeleted = payload.type === 'customer.subscription.deleted'
    const status = isDeleted ? 'canceled' : (data.status ?? 'active')
    const dataRecord = data as Record<string, unknown>
    const cancelAtPeriodEnd = isDeleted
      ? false
      : Boolean(dataRecord.cancel_at_period_end ?? dataRecord.cancelAtPeriodEnd)
    const stripePriceId = readPriceId(data.items)
    const currentPeriodEnd = await resolvePeriodEnd(subscriptionId, dataRecord)

    const result = await syncSubscriptionRow({
      subscriptionId,
      stripeCustomerId,
      status,
      stripePriceId,
      currentPeriodEnd,
      cancelAtPeriodEnd
    })

    if (result === 'stale') {
      console.log('[stripe] ignoring subscription event for a previous subscription', {
        type: payload.type,
        subscriptionId,
        stripeCustomerId
      })
    } else if (result === 'no_user') {
      console.warn('[stripe] subscription event: no user for stripeCustomerId', {
        type: payload.type,
        stripeCustomerId
      })
    }

    await markStripeEventProcessed(stripeEventId)
  } catch (err) {
    console.error(`[stripe] ${payload.type} failed:`, err)
    await markStripeEventFailed(stripeEventId, err)
    throw err
  }
}

export async function handleSubscriptionDeleted(payload: SubscriptionUpdatedPayload): Promise<void> {
  await handleSubscriptionUpdated({
    ...payload,
    type: 'customer.subscription.deleted'
  })
}

export async function handleInvoiceSubscriptionSync(payload: InvoiceSubscriptionPayload): Promise<void> {
  const { stripeEventId, data } = payload

  if (await isStripeEventProcessed(stripeEventId)) {
    return
  }

  try {
    const subscriptionId = readInvoiceSubscriptionId(data)
    if (!subscriptionId) {
      console.log('[stripe] invoice has no subscription, skipping', {
        type: payload.type,
        invoiceId: data.id
      })
      await markStripeEventProcessed(stripeEventId)
      return
    }

    const stripe = getStripe()
    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['items.data.price']
    })
    const stripeCustomerId = readStripeId(subscription.customer)
    if (!stripeCustomerId) {
      throw new Error('Missing customer ID on subscription')
    }

    const subRecord = subscription as unknown as Record<string, unknown>
    const result = await syncSubscriptionRow({
      subscriptionId: subscription.id,
      stripeCustomerId,
      status: subscription.status,
      stripePriceId: readPriceId(subscription.items),
      currentPeriodEnd: periodEndToDate(readPeriodEndSeconds(subRecord)),
      cancelAtPeriodEnd: Boolean(subRecord.cancel_at_period_end ?? subRecord.cancelAtPeriodEnd)
    })

    if (result === 'stale') {
      console.log('[stripe] ignoring invoice event for a previous subscription', {
        type: payload.type,
        subscriptionId,
        stripeCustomerId
      })
    } else if (result === 'no_user') {
      console.warn('[stripe] invoice event: no subscription row yet for stripeCustomerId', {
        type: payload.type,
        stripeCustomerId
      })
    }

    await markStripeEventProcessed(stripeEventId)
  } catch (err) {
    console.error(`[stripe] ${payload.type} failed:`, err)
    await markStripeEventFailed(stripeEventId, err)
    throw err
  }
}

export async function dispatchStripeEvent(
  eventType: string,
  payload: CheckoutSessionCompletedPayload | SubscriptionUpdatedPayload | InvoiceSubscriptionPayload
): Promise<void> {
  if (eventType === 'checkout.session.completed') {
    await handleCheckoutSessionCompleted(payload as CheckoutSessionCompletedPayload)
    return
  }
  if (eventType === 'customer.subscription.updated') {
    await handleSubscriptionUpdated(payload as SubscriptionUpdatedPayload)
    return
  }
  if (eventType === 'customer.subscription.deleted') {
    await handleSubscriptionDeleted(payload as SubscriptionUpdatedPayload)
    return
  }
  if (eventType === 'invoice.paid' || eventType === 'invoice.payment_failed') {
    await handleInvoiceSubscriptionSync(payload as InvoiceSubscriptionPayload)
    return
  }
  throw new Error(`Unhandled Stripe event type: ${eventType}`)
}
