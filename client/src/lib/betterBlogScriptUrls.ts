/**
 * URLs for the Squarespace installation snippet (loader + API).
 * Prefer the current app origin so staging/production dashboards emit snippets
 * that call staging.betterblog.xyz (or production), not GitHub Pages.
 */

const GITHUB_PAGES_LOADER_FALLBACK =
  "https://avantgardetricycle.github.io/squarespace-blog/loader.js";

/** Loader script URL to embed in the Header injection. */
export function getBetterBlogLoaderUrl(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}/loader.js`;
  }
  return GITHUB_PAGES_LOADER_FALLBACK;
}

/** API origin for `data-api-base` on the loader tag (required when loader is CDN-hosted). */
export function getBetterBlogApiBase(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return "";
}
