/**
 * Plan keys: essentials | professional | publication (see planKeys.ts).
 * Legacy keys still map for display when reading old rows.
 */
const PLAN_DISPLAY_NAMES: Record<string, string> = {
  essentials: 'Essentials',
  professional: 'Professional',
  publication: 'Publication',
  starter: 'Essentials',
  pro: 'Professional',
  agency: 'Publication'
}

/** Stripe metadata label segment: better_blog_<segment>_<cadence>_usd */
const PLAN_LABEL_SLUG: Record<string, string> = {
  essentials: 'essentials',
  professional: 'professional',
  publication: 'publication',
  starter: 'essentials',
  pro: 'professional',
  agency: 'publication'
}

export function getPlanDisplayName(planKey: string): string {
  return PLAN_DISPLAY_NAMES[planKey] ?? planKey.charAt(0).toUpperCase() + planKey.slice(1)
}

export function buildStripePriceLabel(planKey: string, cadence: string): string {
  const slug = PLAN_LABEL_SLUG[planKey] ?? planKey
  return `better_blog_${slug}_${cadence}_usd`
}
