import { expect, test } from "@playwright/test";

import { cssNumber, expectPx, mountRenderer } from "./harness";
import { collectionTemplates, zoneOrderPostConfig } from "./fixtures/templates";

test.describe("viewport switching", () => {
  test("Configure phone frame applies mobile rules without a narrow media query", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "renderer-desktop", "needs a wide window around a 375px root");

    await mountRenderer(page, {
      postConfig: zoneOrderPostConfig("feature"),
      previewDevice: "mobile",
      rootWidth: 375,
    });

    const state = await page.evaluate(() => {
      const list = document.getElementById("blog-overlay-list");
      return {
        media: window.matchMedia("(max-width: 767px)").matches,
        narrow: Boolean(list?.classList.contains("bb-narrow-viewport")),
        width: list ? Math.round(list.getBoundingClientRect().width) : 0,
      };
    });
    expect(state.media).toBe(false);
    expect(state.narrow).toBe(true);
    expect(state.width).toBeLessThanOrEqual(767);
    expectPx(await cssNumber(page, ".blog-overlay-post-title", "font-size"), 28);
    const left = await page.locator('[data-bb-sidebar-side="left"]').first().evaluate((el) => {
      return getComputedStyle(el).display;
    });
    expect(left).toBe("none");

    await page.goto("about:blank");
    await mountRenderer(page, {
      collectionConfig: structuredClone(collectionTemplates.digest),
      previewSelectedPostIndex: -1,
      previewDevice: "mobile",
      rootWidth: 375,
    });
    const digest = await page.evaluate(() => {
      const list = document.getElementById("blog-overlay-list");
      const filter = document.querySelector('[data-bb-zone="sidebar"][data-bb-module="filterByCategory"]');
      const leftRail = document.querySelector('[data-bb-sidebar-side="left"]');
      return {
        media: window.matchMedia("(max-width: 767px)").matches,
        narrow: Boolean(list?.classList.contains("bb-narrow-viewport")),
        filterHidden: Boolean(filter?.classList.contains("bb-mobile-sidebar-filter-hidden")),
        leftDisplay: leftRail ? getComputedStyle(leftRail).display : null,
      };
    });
    expect(digest.media).toBe(false);
    expect(digest.narrow).toBe(true);
    expect(digest.filterHidden).toBe(true);
    expect(digest.leftDisplay).toBe("none");
  });

  test("resizing between desktop and mobile restores both layouts", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "renderer-desktop", "starts from the desktop viewport");

    await mountRenderer(page, { postConfig: zoneOrderPostConfig("feature") });
    await expect(page.locator("#blog-overlay-list")).not.toHaveClass(/bb-narrow-viewport/);
    expectPx(await cssNumber(page, ".blog-overlay-post-title", "font-size"), 40, 2);

    await page.setViewportSize({ width: 375, height: 812 });
    await expect(page.locator("#blog-overlay-list")).toHaveClass(/bb-narrow-viewport/, { timeout: 5_000 });
    await expect
      .poll(() => cssNumber(page, ".blog-overlay-post-title", "font-size"), { timeout: 5_000 })
      .toBeLessThan(32);

    await page.setViewportSize({ width: 1280, height: 900 });
    await expect(page.locator("#blog-overlay-list")).not.toHaveClass(/bb-narrow-viewport/, { timeout: 5_000 });
    await expect
      .poll(() => cssNumber(page, ".blog-overlay-post-title", "font-size"), { timeout: 5_000 })
      .toBeGreaterThan(36);

    await page.goto("about:blank");
    await mountRenderer(page, {
      collectionConfig: structuredClone(collectionTemplates.digest),
      previewSelectedPostIndex: -1,
    });
    await expect(page.locator("#blog-overlay-list")).not.toHaveClass(/bb-narrow-viewport/);
    await page.setViewportSize({ width: 375, height: 812 });
    await expect(page.locator("#blog-overlay-list")).toHaveClass(/bb-narrow-viewport/, { timeout: 5_000 });
    const filterHidden = await page
      .locator('[data-bb-zone="sidebar"][data-bb-module="filterByCategory"]')
      .first()
      .evaluate((el) => el.classList.contains("bb-mobile-sidebar-filter-hidden"));
    expect(filterHidden).toBe(true);
    await page.setViewportSize({ width: 1280, height: 900 });
    await expect(page.locator("#blog-overlay-list")).not.toHaveClass(/bb-narrow-viewport/, { timeout: 5_000 });
    const filterShown = await page
      .locator('[data-bb-zone="sidebar"][data-bb-module="filterByCategory"]')
      .first()
      .evaluate((el) => el.classList.contains("bb-mobile-sidebar-filter-hidden"));
    expect(filterShown).toBe(false);
  });
});
