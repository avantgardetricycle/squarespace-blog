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

  test("logout clears the verified email and asks again", async ({ page }) => {
    let posts = 0;
    const nextPost = (): PostPayload => {
      posts += 1;
      return {
        status: 201,
        json: {
          id: `comment-${posts}`,
          display_name: "Member",
          verified_subscriber: true,
          status: "approved",
        },
      };
    };

    await mountLoggedInComments(page, nextPost);
    const form = page.locator("#bb-comments .bb-comment-form-wrap");
    const button = form.locator(".bb-comment-submit");
    const cookieName = "bb_verified_commenter_renderer-layout";

    await form.locator("textarea").fill("A verified comment");
    await button.click();
    await confirmEmail(page, "reader@example.com");

    const identity = form.locator(".bb-comment-logged-in-label");
    const logout = form.getByRole("button", { name: "Logout" });
    await expect(identity).toHaveText("Logged in as reader@example.com");
    await expect(logout).toBeVisible();
    const linkStyles = await logout.evaluate((el) => {
      const cs = getComputedStyle(el);
      return {
        textDecorationLine: cs.textDecorationLine,
        backgroundColor: cs.backgroundColor,
        borderTopWidth: cs.borderTopWidth,
      };
    });
    expect(linkStyles.textDecorationLine).toContain("underline");
    expect(linkStyles.backgroundColor).toBe("rgba(0, 0, 0, 0)");
    expect(linkStyles.borderTopWidth).toBe("0px");
    const identityBox = await identity.boundingBox();
    const logoutBox = await logout.boundingBox();
    expect(identityBox).toBeTruthy();
    expect(logoutBox).toBeTruthy();
    expect(Math.abs((identityBox!.y + identityBox!.height / 2) - (logoutBox!.y + logoutBox!.height / 2))).toBeLessThanOrEqual(2);
    expect(logoutBox!.x).toBeGreaterThan(identityBox!.x + identityBox!.width - 2);

    await expect.poll(async () => {
      const cookies = await page.context().cookies();
      return cookies.some((item) => item.name === cookieName);
    }).toBe(true);

    await logout.click();
    await expect(identity).toBeHidden();
    await expect(logout).toBeHidden();
    const cookies = await page.context().cookies();
    expect(cookies.some((item) => item.name === cookieName)).toBe(false);

    await form.locator("textarea").fill("Need to verify again");
    await button.click();
    await expect(page.getByText("Confirm your email")).toBeVisible();
    expect(posts).toBe(1);
  });

  test("shows an optional name and keeps a typed name on later comments", async ({ page }) => {
    const bodies: Array<Record<string, unknown>> = [];
    page.on("request", (request) => {
      if (request.method() !== "POST" || !request.url().includes("/api/comments")) return;
      bodies.push(request.postDataJSON() as Record<string, unknown>);
    });
    const nextPost = (): PostPayload => ({
      status: 201,
      json: {
        id: `comment-${bodies.length + 1}`,
        display_name: "Pat Example",
        verified_subscriber: true,
        status: "approved",
      },
    });

    await mountLoggedInComments(page, nextPost);
    const form = page.locator("#bb-comments .bb-comment-form-wrap");
    const button = form.locator(".bb-comment-submit");

    await form.locator("textarea").fill("A named comment");
    await button.click();
    const modal = page.locator("body");
    await expect(page.getByText("Confirm your email")).toBeVisible();
    const name = page.locator('input[name="bb-subscriber-name"]');
    await expect(name).toBeVisible();
    await expect(name).toHaveAttribute("placeholder", "Name (optional)");
    await expect(modal.getByText("If you leave this blank, we’ll use your Squarespace profile name.")).toBeVisible();
    await name.fill("Pat Example");
    await confirmEmail(page, "reader@example.com");

    await expect.poll(() => bodies.length).toBe(1);
    expect(bodies[0].display_name).toBe("");
    expect(bodies[0].subscriber_display_name).toBe("Pat Example");
    expect(bodies[0].email).toBe("reader@example.com");

    await expect.poll(async () => {
      const cookies = await page.context().cookies();
      const raw = cookies.find((item) => item.name === "bb_verified_commenter_renderer-layout");
      return raw ? JSON.parse(decodeURIComponent(raw.value)) : null;
    }).toEqual({ name: "Pat Example", email: "reader@example.com", customName: true });

    await form.locator("textarea").fill("A second comment");
    await button.click();
    await expect(page.getByText("Confirm your email")).toBeHidden();
    await expect.poll(() => bodies.length).toBe(2);
    expect(bodies[1].display_name).toBe("");
    expect(bodies[1].subscriber_display_name).toBe("Pat Example");
    expect(bodies[1].email).toBe("reader@example.com");
  });

  test("leaves a blank name for the Squarespace profile", async ({ page }) => {
    const bodies: Array<Record<string, unknown>> = [];
    page.on("request", (request) => {
      if (request.method() !== "POST" || !request.url().includes("/api/comments")) return;
      bodies.push(request.postDataJSON() as Record<string, unknown>);
    });
    const nextPost = (): PostPayload => ({
      status: 201,
      json: {
        id: `comment-${bodies.length + 1}`,
        display_name: "Sarah K.",
        verified_subscriber: true,
        status: "approved",
      },
    });

    await mountLoggedInComments(page, nextPost);
    const form = page.locator("#bb-comments .bb-comment-form-wrap");
    const button = form.locator(".bb-comment-submit");

    await form.locator("textarea").fill("Use my profile name");
    await button.click();
    await expect(page.locator('input[name="bb-subscriber-name"]')).toHaveValue("");
    await confirmEmail(page, "sarah@example.com");

    await expect.poll(() => bodies.length).toBe(1);
    expect(bodies[0].display_name).toBe("");
    expect(bodies[0]).not.toHaveProperty("subscriber_display_name");

    await expect.poll(async () => {
      const cookies = await page.context().cookies();
      const raw = cookies.find((item) => item.name === "bb_verified_commenter_renderer-layout");
      return raw ? JSON.parse(decodeURIComponent(raw.value)).customName : null;
    }).toBe(false);

    await form.locator("textarea").fill("Still the profile name");
    await button.click();
    await expect(page.getByText("Confirm your email")).toBeHidden();
    await expect.poll(() => bodies.length).toBe(2);
    expect(bodies[1]).not.toHaveProperty("subscriber_display_name");
    expect(bodies[1].email).toBe("sarah@example.com");
  });
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
