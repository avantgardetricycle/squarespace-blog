import { expect, test } from "@playwright/test";
import {
  dashboardMeWithCanceledSubscription,
  setupApiMocks,
} from "./support/mocks";

test.describe("Resubscribe after cancel", () => {
  test("Account shows a plan picker and starts Checkout for the chosen product", async ({
    page,
  }) => {
    let checkoutBody: { planKey?: string; cadence?: string } | null = null;

    await setupApiMocks(page, {
      dashboardMe: dashboardMeWithCanceledSubscription(),
      extraRoutes: async ({ method, path, route }) => {
        if (method === "POST" && path === "/api/dashboard/subscription/checkout") {
          checkoutBody = route.request().postDataJSON() as {
            planKey?: string;
            cadence?: string;
          };
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ url: "https://checkout.stripe.com/c/e2e-resubscribe" }),
          });
          return true;
        }
        return false;
      },
    });

    await page.goto("/dashboard/account", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Account Settings" })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText("Subscription canceled")).toBeVisible();
    await expect(page.getByRole("button", { name: "Resubscribe" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Restore Subscription" })).toHaveCount(0);

    await page.getByRole("button", { name: "Resubscribe" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "Choose a plan" })).toBeVisible();
    await expect(dialog.getByRole("heading", { name: "Essentials" })).toBeVisible();
    await expect(dialog.getByRole("heading", { name: "Professional" })).toBeVisible();
    await expect(dialog.getByRole("heading", { name: "Publication" })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Resubscribe" })).toHaveCount(3);

    await dialog.getByRole("button", { name: "Monthly" }).click();

    await page.route("https://checkout.stripe.com/**", (route) =>
      route.fulfill({ status: 200, contentType: "text/plain", body: "ok" })
    );

    await dialog.getByRole("button", { name: "Resubscribe" }).nth(1).click();

    await expect.poll(() => checkoutBody).not.toBeNull();
    expect(checkoutBody).toEqual({ planKey: "professional", cadence: "monthly" });
  });
});
