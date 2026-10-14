import Stripe from 'stripe'
import { studioExtraPriceIdList, studioExtraPriceIds } from './planEntitlements.js'

export class StudioBillingError extends Error {
  constructor (message: string) {
    super(message)
    this.name = 'StudioBillingError'
  }
}

function getStripe (): Stripe {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new StudioBillingError('STRIPE_SECRET_KEY is not set')
  return new Stripe(key)
}

type PriceItem = {
  id?: string
  quantity?: number | null
  price?: { id?: string } | string | null
}

function priceIdOf (item: PriceItem): string | null {
  if (!item.price) return null
  if (typeof item.price === 'string') return item.price
  return item.price.id ?? null
}

/** The subscription item that is the base plan, skipping the extra-website add-on. */
export function basePlanPriceId (items: PriceItem[]): string | null {
  const extras = new Set(studioExtraPriceIdList())
  for (const item of items) {
    const id = priceIdOf(item)
    if (id && !extras.has(id)) return id
  }
  return null
}

export function extraWebsiteQuantity (items: PriceItem[]): number {
  const extras = new Set(studioExtraPriceIdList())
  let quantity = 0
  for (const item of items) {
    const id = priceIdOf(item)
    if (id && extras.has(id)) quantity += item.quantity ?? 0
  }
  return quantity
}

export async function setStudioExtraWebsiteQuantity (args: {
  stripeSubscriptionId: string
  cadence: 'monthly' | 'annual'
  quantity: number
}): Promise<void> {
  const ids = studioExtraPriceIds()
  const priceId = args.cadence === 'annual' ? ids.annual : ids.monthly
  if (!priceId) {
    throw new StudioBillingError(
      'Studio extra websites are not available until a Stripe price is configured.'
    )
  }

  const stripe = getStripe()
  const subscription = await stripe.subscriptions.retrieve(args.stripeSubscriptionId)
  const item = subscription.items.data.find((row) => row.price?.id === priceId)
  const quantity = Math.max(0, args.quantity)

  if (quantity === 0) {
    if (item) {
      await stripe.subscriptionItems.del(item.id, { proration_behavior: 'create_prorations' })
    }
    return
  }

  if (item) {
    if ((item.quantity ?? 0) === quantity) return
    await stripe.subscriptionItems.update(item.id, {
      quantity,
      proration_behavior: 'create_prorations'
    })
    return
  }

  await stripe.subscriptionItems.create({
    subscription: args.stripeSubscriptionId,
    price: priceId,
    quantity,
    proration_behavior: 'create_prorations'
  })
}
