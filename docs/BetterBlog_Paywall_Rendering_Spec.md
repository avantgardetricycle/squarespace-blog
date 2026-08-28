# BetterBlog Paywall Rendering — Technical Specification
**Version:** 1.1  
**Status:** Spec  
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

BetterBlog renders the post page overlay normally (header, sidebars, etc.). The article body is gated with a faded teaser plus the inline paywall overlay card (see §6). The paywall footer card is appended below the post body and replaces all other footer content for logged-out readers — email capture, lead magnet, social links, and any other configured footer modules are not rendered.

```javascript
function shouldShowPaywallFooter() {
  const isLoggedOut = getAuthState() === 'unauthenticated';
  const isPaywalled = blogSettings.isPaywalled; // stored at install time
  return isLoggedOut && isPaywalled;
}
```

---

## 6. Paywall Overlay & Footer Card Specification

The inline article overlay (`.bb-paywall-inline-card`) and the collection/post footer card (`.bb-paywall-card` inside `.bb-paywall-footer`) share the same visual system. Overlay heading is 32px; footer/card heading is 24px. All other type, color, button, and container rules below apply to both.

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│                    MEMBER EXCLUSIVE                              │  ← label
│                                                                  │
│           Unlock unlimited access to [Blog Name]                 │  ← heading
│                                                                  │
│        Subscribe for full access to every story, the             │  ← subtitle
│           complete archive, and ad-free reading.                 │
│                                                                  │
│       [Subscribe — $X/month]      [Sign in]                      │  ← CTAs
│                                                                  │
│   ✓ Unlimited articles  ✓ Full archive  ✓ Cancel anytime         │  ← benefits
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 6.1 Container

| Property | Value |
|---|---|
| Background | `color-mix(in srgb, var(--siteBackgroundColor, white), white 90%)` — 90% white blended with 10% of the customer's site background. Feels subtly branded; always stands out against the page. |
| Border | none |
| Border-radius | `min(Primary Button radius, 20px)` — universal card radius (`--bb-card-radius`). Square Primary Button → 0px corners; pill Primary Button → caps at 20px. |
| Padding | 40px uniform |
| Box-shadow | `0 8px 24px rgba(0, 0, 0, 0.10)` |
| Text-align | center |
| Width | `min(70vw, 600px)`, centered. Scales with viewport, capped at 600px for readability. |

The overlay must render at that width regardless of the article column on the current template. Break out of a narrow parent with:

```css
position: relative;
left: 50%;
transform: translateX(-50%);
width: min(70vw, 600px);
```

### 6.2 "MEMBER EXCLUSIVE" label

| Property | Value |
|---|---|
| Semantic | `<div>` (or `<h4>` if stricter heading semantics are preferred) |
| Font family | inherits H1 (Rule B) via `--bb-heading-font-family` |
| Font size | 12px |
| Font weight | 700 |
| Letter-spacing | 0.2em |
| Text-transform | uppercase |
| Color | `var(--bb-accent)` (Rule A) |
| Margin-bottom | 14px |

Default copy is "MEMBER EXCLUSIVE". Blogger-configurable via paywall settings (`eyebrowText`).

### 6.3 Heading

| Property | Value |
|---|---|
| Semantic | `<h3>` (Rule F — section-level card/overlay header) |
| Font family | inherits H1 |
| Font size | **32px overlay** (`.bb-paywall-heading--overlay`); **24px card/footer** |
| Font weight | 700 |
| Line-height | 1.2 |
| Color | Squarespace `--paragraphLargeColor` token (NOT the computed color of any DOM element). Equivalent BB token: `--bb-body` derived from `--paragraphLargeColor`. |
| Margin-bottom | 14px |

### 6.4 Subtitle

| Property | Value |
|---|---|
| Font family | inherits P1 |
| Font size | 18px |
| Line-height | 1.5 |
| Color | `var(--bb-excerpt)` (body 80%, Rule D) — derived from `--paragraphLargeColor` / `--bb-body` |
| Max-width | none (no hardcoded max-width) |
| Margin-bottom | 28px |

