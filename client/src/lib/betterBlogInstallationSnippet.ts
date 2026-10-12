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
 *
 * One snippet covers every BetterBlog collection on a Squarespace website.
 * Path matching here MUST stay in sync with scripts/loader.js.
 */

const DEFAULT_BLOG_PATH = "/blog";

/** Normalize blog collection path for URL prefix checks (e.g. /blog, /journal). */
export function blogPathPrefixForPreloader(blogPath: string | null | undefined): string {
  const raw = (blogPath && blogPath.trim()) || DEFAULT_BLOG_PATH;
  if (raw === "/") return "/";
  const withSlash = raw.startsWith("/") ? raw : `/${raw}`;
  return withSlash.replace(/\/+$/, "") || DEFAULT_BLOG_PATH;
}

/** KEEP IN SYNC with scripts/loader.js pathMatchesPrefix. */
export function pathMatchesBlogPrefix(pathname: string, prefix: string): boolean {
  const path = pathname || "/";
  if (prefix === "/") return path === "/" || path === "";
  return path === prefix || path.startsWith(prefix + "/");
}

export type BetterBlogSnippetBlog = {
  siteKey: string;
  blogPath?: string | null;
};

export type BetterBlogHeaderSnippetOptions = {
  loaderUrl: string;
  /** When set, adds data-api-base (needed for local / non-default API origins). */
  apiBase?: string | null;
  /**
   * Single-blog back-compat. Ignored when `blogs` is a non-empty array.
   */
  siteKey?: string;
  /** From site settings; falls back to /blog if unset. */
  blogPath?: string | null;
  /** All BetterBlog collections on this Squarespace website. */
  blogs?: BetterBlogSnippetBlog[];
};

function resolveSnippetBlogs(opts: BetterBlogHeaderSnippetOptions): BetterBlogSnippetBlog[] {
  if (opts.blogs && opts.blogs.length > 0) {
    return opts.blogs.filter((b) => b.siteKey && b.siteKey.trim());
  }
  if (opts.siteKey && opts.siteKey.trim()) {
    return [{ siteKey: opts.siteKey.trim(), blogPath: opts.blogPath }];
  }
  return [];
}

function uniquePrefixesLongestFirst(blogs: BetterBlogSnippetBlog[]): string[] {
  const seen = new Set<string>();
  const prefixes: string[] = [];
  for (const blog of blogs) {
    const prefix = blogPathPrefixForPreloader(blog.blogPath);
    if (seen.has(prefix)) continue;
    seen.add(prefix);
    prefixes.push(prefix);
  }
  prefixes.sort((a, b) => b.length - a.length || a.localeCompare(b));
  return prefixes;
}

function escapeHtmlAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/** Same-origin renderer URL the loader will fetch in parallel with config. */
export function rendererUrlFromLoaderUrl(loaderUrl: string): string {
  return loaderUrl.replace(/loader\.js(\?[^#]*)?(#.*)?$/i, "renderer.js$1$2");
}

/**
 * Full HTML to paste in Squarespace Settings → Advanced → Code Injection → Header.
 * Order matters: critical <style> + class-setting <script> must run before the
 * loader, so the overlay is up by the time the body starts parsing.
 */
export function buildBetterBlogSquarespaceHeaderHtml(opts: BetterBlogHeaderSnippetOptions): string {
  const { loaderUrl, apiBase } = opts;
  const blogs = resolveSnippetBlogs(opts);
  if (blogs.length === 0) {
    throw new Error("buildBetterBlogSquarespaceHeaderHtml requires at least one siteKey");
  }

  const prefixes = uniquePrefixesLongestFirst(blogs);
  const prefixesJson = JSON.stringify(prefixes);
  const dataBlogs = blogs.map((b) => ({
    siteKey: b.siteKey.trim(),
    blogPath: blogPathPrefixForPreloader(b.blogPath),
  }));
  const dataBlogsAttr = escapeHtmlAttr(JSON.stringify(dataBlogs));
  const primarySiteKey = escapeHtmlAttr(dataBlogs[0].siteKey);
  const apiAttr =
    typeof apiBase === "string" && apiBase.trim()
      ? `\n  data-api-base="${escapeHtmlAttr(apiBase.trim())}"`
      : "";
  const rendererUrl = rendererUrlFromLoaderUrl(loaderUrl);

  return `<link rel="preload" as="script" href="${loaderUrl}">
<link rel="preload" as="script" href="${rendererUrl}">
<style id="bb-critical-preload-style">
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
  // KEEP IN SYNC with scripts/loader.js installBetterBlogReadyQueue.
  // Installed before the route check so header scripts pasted after this block
  // can call BetterBlog.ready during HTML parse.
  try {
    var bb = window.BetterBlog = window.BetterBlog || {};
    bb._readyQueue = bb._readyQueue || [];
    if (!bb.ready || !bb.ready.__bbReady) {
      var ready = function (fn) {
        if (typeof fn !== "function") return;
        var list = bb._readyQueue || (bb._readyQueue = []);
        list.push(fn);
        if (bb._lastCtx) {
          try { fn(bb._lastCtx); } catch (err) {
            console.error("[BetterBlog] custom script failed", err);
          }
        }
      };
      ready.__bbReady = true;
      bb.ready = ready;
    }
    if (!bb._emit || !bb._emit.__bbEmit) {
      var emit = function (partial) {
        var ctx = partial || {};
        bb._renderSeq = (bb._renderSeq || 0) + 1;
        ctx.renderId = bb._renderSeq;
        if (!ctx.pathname) {
          try { ctx.pathname = location.pathname || "/"; } catch (ePath) { ctx.pathname = "/"; }
        }
        bb._lastCtx = ctx;
        var list = bb._readyQueue || [];
        for (var qi = 0; qi < list.length; qi++) {
          try { list[qi](ctx); } catch (err) {
            console.error("[BetterBlog] custom script failed", err);
          }
        }
      };
      emit.__bbEmit = true;
      bb._emit = emit;
    }
  } catch (eQueue) {}

  // KEEP IN SYNC with scripts/loader.js pathMatchesPrefix (longest prefix first).
  var prefixes = ${prefixesJson};
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
    try { if (window.parent !== window) return; } catch (e2) { return; }
    var path = location.pathname || "/";
    var onBlogRoute = false;
    for (var i = 0; i < prefixes.length; i++) {
      var prefix = prefixes[i];
      if (prefix === "/") {
        if (path === "/" || path === "") { onBlogRoute = true; break; }
      } else if (path === prefix || path.indexOf(prefix + "/") === 0) {
        onBlogRoute = true;
        break;
      }
    }
    if (!onBlogRoute) return;
    doc.classList.add("bb-loading-blog");
    // Safety: never trap the visitor on a blank page if the loader/renderer never runs.
    // If nothing has emitted yet, run queued custom scripts once against the native page.
    setTimeout(function () {
      doc.classList.remove("bb-loading-blog");
      try {
        var api = window.BetterBlog;
        if (api && typeof api._emit === "function" && !api._lastCtx) {
          api._emit({
            active: false,
            reason: "timeout",
            view: null,
            root: null,
            overlay: null,
            pathname: location.pathname || "/"
          });
        }
      } catch (eTimeout) {}
    }, 10000);
  } catch (e) {}
})();
</script>
<script
  defer
  src="${loaderUrl}"
  data-site-key="${primarySiteKey}"
  data-blogs='${dataBlogsAttr}'${apiAttr}
></script>
<!-- Paste rewritten custom header scripts after this block. Register each one with BetterBlog.ready(function (ctx) { ... }). -->`;
}
