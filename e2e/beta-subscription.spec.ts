import { expect, test } from "@playwright/test";
import { dashboardMe, setupApiMocks } from "./support/mocks";

const betaAccessUntil = "2027-10-15T00:00:00.000Z";

function betaAccount() {
  return {
    ...dashboardMe,
    subscription: {
      ...dashboardMe.subscription,
      plan: "publication",
      planDisplay: "Publication",
      source: "beta",
      status: "active",
      priceDisplay: "Free",
      currentPeriodEnd: betaAccessUntil,
      cancelAtPeriodEnd: false,
    },
  };
}

test.describe("Beta tester subscription", () => {
  test("Change Plan and Update Payment Method start checkout without a Stripe customer", async ({
    page,
  }) => {
    let checkoutBody: { planKey?: string; cadence?: string } | null = null;
    let portalCalled = false;

    await setupApiMocks(page, {
      dashboardMe: betaAccount(),
      extraRoutes: async ({ method, path, route }) => {
        if (method === "POST" && path === "/api/dashboard/subscription/portal") {
          portalCalled = true;
          await route.fulfill({
            status: 404,
            contentType: "application/json",
            body: JSON.stringify({ error: "No Stripe customer found. Subscribe to a plan first." }),
          });
          return true;
        }
        if (method === "POST" && path === "/api/dashboard/subscription/checkout") {
          checkoutBody = route.request().postDataJSON() as { planKey?: string; cadence?: string };
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ url: "https://checkout.stripe.com/c/e2e-beta" }),
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
    await expect(page.getByText("Publication · Beta")).toBeVisible();
    await expect(page.getByText("You won't be charged until beta access ends.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Change Plan" })).toBeEnabled();
    await expect(page.getByRole("button", { name: "Update Payment Method" })).toBeEnabled();

    await page.getByRole("button", { name: "Change Plan" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "Choose a plan" })).toBeVisible();
    await expect(dialog.getByText("the first charge happens when beta access ends")).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Subscribe" })).toHaveCount(3);
    await dialog.getByRole("button", { name: "Close" }).click();
    await expect(dialog).toBeHidden();

    await page.getByRole("button", { name: "Update Payment Method" }).click();
    await expect(dialog.getByRole("heading", { name: "Choose a plan" })).toBeVisible();
    await dialog.getByRole("button", { name: "Monthly" }).click();

    await page.route("https://checkout.stripe.com/**", (route) =>
      route.fulfill({ status: 200, contentType: "text/plain", body: "ok" })
    );

    await dialog.getByRole("button", { name: "Subscribe" }).nth(1).click();
    await expect.poll(() => checkoutBody).not.toBeNull();
    expect(checkoutBody).toEqual({ planKey: "professional", cadence: "monthly" });
    expect(portalCalled).toBe(false);
  });
});

test.describe("Admin beta plan changes", () => {
  test("an admin can move a beta tester to another plan", async ({ page }) => {
    let planBody: { plan?: string } | null = null;
    const tester = {
      userId: 7,
      email: "beta@example.com",
      name: "Beta Tester",
      plan: "publication",
      inviteStatus: "accepted",
      accessUntil: betaAccessUntil,
      accessActive: true,
      lastLoginAt: null,
      blogCount: 1,
    };

    await setupApiMocks(page, {
      dashboardMe: { ...dashboardMe, isAdmin: true } as typeof dashboardMe,
      extraRoutes: async ({ method, path, route }) => {
        if (method === "GET" && path === "/api/admin/beta-testers/7") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ tester, blogs: [], activity: [] }),
          });
          return true;
        }
        if (method === "GET" && path === "/api/admin/beta-testers") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ testers: [tester] }),
          });
          return true;
        }
        if (method === "POST" && path === "/api/admin/beta-testers/7/plan") {
          planBody = route.request().postDataJSON() as { plan?: string };
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ tester: { ...tester, plan: planBody.plan } }),
          });
          return true;
        }
        return false;
      },
    });

    await page.goto("/dashboard/admin", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Admin" })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("beta@example.com")).toBeVisible();

    await page.getByRole("combobox", { name: "Plan for beta@example.com" }).click();
    await page.getByRole("option", { name: "Essentials" }).click();
    const dialog = page.getByRole("alertdialog");
    await expect(dialog.getByText("will move from Publication to Essentials")).toBeVisible();
    await dialog.getByRole("button", { name: "Update plan" }).click();

    await expect.poll(() => planBody).toEqual({ plan: "essentials" });
    await expect(page.getByRole("combobox", { name: "Plan for beta@example.com" })).toContainText(
      "Essentials"
    );
  });
});
