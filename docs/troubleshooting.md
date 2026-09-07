# Troubleshooting

This page covers the most common issues BetterBlog users run into, including several that look like bugs but are caused by Squarespace's own behavior. If you don't find your issue here, use the Support tab to ask a question or contact the team.

---

## Installation issues

**I got a "We couldn't reach your blog" error when adding my blog.**
BetterBlog checks that your URL points to a valid Squarespace blog when you click Add Blog. Double-check that the URL is the full path to your blog collection page (including `https://`), that the page is published in Squarespace, and that it's publicly accessible. Private or password-protected pages cannot be verified. If the URL looks correct, try opening it in a browser tab first to confirm it loads.

**I pasted the snippet but my blog looks the same.**
A few things to check in order:
1. Confirm the snippet was pasted into the **Header** field in Code Injection, not the Footer
2. Confirm you clicked **Save** in Squarespace after pasting
3. Open your blog in a fresh browser tab and force-refresh (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows) to bypass any cached version
4. Open the browser console (right-click → Inspect → Console) and look for any BetterBlog-related errors or a confirmation message

If you've just installed and haven't customized anything yet, the visual difference may be subtle — the default templates (The Showcase for collection, The Feature for posts) are applied automatically and may look similar to your existing Squarespace layout.

**I see a blank page or a loading spinner that doesn't go away.**
BetterBlog includes a safety timeout — if the script fails to load within about 10 seconds, the loading overlay is automatically removed and your native Squarespace blog becomes visible. If you're seeing a persistent blank screen beyond that window, the most likely cause is that the snippet was pasted in incomplete or with characters missing. Return to **Installation instructions** in the dashboard, copy the snippet fresh, and replace the existing code in Squarespace Code Injection.

**I have two copies of the snippet in Code Injection.**
Remove both, then paste a single fresh copy from the Installation instructions modal. Duplicate snippets cause conflicts and unpredictable behavior.

**BetterBlog isn't loading in the Squarespace editor.**
This is expected. BetterBlog intentionally does not activate inside the Squarespace editing interface — it only runs on your live published blog. Use BetterBlog's own live preview in the dashboard customizer to see your changes.

---

## Live preview issues

The BetterBlog customizer shows a live preview of your blog as you adjust settings. It works by loading your actual blog in an iframe. In some cases Squarespace prevents this, and BetterBlog falls back to a simulated render instead. When the iframe is blocked, the preview panel shows a message explaining the situation and directing you to check your live blog directly.

**The preview panel shows a message saying it can't display my blog.**
This is almost always caused by one of two things:

**1. You're using a default Squarespace domain (yoursite.squarespace.com)**
Squarespace sets security headers (X-Frame-Options / Content-Security-Policy) on default `.squarespace.com` domains that prevent other sites — including BetterBlog — from loading them in an iframe. These headers are not present on custom domains.

If your site is still on a Squarespace subdomain and you have a custom domain available, connecting it in Squarespace will resolve the preview issue. Go to Squarespace → Settings → Domains and connect your domain. Once connected, update your blog URL in BetterBlog (edit the blog row in the dashboard) to use the custom domain URL.

If you don't have a custom domain, the live preview will not work on a `.squarespace.com` URL. Use the **Check live site** link in the preview panel to open your blog directly in a new tab — your changes are still applied live even though the preview can't display them in the iframe.

**2. Your site has clickjack protection enabled**
Squarespace allows site owners to enable additional clickjack protection, which sets stricter security headers that block iframe embedding regardless of whether you're on a custom domain. This is found in Squarespace → Settings → Advanced → SSL.

If you have clickjack protection enabled and need the BetterBlog preview to work, you would need to disable it. If you'd prefer to keep it on, use the **Check live site** link in the preview panel to review your changes in a new tab instead.

**My changes aren't showing in the live preview.**
Try clicking the refresh button in the preview panel to reload the iframe. If the preview is in simulated render mode (because the iframe was blocked), it may lag slightly behind live changes — always verify on the actual live blog for a definitive view.

---

## Template and settings issues

