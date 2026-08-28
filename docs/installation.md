# Installation

Installing BetterBlog requires pasting one snippet into your Squarespace site. This is the only time you'll need to touch Squarespace — everything else is managed from the BetterBlog dashboard.

---

## Before you start

Make sure you have:

- A BetterBlog account with an active subscription or trial
- A Squarespace site on the **Core plan or higher** (code injection is not available on lower plans)
- A **Squarespace 7.1** site (7.0 is not supported)
- At least one blog page added to your Squarespace site
- Editor or Administrator access to your Squarespace site

---

## Step 1 — Add your blog in BetterBlog

If you haven't added a blog yet, start here. If you've already added your blog and just need the snippet, skip to Step 2.

From the BetterBlog dashboard, click **+ Add Blog**.

Fill in the three fields:

**Blog Name** — a label for your own reference, like "My Travel Blog". This is only shown in the BetterBlog dashboard and doesn't appear anywhere on your site.

**Blog URL** — the full URL of your Squarespace blog collection page, for example `https://yoursite.squarespace.com/blog`. Include `https://` and the full path to the blog page, not just your domain.

**Does this blog require a membership to view posts?** — select Yes if your blog is gated by a Squarespace pricing plan, No if it's publicly accessible. This controls how BetterBlog handles logged-out readers. You can change this later if your setup changes.

Click **Add Blog** to continue.

> **Adding multiple blogs on the same Squarespace site?** You can add them one at a time. All blogs on the same domain share a single installation snippet — you won't need to update the snippet when you add a second blog to the same site.

---

## Step 2 — Get your installation snippet

From the BetterBlog dashboard, find the Squarespace domain that contains your blog. Each domain has its own **Installation instructions** button on the right side of the domain row.

Click **Installation instructions**. A modal will appear showing:

- Which blogs on that domain the snippet covers
- The complete snippet code
- A **Copy Code** button

Click **Copy Code** to copy the full snippet to your clipboard.

> **One snippet per Squarespace site.** A single snippet covers every BetterBlog blog on that domain. If you have two blogs at `yoursite.com/blog` and `yoursite.com/journal`, one snippet handles both.

---

## Step 3 — Paste the snippet into Squarespace

1. Log in to Squarespace
2. Go to **Settings → Advanced → Code Injection**
3. Click into the **Header** field
4. Paste the snippet

**If BetterBlog is already installed on this site:** replace the existing BetterBlog block entirely with the new snippet. Do not paste a second copy alongside the old one — this will cause conflicts. The dashboard's Installation instructions modal reminds you of this if it detects an existing install.

5. Click **Save**

That's it on the Squarespace side. You won't need to return to Code Injection unless you're updating or removing BetterBlog.

---

## Step 4 — Confirm the snippet is working

When you added your blog, BetterBlog verified that your URL points to a real Squarespace blog — that's what the **Verified** badge on the dashboard row means. But Verified only confirms the URL, not that the snippet is installed and running.

To confirm the snippet is actually working, open your blog in a new browser tab. You should see your blog rendered with the BetterBlog layout. If you've just installed and haven't customized anything yet, the visual difference may be subtle — the default template (The Showcase for collection pages, The Feature for post pages) is applied automatically.

If you're not sure whether BetterBlog is active, open your browser's developer tools (right-click → Inspect → Console). BetterBlog logs a confirmation message to the console when it initializes successfully.

---

## Adding more blogs

To add another blog to your BetterBlog account, click **+ Add Blog** from the dashboard and repeat the process above.

**Adding a blog on the same Squarespace domain:** BetterBlog will detect that a snippet is already installed for that domain and remind you that no snippet update is needed. The existing snippet automatically covers the new blog.

**Adding a blog on a different Squarespace domain:** You'll need to install a separate snippet on that site. Each Squarespace site has its own Code Injection field and requires its own snippet.

Your plan determines how many blogs you can connect in total — 1 for Essentials, 3 for Professional, unlimited for Publication. The dashboard shows your current usage (e.g. "2 of 3 blogs on your Professional plan").

---

## Editing a blog

To change a blog's name, URL, or membership setting, click the pencil icon on the blog row in the dashboard. 

Note that the Blog URL field may be read-only after initial setup. If you need to change the URL of a blog (for example, if you've moved your blog to a different path in Squarespace), contact the BetterBlog team from the Support tab.

---

## Removing a blog

To remove a blog from BetterBlog, click the trash icon on the blog row and confirm. Removing a blog from BetterBlog does not delete anything in Squarespace — your posts, content, and Squarespace settings are untouched.

After removing a blog, its customization settings, analytics history, and leads data are retained for 30 days before being permanently deleted, in case you want to restore it.

To restore a removed blog, click **+ Add Blog** and enter the same URL. BetterBlog will detect the previous blog and offer to restore it, preserving your settings and data, rather than starting fresh.

---

## Removing BetterBlog from Squarespace

To fully remove BetterBlog from your Squarespace site, delete the snippet from Settings → Advanced → Code Injection → Header and save. Your blog will immediately return to its default Squarespace appearance.

If you have multiple blogs on that site, removing the snippet removes BetterBlog from all of them at once — the snippet covers all blogs on the domain.

---

## Troubleshooting

**I got a "We couldn't reach your blog" error when adding my blog.**
BetterBlog checks that your URL points to a valid Squarespace blog when you click Add Blog. Double-check that the URL is the full path to your blog collection page (including `https://`), that the page is published in Squarespace, and that it's publicly accessible. Private or password-protected pages cannot be verified. If the URL looks correct, try opening it in a browser tab first to confirm it loads.

**I pasted the snippet but my blog looks the same.**
A few things to check: confirm the snippet was pasted into the **Header** field (not Footer) in Code Injection, and that you clicked Save in Squarespace after pasting. Then open your blog in a fresh browser tab (force-refresh with Cmd+Shift+R / Ctrl+Shift+R to bypass cache). If it still looks unchanged, open the browser console and look for any BetterBlog-related errors.

**I see a blank page or loading spinner that doesn't go away.**
BetterBlog includes a safety timeout — if the script fails to load within about 10 seconds, the loading overlay is automatically removed and your native Squarespace blog becomes visible. If you're seeing a persistent blank page beyond that, check that the snippet was pasted in full without any characters missing, and that your Squarespace plan supports Code Injection.

**I have two copies of the snippet in Code Injection.**
Remove both, then paste a fresh copy from the Installation instructions modal. Having duplicate snippets will cause conflicts.

**BetterBlog isn't loading in the Squarespace editor.**
This is expected. BetterBlog intentionally does not activate inside the Squarespace editing interface — it only runs on your live published blog. Use BetterBlog's own live preview in the dashboard customizer to see how your changes look.
