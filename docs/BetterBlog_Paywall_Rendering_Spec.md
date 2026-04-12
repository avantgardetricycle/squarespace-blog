# BetterBlog Paywall Rendering — Technical Specification
**Version:** 1.0 — MVP  
**Status:** Draft  
**Authors:** BetterBlog Team

---

## 1. Overview

This spec covers how BetterBlog renders on paywalled Squarespace blogs for logged-out readers, at both the collection and post levels. The core principle is that BetterBlog should respect and reinforce the blogger's paywall intent — never obscuring Squarespace's signup machinery, and never rendering collection UI that implies free access to gated content.

---

## 2. Squarespace Paywall Modes

Squarespace gives bloggers two paywall visibility modes, which produce fundamentally different page structures for logged-out readers. BetterBlog must detect and respond to each differently.

| Mode | Squarespace behavior for logged-out reader | BetterBlog response |
|---|---|---|
| **Blog posts only** | Collection overview page renders normally. Post content is hidden when clicked. | Render BB collection layout. Replace teaser text with members-only label. Show paywall footer. |
| **Blog overview and blog posts** | Collection page replaced entirely by Squarespace's signup UI. No post listing rendered. | Do not render BB collection overlay. Let Squarespace's paywall UI show unmodified. |

---

## 3. Paywall Mode Detection

On collection page load, BetterBlog detects which mode is active by checking whether Squarespace has rendered a post listing in the DOM.

```javascript
function detectPaywallMode() {
  const hasPostListing = !!document.querySelector(
    '.blog-list, .blog-grid, [data-collection-type="blog"] .list-items'
    // Note: confirm exact selectors against live test blog DOM before shipping
  );
  const isLoggedOut = getAuthState() === 'unauthenticated';

  if (isLoggedOut && !hasPostListing) {
    return 'squarespace-full-paywall'; // Blog overview mode — SQ owns the page
  }
  if (isLoggedOut && hasPostListing) {
    return 'posts-only-paywall'; // Blog posts only mode — BB renders with restrictions
  }
  return 'authenticated'; // Logged-in member — full BB rendering
}
```

> **Note:** DOM selectors must be verified against both Squarespace 7.1 template families before shipping. Add to QA checklist.

---

## 4. Collection Page Behavior

### 4.1 Mode: Blog overview and blog posts (Squarespace owns the page)

BetterBlog does not initialize its collection overlay. Squarespace renders its native paywall/signup UI unmodified. No CSS suppression, no DOM injection, no footer insertion.

The overlay script exits early:

```javascript
const mode = detectPaywallMode();
if (mode === 'squarespace-full-paywall') {
  return; // Do nothing — SQ handles the logged-out experience
}
```

### 4.2 Mode: Blog posts only (BetterBlog renders with restrictions)

BetterBlog renders its full collection layout with two modifications for logged-out readers:

**Modification 1 — Post card teaser replacement**

The teaser text on each post card (normally 1–2 sentences of excerpt content) is replaced with a members-only label. The post title, featured image, author, and date are still shown — only the excerpt is replaced.

Post card teaser area renders as:

```
🔒 MEMBERS ONLY   [Subscribe to Read →]
```

Exact markup:

```html
<div class="bb-members-only-label">
  <span class="bb-lock-icon" aria-hidden="true">🔒</span>
  <span class="bb-members-only-text">Members only</span>
  <a href="{subscribe_url}" class="bb-subscribe-pill">Subscribe to read</a>
</div>
```

Styling notes:
- "Members only" text: site's secondary color, uppercase, small caps weight
- Subscribe pill button: site's accent color background, white text, same border-radius as site's native buttons
- Lock icon: rendered via Unicode `\uD83D\uDD12` or an inline SVG to avoid emoji rendering inconsistency across platforms

**Modification 2 — Paywall footer**

A full-width paywall footer is appended below the post collection (and above the BetterBlog footer zone if one is configured). See §6 for full footer spec.

No other footer content (email capture, lead magnet, social links, etc.) is rendered for logged-out readers on a paywalled collection. The paywall footer is the only footer zone shown.

---

## 5. Post Page Behavior

### 5.1 Logged-in member

Full BetterBlog post rendering as normal. No paywall elements shown.

### 5.2 Logged-out reader on a paywalled blog

BetterBlog renders the post page overlay normally (header, sidebars, etc.) but appends the paywall footer below the post body. Squarespace's own post-level paywall behavior (hiding post content, showing excerpt) continues to operate — BetterBlog does not interfere with it.

The paywall footer at the post level is identical to the collection-level footer (see §6). It replaces all other footer content for logged-out readers — email capture, lead magnet, social links, and any other configured footer modules are not rendered.

```javascript
function shouldShowPaywallFooter() {
  const isLoggedOut = getAuthState() === 'unauthenticated';
  const isPaywalled = blogSettings.isPaywalled; // stored at install time
  return isLoggedOut && isPaywalled;
}
```

---

## 6. Paywall Footer Specification

### 6.1 Layout