**A setting I was using has disappeared.**
Settings that a template controls are hidden from the customizer panel — the template makes those decisions automatically. If a setting you want has disappeared, it's because your current template owns it. Switching to a different template may expose it. See [Templates](templates.md) for a breakdown of which settings each template controls and which remain customizable.

**I applied a template and now my customizations are gone.**
Applying a template overwrites your settings for that level (collection or post) with the template's defaults — the confirmation dialog before applying warns you of this. Customizations cannot be automatically restored after a template is applied. If you remember what settings you had, you can re-apply them to any controls the new template doesn't own.

**My template change isn't showing on the live blog.**
Confirm the BetterBlog snippet is still installed in Squarespace Code Injection (it's possible it was accidentally removed if someone else edited the site). Also try a hard refresh on your live blog (Cmd+Shift+R / Ctrl+Shift+R).

**The live blog looks different from the preview.**
The preview uses your real blog content loaded in an iframe (or a simulated render if the iframe is blocked). Color, typography, and some spacing inherit from your Squarespace site's CSS, so the live result will always look more finished than any preview. If there's a structural difference — a zone in the wrong position, a module missing — confirm the template and module order in Customize Blog match what you expect, then hard-refresh the live site.

**My sidebar is overlapping the header.**
A sticky sidebar can slide up under your Squarespace site header if there is not enough offset. On the Collection tab, open the sidebar section and increase **Space above**, or turn off **Sticky (move with scroll)**. On the Post tab, turn sticky off (Post sidebars do not expose a space-above control). If the overlap is your Squarespace header covering BetterBlog content, that header is controlled by Squarespace, not BetterBlog — adjust header height or position in the Squarespace site styles.

---

## Comments issues

**Comments aren't showing on my posts.**
Check that Show Comments is enabled in Customize Blog → Post → Comments. Also confirm that BetterBlog is active on the post page (check the browser console for the initialization message). Native Squarespace comments are suppressed by BetterBlog — if BetterBlog isn't running, neither comment system will show.

**A comment I approved isn't appearing on the post.**
After approving in the dashboard, try a hard refresh on the post page. If it still doesn't appear, check that the post itself hasn't passed its auto-close window — if Close Comments After is set and the window has passed, no comments will display regardless of approval status.

**Comments are showing as closed, but I didn't set a close date.**
Check the Close Comments After setting in Customize Blog → Post → Comments. If it's set to any value other than Never, posts older than that threshold will show as closed. Set it to Never to remove the time limit.

**My Squarespace API key shows as invalid for verified subscriber comments.**
There are two common causes. First, confirm the key was generated with the **Profiles (Read)** permission — API key permissions can't be edited after creation, so if the permission was missing, you'll need to delete the key in Squarespace and generate a new one with the correct permission. Second, check whether your Squarespace site's plan has changed — the Profiles API requires a Business plan or higher, and if your Squarespace plan lapsed or was downgraded, the key will return a 401 even though it was previously working. Creating a new key on a lower plan will not fix this.

**Subscriber comments aren't being verified — everyone shows as anonymous.**
If your API key is valid but verification isn't working, check that the commenter's email actually exists in your Squarespace member list. Verification looks up the email against your Profiles API. If the email isn't found and anonymous comments are off, the reader sees a modal and the comment is not posted. If anonymous comments are also on, they are asked to confirm posting as a guest — BetterBlog does not silently store an unverified comment as anonymous.

---

## Analytics issues

**Analytics aren't tracking on my blog.**
BetterBlog's analytics tracking runs as part of the overlay script. If the script isn't installed or isn't loading, no data will be collected. Confirm the snippet is present in Squarespace Code Injection and that the blog is showing the BetterBlog layout (check the browser console for the initialization message).

**My page views look lower than expected.**
BetterBlog tracks page views on the collection and post pages where the overlay is active. Views on other page types (your homepage, About page, etc.) are not tracked. Also note that views from your own browser sessions while logged into the BetterBlog dashboard may be filtered — use a separate browser or incognito window to test tracking.

**The Read Percent Distribution chart shows unexpected numbers.**
Read percent is tracked when a reader navigates away from the post — it captures how far they scrolled before leaving. Very short sessions (where a reader leaves immediately) will count as 0–25%. Readers who don't scroll to the bottom but spend a long time on the page will still show a read percent based on scroll depth, not time.

**Google Analytics shows as connected but I don't see data in BetterBlog's dashboard.**
Connecting Google Analytics sends your blog's event data to your GA property — it doesn't import GA data into BetterBlog. The BetterBlog analytics dashboard shows BetterBlog's own tracking data only. To see Traffic Sources, Top Referrers, and New vs. Returning Visitors, view those in your Google Analytics account directly.

---

## Paywall and membership issues

**My paywall footer isn't showing for logged-out readers.**
First, confirm your blog is set to membership required in the BetterBlog dashboard (edit the blog row and check the membership toggle). If you recently turned a Squarespace paywall on, open the dashboard — BetterBlog may ask whether to update to match the live site. Second, confirm which Squarespace paywall mode you're using. If your blog is set to gate the overview page and posts (not posts only), Squarespace replaces the entire collection page with its own signup UI — BetterBlog intentionally steps back in this mode and does not render, which means no paywall footer. See [Paywall & Membership](paywall-membership.md) for a full explanation of how the two modes work.

**I turned off my Squarespace paywall but BetterBlog still shows membership UI.**
Open the BetterBlog dashboard. If the live site no longer looks paywalled, BetterBlog will ask whether to update. You can also edit the blog row and set membership required to No. See [Paywall & Membership](paywall-membership.md).

**Logged-out readers can see my full post content.**
BetterBlog doesn't control post content gating — that's handled entirely by Squarespace's pricing plan configuration. If logged-out readers can read your full posts, the paywall is not configured in Squarespace. Check your Squarespace pricing plan settings and confirm the blog page is assigned to a plan.

**The "Sign in" button in the paywall footer isn't working.**
The Sign in button triggers Squarespace's native login flow. If it's not responding, check whether Squarespace's own login mechanism is working on your site independently of BetterBlog (try navigating to your blog directly and using Squarespace's login prompt).

