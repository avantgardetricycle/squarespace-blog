# Collection Settings

The Collection tab in **Customize Blog** controls how your blog index page looks — the page that lists your posts. Open Customize Blog, make sure **Collection** is selected at the top of the panel, then adjust the sections below. Click **Save** to apply changes to your live blog.

Settings a template owns are hidden from the panel. If a control you expect is missing, your current collection template is making that decision. See [Templates](templates.md) for what each template locks.

---

## Reader Experience

**Show Date** — Shows the publish date on each post card or row.

**Show Reading Time** — Shows an estimated reading time on each post.

**Show Post Excerpt** — Shows a short teaser under the title. This control is hidden on The Editorial and The Digest — those templates decide excerpt display as part of the layout.

**Show Author(s)** — Shows author name(s) on collection items. Turning this on also reveals author management (default authors and per-post overrides). See [Post Settings](post-settings.md) for adding and editing author profiles.

---

## Pagination

Pagination is always on for the collection page.

**Mode** — **Numbered pages** (1, 2, 3…) or **Load more** (a button that appends the next set of posts). The Masthead template locks this to its own pagination style.

**Posts per page** — 5, 10, or 20.

---

## Featured Article

Turn **Featured Article** on to give one post special treatment at the top of the collection.

**Currently featured** shows which post is featured and why: pinned in BetterBlog, marked featured in Squarespace, or the newest post in the current sort as a fallback.

**Featured post** — Choose **Automatic (Squarespace, else newest)** or pin a specific post.

**Position** — **Header (hero image with overlay)** or **In-layout (at top with indicator)**. Most templates lock position. Masthead always uses a header hero; Digest always uses in-layout.

---

## Featured Image

Controls how post images appear on collection cards. The whole section is locked on Masthead, Digest, Showcase, and Editorial — those templates own the image treatment.

When the section is available (for example on Newsroom):

- **Featured Image** on/off
- **Layout mode:** Full Bleed, Left Justified, or Right Justified
- **Image width** (justified layouts), **aspect behavior** (original ratio or cropped), **rounded corners**, **shadow**, **caption**, and **vertical spacing**

Several image-styling controls are locked on every template so the layout stays consistent.

---

## Header modules

**Header Content** is the bar above your post list. Use **Add module…** to place discovery controls:

- **Filter by Category**, **Filter by Tag**, or **Filter by Tags & Categories**
- **Search Posts**
- **Sort Posts**

Filters align left. Search and sort align right (search before sort when both are on). **Height** sets the header bar height (32–120px); some templates lock this.

Filter availability also depends on the **Filtering** section under Navigation & Discovery. Style follows position: header filters are pills; sidebar filters are topic badges.

---

## Sidebars

There is no separate “enable sidebar” toggle. A sidebar appears when you add modules to **Left Sidebar** or **Right Sidebar**.

When a sidebar is available:

- **Width** (160–400px)
- **Space above** (offset from the top)
- **Sticky (move with scroll)**
- **Module order** — drag to reorder; **Add module…** to place Filter, Search, Sort, Recent Posts, Popular Posts, Author Profiles, Email Capture, or Lead Magnet

Most collection templates lock one or both sidebars. If the sidebar section is missing, the template does not use that sidebar.

If a sticky sidebar overlaps your Squarespace site header, increase **Space above** or turn sticky off. See [Troubleshooting](troubleshooting.md).

---

## Footer modules

**Footer Content** sits below the post list.

- **Top padding** — spacing above the footer
- **Module order** — drag to reorder; remove a module to turn it off
- **Add module…** — **Email Capture** or **Lead Magnet**

Configure copy for those modules under Navigation & Discovery:

**Email Capture** — Location, **Section header**, optional **Section byline**, and **Button text**. Collects newsletter signups; leads appear on the Analytics page.

**Lead Magnet** — Location, **Resource title**, **Description**, and **Button text**. Collects signups for a downloadable resource.

Some templates only allow these modules in the footer (not in sidebars).

**Popular Posts** and **Recent Posts** are sidebar modules. Popular Posts uses view counts when sorting by popularity; otherwise it falls back to recent posts. The Popular Posts settings section is hidden on Masthead, Showcase, and Editorial.

---

## Filtering

**Filter by** — Categories, Tags, or both.

**Location** — Header, Left Sidebar, or Right Sidebar. Header-only templates (Masthead, Showcase, Editorial) do not offer sidebar filter locations. You cannot place a filter in a sidebar the template has locked.

---

## Paywall

Paywall copy is site-level, not a Collection-tab setting. If BetterBlog detects that the blog is membership-gated, a **Paywall Settings** button appears below **Clear all settings**. It opens a modal for subscribe URL, eyebrow, headline, description, and feature checklist. Those values apply to both collection and post views. See [Paywall & Membership](paywall-membership.md).

---

## Saving and preview

Changes apply when you click **Save**. The customizer preview updates as you edit; if the iframe cannot load (common on `.squarespace.com` domains), use **Check live site**. See [Troubleshooting](troubleshooting.md) and [Known Squarespace Behaviors](known-squarespace-behaviors.md).
