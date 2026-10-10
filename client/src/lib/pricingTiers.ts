export const PUBLIC_PRICING_TIERS = [
  {
    name: "Essentials",
    tier: "Essentials",
    planKey: "essentials" as const,
    description: "Make your blog look right.",
    capacity: "1 website · 1 blog",
    features: [
      "4 templates: Showcase and Digest (blog page), Feature and Reporter (post)",
      "Sidebars",
      "Header image formatting",
      "Table of contents",
      "Related, recent and popular posts",
      "Numbered pages",
      "Breadcrumbs",
      "Social sharing",
      "Reading time and progress bar",
      "Post footer block",
      "Live preview (desktop, tablet, phone)",
    ],
    highlight: false,
  },
  {
    name: "Professional",
    tier: "Professional",
    planKey: "professional" as const,
    description: "Make your blog findable.",
    capacity: "1 website · 2 blogs",
    features: [
      "Everything in Essentials, plus",
      "8 templates: adds Newsroom and Masthead (blog page), Writer and Publisher (post)",
      "A different template for each blog",
      "Blog search",
      "Tag and category filters",
      "Featured and pinned posts",
      "Sorting options",
      "Comments with moderation",
      "Basic analytics (traffic, top posts, how far people read)",
    ],
    highlight: true,
  },
  {
    name: "Publication",
    tier: "Publication",
    planKey: "publication" as const,
    description: "Make your blog pay.",
    capacity: "1 website · 3 blogs",
    features: [
      "Everything in Professional, plus",
      "All 10 templates: adds the magazine layouts Editorial (blog page) and Story (post)",
      "Paywall with Squarespace Memberships (BetterBlog takes no cut; Squarespace's own fees apply)",
      "Email sign-up forms and lead magnets, with a downloadable list",
      "Multiple authors and author management",
      "Image styles per blog",
      "Saved post templates",
      "Advanced analytics (Google Analytics connection, click tracking, on-blog search terms, per-author performance)",
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

/**
 * Dollar saved per year by paying annually instead of monthly.
 * Derived from live Stripe prices so the figure can't drift from what we charge.
 */
export function annualSavingsAmount(
  monthlyPerMonth: number,
  annualPerYear: number
): number | null {
  if (monthlyPerMonth <= 0) return null;
  const saved = monthlyPerMonth * 12 - annualPerYear;
  return saved > 0 ? saved : null;
}