### 6.5 Buttons

**Subscribe**

- Attach class `sqs-button-element--primary`
- No inline style overrides — inherits the customer's Squarespace Primary Button styling entirely (background, color, font, padding, radius, letter-spacing, text-transform)
- Keep `bb-paywall-subscribe-btn` in addition to the Squarespace class so price-label refresh can still find the control

**Sign in**

- Attach class `sqs-button-element--primary` (same as Subscribe — for sizing/font consistency)
- Add BetterBlog overrides for outlined treatment only:
  - `background: transparent`
  - `color: var(--bb-accent)`
  - `border: 2px solid var(--bb-accent)`
- Result: visually paired outline button; matches Subscribe in size and typography but outlined instead of filled
- Do **not** use Squarespace's Secondary Button class. Secondary is a design-system class that may not pair with Primary at CTA scale.

**Button row**

- `margin-bottom: 28px`
- Flex, wrap, center-justified, 10px gap

### 6.6 Benefit list

| Property | Value |
|---|---|
| Font family | inherits P1 |
| Font size | 14px |
| Font weight | inherits (normal) |
| Color | `var(--bb-muted)` (body 60%, Rule D) |
| Line-height | 1.2 |
| Layout | flex-wrap, center-justified, gap 4px vertical / 18px horizontal |

**Checkmarks (✓):** `color: var(--bb-accent)` (Rule A); `font-weight: 700`.

### 6.7 Critical implementation notes

**Text color source.** The paywall renders on a light background (90% white overlay). Text colors MUST come from Squarespace's `--paragraphLargeColor` token (or the equivalent BB `--bb-body` token), **not** from the computed color of any DOM element on the page.

- On templates like Story, header text is rendered white-on-dark. Sampling that element produces white text that is invisible on the paywall's light background.
- On paywalled posts, the article body is hidden, so there is no visible article body `<p>` to sample from.

Paywall surfaces set `--bb-body: var(--paragraphLargeColor, #111111)` so `--bb-excerpt` (80%) and `--bb-muted` (60%) derive from the token, not from sampled chrome.

**Buttons.** Zero inline overrides on Subscribe. Attach `sqs-button-element--primary` only (plus the `bb-paywall-subscribe-btn` hook). Any hardcoded padding, font-size, font-weight, letter-spacing, or text-transform overrides the customer's Primary Button styling and breaks tokenization. Confirmed on customer sites: with the class attached and no overrides, buttons match every other Primary Button on the site.

**Sign in** uses Primary class + outline overrides, not Secondary class.

### 6.8 Content

**Eyebrow:** Default "MEMBER EXCLUSIVE". Configurable via paywall settings (`eyebrowText`). Visual treatment is §6.2.

**Headline:** Overlay default: `Continue reading with a membership`. Footer default: `Unlock unlimited access to [Blog Title]` where Blog Title is read from the Squarespace page context (`Static.SQUARESPACE_CONTEXT.website.siteTitle` or the blog page title). Configurable via `headlineText` (`{blogName}` placeholder supported). Visual treatment is §6.3.

**Description:** Blogger-configurable in BetterBlog settings. Overlay prefers `inlineDescription`, then `footerDescription`. Footer uses `footerDescription`. Overlay default: *"Subscribe for unlimited access to every article, the full archive, and ad-free reading."* Footer default: *"Subscribe for full access to every story, the complete archive, and exclusive reading."* Maximum 160 characters. Visual treatment is §6.4.

**Subscribe button:**
- Label: `Subscribe` if no pricing information is available; `Subscribe — $X/month` if a price can be read from the Squarespace paywall DOM (see §6.9). Falling back to `Subscribe` is always safe.
- Link: blogger-configured Subscribe URL. If not configured, defaults to the current collection's base URL (see §6.10).
- Styling: §6.5 — `sqs-button-element--primary`, no inline overrides.

