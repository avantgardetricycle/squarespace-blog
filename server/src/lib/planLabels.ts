/**
 * Internal plan keys (DB, API, Stripe metadata plan_key) stay starter | pro | agency.
 * Display names: Essentials, Professional, Publication.
 */
const PLAN_DISPLAY_NAMES: Record<string, string> = {
  starter: 'Essentials',
  pro: 'Professional',
  agency: 'Publication',
}

/** Stripe metadata label segment: better_blog_<segment>_<cadence>_usd */
const PLAN_LABEL_SLUG: Record<string, string> = {
  starter: 'essentials',
  pro: 'professional',
  agency: 'publication',
}

export function getPlanDisplayName(planKey: string): string {
  return PLAN_DISPLAY_NAMES[planKey] ?? planKey.charAt(0).toUpperCase() + planKey.slice(1)
}

export function buildStripePriceLabel(planKey: string, cadence: string): string {
  const slug = PLAN_LABEL_SLUG[planKey] ?? planKey
  return `better_blog_${slug}_${cadence}_usd`
}
