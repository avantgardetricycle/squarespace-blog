# Getting Started with BetterBlog

BetterBlog enhances your existing Squarespace blog without replacing it. You keep everything you've built — your domain, your design, your content — and the app layers on top to give you better layouts, richer analytics, and features Squarespace doesn't offer natively.

This section covers everything you need to get up and running.

---

## What is BetterBlog?

BetterBlog is a Squarespace blog enhancement plugin. You install it once by pasting a small script into your Squarespace site, then configure everything from the BetterBlog dashboard — no further code editing required.

Once installed, the app replaces your blog's default Squarespace layout with a fully customizable one. Your readers see the new layout automatically; you manage it from BetterBlog.

**What BetterBlog adds to your Squarespace blog:**

- Curated collection and post templates with distinct, polished layouts
- Granular layout controls: sidebars, headers, footers, featured post placement, pagination
- A reading progress bar, table of contents, breadcrumbs, and social sharing links
- Built-in analytics: page views, read depth, click tracking, per-author stats
- Email capture and lead magnet modules with a leads dashboard
- Comment support with moderation, threading, and subscriber verification
- Paywall-aware rendering for membership blogs

BetterBlog works alongside Squarespace — it doesn't touch your Squarespace account settings, domain, billing, or content. If you ever remove the plugin, your Squarespace blog returns to its default appearance instantly.

---

## How it works

BetterBlog uses a technique called a client-side overlay. When a reader visits your blog, their browser loads your Squarespace site as normal, then loads the BetterBlog script, which applies your configured layout on top.

This means:

- **Nothing changes in Squarespace.** Your posts, images, settings, and domain stay exactly where they are.
- **No Squarespace template changes are needed.** BetterBlog works on top of your existing template.
- **Changes you make in BetterBlog appear live** on your blog without republishing in Squarespace.
- **Removing the script** instantly reverts your blog to its default Squarespace appearance. Nothing is deleted.

---

## Requirements

Before installing BetterBlog, check that your setup meets these requirements.

**Squarespace plan**

BetterBlog requires Code Injection, which is available on Squarespace's **Core plan or higher** (Core, Plus, Advanced, and equivalent legacy plans like Business and Commerce). It is not available on the Personal or Basic plans.

If you're unsure which plan you're on, go to your Squarespace dashboard → Settings → Billing & Account → Billing.

**Squarespace version**

BetterBlog supports **Squarespace 7.1 only**. Version 7.0 sites are not currently supported.

If you're unsure which version you're on, go to your Squarespace dashboard → Settings → Advanced → Developer Tools. If that option is present, you're on 7.0 and BetterBlog will not work on your site. If the option is absent, you're on 7.1.

**Blog page**

You need at least one blog page added to your Squarespace site. BetterBlog only activates on blog collection and post pages — it has no effect on other page types.

**BetterBlog plan**

A BetterBlog subscription is required to use the app. A 7-day free trial is included when you sign up — no credit card charged during the trial.

---

## Plans

BetterBlog offers three plans.

| Plan | Blogs included | Best for |
|---|---|---|
| **Essentials** | 1 blog | Single-blog personal sites |
| **Professional** | 3 blogs | Multi-blog creators and freelancers |
| **Publication** | Unlimited | Studios and agencies |

All plans include the full feature set. The only difference between plans is the number of Squarespace blogs you can connect. Annual billing is available at a discount on all plans.

You can change or cancel your plan at any time from the Account section of the BetterBlog dashboard.

---

## Setting up your account

### 1. Create your BetterBlog account

Go to [betterblog.xyz](https://betterblog.xyz) and click **Get Started**. Enter your name and email address. You'll receive a magic link by email — click it to log in. No password to set or remember.

Magic links expire after 24 hours. If yours has expired, return to the login page and request a new one.

### 2. Choose a plan and start your trial

After logging in, you'll be prompted to select a plan. All plans begin with a 7-day free trial. Nothing is charged until the trial ends.

Enter your name and email to proceed to Stripe's secure checkout. Your card details are handled entirely by Stripe — BetterBlog never stores payment information.

### 3. Add your blog

After your account is created, click **Add Blog**. You'll be asked for:

- **Blog name** — a label for your own reference (e.g. "My Photography Blog")
- **Blog URL** — the full URL of your Squarespace blog collection page (e.g. `https://yoursite.com/blog`)
- **Membership required** — whether your blog is gated by a Squarespace pricing plan. This controls how BetterBlog behaves for logged-out readers.

Click **Add Blog**. BetterBlog will generate your installation snippet and display it in a modal.

---

## Installing the script on Squarespace

This is the only step that requires you to touch Squarespace.

### 1. Copy your snippet

After adding your blog, a snippet is displayed. It looks something like this:

```html
<script>
  /* BetterBlog preloader */
  ...
</script>
<script defer src="https://app.betterblog.xyz/loader.js"
  data-site-key="YOUR_SITE_KEY">
</script>
```

Copy the entire snippet. You can also find it anytime from your blog's row in the BetterBlog dashboard.

### 2. Open Code Injection in Squarespace

1. Log in to Squarespace
2. Go to **Settings → Advanced → Code Injection**
3. Paste the snippet into the **Header** field
4. Click **Save**

> **Why the Header field?** BetterBlog's preloader needs to run before your page content loads. Pasting into the Header field ensures the timing is correct and prevents a flash of the default Squarespace blog layout.

### 3. Verify the installation

Open your blog in a new browser tab. If BetterBlog is installed correctly, your blog will now reflect the default BetterBlog layout. You may not notice a dramatic visual change immediately — some templates look similar to Squarespace's default — but you should see no errors in your browser's console.

To confirm installation from the dashboard: your blog row will show a green connected indicator rather than an amber warning.

> **Not seeing your changes?** See [Troubleshooting](troubleshooting.md).

---

## What's next

Once the script is installed, everything else is configured from the BetterBlog dashboard — no more touching Squarespace.

- **[Choose a template](templates.md)** — the fastest way to get a great-looking blog. Templates apply a curated layout in one click.
- **[Customize your collection page](collection-settings.md)** — control sidebars, featured posts, filters, pagination, and footer modules.
- **[Customize your post page](post-settings.md)** — add a progress bar, table of contents, social sharing, and author profiles.
- **[Set up analytics](analytics.md)** — your dashboard starts collecting data as soon as the script is installed.
- **[Enable comments](comments.md)** — add a comment section to your posts with moderation and subscriber verification.

---

## Removing BetterBlog

To stop using BetterBlog, remove the snippet from Squarespace Code Injection and save. Your blog will immediately return to its default Squarespace appearance. Your BetterBlog account, settings, analytics data, and leads are retained until you explicitly delete them.

To fully delete your account and data, contact the BetterBlog team from the Support tab in the dashboard.
