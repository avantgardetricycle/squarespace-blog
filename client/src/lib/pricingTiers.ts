export const PUBLIC_PRICING_TIERS = [
  {
    name: "Essentials",
    tier: "Essentials",
    planKey: "essentials" as const,
    description: "Fix the basics. Everything Squarespace should have included from day one.",
    features: [
      "1 sidebar",
      "Numbered pagination",
      "Table of contents",
      "Post thumbnail banners",
      "Related posts",
      "Social sharing buttons",
    ],
    highlight: false,
  },
  {
    name: "Professional",
    tier: "Professional",
    planKey: "professional" as const,
    description: "A real blog. Discoverable, navigable, and genuinely readable.",
    features: [
      "Everything in Essentials, plus",
      "2 sidebars",
      "Breadcrumb navigation",
      "Post filtering & search",
      "Reading time and scroll progress bar",
      "Featured & pinned posts",
      "Advanced post sorting",
      "Rich author profiles",
    ],
    highlight: true,
  },
  {
    name: "Publication",
    tier: "Publication",
    planKey: "publication" as const,
    description: "A serious publication. Beautiful, branded, fully under your control.",
    features: [
      "Everything in Professional, plus",
      "Custom designed templates",
      "Expanded post banner layouts",
      "Multiple authors",
      "Per-collection layouts & formatting",
      "Image style options per collection",
      "Advanced filtering & tag search",
      "Saved post templates",
      "Priority support",
    ],
    highlight: false,
  },
] as const;

export type PublicPlanKey = (typeof PUBLIC_PRICING_TIERS)[number]["planKey"];

export function annualSavingsPercent(
  monthlyPerMonth: number,
  annualPerYear: number
): number | null {
  if (monthlyPerMonth <= 0) return null;
  const pct = Math.round((1 - annualPerYear / (monthlyPerMonth * 12)) * 100);
  return pct > 0 ? pct : null;
}
