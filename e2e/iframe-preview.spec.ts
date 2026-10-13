import { expect, test, type Page } from "@playwright/test";
import { setupApiMocks } from "./support/mocks";

const configureUrl = "/dashboard/configure?siteKey=e2e-site";

async function openConfigure(page: Page) {
  await setupApiMocks(page);
  await page.goto(configureUrl, { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL((url) => new URL(url).pathname === "/dashboard/configure");
  await expect(page).not.toHaveURL(/\/login(?:\?|$)/);
  await expect(page.getByRole("button", { name: "Collection", exact: true })).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('iframe[title="Blog preview"]')).toBeVisible();
}

function showDateSwitch(page: Page) {
  return page.locator("#show-date");
}

function frame(page: Page) {
  return page.frameLocator('iframe[title="Blog preview"]');
}

async function waitForListView(page: Page) {
  await expect
    .poll(async () => await frame(page).locator("article").count(), { timeout: 15_000 })
    .toBeGreaterThan(1);
}

async function waitForSinglePostView(page: Page) {
  await expect
    .poll(async () => await frame(page).locator("article").count(), { timeout: 15_000 })
    .toBe(1);
}

test.describe("Iframe preview flow", () => {
  test("initial load sync: show date stays in sync across repeated toggles", async ({ page }) => {
    await openConfigure(page);
    await waitForListView(page);
    const iframe = page.locator('iframe[title="Blog preview"]');
    const src = await iframe.getAttribute("src");
    expect(src).toContain("view=collection");
    expect(src).toContain("bbPreview=1");

    for (let i = 0; i < 10; i++) {
      await showDateSwitch(page).click();
      const expectedVisible = i % 2 === 0 ? false : true;
      await expect
        .poll(async () => (await frame(page).locator(".blog-overlay-meta").count()) > 0, { timeout: 10_000 })
        .toBe(expectedVisible);
    }
    await expect(iframe).toHaveAttribute("src", src!);
  });

  test("collection/post transitions restore correct iframe mode", async ({ page }) => {
    await openConfigure(page);
    await waitForListView(page);
    const iframe = page.locator('iframe[title="Blog preview"]');
    await expect(iframe).toHaveAttribute("src", /view=collection/);

    await frame(page).locator("article h2 a").first().click();
    await waitForSinglePostView(page);
    await expect(iframe).toHaveAttribute("src", /view=collection/);

    await page.getByRole("button", { name: "Collection", exact: true }).click();
    await waitForListView(page);
    await expect(iframe).toHaveAttribute("src", /view=collection/);

    await page.getByRole("button", { name: "Post", exact: true }).click();
    await expect(iframe).toHaveAttribute("src", /view=post/);
    await expect(iframe).toHaveAttribute("src", /fixture-post-1/);
    await waitForSinglePostView(page);
  });

  test("in-iframe navbar navigation keeps preview controllable", async ({ page }) => {
    await openConfigure(page);
    await waitForListView(page);

    const iframe = page.locator('iframe[title="Blog preview"]');
    const srcBefore = await iframe.getAttribute("src");
    await frame(page).locator("#blog-nav-link").click();

    await expect(iframe).toHaveAttribute("src", srcBefore!);
    await expect
      .poll(async () => {
        return page.evaluate(() => {
          const frameEl = document.querySelector('iframe[title="Blog preview"]') as HTMLIFrameElement | null;
          return frameEl?.contentWindow?.location.pathname ?? "";
        });
      })
      .toContain("/api/config/preview-snapshot/");

    await showDateSwitch(page).click();
    await expect
      .poll(async () => (await frame(page).locator(".blog-overlay-meta").count()) > 0, { timeout: 10_000 })
      .toBe(false);
  });

  test("rapid toggles converge to final expected state", async ({ page }) => {
    await openConfigure(page);
    await waitForListView(page);

    const toggle = showDateSwitch(page);
    for (let i = 0; i < 7; i++) await toggle.click();

    // Starts true, toggled odd number => false.
    await expect
      .poll(async () => (await frame(page).locator(".blog-overlay-meta").count()) > 0, { timeout: 10_000 })
      .toBe(false);
  });

  test("pageshow/visibility lifecycle still allows re-sync", async ({ page }) => {
    await openConfigure(page);
    await waitForListView(page);

    await page.evaluate(() => {
      window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true }));
      document.dispatchEvent(new Event("visibilitychange"));
    });

    await showDateSwitch(page).click();
    await expect
      .poll(async () => (await frame(page).locator(".blog-overlay-meta").count()) > 0, { timeout: 10_000 })
      .toBe(false);
  });
});
