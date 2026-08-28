# Paywall & Membership

BetterBlog does not create or charge for memberships. Squarespace’s pricing plans gate content. BetterBlog detects that a blog is paywalled and changes how the overlay looks for logged-out readers so the layout still works around Squarespace’s gate.

You tell BetterBlog a blog is membership-required when you add or edit the blog. BetterBlog also detects paywall state from the live site. When a paywall is detected, a **Paywall Settings** button appears on **Customize Blog**, below **Clear all settings**. The same settings apply to both views.

---

## How BetterBlog handles paywalled blogs

On a paywalled blog, BetterBlog:

- Shows members-only teasers on the collection page for logged-out readers (when Squarespace still shows a public listing)
- Shows a paywall footer on the collection page for logged-out readers
- Shows a teaser plus an inline membership card on gated single posts
- Hides comments on paywalled posts for logged-out readers (unless the post is a public preview)
- Renders the full layout for logged-in members

BetterBlog never unlocks post body content that Squarespace has gated. If logged-out readers can read full posts, the pricing plan is not assigned in Squarespace — that is not a BetterBlog setting.

---

## Overview mode vs posts-only mode

Squarespace has two paywall modes. BetterBlog detects which one is active; you do not set this in BetterBlog.

**Posts only** — Logged-out readers still see a public post listing. BetterBlog renders the collection with **MEMBERS ONLY** labels, lock badges on images, hidden excerpts on gated cards, and the paywall footer. Single posts show a teaser and an inline “Continue reading with a membership” card (unless the post is a public preview).

**Blog overview and posts** — Squarespace replaces the collection page with its own signup UI. BetterBlog **does not overlay** that page. There is no BetterBlog paywall footer in this mode because Squarespace owns the whole page. Members who are signed in see the full BetterBlog collection.

If the paywall footer is missing, check which Squarespace mode you are using. Overview-and-posts mode is the usual reason. See [Troubleshooting](troubleshooting.md).

---

## The paywall footer

On **posts-only** blogs, logged-out readers see a footer card at the bottom of the collection page (not on single posts — those use the inline gate).

The live card includes:

1. Eyebrow (shown in uppercase)
2. Headline
3. Description
4. **Subscribe** button (may include a price such as “Subscribe — $X/month” when Squarespace exposes a plan price) and **Sign in**
5. Feature checklist with checkmarks

Customize it from **Customize Blog → Paywall Settings** (only when a paywall is detected). The button sits below **Clear all settings** because the copy applies to both Collection and Post.

**Subscribe URL (optional)** — Leave blank to send readers to your blog collection URL. Use a custom URL for a dedicated signup or membership page.

**Eyebrow (optional, max 80 characters)** — Small label above the headline. Blank defaults to **MEMBER EXCLUSIVE**.

**Header text (optional, max 160 characters)** — Headline. You can use `{blogName}`. Blank defaults to “Unlock unlimited access to {your blog name}”.

**Footer description (optional, max 160 characters)** — Supporting copy under the headline.

**Feature checklist (optional, max 4)** — Defaults include Unlimited articles, Full archive access, and Cancel anytime. Add or remove items.

The **Sign in** button uses Squarespace’s native login. If it does nothing, test Squarespace login on the site without BetterBlog.

---

## Members-only teasers on the collection page

For logged-out readers in posts-only mode, gated cards show **MEMBERS ONLY**, a lock on the image, and often a **Subscribe to read** link. Excerpt text is hidden; date and author may still show depending on the template. Sidebar “more to read” / recent post modules use the same treatment.

**Public preview** posts (Squarespace posts with a public preview or substantial ungated body) stay readable to logged-out visitors.

---

## Logged-in members vs logged-out readers

| Surface | Logged-out | Logged-in member |
|---|---|---|
| Collection (posts only) | Gated teasers + paywall footer | Full layout, no footer |
| Collection (overview + posts) | Squarespace’s own paywall page | Full BetterBlog collection |
| Single post | Teaser + inline card (unless public preview) | Full article |
| Comments | Hidden on paywalled posts | Shown if Show Comments is on |

BetterBlog updates the page when Squarespace auth state changes.

---

## Two Squarespace account types

Squarespace has **customer accounts** (commerce, standard Log in, Contacts) and **member accounts** (pricing plans / Member Areas). They do not share a session. Logging in as a customer does not grant member access to a paywalled blog.

The grayed-out **View** button in the Squarespace account drawer is the usual symptom: it only activates for an authenticated member with an active plan. To test the member experience, use a private window and sign up through the paywall — not the main account login.

BetterBlog verifies subscriber comments against the Profiles API for this reason. DOM “logged in” is not a reliable member check. See [Known Squarespace Behaviors](known-squarespace-behaviors.md) and [Comments](comments.md).
