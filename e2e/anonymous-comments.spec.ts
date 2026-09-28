import * as fs from "fs";
import * as path from "path";

import { expect, test, type Page, type Route } from "@playwright/test";

const RENDERER_PATH = path.join(process.cwd(), "scripts", "renderer.js");
const PAGE_PATH = "/e2e/anonymous-comments.html";
const HANDLE_RE = /^Anonymous\d{4}$/;

const pageHtml = `<!DOCTYPE html>
<html>
<body>
<div id="mount"></div>
<script src="/renderer.js"></script>
<script>
  window.mountAnonymousComments = function(settings, mode) {
    var r = window.BlogOverlayRenderer;
    r.config = { viewerMode: mode, paywallSettings: { signInUrl: '/custom-member-login' } };
    var box = document.getElementById('mount');
    box.innerHTML = '';
    r._initComments(box, { id: 'p1', title: 'Post', recordType: 1 }, {
      baseUrl: window.location.origin,
      siteKey: 'preview-site',
      viewerMode: mode,
      paywallSettings: { signInUrl: '/custom-member-login' },
      commentSettings: Object.assign({
        commentsEnabled: true,
        allowNewComments: true,
        allowAnonymousComments: true,
        subscriberCommentsEnabled: false,
        allowThreadedReplies: true,
        allowLikes: false
      }, settings)
    });
  };
</script>
</body>
</html>`;

async function installRoutes(page: Page, posts: unknown[]): Promise<void> {
  await page.route(/\/renderer\.js(\?.*)?$/, async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/javascript",
      body: fs.readFileSync(RENDERER_PATH, "utf8"),
    });
  });
  await page.route(`**${PAGE_PATH}`, async (route) => {
    await route.fulfill({ status: 200, contentType: "text/html", body: pageHtml });
  });
  await page.route("**/api/comment/GetComments**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ comments: [] }) });
  });
  await page.route("**/api/comments**", async (route) => {
    if (route.request().method() === "POST") {
      posts.push(route.request().postDataJSON());
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "new-comment",
          display_name: "Anonymous0000",
          status: "approved",
          verified_subscriber: false,
        }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        comments: [
          {
            id: "c1",
            display_name: "Reader",
            body: "Existing comment",
            created_at: new Date().toISOString(),
            like_count: 0,
            replies: [],
          },
        ],
        total: 1,
      }),
    });
  });
}

async function openComments(
  page: Page,
  settings: { allowAnonymousComments?: boolean; subscriberCommentsEnabled?: boolean },
  mode: "loggedOut" | "loggedIn",
): Promise<void> {
  await page.evaluate(
    ({ settings, mode }) => {
      (window as unknown as { mountAnonymousComments: (s: unknown, m: string) => void }).mountAnonymousComments(
        settings,
        mode,
      );
    },
    { settings, mode },
  );
}

function form(page: Page) {
  return page.locator("#bb-comments .bb-comment-form-wrap");
}

