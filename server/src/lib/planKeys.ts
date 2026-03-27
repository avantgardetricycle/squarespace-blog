/** Canonical plan keys: DB, API, Stripe checkout metadata `plan_key`. */
export const VALID_PLAN_KEYS = ['essentials', 'professional', 'publication'] as const
export type PlanKey = (typeof VALID_PLAN_KEYS)[number]

export const DEFAULT_PLAN_KEY: PlanKey = 'professional'

const LEGACY_TO_CANONICAL: Record<string, PlanKey> = {
  starter: 'essentials',
  pro: 'professional',
  agency: 'publication'
}

/** True if the string is a known plan key (canonical or legacy). */
export function isRecognizedPlanKeyInput(raw: unknown): raw is string {
  if (typeof raw !== 'string' || !raw.trim()) return false
  const t = raw.trim()
  return (VALID_PLAN_KEYS as readonly string[]).includes(t) || t in LEGACY_TO_CANONICAL
}

/** Normalize body/query/metadata; accepts legacy keys for old bookmarks and Stripe metadata. */
export function normalizePlanKey(raw: string | undefined | null): PlanKey {
  if (raw == null || typeof raw !== 'string') return DEFAULT_PLAN_KEY
  const t = raw.trim()
  if (t in LEGACY_TO_CANONICAL) return LEGACY_TO_CANONICAL[t]
  if ((VALID_PLAN_KEYS as readonly string[]).includes(t)) return t as PlanKey
  return DEFAULT_PLAN_KEY
}
