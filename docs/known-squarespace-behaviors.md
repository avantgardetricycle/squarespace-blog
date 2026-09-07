# Known Squarespace Behaviors

This page documents Squarespace platform behaviors that directly affect how BetterBlog works. None of these are BetterBlog bugs — they are characteristics of the Squarespace platform that are worth understanding if you're building on top of it or troubleshooting unexpected behavior.

Topics are explained with enough technical depth to understand the underlying cause, not just the symptom.

---

## The two Squarespace account systems

Squarespace has two completely separate authentication systems that coexist on every site. They look related but are architecturally independent, and conflating them is the single most common source of confusion when working with paywalled blogs.

**Customer accounts** are Squarespace's commerce identity system. A customer account is created when someone places an order, signs up for a mailing list, or registers through Squarespace's account panel. Customer accounts are managed under Squarespace → Contacts. The standard "Log in" link on a Squarespace site authenticates against the customer account system.

**Member accounts** are Squarespace's membership/paywall identity system. A member account is created when someone signs up through a pricing plan — either a paid subscription or a free membership. Member accounts are managed under Squarespace → Selling → Member Areas (or Squarespace → Selling → Pricing Plans on newer plan structures).

These two systems do not share session state. A user can be authenticated as a customer and simultaneously unauthenticated as a member, or vice versa. When a reader logs in through the standard account panel, they are authenticated only as a customer — they are not automatically granted member access to a paywalled blog.

**The practical implication for BetterBlog:** BetterBlog's auth state detection uses DOM signals to determine whether a reader is logged into Squarespace. Those signals reflect customer account authentication, not member authentication. On a paywalled blog, a reader who is logged in as a customer but not as a member will appear authenticated in the DOM while still being locked out of post content. This is why BetterBlog's paywalled comment flow asks for email verification against the Profiles API rather than relying on DOM auth state alone — the DOM cannot reliably confirm member status.

**The "View" button is grayed out in the account drawer.** This is the most visible symptom of the two-account-system issue. The View button for a paywalled blog is only active when the reader is authenticated as a member with an active pricing plan. Being logged in as a customer does not activate it. To test the full member experience, use a private browser window and sign up through the blog's paywall flow — do not use the standard account login.

**Testing note:** When testing paywalled behavior as a developer, always use a private browsing window and sign up through the pricing plan flow. Logging in as the site owner or through the standard account panel will not replicate the member reader experience.

---

## Iframe embedding restrictions on .squarespace.com domains

Squarespace sets security headers on default `.squarespace.com` domains that prevent other sites from embedding them in an iframe. This affects BetterBlog's live preview, which works by loading your actual blog in an iframe inside the customizer.

**The technical cause:** Squarespace sends an `X-Frame-Options: SAMEORIGIN` header (and in some cases a `Content-Security-Policy: frame-ancestors 'self'` directive) on responses from `.squarespace.com` subdomains. These headers instruct browsers to refuse iframe embedding from any origin other than the same domain. BetterBlog's customizer is served from `app.betterblog.xyz`, which is a different origin — so the browser blocks the iframe silently.

This restriction is not present on custom domains connected to Squarespace. When a site has a custom domain, Squarespace's response headers allow iframe embedding from external origins, which is why the BetterBlog preview works correctly for sites on custom domains.

**What you'll see:** when the iframe is blocked, BetterBlog's preview panel shows a message explaining that the preview couldn't load, with a link to open your live blog directly. BetterBlog attempts the iframe first and falls back to a simulated render if the iframe fails. Changes you make in the customizer are still applied to the live blog in real time — the iframe block only affects the preview, not the actual rendering for your readers.

**The fix:** connect a custom domain to your Squarespace site. Once connected, update your blog URL in the BetterBlog dashboard to the custom domain URL. The preview will work immediately after the URL is updated.

If you're in early development and not ready to use a custom domain, use the live blog link in the preview panel to check your changes in a new tab.

---

## Clickjack protection and iframe embedding

Squarespace offers an optional clickjack protection setting that sets stricter iframe embedding restrictions, regardless of whether the site is on a custom domain or a `.squarespace.com` subdomain.

**The technical cause:** enabling clickjack protection in Squarespace → Settings → Advanced → SSL causes Squarespace to send `X-Frame-Options: DENY` on all page responses. Unlike `SAMEORIGIN` (which allows same-domain embedding), `DENY` blocks iframe embedding from any origin including the same domain. This makes the restriction absolute — connecting a custom domain will not resolve it when clickjack protection is on.

**What you'll see:** the same preview panel message as the `.squarespace.com` domain case. The symptom is identical; the cause is different.

**The fix:** if you need the BetterBlog live preview to work and have clickjack protection enabled, you'll need to disable it in Squarespace. If you prefer to keep clickjack protection on for security reasons, use the live blog link to review your changes instead. The BetterBlog overlay still runs correctly for your readers regardless of this setting — it is injected as a script, not an iframe.

---

## API key scoping and lifecycle

Squarespace API keys are scoped per site, not per account. A single Squarespace account that manages multiple sites must generate a separate API key for each site — there is no account-level key that spans multiple properties.

**Key generation:** keys are created at Squarespace → Settings → Advanced → Developer API Keys. Each key is assigned a set of permissions at creation time. The available permissions depend on the site's plan.

**Permissions are immutable after creation.** Once an API key is created, its permissions cannot be edited. If a key is missing a required permission — for example, Profiles Read for BetterBlog's subscriber verification feature — the only option is to delete the key and generate a new one with the correct permissions selected. This is a Squarespace platform constraint, not a BetterBlog limitation.

**Keys do not expire on a time basis.** A Squarespace API key remains valid indefinitely as long as the site is active on a qualifying plan. However, keys become invalid immediately in two scenarios:

