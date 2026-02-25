/** Plan prices for display (matches client Checkout pricingPlans) */
export const PLAN_PRICES: Record<string, { monthly: number; annual: number }> = {
  starter: { monthly: 15, annual: 12 },
  pro: { monthly: 29, annual: 24 },
  agency: { monthly: 79, annual: 65 }
}

export function getPlanPriceDisplay(planKey: string, cadence: string): string {
  const prices = PLAN_PRICES[planKey] ?? PLAN_PRICES.pro
  const price = cadence === 'annual' ? prices.annual : prices.monthly
  return `$${price}/month`
}
