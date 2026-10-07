import { expect, test } from "@playwright/test";

import { mountRenderer } from "./harness";
import { collectionTemplates } from "./fixtures/templates";

const CREAM = "rgb(243, 234, 215)";
const DARK = "rgb(17, 17, 17)";

test.describe("page background", () => {
  test("paints the blog section color after native markup is removed", async ({ page }) => {
    await mountRenderer(page, {
      collectionConfig: structuredClone(collectionTemplates.masthead),
      previewSelectedPostIndex: -1,
      pageBackground: { section: "#f3ead7", cssVariable: "#111111" },
    });

    const colors = await page.evaluate(() => {
      const overlay = document.getElementById("blog-overlay-list");
      const root = document.getElementById("root");
      const header = document.querySelector("header.Header");
      return {
        overlay: overlay ? getComputedStyle(overlay).backgroundColor : null,
        root: root ? getComputedStyle(root).backgroundColor : null,
        header: header ? getComputedStyle(header).backgroundColor : null,
        body: getComputedStyle(document.body).backgroundColor,
        nativeSectionBackground: Boolean(document.querySelector(".section-background")),
      };
    });

    expect(colors.nativeSectionBackground).toBe(false);
    expect(colors.overlay).toBe(CREAM);
    expect(colors.root).toBe(CREAM);
    expect(colors.header).toBe(DARK);
    expect(colors.body).toBe(DARK);
  });

  test("paints --siteBackgroundColor when the section has no background", async ({ page }) => {
    await mountRenderer(page, {
      collectionConfig: structuredClone(collectionTemplates.masthead),
      previewSelectedPostIndex: -1,
      pageBackground: { cssVariable: "#f3ead7" },
    });

    const overlay = await page.locator("#blog-overlay-list").evaluate((el) => {
      return getComputedStyle(el).backgroundColor;
    });
    const root = await page.locator("#root").evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(overlay).toBe(CREAM);
    expect(root).toBe(CREAM);
  });

  test("leaves a section background image uncovered", async ({ page }) => {
    await mountRenderer(page, {
      collectionConfig: structuredClone(collectionTemplates.masthead),
      previewSelectedPostIndex: -1,
      pageBackground: { section: "#f3ead7", cssVariable: "#111111", image: true },
    });

    const colors = await page.evaluate(() => {
      const overlay = document.getElementById("blog-overlay-list");
      const root = document.getElementById("root");
      return {
        overlay: overlay ? getComputedStyle(overlay).backgroundColor : null,
        root: root ? getComputedStyle(root).backgroundColor : null,
      };
    });

    expect(colors.overlay).toBe("rgba(0, 0, 0, 0)");
    expect(colors.root).toBe("rgba(0, 0, 0, 0)");
  });
});