1. **The site's plan lapses or is downgraded.** The Profiles API requires a Business plan or higher. If the Squarespace site drops below that plan level — even temporarily, due to a failed payment — any key with Profiles permission will return `401 Unauthorized`. This is distinct from a `402 Payment Required`, which Squarespace also uses to signal an expired site. Generating a new key on a lower plan does not resolve the issue; the plan must be restored first.

2. **The key is manually deleted.** Any site owner or administrator can delete API keys from the Squarespace dashboard. BetterBlog has no way to detect key deletion proactively — the only signal is a `401` response on the next Profiles API call. BetterBlog monitors connected keys and will surface a dashboard warning if a key returns a `401`, but there is no real-time notification.

**Multiple keys can coexist.** Creating a new key does not invalidate existing ones. This means you can rotate keys without downtime — generate the new key, update it in BetterBlog, then delete the old one.

---

## Squarespace paywall modes

Squarespace gives site owners two distinct paywall visibility modes when assigning a pricing plan to a blog. These modes produce fundamentally different page structures for logged-out readers and require different responses from BetterBlog.

**Mode 1 — Posts only:** the paywall applies only to individual post pages. The blog collection (index) page is fully public — any visitor can browse post cards, titles, and excerpts. The paywall gate activates when a visitor navigates to an individual post. In this mode, Squarespace renders the normal post listing HTML for all visitors.

**Mode 2 — Blog overview and posts:** the paywall applies to both the collection page and individual posts. When a logged-out visitor navigates to the blog's collection URL, Squarespace intercepts the request and renders its own signup/paywall UI in place of the post listing. No post listing HTML is rendered for logged-out visitors.

**How BetterBlog detects the mode:** at page load, BetterBlog checks whether Squarespace has rendered a post listing in the DOM. If the expected post listing elements are absent, BetterBlog infers that Mode 2 is active and exits without rendering the collection overlay — allowing Squarespace's own paywall UI to display unmodified. If the post listing is present, BetterBlog infers Mode 1 and renders normally, replacing post teasers with members-only labels and showing the paywall footer.

**Why BetterBlog doesn't render in Mode 2:** in Mode 2, the blogger has explicitly decided that logged-out readers should see a signup page, not a blog listing. Rendering BetterBlog's collection layout over Squarespace's paywall UI would cover the pricing plan, the signup form, and the call to action — directly undermining the blogger's intent. BetterBlog steps back intentionally.

**Changing modes:** the paywall visibility mode is set in Squarespace's pricing plan configuration. BetterBlog detects it dynamically on each page load — there is no stored setting in BetterBlog that needs to be updated when the mode changes.

---

## Squarespace plan requirements for API features

Not all Squarespace API endpoints are available on all plans. This matters for BetterBlog features that rely on server-side API calls.

**Profiles API (used for verified subscriber commenting):** requires Business plan or higher. Available on: Business, Commerce Basic, Commerce Advanced, and equivalent plans in Squarespace's current plan naming (Core, Plus, Advanced). Not available on Personal/Basic.

**Code Injection (required for BetterBlog installation):** available on Core plan or higher. Not available on Personal or Basic.

**Developer API Keys (required for Profiles API integration):** available wherever the Profiles API is available. The key generation UI at Settings → Advanced → Developer API Keys will only show the Profiles permission option if the site is on a qualifying plan.

If a blogger generates an API key on a qualifying plan and the plan is later downgraded, the key becomes non-functional for any permission that requires the higher plan. The key itself still exists in the dashboard but all calls using it will return `401` until the plan is restored.

---

## Squarespace 7.0 vs 7.1

BetterBlog supports Squarespace 7.1 only. This section explains the difference for context.

Squarespace 7.0 and 7.1 are architecturally distinct versions of the platform. They use different template systems, different DOM structures, and different approaches to page rendering. Selectors, class names, and page structure that BetterBlog relies on for its overlay differ significantly between versions.

**How to identify your version:** go to Squarespace → Settings → Advanced → Developer Tools. If this option exists, you're on 7.0. If it doesn't appear, you're on 7.1. All new Squarespace sites created after late 2020 are on 7.1.

7.0 sites can be migrated to 7.1 through Squarespace's migration process, but this involves template changes and is a significant undertaking. BetterBlog does not have a planned timeline for 7.0 support.

---

## Ajax navigation and script re-initialization

Squarespace 7.1 uses Ajax-based page transitions by default — when a reader clicks a link on the site, Squarespace loads the new page content without a full browser reload. This means the browser does not re-execute scripts on navigation, which affects how BetterBlog initializes.

**The technical implication:** BetterBlog listens for Squarespace's Ajax navigation events and re-initializes the overlay on each page transition. If a new version of Squarespace changes the events it dispatches for navigation, BetterBlog's re-initialization logic may break, causing the overlay to fail to apply on navigated pages while still working on direct page loads.

**What you'll see if this breaks:** the first page a visitor loads will show the BetterBlog layout correctly, but subsequent pages navigated to within the same session will revert to the native Squarespace layout. A hard refresh on any page will restore BetterBlog.

This is not a current known issue, but it is a class of issue worth being aware of if Squarespace ships a platform update that changes navigation behavior.

---

## Squarespace editor interference

When a site owner is actively editing their Squarespace site in the Squarespace editor, BetterBlog does not activate. This is intentional — BetterBlog detects the editor context and exits early to avoid interfering with the editing interface.

The Squarespace editor injects its own scripts and DOM modifications that conflict with BetterBlog's overlay. Attempting to run BetterBlog inside the editor would produce unpredictable rendering and could disrupt the editor's own functionality.

Use BetterBlog's customizer preview to review layout changes. The live blog (viewed outside the editor, in a separate browser tab) is always the authoritative render.
