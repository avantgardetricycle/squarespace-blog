import { expect, test } from "@playwright/test";

import { blogJson } from "./fixtures/blog";
import { collectionTemplates } from "./fixtures/templates";
import { cssValue, isMobileProject, mountRenderer } from "./harness";

const CARD = '#blog-overlay-list[data-bb-collection-layout="grid"] article .blog-overlay-featured-image';

/** 1×1 gif so fixture image URLs stay in the DOM instead of falling back to a placeholder. */
const TINY_GIF = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");

async function stubCardImages(page: import("@playwright/test").Page): Promise<void> {
  await page.route("**/*bb-layout-post-*.jpg", (route) =>
    route.fulfill({ status: 200, contentType: "image/gif", body: TINY_GIF }),
  );
}

async function boxRatio(page: import("@playwright/test").Page, selector: string): Promise<number> {
  return page.locator(selector).first().evaluate((el) => {
    const box = el.getBoundingClientRect();
    return box.width / box.height;
  });
}

test.describe("masthead thumbnail shape", () => {
  test("grid cards stay 16:9 by default and the hero crop is unchanged", async ({ page }, testInfo) => {
    const mobile = isMobileProject(testInfo);
    await stubCardImages(page);
    await mountRenderer(page, {
      collectionConfig: structuredClone(collectionTemplates.masthead),
      previewSelectedPostIndex: -1,
    });

    const cardRatio = await cssValue(page, CARD, "aspect-ratio");
    expect(cardRatio === "16 / 9" || cardRatio === "1.77778").toBe(true);
    const cardBox = await boxRatio(page, CARD);
    expect(cardBox).toBeGreaterThan(1.6);
    expect(cardBox).toBeLessThan(1.95);

    const padding = await cssValue(page, CARD, "padding-top");
    expect(padding).toBe("0px");
    const innerHeight = await cssValue(page, `${CARD} > div`, "height");
    const cardHeight = await cssValue(page, CARD, "height");
    expect(innerHeight).toBe(cardHeight);

    const imgFit = await cssValue(page, `${CARD} img`, "object-fit");
    expect(imgFit).toBe("cover");
    const imgPosition = await cssValue(page, `${CARD} img`, "object-position");
    expect(imgPosition === "center" || imgPosition === "50% 50%").toBe(true);

    const heroRatio = await cssValue(page, ".blog-overlay-featured-hero > div", "aspect-ratio");
    if (mobile) {
      expect(heroRatio === "4 / 3" || heroRatio === "1.33333").toBe(true);
    } else {
      expect(heroRatio === "21 / 9" || heroRatio === "2.33333").toBe(true);
    }
  });

  test("portrait shape crops grid cards at 2:3 and uses the Squarespace focal point", async ({ page }, testInfo) => {
    const mobile = isMobileProject(testInfo);
    await stubCardImages(page);
    const items = blogJson.items.map((item, index) =>
      index === 0 ? { ...item, mediaFocalPoint: { x: 0.2, y: 0.8 } } : item,
    );
    await mountRenderer(page, {
      collectionConfig: { ...structuredClone(collectionTemplates.masthead), thumbnailShape: "2:3" },
      previewSelectedPostIndex: -1,
      blogItems: items,
    });

    const cardRatio = await cssValue(page, CARD, "aspect-ratio");
    expect(cardRatio === "2 / 3" || cardRatio === "0.666667").toBe(true);
    const cardBox = await boxRatio(page, CARD);
    expect(cardBox).toBeGreaterThan(0.55);
    expect(cardBox).toBeLessThan(0.8);

    const focal = await page.locator(`${CARD} img[src*="bb-layout-post-0"]`).evaluate((el) => {
      return getComputedStyle(el).objectPosition;
    });
    expect(focal).toBe("20% 80%");

    const centered = await page.locator(`${CARD} img[src*="bb-layout-post-1"]`).evaluate((el) => {
      return getComputedStyle(el).objectPosition;
    });
    expect(centered === "center" || centered === "50% 50%").toBe(true);

    const heroRatio = await cssValue(page, ".blog-overlay-featured-hero > div", "aspect-ratio");
    if (mobile) {
      expect(heroRatio === "4 / 3" || heroRatio === "1.33333").toBe(true);
    } else {
      expect(heroRatio === "21 / 9" || heroRatio === "2.33333").toBe(true);
    }
  });

  test("other collection layouts ignore thumbnail shape", async ({ page }) => {
    await mountRenderer(page, {
      collectionConfig: { ...structuredClone(collectionTemplates.newsroom), thumbnailShape: "2:3" },
      previewSelectedPostIndex: -1,
    });

    const ratio = await cssValue(
      page,
      '#blog-overlay-list[data-bb-collection-layout="listRows"] .blog-overlay-featured-image',
      "aspect-ratio",
    );
    expect(ratio === "2 / 3" || ratio === "0.666667").toBe(false);
  });
});
