/**
 * Group BetterBlog blogs by Squarespace website (origin).
 * Header code injection is per website, so install snippets are per origin.
 *
 * `www.example.com` and `example.com` are the same Squarespace site (apex vs www
 * are interchangeable on custom domains), so grouping strips a leading `www.`.
 */

export type SquarespaceSiteGroup<T extends { url?: string | null }> = {
  /** Canonical origin (`https://example.com`), or null when the blog has no parseable URL. */
  origin: string | null;
  /** Hostname for display (`example.com`, www stripped), or "Unconfigured". */
  originLabel: string;
  blogs: T[];
};

/** Drop only the `www.` subdomain; `shop.example.com` stays distinct. */
function stripWww(hostname: string): string {
  return hostname.replace(/^www\./i, "").toLowerCase();
}

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
    const hostname = stripWww(parsed.hostname);
    const defaultPort = parsed.protocol === "https:" ? "443" : "80";
    const port = parsed.port && parsed.port !== defaultPort ? `:${parsed.port}` : "";
    return { origin: `${parsed.protocol}//${hostname}${port}`, hostname };
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