test.describe("anonymous comment handles", () => {
  test("logged-out readers with verification post as a session handle and can sign in", async ({ page }) => {
    const posts: unknown[] = [];
    await installRoutes(page, posts);
    await page.goto(PAGE_PATH);
    await openComments(page, { allowAnonymousComments: true, subscriberCommentsEnabled: true }, "loggedOut");

    await expect(form(page).getByRole("heading", { name: "Leave a comment" })).toBeVisible();
    await expect(form(page)).toContainText(/Commenting as Anonymous\d{4}/);
    const signIn = form(page).getByRole("link", { name: "Sign in to comment as a member" });
    await expect(signIn).toHaveAttribute("href", "/custom-member-login");
    await expect(form(page).locator('input[placeholder="Name (optional)"]')).toBeHidden();
    await expect(form(page).locator('input[placeholder="Email (optional)"]')).toBeHidden();

    const shown = (await form(page).innerText()).match(/Anonymous\d{4}/)?.[0];
    expect(shown).toMatch(HANDLE_RE);

    const cookies = await page.context().cookies();
    const cookie = cookies.find((item) => item.name === "bb_anon_commenter_preview-site");
    expect(cookie?.value).toBe(shown);
    expect(cookie?.expires).toBe(-1);

    await page.getByRole("button", { name: "Reply" }).click();
    const reply = page.locator("#bb-comments .bb-comment-inline-reply");
    await expect(reply).toContainText(`Commenting as ${shown}`);
    await expect(reply.getByRole("link", { name: "Sign in to comment as a member" })).toHaveAttribute(
      "href",
      "/custom-member-login",
    );
    await expect(reply.locator('input[placeholder="Name (optional)"]')).toBeHidden();
    await expect(reply.locator('input[placeholder="Email (optional)"]')).toBeHidden();

    await form(page).locator("textarea").fill("Hello from the session");
    await form(page).getByRole("button", { name: "Post Comment" }).click();
    await expect.poll(() => posts.length).toBe(1);
    expect(posts[0]).toMatchObject({
      display_name: shown,
      body: "Hello from the session",
    });
    expect(posts[0]).not.toHaveProperty("email");
  });

  test("the same browser session keeps one handle, and an invalid cookie is replaced", async ({ page }) => {
    await installRoutes(page, []);
    await page.goto(PAGE_PATH);
    await page.context().addCookies([
      {
        name: "bb_anon_commenter_preview-site",
        value: "Jane Doe",
        url: "http://127.0.0.1:4173",
      },
    ]);
    await openComments(page, { allowAnonymousComments: true, subscriberCommentsEnabled: true }, "loggedOut");
    const replaced = (await form(page).innerText()).match(/Anonymous\d{4}/)?.[0];
    expect(replaced).toMatch(HANDLE_RE);
    expect(replaced).not.toBe("Jane Doe");

    await page.context().addCookies([
      {
        name: "bb_anon_commenter_preview-site",
        value: "Anonymous2222",
        url: "http://127.0.0.1:4173",
      },
    ]);
    await openComments(page, { allowAnonymousComments: true, subscriberCommentsEnabled: false }, "loggedOut");
    await expect(form(page)).toContainText("Commenting as Anonymous2222");
    await expect(form(page).getByRole("link", { name: /Sign in/ })).toHaveCount(0);

    await openComments(page, { allowAnonymousComments: true, subscriberCommentsEnabled: true }, "loggedOut");
    await expect(form(page)).toContainText("Commenting as Anonymous2222");
  });

  test("verification on and anonymous off exposes a real sign-in link", async ({ page }) => {
    await installRoutes(page, []);
    await page.goto(PAGE_PATH);
    await openComments(page, { allowAnonymousComments: false, subscriberCommentsEnabled: true }, "loggedOut");

    await expect(form(page).getByRole("link", { name: "Sign in to comment" })).toHaveAttribute(
      "href",
      "/custom-member-login",
    );
    await expect(form(page).getByRole("link", { name: "Sign in", exact: true })).toHaveAttribute(
      "href",
      "/custom-member-login",
    );
    await expect(form(page).locator("textarea")).toBeHidden();
    await expect(page.getByRole("button", { name: "Reply" })).toHaveCount(0);
  });

  test("logged-in readers with verification stay on the member form", async ({ page }) => {
    await installRoutes(page, []);
    await page.goto(PAGE_PATH);
    await openComments(page, { allowAnonymousComments: true, subscriberCommentsEnabled: true }, "loggedIn");

    await expect(form(page).getByRole("heading", { name: "Leave a comment" })).toBeVisible();
    await expect(form(page)).not.toContainText("Commenting as");
    await expect(form(page).getByRole("link", { name: /Sign in/ })).toHaveCount(0);
    await expect(form(page).locator('input[placeholder="Name (optional)"]')).toBeHidden();
    await expect(form(page).locator('input[placeholder="Email (optional)"]')).toBeHidden();
    await expect(form(page).locator("textarea")).toBeVisible();
  });
});
