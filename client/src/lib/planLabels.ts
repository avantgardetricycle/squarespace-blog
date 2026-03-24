/** Matches server plan keys; display names for UI when API omits planDisplay. */
const PLAN_DISPLAY_NAMES: Record<string, string> = {
  starter: "Essentials",
  pro: "Professional",
  agency: "Publication",
};

export function getPlanDisplayName(planKey: string): string {
  return PLAN_DISPLAY_NAMES[planKey] ?? planKey.charAt(0).toUpperCase() + planKey.slice(1);
}
