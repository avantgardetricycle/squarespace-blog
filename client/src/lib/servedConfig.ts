import type { PlanEntitlements, PlanFeatureFlags } from "@/api/auth";

export function featureAllowed(
  entitlements: PlanEntitlements | null | undefined,
  feature: keyof PlanFeatureFlags,
  loaded: boolean
): boolean {
  if (!loaded) return true;
  return entitlements?.features[feature] === true;
}

export function requiredPlanName(
  entitlements: PlanEntitlements | null | undefined,
  feature: string
): string {
  return entitlements?.requiredPlan[feature] ?? "a higher";
}

export function templateAllowed(
  entitlements: PlanEntitlements | null | undefined,
  level: "collection" | "post",
  templateKey: string,
  loaded: boolean
): boolean {
  if (!loaded) return true;
  if (!entitlements) return false;
  return entitlements.templates[level].includes(templateKey);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/** Preview-only copy. Stored settings are left as the editor loaded them. */
export function stripPreviewConfig<T>(config: T, entitlements: PlanEntitlements | null | undefined): T {
  if (!entitlements || !config || typeof config !== "object") return config;
  const clone = JSON.parse(JSON.stringify(config)) as Record<string, unknown>;
  const locked = new Set(entitlements.lockedModules);
  const walk = (node: unknown) => {
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (!isRecord(node)) return;
    for (const [key, value] of Object.entries(node)) {
      if ((key === "modules" || key === "moduleOrder") && Array.isArray(value)) {
        node[key] = value.filter((id) => typeof id !== "string" || !locked.has(id));
      } else {
        walk(value);
      }
    }
  };
  walk(clone);
  if (!entitlements.features.featuredAndPinned && isRecord(clone.featuredArticle)) {
    clone.featuredArticle = { ...clone.featuredArticle, show: false, featuredPostId: null };
  }
  if (!entitlements.features.sorting) clone.postSort = "date";
  if (!entitlements.features.tagCategoryFilters && isRecord(clone.collectionModules) && isRecord(clone.collectionModules.filter)) {
    clone.collectionModules.filter = {
      ...clone.collectionModules.filter,
      filterByTags: false,
      filterByCategories: false,
    };
  }
  if (
    typeof clone.collectionLayout === "string" &&
    !entitlements.allowedCollectionLayouts.includes(clone.collectionLayout)
  ) {
    clone.collectionLayout = "showcase";
  }
  return clone as T;
}