---

## Account and billing issues

**My magic link isn't working.**
Magic links expire after 24 hours. If yours has expired, return to the BetterBlog login page and request a new one. If a fresh link also isn't working, check your spam folder, and confirm you're clicking the link in the most recent email (requesting a new link invalidates previous ones).

**I can't add another blog — the option is blocked.**
You've reached your plan's blog limit (1 for Essentials, 3 for Professional). To add more blogs, upgrade your plan from the Account section of the dashboard.

**I canceled my subscription but I'm still being charged.**
Canceling in BetterBlog schedules the cancellation at the end of your current billing period — it doesn't cancel immediately. You'll retain access until the period ends and won't be charged again after that. If you believe you've been charged incorrectly, contact the team from the Support tab.

---

## Known Squarespace behaviors

These are Squarespace behaviors that frequently cause confusion for BetterBlog users. They are not BetterBlog bugs.

**The "View" button in the Squarespace account drawer is grayed out.**
Squarespace has two separate account systems: customer accounts (for commerce) and member accounts (for paywalled content). Logging in via the standard account panel authenticates you as a customer, not as a member. The View button for a paywalled blog is only active when you're authenticated as a member with an active pricing plan. To test the member experience properly, use a private browser window and sign up through the blog's paywall flow — not through the main account login.

**My Squarespace API key stopped working suddenly.**
API keys are tied to a specific Squarespace site and do not expire on their own — but they stop working if the site's Squarespace plan lapses or is downgraded below the level required for the API (Business or higher for the Profiles API). If your key recently returned a 401, check whether anything changed on your Squarespace billing. Generating a new key won't help if the plan level is the issue. Also check that the key hasn't been deleted from Squarespace → Settings → Advanced → Developer API Keys.

**I can't edit my Squarespace API key's permissions.**
Squarespace doesn't allow editing permissions on an existing API key. If a key is missing a permission (such as Profiles Read), you need to delete it and generate a new one with the correct permissions selected.

**BetterBlog behaves differently on a .squarespace.com URL vs a custom domain.**
Squarespace sets stricter security headers on default `.squarespace.com` domains. The most visible effect for BetterBlog users is that the live preview iframe won't load on a Squarespace subdomain. Your blog still works correctly for readers on either URL type — the difference only affects the BetterBlog customizer preview.
