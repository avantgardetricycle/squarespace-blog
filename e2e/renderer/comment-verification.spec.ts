import { expect, test, type Locator, type Page } from "@playwright/test";

import { mountRenderer } from "./harness";

const MEMBER_NOT_FOUND = "We couldn't find a membership for reader@example.com.";

async function mountLoggedInComments(
  page: Page,
  nextPost: () => { status: number; json: Record<string, unknown> },
  extra: Parameters<typeof mountRenderer>[1] = {},
) {
  await mountRenderer(page, {
    previewSelectedPostIndex: 0,
    loggedInAccount: { displayName: "Member", email: "member@example.com", id: "acct-1" },
    commentSettings: {
      commentsEnabled: true,
      allowAnonymousComments: false,
      allowNewComments: true,
      subscriberCommentsEnabled: true,
    },
    commentPostResponse: nextPost,
    ...extra,
  });
  await expect(page.locator("#bb-comments .bb-comment-submit")).toBeVisible();
}

async function sendCode(page: Page, name: string) {
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("Confirm your email")).toBeVisible();
  await dialog.locator('input[name="name"]').fill(name);
  await dialog.getByRole("button", { name: "Send code" }).click();
  await expect(dialog.locator("#bb-commenter-code")).toBeVisible();
}

test("a logged-in reader verifies once and the original draft posts", async ({ page }) => {
  const bodies: Array<Record<string, unknown>> = [];
  const headers: string[] = [];
  page.on("request", (request) => {
    if (request.method() !== "POST" || !request.url().endsWith("/api/comments")) return;
    bodies.push(request.postDataJSON() as Record<string, unknown>);
    headers.push(request.headers().authorization ?? "");
  });
  await mountLoggedInComments(page, () => ({
    status: 201,
    json: { id: "comment-ok", display_name: "Sam", verified_subscriber: true, status: "approved" },
  }));

  const form = page.locator("#bb-comments .bb-comment-form-wrap");
  await form.locator("textarea").fill("A verified comment");
  await form.locator(".bb-comment-submit").click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.locator('input[name="email"]')).toHaveValue("member@example.com");
  await sendCode(page, "Sam");
  await dialog.locator("#bb-commenter-code").fill("123456");

  await expect.poll(() => bodies.length).toBe(1);
  expect(bodies[0].body).toBe("A verified comment");
  expect(bodies[0].squarespace_logged_in).toBe(true);
  expect(bodies[0]).not.toHaveProperty("email");
  expect(bodies[0]).not.toHaveProperty("verification_cookie_token");
  expect(headers[0]).toBe("Bearer sess-token");
  await expect(form.locator(".bb-comment-logged-in-label")).toHaveText("Commenting as Sam");
  await expect(form.getByRole("button", { name: "Sign out" })).toBeVisible();

  await page.getByRole("button", { name: "Reply" }).first().click();
  const reply = page.locator(".bb-comment-inline-reply").first();
  await reply.locator("textarea").fill("A verified reply");
  await reply.getByRole("button", { name: "Post reply" }).click();
  await expect.poll(() => bodies.length).toBe(2);
  expect(bodies[1].body).toBe("A verified reply");
  expect(bodies[1].parent_id).toBe("c-layout-1");
  expect(page.getByRole("dialog")).toHaveCount(0);
});

test("a stored session posts directly and sign out clears it", async ({ page }) => {
  const logout = page.waitForRequest(
    (request) => request.method() === "POST" && request.url().includes("/api/comments/auth/logout"),
  );
  await mountLoggedInComments(
    page,
    () => ({ status: 201, json: { id: "c1", display_name: "Sam", verified_subscriber: true, status: "approved" } }),
    { commenterSession: { token: "stored-token", email: "sam@example.com", displayName: "Sam" } },
  );
  const form = page.locator("#bb-comments .bb-comment-form-wrap");
  await expect(form.locator(".bb-comment-logged-in-label")).toHaveText("Commenting as Sam");
  const bodies: Array<Record<string, unknown>> = [];
  page.on("request", (request) => {
    if (request.method() === "POST" && request.url().endsWith("/api/comments")) {
      bodies.push(request.postDataJSON() as Record<string, unknown>);
    }
  });
  await form.locator("textarea").fill("Already verified");
  await form.locator(".bb-comment-submit").click();
  await expect.poll(() => bodies.length).toBe(1);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await form.getByRole("button", { name: "Sign out" }).click();
  const sent = await logout;
  expect(sent.headers().authorization).toBe("Bearer stored-token");
  await expect(form.locator(".bb-comment-logged-in-label")).toBeHidden();
});

