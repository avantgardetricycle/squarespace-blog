/** Matches server plan keys: essentials | professional | publication */
const PLAN_DISPLAY_NAMES: Record<string, string> = {
  essentials: "Essentials",
  professional: "Professional",
  publication: "Publication",
  starter: "Essentials",
  pro: "Professional",
  agency: "Publication",
};

export const DEFAULT_PLAN_KEY = "professional" as const;

const KNOWN_PLAN_KEYS = new Set(["essentials", "professional", "publication"]);

const LEGACY_TO_CURRENT: Record<string, string> = {
  starter: "essentials",
  pro: "professional",
  agency: "publication",
};

/** URL `?plan=` and legacy slugs → canonical key. */
export function normalizePlanParam(raw: string | null | undefined): string {
  const key = raw?.trim() || DEFAULT_PLAN_KEY;
  return LEGACY_TO_CURRENT[key] ?? (KNOWN_PLAN_KEYS.has(key) ? key : DEFAULT_PLAN_KEY);
}

export function getPlanDisplayName(planKey: string): string {
  return PLAN_DISPLAY_NAMES[planKey] ?? planKey.charAt(0).toUpperCase() + planKey.slice(1);
}
