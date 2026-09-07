# Analytics

The **Analytics** page tracks performance on the blog pages where BetterBlog is installed. Open Analytics in the dashboard sidebar. If you have more than one blog, use **Select blog**.

Tracking starts when the BetterBlog snippet is running on the live collection and post pages. Homepage, About, and other non-blog pages are not included.

---

## Time range

The dropdown applies to every metric, chart, per-post table, and Leads & Subscribers:

- **Last 7 days**
- **Last 30 days** (default)
- **Last 90 days**
- **Last 12 months**

Percent-change badges on Total Page Views compare the selected range to the previous period of the same length.

---

## Key metrics

**Total Page Views** — Count of page-view events on BetterBlog collection and post pages in the range.

**Unique Visitors** — Distinct visitor IDs among those page views.

**Avg. Time on Page** — Average time readers spent on the page, recorded when they leave or hide the tab. Shown as `M:SS`. Shows **—** when there are no page views.

**Avg. Read Percent** — How far readers typically scroll through a post. For each reader session on a post, BetterBlog stores the deepest scroll reached (25%, 50%, 75%, or 100% of the post body). Avg. Read Percent is the average of those depths, rounded to a whole percent. It measures scroll depth, not time. Shows **—** when there are no page views.

Very short visits often land in the 0–25% bucket. A reader who stays a long time but does not scroll still has a low read percent.

---

## Per-Post Analytics

Each row shows title, author, posted date, views, average time, and read percent.

**Sort by:** Views (high → low), Date posted (newest first), Read % (high → low), or Avg. read time (high → low).

**Show:** 5, 10, 25, 50, 100, or All posts. Metrics always match the dashboard time range.

---

## Click Tracking

Lists overlay elements readers click most (top 8), with click count and CTR (clicks ÷ total page views).

Elements include TOC links, breadcrumb navigation, related posts, author bio links, social share buttons (X, Facebook, LinkedIn, and others), category tags, newsletter CTA, recent posts, post title, featured hero, popular posts, and previous/next article.

---

## Read Percent Distribution

A breakdown of sessions by deepest scroll:

- 0–25%
- 26–50%
- 51–75%
- 76–100%

---

## Search Analytics

If Search Posts is enabled on the collection, this table shows **Search Term**, **Searches**, **Clicks** (clicks on a result), and **CTR**. Top 10 terms by search volume.

---

## Per-Author Analytics

Columns: **Author**, **Posts**, **Total Views**, **Avg. Read %**, **Avg. Time**, **Engagement**. Authors come from your BetterBlog author settings (defaults and per-post overrides). Co-authored posts count toward each listed author.

---

## Connecting Google Analytics

The **Google Analytics Integration** card forwards selected BetterBlog events to your GA4 property. It does **not** import Google Analytics data into the BetterBlog dashboard. Traffic Sources, Top Referrers, and New vs. Returning Visitors are viewed in GA itself.

1. Click **Connect Google Analytics**.
2. Enter your GA4 **Measurement ID** (`G-XXXXXXXXXX`) from GA4 Admin → Data Streams → your web stream.
3. Choose metrics to forward: **Traffic Sources**, **Top Referrers**, **New vs. Returning Visitors**.
4. Click **Connect**.

Use **Edit** to change the ID or metrics, or **Disconnect** to stop forwarding.

If the card says connected but the BetterBlog charts are empty, the snippet may not be collecting BetterBlog’s own events yet. See [Troubleshooting](troubleshooting.md).

---

## Leads & Subscribers

**Leads & Subscribers** lists newsletter and lead-magnet signups from Email Capture and Lead Magnet modules.

Summary counts: newsletter, lead magnet, and total. The table shows Email, Name, Type, Resource, and Date (up to 20 rows on the page).

**Download CSV** exports the full list with columns `email`, `name`, `type`, `resourceTitle`, and `createdAt`. Filename: `leads-{siteKey}-{date}.csv`.

Empty state: add Email Capture or Lead Magnet modules in Customize Blog to start collecting. See [Collection Settings](collection-settings.md) and [Post Settings](post-settings.md).

---

## Analytics are not tracking

1. Confirm the snippet is in Squarespace **Code Injection → Header** and the live blog shows the BetterBlog layout.
2. Only collection and post pages are tracked.
3. Test in a private window — some dashboard sessions may not look like a typical reader visit.
4. Allow time after install; there is no data until readers load the overlay.
