/**
 * Group BetterBlog blogs by Squarespace website (origin).
 * Header code injection is per website, so install snippets are per origin.
 */

export type SquarespaceSiteGroup<T extends { url?: string | null }> = {
  /** `https://example.com`, or null when the blog has no parseable URL. */
  origin: string | null;
  /** Hostname for display (`example.com`), or "Unconfigured". */
  originLabel: string;
  blogs: T[];
};

export function squarespaceOriginFromUrl(
  url: string | null | undefined,
): { origin: string; hostname: string } | null {
  if (!url || !url.trim()) return null;
  let toParse = url.trim();
  if (!/^https?:\/\//i.test(toParse)) {
    toParse = `https://${toParse}`;
  }
  try {
    const parsed = new URL(toParse);
    if (!parsed.hostname) return null;
    return { origin: parsed.origin, hostname: parsed.hostname };
  } catch {
    return null;
  }
}

export function sameSquarespaceOrigin(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  const oa = squarespaceOriginFromUrl(a);
  const ob = squarespaceOriginFromUrl(b);
  if (!oa || !ob) return false;
  return oa.origin === ob.origin;
}

/**
 * Preserve first-seen origin order; blogs keep their relative order within a group.
 * Blogs with a missing/unparseable URL are collected last as "Unconfigured".
 */
export function groupBlogsBySquarespaceOrigin<T extends { url?: string | null }>(
  sites: T[],
): SquarespaceSiteGroup<T>[] {
  const byOrigin = new Map<string, SquarespaceSiteGroup<T>>();
  const unconfigured: T[] = [];
  const ordered: SquarespaceSiteGroup<T>[] = [];

  for (const site of sites) {
    const parsed = squarespaceOriginFromUrl(site.url);
    if (!parsed) {
      unconfigured.push(site);
      continue;
    }
    let group = byOrigin.get(parsed.origin);
    if (!group) {
      group = { origin: parsed.origin, originLabel: parsed.hostname, blogs: [] };
      byOrigin.set(parsed.origin, group);
      ordered.push(group);
    }
    group.blogs.push(site);
  }

  if (unconfigured.length > 0) {
    ordered.push({
      origin: null,
      originLabel: "Unconfigured",
      blogs: unconfigured,
    });
  }
  return ordered;
}
