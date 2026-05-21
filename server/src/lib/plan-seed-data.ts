import type { PrismaClient } from '../generated/prisma/client.js'
import { buildStripePriceLabel } from './planLabels.js'
import type { StripePlanEnvironment } from './stripeEnvironment.js'

export type PlanSeedRow = {
  planKey: 'essentials' | 'professional' | 'publication'
  cadence: 'monthly' | 'annual'
  stripePriceId: string
  maxSites: number | null
}

/** Staging / local — STRIPE_ENVIRONMENT=sandbox */
export const SANDBOX_PLANS: readonly PlanSeedRow[] = [
  { planKey: 'essentials', cadence: 'monthly', stripePriceId: 'price_1TEaw1FNhpDahMYtkTRXKh6q', maxSites: 1 },
  { planKey: 'essentials', cadence: 'annual', stripePriceId: 'price_1TEbDwFNhpDahMYtRctRNNaK', maxSites: 1 },
  { planKey: 'professional', cadence: 'monthly', stripePriceId: 'price_1TEbF1FNhpDahMYtETj6pLFZ', maxSites: 3 },
  { planKey: 'professional', cadence: 'annual', stripePriceId: 'price_1TEbFWFNhpDahMYtVN7ItqqY', maxSites: 3 },
  { planKey: 'publication', cadence: 'monthly', stripePriceId: 'price_1TEbGEFNhpDahMYtW1NRSMNP', maxSites: null },
  { planKey: 'publication', cadence: 'annual', stripePriceId: 'price_1TEbGhFNhpDahMYt5ghEqi90', maxSites: null },
] as const

/** Production — STRIPE_ENVIRONMENT=live */
export const LIVE_PLANS: readonly PlanSeedRow[] = [
  { planKey: 'essentials', cadence: 'monthly', stripePriceId: 'price_1TZdhDF6YDk2mKyqP0zb5ZJk', maxSites: 1 },
  { planKey: 'essentials', cadence: 'annual', stripePriceId: 'price_1TZdhEF6YDk2mKyq4EE8g6ky', maxSites: 1 },
  { planKey: 'professional', cadence: 'monthly', stripePriceId: 'price_1TZdhDF6YDk2mKyqf4UDoSVI', maxSites: 3 },
  { planKey: 'professional', cadence: 'annual', stripePriceId: 'price_1TZdhFF6YDk2mKyqlCWDDtCp', maxSites: 3 },
  { planKey: 'publication', cadence: 'monthly', stripePriceId: 'price_1TZdhHF6YDk2mKyqzDJOFcly', maxSites: null },
  { planKey: 'publication', cadence: 'annual', stripePriceId: 'price_1TZdhFF6YDk2mKyqh0y5lDBu', maxSites: null },
] as const

export type { StripePlanEnvironment }

const PLANS_BY_ENVIRONMENT: Record<StripePlanEnvironment, readonly PlanSeedRow[]> = {
  sandbox: SANDBOX_PLANS,
  live: LIVE_PLANS,
}

export function parsePlanSeedEnvironments(argv: string[]): StripePlanEnvironment[] {
  const flag = argv.find((arg) => arg.startsWith('--environment='))
  const value = flag?.slice('--environment='.length) ?? 'all'

  if (value === 'all') return ['sandbox', 'live']
  if (value === 'sandbox' || value === 'live') return [value]
  throw new Error(`Invalid --environment=${value}. Use sandbox, live, or all.`)
}

/** Migrate legacy plan_key values before upserting canonical rows. */
export async function migrateLegacyPlanKeys(prisma: PrismaClient): Promise<void> {
  await prisma.$executeRaw`UPDATE plans SET plan_key = 'essentials' WHERE plan_key = 'starter'`
  await prisma.$executeRaw`UPDATE plans SET plan_key = 'professional' WHERE plan_key = 'pro'`
  await prisma.$executeRaw`UPDATE plans SET plan_key = 'publication' WHERE plan_key = 'agency'`
}

/** Idempotent upsert of plan rows for one or more Stripe environments. */
export async function seedPlans(
  prisma: PrismaClient,
  environments: StripePlanEnvironment[]
): Promise<{ environment: StripePlanEnvironment; upserted: number }[]> {
  await migrateLegacyPlanKeys(prisma)

  const results: { environment: StripePlanEnvironment; upserted: number }[] = []

  for (const stripeEnvironment of environments) {
    const rows = PLANS_BY_ENVIRONMENT[stripeEnvironment]
    for (const p of rows) {
      const stripePriceLabel = buildStripePriceLabel(p.planKey, p.cadence)
      await prisma.plan.upsert({
        where: {
          planKey_cadence_stripeEnvironment: {
            planKey: p.planKey,
            cadence: p.cadence,
            stripeEnvironment,
          },
        },
        create: {
          planKey: p.planKey,
          cadence: p.cadence,
          stripePriceId: p.stripePriceId,
          stripePriceLabel,
          maxSites: p.maxSites,
          stripeEnvironment,
        },
        update: {
          stripePriceId: p.stripePriceId,
          stripePriceLabel,
          maxSites: p.maxSites,
        },
      })
    }
    results.push({ environment: stripeEnvironment, upserted: rows.length })
  }

  return results
}