**Sign in button:**
- Label: "Sign in" — not configurable.
- Action: configured `signInUrl`, else `/account/login`.
- Styling: §6.5 — Primary class + outline overrides. Not Secondary class.

**Feature checklist:** Blogger-configurable list of 2–4 short feature strings. Overlay defaults: "Unlimited articles", "Full archive", "Ad-free", "Cancel anytime". Footer defaults: "Unlimited articles", "Full archive access", "Cancel anytime". Each item rendered with a checkmark (✓) per §6.6.

### 6.9 Price Extraction (Best-Effort)

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

### 6.10 Subscribe URL Resolution

Priority order for the Subscribe button link:

1. Blogger-configured Subscribe URL in BetterBlog settings (explicit field)
2. If not configured: the blog's own collection URL (current `window.location.pathname` base slug, e.g. `/journal`)

The collection URL fallback is valid because in "blog posts only" mode, navigating to the collection page as a logged-out user does show post previews — it does not immediately trigger a Squarespace signup flow. The subscribe button in this case is BetterBlog's CTA, not a replacement for Squarespace's mechanism.

---

## 7. BetterBlog Settings — Paywall fields

Paywall copy is **site-level**, not nested under Collection or Post. When the site is detected as paywalled, Customize Blog shows a **Paywall Settings** button above the Collection / Post toggle. That button opens a modal with:

```
┌─────────────────────────────────────────────────────┐
│  PAYWALL SETTINGS                                    │
│  These settings apply to both collection and post.   │
│                                                      │
│  Subscribe URL  (optional)                           │
│  [                                        ]          │
│  Leave blank to send readers to your blog page.      │
│  Enter a custom URL if you have a dedicated          │
│  sign-up or membership page.                         │
│                                                      │
│  Eyebrow  (optional, max 80)                         │
│  Header text  (optional, max 160, {blogName} ok)     │
│  Footer description  (optional, max 160)             │
│                                                      │
│  Feature checklist  (optional, one per line)         │
│  [ Unlimited articles                     ]          │
│  [ Full archive access                    ]          │
│  [ Cancel anytime                         ]          │
│  [+ Add item]       Max 4 items.                     │
└─────────────────────────────────────────────────────┘
```

The same subscribe URL, headline, description, and checklist apply at both the collection and post level. They are not independently configured per level. Clearing Collection or Post layout settings does not reset paywall copy.

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
                            card only (no other
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
                        • Inline overlay card
                          on gated body (32px heading)
                        • Paywall footer card
                          only (no other footer content)
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

- Custom paywall footer per post (footer is configured once at collection level)
- Metered access (e.g. "3 free articles before paywall")
- BetterBlog-owned checkout or subscription flow (always defers to Squarespace or blogger's subscribe URL)

Eyebrow and headline copy are configurable (defaults in §6.8). Visual treatment is not configurable.

---

## 12. Open Questions

| # | Question | Owner | Due |
|---|---|---|---|
| 1 | What exact DOM selectors does Squarespace use for the post listing in 7.1? Confirm across multiple templates. | Eng | Before build |
| 2 | In "blog posts only" mode, does Squarespace render any pricing plan markup in the collection page DOM for logged-out readers? Affects price extraction feasibility. | Eng | Before build |
| 3 | What is the correct mechanism to trigger Squarespace's native login flow from a custom button? Verify `/account/login` vs `/?login=true`. | Eng | Before build |
| 4 | Should the paywall footer appear on public preview posts (posts the blogger has explicitly set as free)? Current assumption: no — if a post is a public preview, it is fully readable and no paywall footer should appear. Confirm intended behavior. | Product | Before build |

**Resolved — text color source (was Q4):** Paywall heading/body colors use Squarespace `--paragraphLargeColor` (BB `--bb-body`), never computed `color` from a heading or `<p>`. Accent is Rule A (`--bb-accent`). Derived neutrals are Rule D (`--bb-excerpt` 80%, `--bb-muted` 60%). See §6.7.
