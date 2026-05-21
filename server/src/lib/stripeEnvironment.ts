/**
 * Resolves which `plans.stripe_environment` rows to use.
 * DB + seed script use `sandbox` | `live` (see plan-seed-data.ts).
 */
export type StripePlanEnvironment = 'sandbox' | 'live'

const ENV_ALIASES: Record<string, StripePlanEnvironment> = {
  sandbox: 'sandbox',
  test: 'sandbox',
  staging: 'sandbox',
  development: 'sandbox',
  dev: 'sandbox',
  live: 'live',
  production: 'live',
  prod: 'live',
}

function normalizeStripeEnvironmentInput(raw: string | undefined): StripePlanEnvironment | null {
  if (!raw?.trim()) return null
  return ENV_ALIASES[raw.trim().toLowerCase()] ?? null
}

function stripeEnvironmentFromSecretKey(): StripePlanEnvironment | null {
  const key = process.env.STRIPE_SECRET_KEY ?? ''
  if (key.startsWith('sk_live')) return 'live'
  if (key.startsWith('sk_test')) return 'sandbox'
  return null
}

/** Value used for `plans.stripe_environment` lookups and checkout. */
export function getStripeEnvironment(): StripePlanEnvironment {
  const fromVar = normalizeStripeEnvironmentInput(process.env.STRIPE_ENVIRONMENT)
  const fromKey = stripeEnvironmentFromSecretKey()

  if (fromVar && fromKey && fromVar !== fromKey) {
    console.warn(
      `[stripe] STRIPE_ENVIRONMENT=${process.env.STRIPE_ENVIRONMENT} (${fromVar}) disagrees with ` +
        `STRIPE_SECRET_KEY mode (${fromKey}); using ${fromKey} for plan rows.`
    )
    return fromKey
  }

  if (fromVar) return fromVar
  if (fromKey) return fromKey

  const raw = process.env.STRIPE_ENVIRONMENT
  if (raw?.trim()) {
    console.warn(
      `[stripe] Unknown STRIPE_ENVIRONMENT="${raw}"; expected sandbox or live. Defaulting to sandbox.`
    )
  }
  return 'sandbox'
}

export function stripeEnvironmentConfigHint(): string {
  const resolved = getStripeEnvironment()
  const raw = process.env.STRIPE_ENVIRONMENT ?? '(unset)'
  const keyMode = stripeEnvironmentFromSecretKey()
  const keyHint = keyMode ? `, STRIPE_SECRET_KEY implies ${keyMode}` : ''
  return `STRIPE_ENVIRONMENT=${raw} (resolved: ${resolved}${keyHint}). Seed with: npm run db:seed-plans --workspace=server -- --environment=${resolved}`
}
