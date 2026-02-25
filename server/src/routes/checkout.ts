import { Router, Request, Response } from 'express'
import Stripe from 'stripe'
import prisma from '../db/index.js'
import { optionalSession, SessionUser } from '../middleware/session.js'
import { getAppUrl } from '../lib/url.js'

const router = Router()
const TRIAL_DAYS = 7

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set')
  return new Stripe(key)
}

// POST /api/checkout/create-session - Create Stripe Checkout session
router.post('/create-session', optionalSession, async (req: Request, res: Response) => {
  const { planKey, cadence, name, email } = req.body ?? {}
  const stripeEnv = process.env.STRIPE_ENVIRONMENT ?? 'sandbox'

  if (!planKey || !cadence) {
    res.status(400).json({ error: 'planKey and cadence are required' })
    return
  }

  const validPlans = ['starter', 'pro', 'agency']
  const validCadences = ['monthly', 'annual']
  if (!validPlans.includes(planKey) || !validCadences.includes(cadence)) {
    res.status(400).json({ error: 'Invalid planKey or cadence' })
    return
  }

  const customerEmail = typeof email === 'string' && email.includes('@') ? email.trim().toLowerCase() : null
  const customerName = typeof name === 'string' && name.trim() ? name.trim() : null

  try {
    const plan = await prisma.plan.findUnique({
      where: {
        planKey_cadence_stripeEnvironment: {
          planKey,
          cadence,
          stripeEnvironment: stripeEnv
        }
      }
    })

    if (!plan) {
      res.status(404).json({ error: 'Plan not found' })
      return
    }

    const stripe = getStripe()
    const appUrl = getAppUrl()

    const metadata: Record<string, string> = {
      plan_key: planKey,
      cadence,
      stripe_price_label: plan.stripePriceLabel
    }
    if (customerName) {
      metadata.customer_name = customerName
    }

    const subscriptionMetadata: Record<string, string> = {
      plan_key: planKey,
      cadence,
      stripe_price_label: plan.stripePriceLabel
    }
    if (customerName) {
      subscriptionMetadata.customer_name = customerName
    }

    const sessionOptions: Stripe.Checkout.SessionCreateParams = {
      mode: 'subscription',
      line_items: [
        {
          price: plan.stripePriceId,
          quantity: 1
        }
      ],
      subscription_data: {
        trial_period_days: TRIAL_DAYS,
        metadata: subscriptionMetadata
      },
      success_url: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/checkout?plan=${planKey}&billing=${cadence}`,
      metadata,
      // Collect name on Stripe's form as fallback if our metadata doesn't propagate
      name_collection: { individual: { enabled: true, optional: true } }
    }

    const user = (req as Request & { user?: SessionUser }).user
    const emailToUse = customerEmail ?? user?.email
    if (emailToUse) {
      sessionOptions.customer_email = emailToUse
    }

    const session = await stripe.checkout.sessions.create(sessionOptions)

    await prisma.checkoutSession.create({
      data: {
        stripeCheckoutSessionId: session.id,
        userId: user?.id ?? null,
        email: emailToUse ?? user?.email ?? null,
        plan: planKey,
        stripePriceId: plan.stripePriceId,
        status: 'created',
        metadataJson: JSON.stringify({
          cadence,
          stripePriceLabel: plan.stripePriceLabel,
          maxSites: plan.maxSites,
          customerName: customerName ?? undefined
        })
      }
    })

    res.json({ url: session.url })
  } catch (err) {
    console.error('Checkout session error:', err)
    const message = err instanceof Error ? err.message : 'Failed to create checkout session'
    res.status(500).json({ error: message })
  }
})

// GET /api/checkout/session/:sessionId - Get session details for success page
router.get('/session/:sessionId', async (req: Request, res: Response) => {
  const raw = req.params.sessionId
  const sessionId = typeof raw === 'string' ? raw : Array.isArray(raw) ? raw[0] : ''

  if (!sessionId) {
    res.status(400).json({ error: 'session_id is required' })
    return
  }

  try {
    const stripe = getStripe()
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items.data.price']
    })

    if (session.status !== 'complete') {
      res.status(400).json({ error: 'Session not completed' })
      return
    }

    const email = session.customer_email ?? session.customer_details?.email ?? null
    const metadata = session.metadata ?? {}
    const planKey = (metadata.plan_key as string) ?? 'pro'
    const cadence = (metadata.cadence as string) ?? 'monthly'
    const planDisplay = planKey.charAt(0).toUpperCase() + planKey.slice(1)

    let priceDisplay = '$0'
    const lineItems = session.line_items?.data
    if (lineItems?.[0]?.amount_total != null && lineItems[0].amount_total > 0) {
      priceDisplay = `$${lineItems[0].amount_total / 100}`
    } else if (lineItems?.[0]?.price) {
      const price = lineItems[0].price as Stripe.Price
      if (price.unit_amount != null) {
        priceDisplay = `$${price.unit_amount / 100}`
      }
    }

    res.json({
      email,
      plan: planDisplay,
      price: priceDisplay,
      cadence,
      status: session.status
    })
  } catch (err) {
    console.error('Session retrieve error:', err)
    res.status(500).json({ error: 'Failed to retrieve session' })
  }
})

export default router
