import { expect, test, type Page } from "@playwright/test";
import { setupApiMocks } from "./support/mocks";

const configureUrl = "/dashboard/configure?siteKey=e2e-site";

async function openConfigure(page: Page) {
  await setupApiMocks(page);
  await page.goto(configureUrl);
  await expect(page).toHaveURL(/\/dashboard\/configure/);
  await expect(page.getByRole("button", { name: "Collection", exact: true })).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('iframe[title="Blog preview"]')).toBeVisible();
}

function showDateSwitch(page: Page) {
  return page.locator("div", { has: page.getByText("Show Date", { exact: true }) }).locator('[role="switch"]');
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

    for (let i = 0; i < 10; i++) {
      await showDateSwitch(page).click();
      const expectedVisible = i % 2 === 0 ? false : true;
      await expect
        .poll(async () => (await frame(page).locator(".blog-overlay-meta").count()) > 0, { timeout: 10_000 })
        .toBe(expectedVisible);
    }
  });

  test("collection/post transitions restore correct iframe mode", async ({ page }) => {
    await openConfigure(page);
    await waitForListView(page);

    await frame(page).locator("article h2 a").first().click();
    await waitForSinglePostView(page);

    await page.getByRole("button", { name: "Collection", exact: true }).click();
    await waitForListView(page);

    await page.getByRole("button", { name: "Post", exact: true }).click();
    await waitForSinglePostView(page);
  });

  test("in-iframe navbar navigation keeps preview controllable", async ({ page }) => {
    await openConfigure(page);
    await waitForListView(page);

    await frame(page).locator("#blog-nav-link").click();

    const iframe = page.locator('iframe[title="Blog preview"]');
    await expect
      .poll(async () => {
        const src = await iframe.getAttribute("src");
        return typeof src === "string" && src.includes("bbPreview=1");
      })
      .toBeTruthy();

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
