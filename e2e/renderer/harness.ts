import * as path from "path";

import { expect, type Page, type TestInfo } from "@playwright/test";

import { blogJson, BLOG_JSON_PATH, commentListJson } from "./fixtures/blog";

const RENDERER_PATH = path.join(process.cwd(), "scripts", "renderer.js");

export function isMobileProject(testInfo: TestInfo): boolean {
  return testInfo.project.name === "renderer-mobile";
}

type MountOptions = {
  collectionConfig?: Record<string, unknown>;
  postConfig?: Record<string, unknown>;
  /** -1 is the collection index. Defaults to the middle post. */
  previewSelectedPostIndex?: number;
  previewDevice?: "desktop" | "tablet" | "mobile";
  /** Constrain the mount root. Used for Configure's phone frame on a wide window. */
  rootWidth?: number;
};

export async function mountRenderer(page: Page, options: MountOptions = {}): Promise<void> {
  const previewSelectedPostIndex = options.previewSelectedPostIndex ?? 1;
  const rootWidth = options.rootWidth;

  await page.route(`**${BLOG_JSON_PATH}*`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(blogJson),
    });
  });
  await page.route("**/api/config/check-placeholder-images", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: '{"data":{}}' });
  });
  await page.route("**/api/comment/**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: '{"comments":[]}' });
  });
  await page.route("**/api/comments**", async (route) => {
    if (route.request().method() !== "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(commentListJson),
    });
  });
  await page.route("**/e2e/renderer-mount", async (route) => {
    const widthStyle = rootWidth ? `style="width:${rootWidth}px;margin:0 auto"` : "";
    await route.fulfill({
      status: 200,
      contentType: "text/html",
      body: `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Renderer layout harness</title>
  <style>html,body{margin:0;padding:0;background:#fff}</style>
</head>
<body>
  <header class="Header" style="height:64px;background:#111;color:#fff">Site header</header>
  <div id="root" ${widthStyle}></div>
</body>
</html>`,
    });
  });

  await page.goto("/e2e/renderer-mount", { waitUntil: "domcontentloaded" });
  await page.addScriptTag({ path: RENDERER_PATH });

  await page.evaluate(
    ({ collectionConfig, postConfig, previewSelectedPostIndex: selected, previewDevice }) => {
      const w = window as unknown as {
        BlogOverlayRenderer: { init: (config: Record<string, unknown>) => void };
      };
      const root = document.getElementById("root");
      w.BlogOverlayRenderer.init({
        previewMode: true,
        rootEl: root,
        previewFetchUrl: "/e2e/renderer-blog.json",
        baseUrl: window.location.origin,
        siteKey: "renderer-layout",
        blogPath: "/e2e/renderer-blog",
        previewSelectedPostIndex: selected,
        previewDevice,
        defaultAuthorIds: ["ada", "grace"],
        authorMap: { ada: "Ada Lovelace", grace: "Grace Hopper" },
        authorProfiles: {
          ada: {
            name: "Ada Lovelace",
            imageUrl: null,
            bio: "Wrote the first algorithm.",
            email: "ada@example.invalid",
            socialLinks: { website: "https://example.invalid/ada" },
          },
          grace: {
            name: "Grace Hopper",
            imageUrl: null,
            bio: "Invented the compiler.",
            email: "grace@example.invalid",
            socialLinks: { website: "https://example.invalid/grace" },
          },
        },
        collectionConfig,
        postConfig,
        commentSettings: {
          commentsEnabled: true,
          allowAnonymousComments: true,
          allowNewComments: true,
          subscriberCommentsEnabled: false,
        },
      });
    },
    {
      collectionConfig: options.collectionConfig,
      postConfig: options.postConfig,
      previewSelectedPostIndex,
      previewDevice: options.previewDevice,
    },
  );

  await page.waitForSelector("#blog-overlay-list", { timeout: 15_000 });
  if (previewSelectedPostIndex >= 0) {
    await page.waitForSelector("#bb-comments .bb-comments-list > *", { timeout: 15_000 });
  }
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );
}

export async function cssNumber(page: Page, selector: string, prop: string): Promise<number> {
  const value = await page.locator(selector).first().evaluate((el, property) => {
    return window.getComputedStyle(el).getPropertyValue(property);
  }, prop);
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : NaN;
}

export async function cssValue(page: Page, selector: string, prop: string): Promise<string> {
  return page.locator(selector).first().evaluate((el, property) => {
    return window.getComputedStyle(el).getPropertyValue(property);
  }, prop);
}

export function expectPx(actual: number, expected: number, tolerance = 1.5): void {
  expect(Math.abs(actual - expected), `expected ${expected}px ± ${tolerance}, got ${actual}`).toBeLessThanOrEqual(tolerance);
}