test("localStorage failures keep the session in memory", async ({ page }) => {
  await page.addInitScript(() => {
    const throwing = {
      getItem() {
        throw new Error("blocked");
      },
      setItem() {
        throw new Error("blocked");
      },
      removeItem() {
        throw new Error("blocked");
      },
    };
    Object.defineProperty(window, "localStorage", { configurable: true, get: () => throwing });
  });
  const bodies: unknown[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST" && request.url().endsWith("/api/comments")) bodies.push(request.postDataJSON());
  });
  await mountLoggedInComments(page, () => ({
    status: 201,
    json: { id: "c-mem", display_name: "Sam", verified_subscriber: true, status: "approved" },
  }));
  const form = page.locator("#bb-comments .bb-comment-form-wrap");
  await form.locator("textarea").fill("First");
  await form.locator(".bb-comment-submit").click();
  await sendCode(page, "Sam");
  await page.locator("#bb-commenter-code").fill("123456");
  await expect.poll(() => bodies.length).toBe(1);
  await form.locator("textarea").fill("Second");
  await form.locator(".bb-comment-submit").click();
  await expect.poll(() => bodies.length).toBe(2);
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("legacy verification cookies are deleted on load", async ({ page }) => {
  await mountLoggedInComments(page, () => ({ status: 201, json: {} }), { legacyVerifiedCookies: true });
  const cookie = await page.evaluate(() => document.cookie);
  expect(cookie).not.toContain("bb_verified_commenter_");
  expect(cookie).not.toContain("bb_verified_sub_");
});

test("escape closes the email modal and returns focus to the comment button", async ({ page }) => {
  await mountLoggedInComments(page, () => ({ status: 201, json: {} }));
  const button = page.locator("#bb-comments .bb-comment-form-wrap .bb-comment-submit");
  await page.locator("#bb-comments .bb-comment-form-wrap textarea").fill("Keyboard");
  await button.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(button).toBeFocused();
});

async function expectInline(error: Locator, message: string) {
  await expect(error).toBeVisible();
  await expect(error).toHaveText(message);
  const styles = await error.evaluate((el) => {
    const cs = getComputedStyle(el);
    return { fontStyle: cs.fontStyle, fontWeight: cs.fontWeight, fontSize: cs.fontSize };
  });
  expect(styles.fontStyle).toBe("italic");
  expect(styles.fontWeight).toBe("400");
  expect(styles.fontSize).toBe("12px");
}

test("a membership miss keeps the message and reopens the email modal", async ({ page }) => {
  await mountLoggedInComments(
    page,
    () => ({ status: 400, json: { code: "verification_failed", error: MEMBER_NOT_FOUND } }),
    { commenterSession: { token: "stored-token", email: "reader@example.com", displayName: "Sam" } },
  );
  const form = page.locator("#bb-comments .bb-comment-form-wrap");
  const button = form.locator(".bb-comment-submit");
  await form.locator("textarea").fill("Try again");
  await button.click();
  await expect(page.getByRole("button", { name: "OK" })).toBeVisible();
  await page.getByRole("button", { name: "OK" }).click();
  await expectInline(form.locator(".bb-comment-form-error"), MEMBER_NOT_FOUND);
  await button.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.locator('input[name="email"]')).toHaveValue("reader@example.com");
  await expect(page.getByRole("button", { name: "Use a different email" })).toBeFocused();
});

test("a missing session opens the email modal without an inline error", async ({ page }) => {
  await mountLoggedInComments(
    page,
    () => ({ status: 401, json: { code: "commenter_auth_required", error: "Confirm your email to comment." } }),
    { commenterSession: { token: "dead-token", email: "sam@example.com", displayName: "Sam" } },
  );
  const form = page.locator("#bb-comments .bb-comment-form-wrap");
  await form.locator("textarea").fill("Need a code");
  await form.locator(".bb-comment-submit").click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(form.locator(".bb-comment-form-error")).toBeHidden();
});

test("commenter email is not rendered on the blog", async ({ page }) => {
  await mountRenderer(page, {
    previewSelectedPostIndex: 0,
    loggedInAccount: { displayName: "Member", email: "member@example.com", id: "acct-1" },
    commentSettings: {
      commentsEnabled: true,
      allowAnonymousComments: false,
      allowNewComments: true,
      subscriberCommentsEnabled: true,
    },
    commentsResponse: {
      comments: [
        {
          id: "c-email",
          display_name: "Sarah K.",
          email: "sarah.kim@example.com",
          verified_subscriber: true,
          body: "Hello from a member",
          created_at: "2024-01-02T00:00:00.000Z",
          like_count: 0,
          replies: [],
        },
      ],
      total: 1,
    },
  });

  const list = page.locator("#bb-comments .bb-comments-list");
  await expect(list).toContainText("Sarah K.");
  await expect(list).toContainText("Hello from a member");
  await expect(list).not.toContainText("sarah.kim@example.com");
});
