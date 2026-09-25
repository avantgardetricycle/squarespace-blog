import { expect, test, type Locator, type Page } from "@playwright/test";

import { mountRenderer } from "./harness";

const VERIFICATION_ERROR =
  "Member email verification is required to comment. Enable subscriber comments and connect your Squarespace API key, or turn on anonymous comments.";

const MEMBER_NOT_FOUND =
  "We could not verify a member account for that email. Use the address tied to your site membership, or ask the site owner for help.";

type PostPayload = { status: number; json: Record<string, unknown> };

async function mountLoggedInComments(page: Page, nextPost: () => PostPayload) {
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
  });
  await expect(page.locator("#bb-comments .bb-comment-submit")).toBeVisible();
}

async function confirmEmail(page: Page, email: string) {
  const emailInput = page.locator('input[type="email"][name="email"]');
  await expect(emailInput).toBeVisible();
  await emailInput.fill(email);
  await page.getByRole("button", { name: "Continue" }).click();
}

async function expectInlineVerificationError(error: Locator, button: Locator, message: string) {
  await expect(error).toBeVisible();
  await expect(error).toHaveText(message);
  await expect(button).toBeVisible();
  await expect(button).toHaveText(/Post (Comment|reply)/);
  const styles = await error.evaluate((el) => {
    const cs = getComputedStyle(el);
    const accent = cs.getPropertyValue("--bb-accent").trim();
    return {
      fontStyle: cs.fontStyle,
      fontWeight: cs.fontWeight,
      fontSize: cs.fontSize,
      color: cs.color,
      accent,
      background: cs.backgroundColor,
    };
  });
  expect(styles.fontStyle).toBe("italic");
  expect(styles.fontWeight).toBe("400");
  expect(styles.fontSize).toBe("12px");
  expect(styles.background).toBe("rgba(0, 0, 0, 0)");
  expect(styles.accent).toBeTruthy();
  const probe = await error.evaluate((el) => {
    const probeEl = document.createElement("span");
    probeEl.style.color = "var(--bb-accent)";
    el.appendChild(probeEl);
    const color = getComputedStyle(probeEl).color;
    probeEl.remove();
    return color;
  });
  expect(styles.color).toBe(probe);
}

test.describe("verified comment failure", () => {
  test("keeps the error beside the button and reopens email verification", async ({ page }) => {
    let posts = 0;
    const nextPost = (): PostPayload => {
      posts += 1;
      if (posts === 1) return { status: 400, json: { error: VERIFICATION_ERROR } };
      return {
        status: 201,
        json: {
          id: "comment-ok",
          display_name: "Member",
          verified_subscriber: true,
          status: "approved",
        },
      };
    };

    await mountLoggedInComments(page, nextPost);
    const button = page.locator("#bb-comments .bb-comment-form-wrap .bb-comment-submit");
    const error = page.locator("#bb-comments .bb-comment-form-wrap .bb-comment-form-error");

    await page.locator("#bb-comments .bb-comment-form-wrap textarea").fill("A verified comment");
    await button.click();
    await confirmEmail(page, "reader@example.com");

    await expectInlineVerificationError(error, button, VERIFICATION_ERROR);
    expect(posts).toBe(1);

    await button.click();
    await expect(page.getByText("Confirm your email")).toBeVisible();
    await expect(error).toBeVisible();
    await expect(error).toHaveText(VERIFICATION_ERROR);
    expect(posts).toBe(1);

    await confirmEmail(page, "reader@example.com");
    await expect(error).toBeHidden();
    expect(posts).toBe(2);
    await expect(button).toHaveText("Post Comment");
  });

  test("reopens email verification after a membership lookup failure", async ({ page }) => {
    let posts = 0;
    const nextPost = (): PostPayload => {
      posts += 1;
      return {
        status: 400,
        json: { code: "verification_failed", error: MEMBER_NOT_FOUND },
      };
    };

    await mountLoggedInComments(page, nextPost);
    const button = page.locator("#bb-comments .bb-comment-form-wrap .bb-comment-submit");
    const error = page.locator("#bb-comments .bb-comment-form-wrap .bb-comment-form-error");

    await page.locator("#bb-comments .bb-comment-form-wrap textarea").fill("Try again");
    await button.click();
    await confirmEmail(page, "missing@example.com");

    await expect(page.getByRole("button", { name: "OK" })).toBeVisible();
    await page.getByRole("button", { name: "OK" }).click();
    await expectInlineVerificationError(error, button, MEMBER_NOT_FOUND);

    await button.click();
    await expect(page.getByText("Confirm your email")).toBeVisible();
    await expect(error).toHaveText(MEMBER_NOT_FOUND);
    expect(posts).toBe(1);
  });

  test("reopens email verification for a failed reply", async ({ page }) => {
    let posts = 0;
    const nextPost = (): PostPayload => {
      posts += 1;
      if (posts === 1) return { status: 400, json: { error: VERIFICATION_ERROR } };
      return {
        status: 201,
        json: {
          id: "reply-ok",
          display_name: "Member",
          verified_subscriber: true,
          status: "approved",
        },
      };
    };

    await mountLoggedInComments(page, nextPost);
    await page.getByRole("button", { name: "Reply" }).first().click();
    const reply = page.locator(".bb-comment-inline-reply").first();
    const button = reply.getByRole("button", { name: "Post reply" });
    const error = reply.locator(".bb-comment-form-error");

    await reply.locator("textarea").fill("A verified reply");
    await button.click();
    await confirmEmail(page, "reader@example.com");

    await expectInlineVerificationError(error, button, VERIFICATION_ERROR);
    await button.click();
    await expect(page.getByText("Confirm your email")).toBeVisible();
    await expect(error).toHaveText(VERIFICATION_ERROR);
    expect(posts).toBe(1);

    await confirmEmail(page, "reader@example.com");
    await expect(error).toBeHidden();
    expect(posts).toBe(2);
  });
});
