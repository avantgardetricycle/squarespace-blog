# Comments

BetterBlog comments replace the native Squarespace comment form on your posts. You moderate them from the **Comments** page in the dashboard. Settings can be changed there (they save immediately) or from **Customize Blog → Post → Comments** (saved with the rest of the customizer).

---

## Enabling comments

**Show Comments** is the master switch.

- **On** — BetterBlog shows the comment section on posts and hides Squarespace’s native comment form.
- **Off** — Both BetterBlog comments and native Squarespace comment blocks are hidden.

When Show Comments is on, these options appear:

**Allow New Comments** — When off, readers cannot submit new comments; existing comments can still display.

**Allow Anonymous Comments** — Readers can comment with a name only (email optional unless subscriber verification is on). Helper text: “Readers can comment with name only.” When this is off, guests see a message to sign in with a site member account.

**Verify subscriber comments** — For paywalled posts, require an email and check it against your Squarespace member list. Disabled until a Squarespace API key is connected.

**Require Approval Before Publishing** — New comments wait in **Awaiting Review** until you approve them.

**Close Comments After** — **Never** (0) or 1–365 days after the post’s publish date. Closed posts show “Comments are closed.”

**Email me new comments** — Sends a notification to your BetterBlog account email.

**Allow Threaded Replies** — Replies nest up to 4 levels.

**Allow Comment Likes** — Readers can like BetterBlog comments (not imported Squarespace comments).

**Default Sort** — Newest First, Oldest First, or Most Liked.

If you have more than one blog, use **Select blog** at the top of the Comments page.

---

## Anonymous vs verified subscriber comments

**Anonymous** — Name-only comments when **Allow Anonymous Comments** is on. In the dashboard these show an **Anonymous** badge.

**Authenticated (member)** — The commenter’s email matched a Squarespace member via the Profiles API. These show an **Authenticated** badge and a checkmark (✓) on the live blog. Authenticated names may link to the Squarespace member profile.

On paywalled posts, logged-out readers do not see the comment section unless the post is a public preview. Verification looks up the email in your member list — if the email is not found and anonymous comments are allowed, the comment is stored as a guest. That is expected, not an error.

---

## Connecting your Squarespace API key

Verified subscriber comments need a Squarespace API key with **Profiles (Read)** permission.

1. In Squarespace, go to **Settings → Developer Tools → Developer API Keys** (or **Settings → Advanced → Developer API Keys**).
2. Create a key with **Profiles (Read)**, or paste an existing key that already has that permission. Permissions cannot be edited after creation — if Profiles (Read) is missing, delete the key and create a new one.
3. In BetterBlog, open **Connect Squarespace API key** from the Comments page or Customize Blog → Post → Comments.
4. Paste the key, click **Verify**, then **Connect**.

On a successful first connect, **Verify subscriber comments** is turned on automatically. The key is shared across blogs on the same Squarespace hostname.

If Squarespace rejects the key, the dashboard shows a warning to update it. Common causes: the site’s Squarespace plan dropped below the API requirement (Business or higher for Profiles), the key was deleted, or Profiles (Read) was never granted. See [Known Squarespace Behaviors](known-squarespace-behaviors.md) and [Troubleshooting](troubleshooting.md).

---

## Moderation dashboard

Open **Comments** in the sidebar. Stats show **Published**, **Awaiting Review**, **Hidden**, and **Spam**.

Filter by **Status**, **Audience** (All comments, Authenticated (member), Anonymous / guest), and **Post**. Search with **Search comments…**.

Per-comment actions:

- **Approve** — Publish a comment awaiting review
- **Hide** / **Unhide** — Hide from the live blog, or publish a hidden comment
- **Mark as Spam** / **Publish** from spam
- **Delete** — Permanent removal (cannot be undone)
- **Reply** — Post a reply as the site owner from the dashboard

You can select multiple comments for bulk Approve, Hide, Mark as Spam, or Delete (20 comments per page).

Notification emails include one-click **Approve**, **Mark as spam**, **Hide**, and **View in Dashboard** links.

---

## Email notifications

When **Email me new comments** is on, new comments send mail to your account email. Pending comments include review actions; published comments include spam/hide/view actions. Manage the toggle in Comment Settings.

---

## Auto-closing comments

**Close Comments After** uses the post’s Squarespace publish date. If comments appear closed and you did not mean to set a window, set the slider to **Never**. After the window passes, no comments display on that post — including ones you already approved.

---

## Existing Squarespace comments

BetterBlog hides the native Squarespace comment form. Approved Squarespace comments are fetched and shown in the same thread as new BetterBlog comments, sorted by your **Default Sort**. New submissions go to BetterBlog only. Imported Squarespace comments cannot be liked. When **Show Comments** is off, both systems are hidden.

---

## Comments are not showing

1. Confirm **Show Comments** is on (Customize Blog → Post → Comments, or the Comments page).
2. Confirm BetterBlog is running on the post (browser console initialization message).
3. On paywalled posts, comments are hidden for logged-out readers unless the post is a public preview.
4. If you approved a comment and it still does not appear, hard-refresh the post and check **Close Comments After**.
