import Stripe from 'stripe'
import prisma from '../db/index.js'

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set')
  return new Stripe(key)
}

export function formatMoney(amount: number, currency: string): string {
  const c = currency.toUpperCase()
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: c,
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2
  }).format(amount)
}

export function formatPricePerMo(perMonth: number, currency: string): string {
  return `${formatMoney(perMonth, currency)}/mo`
}

/** Normalized amounts for marketing / checkout UI (major currency units). */
export type PublicCadencePrice = {
  /** Monthly plan: price per month. */
  perMonth: number
}

export type PublicAnnualPrice = {
  /** Effective monthly when billed annually (year total / 12). */
  perMonth: number
  /** Total charged per year (Stripe yearly price). */
  perYear: number
}

export type PublicPlanPrices = {
  currency: string
  plans: Record<
    string,
    {
      monthly: PublicCadencePrice
      annual: PublicAnnualPrice
    }
  >
}

function interpretStripePrice(price: Stripe.Price): {
  perMonth: number
  perYear?: number
  currency: string
} {
  const amountCents = price.unit_amount ?? 0
  const currency = (price.currency ?? 'usd').toLowerCase()
  const recurring = price.recurring

  if (!recurring) {
    return { perMonth: amountCents / 100, currency }
  }

  if (recurring.interval === 'month') {
    const count = recurring.interval_count ?? 1
    return { perMonth: amountCents / count / 100, currency }
  }

  if (recurring.interval === 'year') {
    const perYear = amountCents / 100
    return { perMonth: perYear / 12, perYear, currency }
  }

  return { perMonth: amountCents / 100, currency }
}

export async function loadPublicPlanPrices(): Promise<PublicPlanPrices> {
  const stripeEnv = process.env.STRIPE_ENVIRONMENT ?? 'sandbox'
  const rows = await prisma.plan.findMany({
    where: { stripeEnvironment: stripeEnv }
  })

  if (rows.length === 0) {
    throw new Error('No plans configured for current Stripe environment')
  }

  const stripe = getStripe()
  const uniqueIds = [...new Set(rows.map((r) => r.stripePriceId))]
  const stripePrices = await Promise.all(uniqueIds.map((id) => stripe.prices.retrieve(id)))
  const byId = new Map(stripePrices.map((p) => [p.id, p]))

  const plans: PublicPlanPrices['plans'] = {}

  for (const row of rows) {
    const price = byId.get(row.stripePriceId)
    if (!price) continue

    const interpreted = interpretStripePrice(price)
    if (!plans[row.planKey]) {
      plans[row.planKey] = {
        monthly: { perMonth: 0 },
        annual: { perMonth: 0, perYear: 0 }
      }
    }

    if (row.cadence === 'monthly') {
      plans[row.planKey].monthly = { perMonth: interpreted.perMonth }
    } else if (row.cadence === 'annual') {
      const perYear = interpreted.perYear ?? interpreted.perMonth * 12
      plans[row.planKey].annual = {
        perMonth: interpreted.perMonth,
        perYear
      }
    }
  }

  return {
    currency: stripePrices[0]?.currency?.toLowerCase() ?? 'usd',
    plans
  }
}

/** Dashboard / account: label for the subscriber's actual Stripe price. */
export async function getStripePriceDisplayForPriceId(stripePriceId: string): Promise<string> {
  const stripe = getStripe()
  const price = await stripe.prices.retrieve(stripePriceId)
  const { perMonth, currency } = interpretStripePrice(price)
  const c = currency.toUpperCase()
  return formatPricePerMo(perMonth, c)
}