The paywall footer is a full-width block. Its visual design mirrors the component shown in the reference screenshot: centered content, eyebrow label, headline, description, two action buttons, and a feature checklist.

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│                    MEMBER EXCLUSIVE                              │  ← eyebrow
│                                                                  │
│           Unlock unlimited access to [Blog Name]                 │  ← headline
│                                                                  │
│        Subscribe for full access to every story, the             │  ← description
│           complete archive, and ad-free reading.                 │    (blogger-configured
│                                                                  │     or default copy)
│                                                                  │
│       [Subscribe — $X/month]      [Sign in]                      │  ← CTAs
│                                                                  │
│   ✓ Unlimited articles  ✓ Full archive  ✓ Cancel anytime         │  ← feature list
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 Color Inheritance

All colors are inherited from Squarespace's CSS custom properties rather than hardcoded. BetterBlog reads these at render time from the computed styles of the Squarespace `<body>` or root element.

| Footer element | Color source | Fallback |
|---|---|---|
| Footer background | Site background color (`--sqs-site-background` or equivalent) | `#ffffff` |
| Footer border | Site border color (10% opacity of body text color) | `rgba(0,0,0,0.1)` |
| Eyebrow text ("MEMBER EXCLUSIVE") | Site accent color | `#e91e8c` |
| Headline text | Site primary text color | `#111111` |
| Description text | Site secondary text color | `#666666` |
| Subscribe button background | Site accent color | `#e91e8c` |
| Subscribe button text | White | `#ffffff` |
| Sign in button border | Site primary text color at 30% opacity | `rgba(0,0,0,0.3)` |
| Sign in button text | Site primary text color | `#111111` |
| Checkmark icon color | Site accent color | `#e91e8c` |
| Feature list text | Site secondary text color | `#666666` |

> **Implementation note:** Squarespace 7.1 exposes site-level design tokens as CSS variables on `:root`. The exact variable names vary by template. BetterBlog should read `getComputedStyle(document.documentElement)` to retrieve the values, with the hardcoded fallbacks above if a variable is absent. The fallbacks intentionally use a pink/magenta accent to match the reference screenshot aesthetic, but the correct behavior in production is always to inherit from the site.

### 6.3 Content

**Eyebrow:** Always "MEMBER EXCLUSIVE" — not configurable.

**Headline:** `Unlock unlimited access to [Blog Title]` where Blog Title is read from the Squarespace page context (`Static.SQUARESPACE_CONTEXT.website.siteTitle` or the blog page title). Not configurable by the blogger.

**Description:** Blogger-configurable in BetterBlog settings. Defaults to: *"Subscribe for full access to every story, the complete archive, and exclusive reading."* Maximum 160 characters.

**Subscribe button:**
- Label: `Subscribe` if no pricing information is available; `Subscribe — $X/month` if a price can be read from the Squarespace paywall DOM (see §6.4). Falling back to `Subscribe` is always safe.
- Link: blogger-configured Subscribe URL. If not configured, defaults to the current collection's base URL (see §6.5).

**Sign in button:**
- Label: "Sign in" — not configurable.
- Action: triggers Squarespace's native login flow. Use the same mechanism as Squarespace's own login links — typically a click on the member account nav element or a direct link to `/?login=true` (verify against live site behavior).

**Feature checklist:** Blogger-configurable list of 2–4 short feature strings. Defaults to: "Unlimited articles", "Full archive access", "Cancel anytime". Each item rendered with a checkmark (✓) in the accent color.

### 6.4 Price Extraction (Best-Effort)

If the Squarespace paywall DOM is present on the page (i.e., in "blog posts only" mode, post-level paywall elements may exist in the DOM even if hidden), BetterBlog attempts to read the lowest displayed price from the pricing plan markup to populate the button label.

This is best-effort only. If the price cannot be cleanly extracted, the button falls back to "Subscribe" with no price. Do not show a price if there is any ambiguity (e.g., multiple pricing tiers, free plans, installment plans).

```javascript
function extractLowestPrice() {
  // Attempt to read from Squarespace pricing plan block markup
  // Exact selector TBD based on live DOM inspection
  const priceEl = document.querySelector('.pricing-plan-price, [data-pricing-amount]');
  if (!priceEl) return null;
  const text = priceEl.textContent.trim();
  // Only use if it looks like a simple monthly price (e.g. "$8/month")
  if (/^\$[\d.]+\/(month|mo)$/i.test(text)) return text;
  return null;
}
```

> **Open question:** Verify what Squarespace renders in the DOM for a paywalled collection in "blog posts only" mode — does it include any pricing markup even for logged-out readers, or is pricing only shown when the user navigates to an individual post? This affects whether price extraction is feasible at the collection level.

### 6.5 Subscribe URL Resolution

Priority order for the Subscribe button link:

1. Blogger-configured Subscribe URL in BetterBlog settings (explicit field)
2. If not configured: the blog's own collection URL (current `window.location.pathname` base slug, e.g. `/journal`)

The collection URL fallback is valid because in "blog posts only" mode, navigating to the collection page as a logged-out user does show post previews — it does not immediately trigger a Squarespace signup flow. The subscribe button in this case is BetterBlog's CTA, not a replacement for Squarespace's mechanism.

