/**
 * Squarespace Header code injection: critical preloader (reduces native blog flash
 * before loader.js runs) + BetterBlog loader script.
 */

const DEFAULT_BLOG_PATH = "/blog";

/** Normalize blog collection path for URL prefix checks (e.g. /blog, /journal). */
function blogPathPrefixForPreloader(blogPath: string | null | undefined): string {
  const raw = (blogPath && blogPath.trim()) || DEFAULT_BLOG_PATH;
  if (raw === "/") return "/";
  const withSlash = raw.startsWith("/") ? raw : `/${raw}`;
  return withSlash.replace(/\/+$/, "") || DEFAULT_BLOG_PATH;
}

export type BetterBlogHeaderSnippetOptions = {
  loaderUrl: string;
  siteKey: string;
  /** From site settings; falls back to /blog if unset. */
  blogPath?: string | null;
  /** When set, adds data-api-base (needed for local / non-default API origins). */
  apiBase?: string | null;
};

/**
 * Full HTML to paste in Squarespace Settings → Advanced → Code Injection → Header.
 * Order: inline preloader first, then external loader (so the overlay can remove bb-loading-blog).
 */
export function buildBetterBlogSquarespaceHeaderHtml(opts: BetterBlogHeaderSnippetOptions): string {
  const { loaderUrl, siteKey, apiBase } = opts;
  const prefix = blogPathPrefixForPreloader(opts.blogPath);
  const prefixJson = JSON.stringify(prefix);
  const apiAttr =
    typeof apiBase === "string" && apiBase.trim()
      ? `\n  data-api-base="${apiBase.trim().replace(/"/g, "&quot;")}"`
      : "";

  return `<style id="bb-critical-preload-style">
html.bb-loading-blog [data-collection-type="blog"],
html.bb-loading-blog .blog-list,
html.bb-loading-blog .blog-basic-grid {
  opacity: 0 !important;
}
</style>
<script>
(function () {
  var prefix = ${prefixJson};
  if (!prefix || prefix === "/") return;
  try {
    if (location.pathname.indexOf(prefix) !== 0) return;
    document.documentElement.classList.add("bb-loading-blog");
    setTimeout(function () {
      document.documentElement.classList.remove("bb-loading-blog");
    }, 8000);
  } catch (e) {}
})();
</script>
<script
  src="${loaderUrl}"
  data-site-key="${siteKey}"${apiAttr}
></script>`;
}
