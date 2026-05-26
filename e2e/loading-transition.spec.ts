/**
 * Loading transition regression test.
 *
 * Reproduces the deployment scenario: a Squarespace-like HTML page is served
 * with the BetterBlog Header injection in <head>, followed by the loader and
 * renderer scripts. We assert that the obnoxiously-styled native Squarespace
 * blog markup is never visible in any animation frame between page navigation
 * and BetterBlog's first paint.
 *
 * The check works frame-by-frame via requestAnimationFrame: any frame in which
 *   - <body> is *not* visibility:hidden / display:none
 *   - AND at least one <article data-native-squarespace="true"> has non-zero
 *     box rect and non-hidden computed style
 * is recorded as a flash and fails the test.
 */

import * as fs from "fs";
import * as path from "path";

import { test, expect, type Route } from "@playwright/test";
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
  postConfig: null,
  paywallMode: "auto",
  paywallDetectionState: "detected_unpaywalled",
};

async function fulfillJson(route: Route, body: unknown): Promise<void> {
  await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
}

async function fulfillScript(route: Route, scriptPath: string): Promise<void> {
  const body = fs.readFileSync(scriptPath, "utf8");
  await route.fulfill({ status: 200, contentType: "application/javascript", body });
}

test.describe("Loading transition", () => {
  test("native Squarespace blog markup never paints between loader and BetterBlog", async ({ page }) => {
    // Playwright route precedence is last-registered-wins. Register the
    // broadest matchers first, then the specific overrides on top.

    // 1. Catch-all: any /api/* request that we don't override returns 204 so
    // the renderer doesn't hang on a missing analytics/comments endpoint.
    await page.route("**/api/**", async (route) => {
      await route.fulfill({ status: 204, contentType: "application/json", body: "{}" });
    });

    // 2. Specific override: the BetterBlog config endpoint that loader.js
    // fetches. Registered after the catch-all so it wins.
    await page.route(`**/api/config/${SITE_KEY}`, async (route) => fulfillJson(route, configResponse));

    // 3. Serve the fake Squarespace blog HTML at the blog path. Squarespace
    // serves the same path with ?format=json as JSON; route on the query string.
    // Use a RegExp so the matcher handles `?` (which is a glob wildcard).
    const blogPathRegex = new RegExp(`${FAKE_BLOG_PATH.replace(/[/.]/g, "\\$&")}(\\?.*)?$`);
    await page.route(blogPathRegex, async (route) => {
      const reqUrl = new URL(route.request().url());
      if (reqUrl.searchParams.get("format") === "json") {
        await fulfillJson(route, blogJsonResponse);
        return;
      }
      await route.fulfill({ status: 200, contentType: "text/html", body: fakeSquarespaceBlogHtml });
    });

    // 4. Serve loader.js and renderer.js from disk. Vite's dev server normally
    // proxies these to the (unused-in-tests) Express backend, which would
    // ECONNREFUSED in CI. Reading directly from scripts/* ensures we test the
    // canonical source.
    await page.route(/\/loader\.js(\?.*)?$/, async (route) => fulfillScript(route, LOADER_PATH));
    await page.route(/\/renderer\.js(\?.*)?$/, async (route) => fulfillScript(route, RENDERER_PATH));

    // 5. Install the frame-by-frame visibility watcher before any page script
    // runs. This is the heart of the test.
    await page.addInitScript(() => {
      const w = window as unknown as {
        __flashFrames: Array<{ t: number; htmlClass: string; bodyVisibility: string; articleCount: number }>;
        __stopFlashWatch?: () => void;
      };
      w.__flashFrames = [];
      let stopped = false;

      function check(): void {
        if (stopped || !document.body) return;
        const articles = document.querySelectorAll<HTMLElement>('article[data-native-squarespace="true"]');
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

    // 6. Navigate to the fixture. domcontentloaded is sufficient — the loader
    // and renderer take over from there.
    await page.goto(FAKE_BLOG_PATH, { waitUntil: "domcontentloaded" });

    // 7. Wait for BetterBlog's overlay to land. This is the indicator that the
    // handoff has occurred.
    await page.waitForSelector("#blog-overlay-list", { timeout: 15_000 });

    // 8. Wait for bb-loading-blog to be cleared (i.e. the loader has finished
    // the double-RAF + fonts.ready handoff).
    await page.waitForFunction(
      () => !document.documentElement.classList.contains("bb-loading-blog"),
      undefined,
      { timeout: 15_000 },
    );

    // 9. Wait a few more frames past the handoff to give the rAF loop a chance
    // to record any late re-injection by Squarespace's native bundles (the
    // root-injection guard from Step 3 should suppress these).
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          let n = 0;
          function spin(): void {
            n += 1;
            if (n >= 5) return resolve();
            requestAnimationFrame(spin);
          }
          requestAnimationFrame(spin);
        }),
    );

    // 10. Stop the watcher and pull the captured frames into Node.
    const flashFrames = await page.evaluate(() => {
      const w = window as unknown as {
        __flashFrames: Array<{ t: number; htmlClass: string; bodyVisibility: string; articleCount: number }>;
        __stopFlashWatch?: () => void;
      };
      w.__stopFlashWatch?.();
      return w.__flashFrames;
    });

    expect(
      flashFrames,
      "Native Squarespace blog markup must never be visible during the loading transition",
    ).toEqual([]);

    // Sanity check: BetterBlog actually rendered the mocked posts.
    const overlayPosts = await page.locator("#blog-overlay-list article").count();
    expect(overlayPosts).toBeGreaterThan(0);
  });
});
