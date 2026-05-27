/**
 * Squarespace Header code injection.
 *
 * Strategy for eliminating the "flash of Squarespace blog" before BetterBlog mounts:
 *
 *   1. An inline <style> applies `visibility: hidden` to <body> whenever
 *      <html> carries the `bb-loading-blog` class, and renders a centered
 *      spinner via :before/:after pseudo-elements on <html>. Pseudo-elements
 *      on <html> are not affected by the body visibility rule, so the spinner
 *      stays visible even while the rest of the page is suppressed.
 *
 *   2. An inline <script> adds the `bb-loading-blog` class synchronously,
 *      *before* the browser parses <body>. This means the first paint of the
 *      document already has the overlay up; Squarespace's server-rendered
 *      blog markup can never appear on screen.
 *
 *   3. The BetterBlog loader (loaded next) ultimately removes the class after
 *      double-RAFing past one paint of its own content, so the handoff has
 *      no gap.
 *
 * The class is removed by a 10s safety timer in case the loader script never
 * runs (network failure, blocked, etc.) so visitors can never get stuck on a
 * blank page.
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
 * Order matters: critical <style> + class-setting <script> must run before the
 * loader, so the overlay is up by the time the body starts parsing.
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
html.bb-loading-blog body {
  visibility: hidden !important;
}
html.bb-loading-blog::before {
  content: "";
  position: fixed;
  inset: 0;
  background: #ffffff;
  z-index: 2147483646;
}
html.bb-loading-blog::after {
  content: "";
  position: fixed;
  top: 50%;
  left: 50%;
  width: 40px;
  height: 40px;
  margin: -20px 0 0 -20px;
  border: 3px solid #e8e6e3;
  border-top-color: #5B4FE8;
  border-radius: 50%;
  animation: bb-bootstrap-spin 0.75s linear infinite;
  z-index: 2147483647;
}
@keyframes bb-bootstrap-spin {
  to { transform: rotate(360deg); }
}
</style>
<script>
(function () {
  var prefix = ${prefixJson};
  try {
    var doc = document.documentElement;
    if (!doc) return;
    // Never suppress the Squarespace editor UI; preview/edit mode must stay interactive.
    var htmlClass = " " + (doc.className || "") + " ";
    var bodyClass = document.body ? " " + (document.body.className || "") + " " : " ";
    if (
      htmlClass.indexOf(" sqs-edit-mode ") >= 0 ||
      htmlClass.indexOf(" sqs-edit-mode-active ") >= 0 ||
      htmlClass.indexOf(" sqs-site-styles-editing ") >= 0 ||
      bodyClass.indexOf(" sqs-edit-mode ") >= 0 ||
      bodyClass.indexOf(" sqs-edit-mode-active ") >= 0 ||
      bodyClass.indexOf(" sqs-site-styles-editing ") >= 0
    ) return;
    var path = location.pathname || "/";
    var onBlogRoute = prefix === "/"
      ? path === "/"
      : (path === prefix || path.indexOf(prefix + "/") === 0);
    if (!onBlogRoute) return;
    doc.classList.add("bb-loading-blog");
    // Safety: never trap the visitor on a blank page if the loader/renderer never runs.
    setTimeout(function () {
      doc.classList.remove("bb-loading-blog");
    }, 10000);
  } catch (e) {}
})();
</script>
<script
  defer
  src="${loaderUrl}"
  data-site-key="${siteKey}"${apiAttr}
></script>`;
}
