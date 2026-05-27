/**
 * Loading transition regression tests.
 *
 * Three scenarios are exercised against a Squarespace-like fixture that ships
 * the BetterBlog Header injection and obnoxiously-styled native blog markup:
 *
 *   1. Cold load at the collection URL — the original repro of the flash.
 *   2. SPA-style navigation from collection to post — the renderer's route
 *      observer must re-render without exposing the native markup that
 *      Squarespace's own router would inject during navigation.
 *   3. Hard refresh at a post URL — same protections as the collection cold
 *      load, but exercised on the single-post code path that has its own
 *      auth-hydration / paywall flow.
 *
 * The check works frame-by-frame via requestAnimationFrame: any frame in
 * which (a) <body> is not visibility:hidden / display:none, and (b) at least
 * one <article data-native-squarespace="true"> has a non-zero box rect and
 * non-hidden computed style is recorded as a flash and fails the test.
 */

import * as fs from "fs";
import * as path from "path";

import { test, expect, type Page, type Route } from "@playwright/test";
import { buildBetterBlogSquarespaceHeaderHtml } from "../client/src/lib/betterBlogInstallationSnippet";

// Playwright is invoked from the repo root, so process.cwd() is the repo root.
const REPO_ROOT = process.cwd();
const LOADER_PATH = path.join(REPO_ROOT, "scripts", "loader.js");
const RENDERER_PATH = path.join(REPO_ROOT, "scripts", "renderer.js");

const SITE_KEY = "loading-transition-test";
// Use a path that does not collide with any client-side route; we will intercept it.
const FAKE_BLOG_PATH = "/e2e/fake-squarespace-blog";

const headerInjection = buildBetterBlogSquarespaceHeaderHtml({
  loaderUrl: "/loader.js",
  siteKey: SITE_KEY,
  blogPath: FAKE_BLOG_PATH,
});

/**
 * The fixture mimics what Squarespace would serve: a hard-styled page with
 * native blog articles in main, plus the BetterBlog header injection in <head>.
 * The articles intentionally use a screaming color so any visible frame of
 * them in a CI screenshot/video is unmissable.
 */
const fakeSquarespaceBlogHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Fake Squarespace Blog (e2e fixture)</title>
  <style>
    body { margin: 0; font-family: Georgia, serif; background: #f3edda; color: #2a2a2a; }
    nav.sqs-nav { display: flex; gap: 12px; padding: 10px 16px; border-bottom: 1px solid #ddd; }
    main { padding: 24px; }
    article.native-squarespace-blog-item {
      background: #ff00ff;
      border: 4px solid #00ff00;
      padding: 24px;
      margin-bottom: 24px;
      font-size: 24px;
      min-height: 120px;
    }
  </style>
  ${headerInjection}
</head>
<body>
  <nav class="sqs-nav"><a href="/">Home</a><a href="${FAKE_BLOG_PATH}">Blog</a></nav>
  <main id="content">
    <article class="native-squarespace-blog-item" data-native-squarespace="true">
      <h2>Native Squarespace Post 1</h2>
      <p>This server-rendered Squarespace blog markup must NEVER appear on screen.</p>
    </article>
    <article class="native-squarespace-blog-item" data-native-squarespace="true">
      <h2>Native Squarespace Post 2</h2>
      <p>If a tester sees me, the flash bug is back.</p>
    </article>
  </main>
</body>
</html>`;

const blogJsonResponse = {
  collection: {
    title: "Fake Squarespace Blog",
    fullUrl: FAKE_BLOG_PATH,
  },
  website: { title: "E2E Fixture Site" },
  items: [
    {
      id: "bb-post-1",
      title: "BetterBlog Post 1",
      urlId: "bb-post-1",
      fullUrl: `${FAKE_BLOG_PATH}/bb-post-1`,
      // assetUrl is required to make the renderer actually issue its
      // `check-placeholder-images` POST during _renderContent, which gives the
      // SPA-nav test a meaningful async window to exercise the root-injection
      // guard while it would otherwise complete in <2ms.
      assetUrl: "https://example.invalid/bb-post-1.jpg",
      body: "<p>BetterBlog body 1</p>",
      excerpt: "BetterBlog excerpt 1",
      publishOn: 1_700_000_000_000,
      author: { displayName: "BetterBlog Author" },
    },
    {
      id: "bb-post-2",
      title: "BetterBlog Post 2",
      urlId: "bb-post-2",
      fullUrl: `${FAKE_BLOG_PATH}/bb-post-2`,
      assetUrl: "https://example.invalid/bb-post-2.jpg",
      body: "<p>BetterBlog body 2</p>",
      excerpt: "BetterBlog excerpt 2",
      publishOn: 1_700_000_100_000,
      author: { displayName: "BetterBlog Author" },
    },
  ],
};

const configResponse = {
  siteKey: SITE_KEY,
  blogPath: FAKE_BLOG_PATH,
  // baseUrl is required for the renderer's check-placeholder-images POST to
  // fire (renderer.js ~L7596 guards on `urlsToCheck.length > 0 && baseUrl`).
  // The SPA-nav test deliberately delays that response so the unguarded
  // window in _renderContent is wide enough to expose regressions.
  baseUrl: "http://localhost",
  // Point at our local dev server's renderer.js so loader.js doesn't try to
  // pull the production CDN bundle and get an older copy that lacks the
  // Step 1-3 changes.
  rendererUrl: "/renderer.js",
  defaultAuthorIds: [],
  postAuthorOverrides: {},
  authorMap: {},
  authorProfiles: {},
  collectionConfig: {
    showDate: true,
    showAuthor: false,
    showReadingTime: false,
    postSort: "date",
    pagination: { show: false, mode: "pages", postsPerPage: 10 },
    collectionLayout: "grid",
    gridColumns: 3,
    collectionModules: {
      filter: { enabled: false, filterByTags: false, filterByCategories: false, position: "none" },
      sort: { enabled: false, position: "none" },
      search: { enabled: false, position: "none" },
      recentPosts: { enabled: false, position: "none" },
      emailCapture: { enabled: false, position: "none", header: "", buttonText: "" },
      leadMagnet: { enabled: false, position: "none", resourceTitle: "", description: "", buttonText: "" },
    },
    leftSidebar: { show: false, modules: [], moduleOrder: [], width: 240, spaceAbove: 0, sticky: false },
    rightSidebar: { show: false, modules: [], moduleOrder: [], width: 240, spaceAbove: 0, sticky: false },
    headerContent: { show: false, modules: [], moduleOrder: [], height: 48 },
    footerContent: { show: false, modules: [], moduleOrder: [], topPadding: 16 },
    socialMediaLinks: { show: false, platforms: [] },
    featuredImage: {
      show: false,
      layoutMode: "fullBleed",
      imageWidthPercent: 40,
      aspectBehavior: "original",
      aspectRatio: "16:9",
      roundedCorners: "off",
      shadow: false,
      showCaption: false,
      verticalSpacing: "normal",
    },
    featuredArticle: { show: false, position: "header" },
  },
  postConfig: {
    showDate: true,
    showAuthor: false,
    showReadingTime: false,
    postSort: "date",
    pagination: { show: false, mode: "pages", postsPerPage: 10 },
    collectionLayout: "grid",
    gridColumns: 3,
    postModules: {
      tableOfContents: { enabled: false, position: "none" },
      breadcrumbs: { enabled: false, position: "none" },
      authorProfiles: { enabled: false, position: "none" },
      popularPosts: { enabled: false, position: "none", count: 5 },
      relevantPosts: { enabled: false, position: "none" },
      emailCapture: { enabled: false, position: "none", header: "", buttonText: "" },
      leadMagnet: { enabled: false, position: "none", resourceTitle: "", description: "", buttonText: "" },
    },
    postHeader: {
      imagePosition: "fullBleed",
      contentAlignment: "left",
      contentVerticalAlignment: "bottom",
      showBreadcrumbs: false,
      showTags: false,
      showCategories: false,
    },
    leftSidebar: { show: false, modules: [], moduleOrder: [], width: 240, spaceAbove: 0, sticky: false },
    rightSidebar: { show: false, modules: [], moduleOrder: [], width: 240, spaceAbove: 0, sticky: false },
    headerContent: { show: false, modules: [], moduleOrder: [], height: 48 },
    footerContent: { show: false, modules: [], moduleOrder: [], topPadding: 16 },
    socialMediaLinks: { show: false, platforms: [] },
    featuredImage: {
      show: false,
      layoutMode: "fullBleed",
      imageWidthPercent: 40,
      aspectBehavior: "original",
      aspectRatio: "16:9",
      roundedCorners: "off",
      shadow: false,
      showCaption: false,
      verticalSpacing: "normal",
    },
    progressBar: { show: false, position: "top", thickness: 6, color: "#5B4FE8" },
  },
  paywallMode: "auto",
  paywallDetectionState: "detected_unpaywalled",
};

type FlashFrame = {
  t: number;
  htmlClass: string;
  bodyVisibility: string;
  articleCount: number;
};

async function fulfillJson(route: Route, body: unknown): Promise<void> {
  await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
}

async function fulfillScript(route: Route, scriptPath: string): Promise<void> {
  const body = fs.readFileSync(scriptPath, "utf8");
  await route.fulfill({ status: 200, contentType: "application/javascript", body });
}

/**
 * Install all the routes the loader+renderer need to function in isolation
 * from the real backend. Playwright route precedence is last-registered-wins,
 * so the catch-all is registered first and the specific overrides after.
 *
 * The blog-path regex intentionally accepts an optional subpath so post URLs
 * like `${FAKE_BLOG_PATH}/bb-post-1` also resolve to the fixture; the renderer
 * also probes the post's own `?format=json` URL via `_probeCurrentPageJsonAuth`,
 * and we return the same collection JSON for those probes (the renderer only
 * inspects auth-related fields, which our shape doesn't set, so it falls back
 * to the default loggedOut signal — what we want for a non-paywalled fixture).
 */
async function installRoutes(page: Page): Promise<void> {
  await page.route("**/api/**", async (route) => {
    await route.fulfill({ status: 204, contentType: "application/json", body: "{}" });
  });
  // Artificially slow the placeholder-images probe by ~120ms so the renderer's
  // _renderContent function has a meaningful async window. In production
  // network round-trips routinely take that long; in the synthetic Playwright
  // environment mocked routes resolve in microseconds, which would collapse
  // the window we need the regression watcher to observe.
  await page.route("**/api/config/check-placeholder-images", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 120));
    await route.fulfill({ status: 200, contentType: "application/json", body: '{"data":{}}' });
  });
  await page.route(`**/api/config/${SITE_KEY}`, async (route) => fulfillJson(route, configResponse));

  const escapedPath = FAKE_BLOG_PATH.replace(/[/.]/g, "\\$&");
  const blogPathRegex = new RegExp(`${escapedPath}(/[^?]*)?(\\?.*)?$`);
  await page.route(blogPathRegex, async (route) => {
    const reqUrl = new URL(route.request().url());
    if (reqUrl.searchParams.get("format") === "json") {
      await fulfillJson(route, blogJsonResponse);
      return;
    }
    await route.fulfill({ status: 200, contentType: "text/html", body: fakeSquarespaceBlogHtml });
  });

  // Vite proxies /loader.js and /renderer.js to the Express backend by default;
  // serve them from disk so the test exercises the canonical source.
  await page.route(/\/loader\.js(\?.*)?$/, async (route) => fulfillScript(route, LOADER_PATH));
  await page.route(/\/renderer\.js(\?.*)?$/, async (route) => fulfillScript(route, RENDERER_PATH));
}

/**
 * Install the frame-by-frame flash watcher. Must be called before any page
 * script runs (i.e. before page.goto).
 */
async function installFlashWatcher(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const w = window as unknown as {
      __flashFrames: Array<{ t: number; htmlClass: string; bodyVisibility: string; articleCount: number }>;
      __stopFlashWatch?: () => void;
    };
    w.__flashFrames = [];
    let stopped = false;

    function check(): void {
      if (stopped || !document.body) return;
      // Match the attribute by presence so both the cold-load native articles
      // (data-native-squarespace="true") and the SPA-nav-injected ones
      // (data-native-squarespace="spa-injected") are caught.
      const articles = document.querySelectorAll<HTMLElement>("article[data-native-squarespace]");
      if (articles.length === 0) return;
      const bodyStyle = window.getComputedStyle(document.body);
      // The loading overlay relies on visibility:hidden on <body>. If body
      // isn't hidden, this is a frame the user could see.
      if (bodyStyle.visibility === "hidden" || bodyStyle.display === "none") return;
      for (let i = 0; i < articles.length; i++) {
        const a = articles[i];
        const s = window.getComputedStyle(a);
        if (s.visibility === "hidden" || s.display === "none" || parseFloat(s.opacity) === 0) continue;
        const rect = a.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          w.__flashFrames.push({
            t: performance.now(),
            htmlClass: document.documentElement.className,
            bodyVisibility: bodyStyle.visibility,
            articleCount: articles.length,
          });
          return;
        }
      }
    }

    function loop(): void {
      if (stopped) return;
      check();
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
    w.__stopFlashWatch = () => {
      stopped = true;
    };
  });
}

/** Wait `n` animation frames inside the page. */
async function waitFrames(page: Page, n: number): Promise<void> {
  await page.evaluate(
    (count) =>
      new Promise<void>((resolve) => {
        let i = 0;
        function spin(): void {
          i += 1;
          if (i >= count) return resolve();
          requestAnimationFrame(spin);
        }
        requestAnimationFrame(spin);
      }),
    n,
  );
}

async function collectFlashFrames(page: Page): Promise<FlashFrame[]> {
  return page.evaluate(() => {
    const w = window as unknown as {
      __flashFrames: FlashFrame[];
      __stopFlashWatch?: () => void;
    };
    w.__stopFlashWatch?.();
    return w.__flashFrames;
  });
}

/**
 * Block until the renderer has fully handed off: overlay is in the DOM,
 * `bb-loading-blog` is gone, plus 5 extra frames so the rAF watcher has a
 * chance to record any late re-injection by Squarespace bundles.
 */
async function waitForHandoffComplete(page: Page): Promise<void> {
  await page.waitForSelector("#blog-overlay-list", { timeout: 15_000 });
  await page.waitForFunction(
    () => !document.documentElement.classList.contains("bb-loading-blog"),
    undefined,
    { timeout: 15_000 },
  );
  await waitFrames(page, 5);
}

test.describe("Loading transition", () => {
  test.beforeEach(async ({ page }) => {
    await installRoutes(page);
    await installFlashWatcher(page);
  });

  test("native Squarespace blog markup never paints during cold load at the collection URL", async ({ page }) => {
    await page.goto(FAKE_BLOG_PATH, { waitUntil: "domcontentloaded" });
    await waitForHandoffComplete(page);

    const flashFrames = await collectFlashFrames(page);
    expect(
      flashFrames,
      "Native Squarespace blog markup must never be visible during the collection load",
    ).toEqual([]);

    const overlayPosts = await page.locator("#blog-overlay-list article").count();
    expect(overlayPosts).toBeGreaterThan(0);
  });

  test("native markup never paints during SPA navigation from collection to post", async ({ page }) => {
    await page.goto(FAKE_BLOG_PATH, { waitUntil: "domcontentloaded" });
    await waitForHandoffComplete(page);

    // Pre-condition: we're on the collection view with no flash so far.
    const preNavFrames = await page.evaluate(() => {
      const w = window as unknown as { __flashFrames: FlashFrame[] };
      return w.__flashFrames.slice();
    });
    expect(preNavFrames, "no flash should occur before SPA navigation").toEqual([]);
    const preCount = await page.locator("#blog-overlay-list article").count();
    expect(preCount).toBe(blogJsonResponse.items.length);

    // Simulate what Squarespace's SPA router does on a post-link click:
    // (a) inject the native single-post markup into root (same container the
    //     renderer took over), and (b) update the URL via pushState. The
    //     wrapped pushState fires BetterBlog's route observer, which queues a
    //     re-render. The root-injection guard — which must stay active for
    //     the duration of the re-render — has to neutralize Squarespace's
    //     content before any frame paints with body visible.
    //
    // We re-inject for ~500ms to model Squarespace bundles that hydrate over
    // several ticks rather than a single synchronous mutation. If the guard
    // is ever torn down (which was the original Step 3 bug), at least one of
    // those re-injections survives long enough for an rAF tick to see it.
    await page.evaluate((targetPath) => {
      const w = window as unknown as {
        __flashFrames: unknown[];
      };
      // Reset watcher state so only the SPA window is observed. The cold-load
      // period already passed with no flash (asserted by preNavFrames above);
      // we want the SPA assertion to be unambiguous about the SPA window.
      w.__flashFrames = [];

      const TAG = "spa-injected";
      function inject(): void {
        const main = document.querySelector("main");
        if (!main) return;
        if (main.querySelector(`article[data-native-squarespace="${TAG}"]`)) return;
        const article = document.createElement("article");
        article.className = "native-squarespace-blog-item";
        article.dataset.nativeSquarespace = TAG;
        article.innerHTML =
          '<h2>Native Squarespace Single Post</h2><p>If you see me during SPA nav, the guard was torn down.</p>';
        main.appendChild(article);
      }

      // (a) Inject first so the guard sees an existing flash candidate even
      //     before BetterBlog notices the route change.
      inject();
      // (b) Update the URL; this is what kicks off BetterBlog's re-render via
      //     the wrapped history.pushState in _startRouteChangeObserver.
      history.pushState(null, "", targetPath);
      // (c) Keep re-injecting for ~500ms to model a Squarespace SPA bundle
      //     that hydrates over many ticks. If the root-injection guard is
      //     ever torn down mid-_renderContent (the regression that prompted
      //     this test), at least one injection survives long enough for the
      //     rAF flash watcher to record it as a visible frame.
      let n = 0;
      const interval = window.setInterval(() => {
        inject();
        n += 1;
        if (n >= 30) window.clearInterval(interval);
      }, 16);
    }, `${FAKE_BLOG_PATH}/bb-post-1`);

    // Wait for BetterBlog to re-render as the single-post view (overlay-list
    // has exactly one article after the route change).
    await page.waitForFunction(
      () => {
        const list = document.querySelector("#blog-overlay-list");
        if (!list) return false;
        return list.querySelectorAll("article").length === 1;
      },
      undefined,
      { timeout: 15_000 },
    );
    // Let the injection interval keep firing past the re-render so we also
    // exercise the post-render guard window.
    await page.waitForTimeout(600);
    await waitFrames(page, 5);

    const flashFrames = await collectFlashFrames(page);
    expect(
      flashFrames,
      "Native Squarespace markup must never be visible during SPA navigation",
    ).toEqual([]);

    // The injected native article must not have survived in the DOM either.
    const survived = await page
      .locator('main article[data-native-squarespace="spa-injected"]')
      .count();
    expect(survived).toBe(0);
  });

  test("native markup never paints on hard refresh at a post URL", async ({ page }) => {
    await page.goto(`${FAKE_BLOG_PATH}/bb-post-1`, { waitUntil: "domcontentloaded" });
    await waitForHandoffComplete(page);

    const flashFrames = await collectFlashFrames(page);
    expect(
      flashFrames,
      "Native Squarespace markup must never be visible during a hard refresh on a post URL",
    ).toEqual([]);

    // Sanity: BetterBlog rendered the single-post view, not the collection.
    const overlayPosts = await page.locator("#blog-overlay-list article").count();
    expect(overlayPosts).toBe(1);
  });
});