---

## 7. BetterBlog Settings — New Fields

Two new fields are added to the Collection-level settings panel under a new **Paywall** section:

```
┌─────────────────────────────────────────────────────┐
│  PAYWALL                                             │
│                                                      │
│  Subscribe URL  (optional)                           │
│  [                                        ]          │
│  Leave blank to send readers to your blog page.      │
│  Enter a custom URL if you have a dedicated          │
│  sign-up or membership page.                         │
│                                                      │
│  Footer description  (optional)                      │
│  [                                        ]          │
│  Shown beneath the headline in the paywall footer.   │
│  Max 160 characters. Leave blank to use the default. │
│                                                      │
│  Feature checklist  (optional, one per line)         │
│  [ Unlimited articles                     ]          │
│  [ Full archive access                    ]          │
│  [ Cancel anytime                         ]          │
│  [+ Add item]       Max 4 items.                     │
└─────────────────────────────────────────────────────┘
```

These settings are collection-level only. The same subscribe URL and footer content apply at both the collection and post level (the footer is shared, not independently configured per level).

---

## 8. Data Model Changes

One new column on `blog_comment_settings` or a new `blog_paywall_settings` table (prefer the latter to keep concerns separated):

```sql
CREATE TABLE blog_paywall_settings (
  blog_id              UUID PRIMARY KEY REFERENCES blogs(id),
  subscribe_url        TEXT,                    -- null = use collection URL fallback
  footer_description   TEXT,                    -- null = use default copy
  feature_items        TEXT[],                  -- null = use defaults
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

No new column is needed for `is_paywalled` — this is already detectable at render time from the Squarespace DOM and is not stored in BetterBlog's DB (it is a Squarespace-side setting that BetterBlog should always read live, not cache).

---

## 9. Rendering Decision Tree

```
Collection page loads
        │
        ▼
Is blog paywalled?
   │              │
  NO             YES
   │              │
   ▼              ▼
Render BB      Is reader logged out?
normally          │              │
                 NO             YES
                  │              │
                  ▼              ▼
               Render BB    Does SQ post listing
               normally     exist in DOM?
                               │              │
                              YES             NO
                               │              │
                               ▼              ▼
                          Render BB      Exit — let SQ
                          collection     paywall UI show
                          with:          unmodified
                          • Members-only
                            teaser labels
                          • Paywall footer
                            only (no other
                            footer content)


Post page loads
        │
        ▼
Is blog paywalled AND reader logged out?
        │                    │
       NO                   YES
        │                    │
        ▼                    ▼
  Render BB             Render BB post
  normally              normally EXCEPT:
                        • Paywall footer only
                          (no other footer content)
```

---

## 10. Edge Cases

| Scenario | Handling |
|---|---|
| Blog has a free pricing plan (email signup, no charge) | Treat identically to a paid paywall. The reader is still not authenticated. Paywall footer renders. Subscribe button still uses configured URL or collection fallback. Price extraction returns null; button shows "Subscribe" with no price. |
| Blogger has not configured a Subscribe URL and blog is in "blog overview" mode | BetterBlog does not render at all (SQ owns the page). Subscribe URL setting is irrelevant for this mode. |
| Reader logs in during a session (MutationObserver detects auth change) | Re-run render logic. Remove paywall footer. Restore normal footer zones. Restore full post teasers in collection cards. No page reload required. |
| Blog switches paywall mode (blogger changes setting in SQ) | Detected on next page load via DOM check. No stale state risk since BetterBlog reads paywall mode live. |
| Subscribe URL configured but returns a 404 | BetterBlog has no way to validate this at render time. The link renders as-is. Broken URL is the blogger's responsibility; note this in onboarding docs. |
| Multiple pricing plans at different price points | Price extraction returns null. Button shows "Subscribe" with no price. |

---

## 11. Out of Scope for MVP

- Blogger-configurable eyebrow text ("MEMBER EXCLUSIVE")
- Blogger-configurable headline
- Custom paywall footer per post (footer is configured once at collection level)
- Metered access (e.g. "3 free articles before paywall")
- BetterBlog-owned checkout or subscription flow (always defers to Squarespace or blogger's subscribe URL)

---

## 12. Open Questions

| # | Question | Owner | Due |
|---|---|---|---|
| 1 | What exact DOM selectors does Squarespace use for the post listing in 7.1? Confirm across multiple templates. | Eng | Before build |
| 2 | In "blog posts only" mode, does Squarespace render any pricing plan markup in the collection page DOM for logged-out readers? Affects price extraction feasibility. | Eng | Before build |
| 3 | What is the correct mechanism to trigger Squarespace's native login flow from a custom button? Verify `/?login=true` or equivalent. | Eng | Before build |
| 4 | Which Squarespace CSS variables expose the accent/primary/secondary colors reliably across 7.1 templates? Verify via DevTools on test blog. | Eng | Before build |
| 5 | Should the paywall footer appear on public preview posts (posts the blogger has explicitly set as free)? Current assumption: no — if a post is a public preview, it is fully readable and no paywall footer should appear. Confirm intended behavior. | Product | Before build |
