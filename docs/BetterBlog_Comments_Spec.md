# BetterBlog Comments — Technical Specification
**Version:** 1.0 — MVP  
**Status:** Draft  
**Authors:** BetterBlog Team

---

## 1. Overview

This document specifies the design and implementation of comment support for BetterBlog's Squarespace overlay plugin. BetterBlog preserves Squarespace's existing comments in a read-only display above the BetterBlog comment section, and owns all new comments in its own database layer. The implementation covers the reader-facing comment UI, the blogger settings panel, and the moderation dashboard.

---

## 2. Scope & Decisions

| Decision | Resolution |
|---|---|
| Squarespace native comments | **Preserved read-only** above BetterBlog comments. Native comment form suppressed via CSS; existing comments displayed in a distinct "Earlier comments" block. New comments go to BetterBlog only. |
| Non-paywalled commenting | Anonymous guest — name required, email optional. Matches Squarespace's native behavior. |
| Paywalled commenting | Email required when **Verify subscriber comments** is on. Verified against Squarespace Profiles API if API key is configured. Failure handling depends on whether anonymous comments are also enabled (see §5.3). |
| Email verification failure | Shown in a modal. If anonymous comments are off, the comment is rejected. If anonymous comments are on, the reader must confirm posting as a guest — no silent fallback. |
| Notifications | **Email only** (matches Squarespace). No dashboard badge. |
| Dashboard replies | Replies written in the dashboard appear **publicly on the blog**. |
| Cookie expiry / new device | **Prompt for email again** (re-verify). No silent fallback. |
| Advanced moderation (blocklist, email ban) | **Deferred to V2.** |

---

## 3. Data Model

### 3.1 `comments` Table

```sql
CREATE TABLE comments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blog_id             UUID NOT NULL REFERENCES blogs(id),
  post_id             UUID NOT NULL REFERENCES posts(id),
  parent_id           UUID REFERENCES comments(id),   -- for threaded replies

  -- Identity
  display_name        TEXT NOT NULL,
  email               TEXT,                           -- optional for anonymous; stored but never shown publicly
  verified_subscriber BOOLEAN NOT NULL DEFAULT FALSE,
  squarespace_profile_id TEXT,                        -- populated on successful Profiles API lookup

  -- Content
  body                TEXT NOT NULL,

  -- Status
  status              TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'spam', 'deleted')),
  auto_approved       BOOLEAN NOT NULL DEFAULT FALSE,

  -- Metadata
  ip_address          INET,
  user_agent          TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_comments_post_id ON comments(post_id);
CREATE INDEX idx_comments_status ON comments(status);
CREATE INDEX idx_comments_created_at ON comments(created_at);
```

### 3.2 `blog_comment_settings` Table

```sql
CREATE TABLE blog_comment_settings (
  blog_id                    UUID PRIMARY KEY REFERENCES blogs(id),

  -- Master toggle
  comments_enabled           BOOLEAN NOT NULL DEFAULT TRUE,

  -- Anonymous commenting
  allow_anonymous_comments   BOOLEAN NOT NULL DEFAULT TRUE,

  -- Paywalled subscriber verification
  subscriber_comments_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  squarespace_api_key_enc    TEXT,                    -- AES-256 encrypted at rest; never returned to client

  -- Moderation
  require_approval           BOOLEAN NOT NULL DEFAULT FALSE,
  auto_close_after_days      INTEGER,                 -- NULL = never close

  -- Notifications
  notify_email               BOOLEAN NOT NULL DEFAULT TRUE,
  notification_email         TEXT,                    -- defaults to blogger account email if null

  -- Display
  allow_likes                BOOLEAN NOT NULL DEFAULT TRUE,
  allow_threaded_replies     BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order                 TEXT NOT NULL DEFAULT 'newest' CHECK (sort_order IN ('newest', 'oldest', 'most_liked')),

  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 3.3 `comment_likes` Table

```sql
CREATE TABLE comment_likes (
  comment_id   UUID NOT NULL REFERENCES comments(id),
  fingerprint  TEXT NOT NULL,     -- hashed IP + user-agent; no account required
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (comment_id, fingerprint)
);
```

### 3.4 Legacy Comment Handling

Squarespace native comments are preserved and rendered read-only directly from Squarespace's own HTML — BetterBlog does not scrape or re-store them. The `legacy_comments` table is therefore **not required for MVP**. BetterBlog manipulates the existing DOM to label and visually distinguish the native comment block (see §9.3).

This approach means:
- No scraping or migration pipeline is needed at install time
- Legacy comments continue to be served by Squarespace's own rendering
- If a blogger later migrates off Squarespace entirely (V3), a scrape-and-import pipeline can be built at that point using the existing Squarespace HTML as source

> **MVP scope:** Legacy comments are display-only via DOM manipulation. The `legacy_comments` table is deferred to V3 migration tooling.

---

## 4. Blogger Settings Panel

Settings are located in the BetterBlog customizer under **Post Settings → Comments**.

### 4.1 Settings UI Specification

```
┌─────────────────────────────────────────────────┐
│  COMMENTS                                        │
├─────────────────────────────────────────────────┤
│  Enable Comments                    [●  ON ]     │
├─────────────────────────────────────────────────┤
│  READER PERMISSIONS                              │
│                                                  │
│  Allow Anonymous Comments           [●  ON ]     │
│  Readers can comment with name only.             │
│                                                  │
│  Verified Subscriber Comments       [○  OFF]     │
│  Require email for paywalled posts,              │
│  verified against your Squarespace              │
│  member list.                                    │
│                                                  │
│  ┌─ Squarespace API Key ──────────────────────┐  │
│  │  Settings → Advanced → Developer API Keys  │  │
│  │  Required permissions: Profiles (Read)     │  │
│  │  [●●●●●●●●●●●●●●●●●●●●●●●●●●●] [Verify]  │  │
│  └────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────┤
│  MODERATION                                      │
│                                                  │
│  Require Approval Before Publishing [○  OFF]     │
│                                                  │
│  Close Comments After                            │
│  [──●────────────────────] 30 days              │
│   Never              365 days                    │
│  (drag to Never to disable)                      │
├─────────────────────────────────────────────────┤
│  NOTIFICATIONS                                   │
│                                                  │
│  Email me new comments              [●  ON ]     │
│  Notify address: [me@example.com         ]       │
├─────────────────────────────────────────────────┤
│  DISPLAY                                         │
│                                                  │
│  Allow Comment Likes                [●  ON ]     │
│  Allow Threaded Replies             [●  ON ]     │
│  Default Sort  [Newest First      ▾]             │
└─────────────────────────────────────────────────┘
```

### 4.2 API Key Validation

When the blogger enters or updates their Squarespace API key, BetterBlog immediately calls the Squarespace `/1.0/authorization/website` endpoint server-side to verify the key is valid and the Profiles permission is granted.

**Validation states shown in UI:**
- `UNVERIFIED` — key not yet entered
- `VERIFYING…` — spinner during check
- `VERIFIED ✓` — key valid, Profiles permission confirmed
- `INVALID KEY ✗` — key rejected by Squarespace
- `MISSING PERMISSION ✗` — key valid but Profiles Read not enabled; show specific message

The API key is **never transmitted to the client** after being saved. The UI shows only a masked token (e.g., `sk-••••••••••••••••A3F2`) after initial entry.

### 4.3 Settings Validation Rules

- `subscriber_comments_enabled` cannot be `TRUE` unless a verified API key is stored.
- `auto_close_after_days` accepts `NULL` (never) or an integer between 1 and 365.
- `allow_anonymous_comments` and `subscriber_comments_enabled` are independent toggles and can be on simultaneously. When both are on, logged-in readers can verify as a member or explicitly choose to comment anonymously. When verification is on and anonymous is off, logged-out readers see comments but not the comment form.

---

## 5. Reader-Facing Comment UI

### 5.1 Rendering Logic

The overlay script partially modifies Squarespace's native comment section rather than fully replacing it. The native comment input form is hidden; existing displayed comments are preserved in-place with a "Earlier comments" label and visual distinction. BetterBlog's own `<div id="bb-comments">` is injected immediately after the native block, containing the new comment form and all BetterBlog-owned comments.

Full DOM manipulation detail is specified in §9.3.

### 5.2 Non-Paywalled Posts — Anonymous Commenting

Displayed when `allow_anonymous_comments = TRUE` and the post is not paywalled.

**Comment form fields:**
| Field | Required | Notes |
|---|---|---|
| Name | Yes | Max 100 chars |
| Comment | Yes | Max 5,000 chars. Plain text only for MVP. |
| Email | No | If provided, stored but never shown publicly |

**Spam protection:** hCaptcha invisible challenge on every submission.

**On submit:**
1. Client sends `POST /api/comments` with `{ post_id, display_name, email?, body, hcaptcha_token }`.
2. Server verifies hCaptcha token.
3. If `require_approval = FALSE` → status set to `approved`, comment appears immediately.
4. If `require_approval = TRUE` → status set to `pending`, "Your comment is awaiting moderation" shown to reader.
5. Notification triggered if configured (§7).

### 5.3 Subscriber Verification Flow

Displayed when `subscriber_comments_enabled = TRUE`. The overlay detects authenticated state via Squarespace's DOM (presence of `.auth` class / absence of `.unauth` class on the body).

On paywalled posts that are not a public preview, logged-out readers still do not see the comment section at all. The form rules below apply when the comment section is shown.

**Verified comments on, anonymous comments off**

| Reader state | UI |
|---|---|
| Not logged in | Comment list is visible. The comment form is hidden. |
| Logged in | Comment form is shown (body only). On submit, a **Confirm your email** modal collects the member email. |

**On submit — server-side flow (anonymous off):**

```
1. Verify hCaptcha token
2. Call Squarespace Profiles API:
   GET https://api.squarespace.com/1.0/profiles?filter=email,{email}
   Authorization: Bearer {blogger_api_key}

3a. Profile found:
    - Set verified_subscriber = TRUE
    - Store squarespace_profile_id
    - Use firstName from profile as display_name if reader left name blank
    - Set verification cookie (§5.4)
    - Store and process comment normally

3b. Profile not found OR API key not configured OR Profiles API error:
    - Do not create the comment
    - Return 400 { code: "verification_failed", error: "We could not verify a member account…" }
    - Overlay shows the error in a modal (not inline under the comment box)
```

**Verified comments on, anonymous comments on**

| Reader state | UI |
|---|---|
| Not logged in | Comment form is shown with name and optional email. Guests may post without signing in. |
| Logged in | Comment form is shown (body only). On submit, a **Confirm your email** modal collects the member email and also offers **Comment anonymously**. |

**On submit — server-side flow (anonymous on):**

```
1. Verify hCaptcha token
2. If the client sent post_as_anonymous = true (reader chose anonymous in a modal):
    - Skip Profiles lookup
    - Store as unverified guest (display_name "Anonymous" if blank)
3. Otherwise call Squarespace Profiles API as above

3a. Profile found:
    - Same as verified-only 3a (comment posts as verified)

3b. Profile not found OR Profiles API error:
    - Do not create the comment
    - Return 400 { code: "verification_failed_anonymous_available", error: "…Would you like to post this comment anonymously?" }
    - Overlay shows a confirmation modal. If the reader confirms, the client resubmits with post_as_anonymous = true
```

If a valid verification cookie exists (§5.4), the email modal is skipped and the stored email is sent automatically.

### 5.4 Verification Cookie

On successful subscriber verification:

```
Name:    bb_verified_sub_{blog_id}
Value:   {base64-encoded JSON: { email, display_name, profile_id, verified_at }}
Expiry:  30 days
Flags:   SameSite=Strict; Secure; HttpOnly=false (must be readable by overlay JS)
Scope:   Set on the Squarespace domain
```

> **Security note:** The cookie contains no sensitive credentials — only display metadata. The actual verification always happens server-side. The cookie is purely a UX convenience to avoid re-entering email on repeat visits.

**On new device or after cookie expiry:** Reader is prompted to enter email again. No silent fallback to anonymous. The form shows the standard paywalled comment form from scratch.

### 5.5 Comment Display

Comments are rendered below the comment form, sorted per the blogger's `sort_order` setting.

**Per-comment display:**
```
[Avatar initials]  Display Name          [verified subscriber badge if applicable]
                   Comment body text
                   2 hours ago · 👍 3 · Reply
```

- Avatars are generated from initials only (no Gravatar or external calls for MVP).
- Verified subscriber badge: small checkmark icon with tooltip "Verified subscriber".
- Like button: increments a count, keyed by fingerprint (hashed IP + user-agent). No account required.
- Reply link: shows inline reply form. Replies are threaded one level deep only — replies to replies are appended flat under the parent.
- Timestamps: relative ("2 hours ago") for recent, absolute date for comments older than 7 days.

**Comment states visible to readers:**
- `approved` — visible normally
- `pending` — visible only to the commenter in their current session (shown with "Awaiting moderation" label)
- `spam` / `deleted` — not rendered

---

## 6. API Endpoints

All endpoints require the BetterBlog overlay script's site token for authentication. Moderation endpoints require blogger session auth.

### 6.1 Public Endpoints (Reader-Facing)

#### `GET /api/comments`
Returns approved comments for a post.

**Query params:** `post_id` (required), `page` (default 1), `per_page` (default 20)

**Response:**
```json
{
  "comments": [
    {
      "id": "uuid",
      "display_name": "Sarah",
      "verified_subscriber": true,
      "body": "Great post!",
      "like_count": 3,
      "created_at": "2026-03-10T14:22:00Z",
      "replies": [ /* same shape, max 1 level deep */ ]
    }
  ],
  "total": 42,
  "page": 1
}
```

> Note: `email`, `ip_address`, `squarespace_profile_id` are never returned in this response.

#### `POST /api/comments`
Submit a new comment.

**Request body:**
```json
{
  "post_id": "uuid",
  "display_name": "Sarah",
  "email": "sarah@example.com",
  "body": "Great post!",
  "parent_id": null,
  "hcaptcha_token": "...",
  "verification_cookie_token": "...",
  "post_as_anonymous": false,
  "anonymous_retry_token": "..."
}
```

`post_as_anonymous` is sent when the reader confirms posting as a guest after a failed verification, or chooses **Comment anonymously** in the email modal. `anonymous_retry_token` is a one-time token from the `verification_failed_anonymous_available` error so the confirmation POST can skip a second captcha.

**Response:** `201 Created` with the comment object (status will be `pending` or `approved` depending on settings).

**Verification errors:**
- `400 { code: "verification_failed" }` — email not found and anonymous comments are off. Overlay shows a modal.
- `400 { code: "verification_failed_anonymous_available", anonymous_retry_token }` — email not found and anonymous comments are on. Overlay asks the reader to confirm posting as a guest.

#### `POST /api/comments/:id/like`
Toggle a like on a comment. Keyed by fingerprint server-side.

**Response:** `{ "like_count": 4, "liked": true }`

### 6.2 Blogger Endpoints (Dashboard)

All require authenticated blogger session.

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/dashboard/comments` | List comments with status filter (`pending`, `approved`, `spam`) and pagination |
| `PATCH` | `/api/dashboard/comments/:id` | Update status (`approved`, `spam`, `deleted`) or body |
| `POST` | `/api/dashboard/comments/:id/reply` | Post a public reply as the blogger |
| `GET` | `/api/dashboard/comments/count` | Returns `{ pending: N }` for dashboard badge |
| `GET` | `/api/dashboard/settings/comments` | Get comment settings for blog |
| `PUT` | `/api/dashboard/settings/comments` | Update comment settings |
| `POST` | `/api/dashboard/settings/comments/verify-api-key` | Validate a Squarespace API key server-side |

---

## 7. Notification System

### 7.1 Triggers

A notification email is dispatched when:
- A new comment is submitted to any post on the blog (regardless of approval status)
- A comment is approved after being pending (if blogger has approval required on)

BetterBlog sends email only. There is no in-dashboard badge for MVP.

### 7.2 Email Notification

Sent to `notification_email` (or blogger account email if unset) when `notify_email = TRUE`.

**Email content:**
```
Subject: New comment on "[Post Title]"

[Display Name] commented on your post "[Post Title]":

  "[First 200 chars of comment body]…"

[Approve Comment]   [View in Dashboard]   [Mark as Spam]

---
Manage your notification preferences in BetterBlog Settings.
```

Action links are signed, time-limited tokens (expire after 72 hours) that perform the action server-side without requiring dashboard login. This matches the workflow convenience of Squarespace's native email moderation.

---

## 8. Moderation Dashboard

Located at **BetterBlog Dashboard → Comments**.

### 8.1 Queue Views

Three tabs mirror Squarespace's structure:

| Tab | Shows |
|---|---|
| **Pending** | Comments with `status = pending`. Default view. |
| **Approved** | Comments with `status = approved`. |
| **Spam** | Comments with `status = spam`. |

### 8.2 Per-Comment Actions

| Action | Available in Pending | Available in Approved | Available in Spam |
|---|---|---|---|
| Approve | ✅ | — | ✅ |
| Reply (public) | ✅ | ✅ | — |
| Mark as Spam | ✅ | ✅ | — |
| Delete | ✅ | ✅ | ✅ |
| View post | ✅ | ✅ | ✅ |

**Reply behavior:** Blogger replies are stored as a `comments` row with `parent_id` pointing to the original comment, `display_name` set to the blog's display name (configurable), and `verified_subscriber = FALSE`. They are always auto-approved regardless of the `require_approval` setting.

### 8.3 Comment Metadata Shown in Dashboard

Bloggers see the following per comment (more than is shown publicly):
- Display name
- Email (if provided) — shown in full, only in dashboard
- Verified subscriber badge if applicable
- Squarespace profile link if `squarespace_profile_id` is populated
- IP address (for spam pattern identification)
- Timestamp
- Post title and link

### 8.4 Filtering and Search

For MVP, the dashboard supports:
- Filter by post (dropdown)
- Filter by date range
- Filter by verified/anonymous
- Text search across display name and comment body

---

## 9. Squarespace DOM Integration

### 9.1 Paywall Detection

BetterBlog detects whether a post is paywalled by checking for Squarespace's paywall gate element in the DOM:

```javascript
const isPaywalled = !!document.querySelector(
  '.sqs-member-area-gate, [data-controller="MemberAreaGate"], .members-only-gate'
);
```

> **Note:** These selectors reflect current Squarespace markup. They must be treated as fragile and monitored for changes with each Squarespace update. BetterBlog should include an override in the blogger settings to force paywall mode on or off for a specific blog if auto-detection fails.

### 9.2 Auth State Detection

BetterBlog detects whether a reader is logged into Squarespace using a MutationObserver on the `<body>`:

```javascript
function getAuthState() {
  // Squarespace renders either .auth or .unauth sibling within
  // the member panel container depending on login state
  const unauth = document.querySelector('.user-accounts-panel .unauth');
  const auth   = document.querySelector('.user-accounts-panel .auth');
  if (auth && !unauth) return 'authenticated';
  if (unauth && !auth) return 'unauthenticated';
  return 'unknown'; // treat as unauthenticated
}

// Watch for login/logout during session
const observer = new MutationObserver(() => {
  updateCommentFormForAuthState(getAuthState());
});
observer.observe(document.body, { childList: true, subtree: true });
```

Auth state is checked on page load and whenever the observer fires. The comment form re-renders accordingly.

### 9.3 Native Comment Section Handling

BetterBlog does **not** fully suppress Squarespace's native comment section. Instead it takes a two-part approach:

**Part 1 — Suppress the native comment form only** (new comment submission UI):

```css
/* Hide Squarespace comment input form, not the displayed comments */
.squarespace-comments .comment-form,
.squarespace-comments .comment-form-wrapper,
[data-block-type="comments"] form,
.comment-count-link { display: none !important; }
```

**Part 2 — Wrap existing native comments in a read-only "Earlier comments" block:**

```javascript
const nativeComments = document.querySelector(
  '.squarespace-comments, [data-block-type="comments"]'
);

if (nativeComments && nativeComments.querySelectorAll('.comment').length > 0) {
  // Label the existing block as legacy
  const label = document.createElement('p');
  label.className = 'bb-legacy-label';
  label.textContent = 'Earlier comments';
  nativeComments.insertAdjacentElement('beforebegin', label);
  nativeComments.classList.add('bb-legacy-comments');
}
```

BetterBlog then injects its own comment container **after** the Squarespace comment block:

```javascript
const nativeBlock = document.querySelector(
  '.squarespace-comments, [data-block-type="comments"], .post-content'
);
if (nativeBlock) {
  const container = document.createElement('div');
  container.id = 'bb-comments';
  nativeBlock.insertAdjacentElement('afterend', container);
  initComments(container, { postId, blogId, settings });
}
```

The result is a single continuous comments experience on the page:

```
┌─────────────────────────────────────┐
│  Earlier comments                   │  ← Squarespace native block, read-only,
│  [legacy comment 1]                 │     form suppressed, visually distinct
│  [legacy comment 2]                 │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│  [BetterBlog comment 1]             │  ← BetterBlog-owned comments + form
│  [BetterBlog comment 2]             │
│                                     │
│  Leave a comment                    │
│  Name: [          ]                 │
│  [                    ]             │
│  [Post Comment]                     │
└─────────────────────────────────────┘
```

> **If a post has no Squarespace native comments**, the legacy block is hidden entirely. No empty "Earlier comments" heading is shown.

> **Styling note:** The `.bb-legacy-comments` class should apply a visual treatment (e.g., reduced opacity, subtle border, or muted label color) to clearly distinguish legacy read-only comments from new BetterBlog comments. Exact styling is at the blogger's theme discretion but a sensible default should be provided.

---

## 10. Auto-Close Logic

Comments are automatically closed based on `auto_close_after_days` relative to `posts.published_at`.

**Enforcement is dual-layer:**

1. **API layer:** `POST /api/comments` checks `(NOW() - post.published_at) > auto_close_after_days` and returns `403 { error: "comments_closed" }` if expired.
2. **UI layer:** The overlay script fetches comment settings and hides the comment form if the post is past its close window, replacing it with: *"Comments on this post are closed."*

`auto_close_after_days = NULL` means comments never auto-close.

---

## 11. Security Considerations

| Concern | Mitigation |
|---|---|
| API key exposure | Encrypted at rest (AES-256). Never returned in any API response. Masked in UI after entry. Used only server-side. |
| Spam | hCaptcha on every comment submission. Rate limiting: max 5 comments per IP per hour per blog. |
| XSS | Comment body stored as plain text. Rendered with `textContent`, not `innerHTML`. |
| CSRF | All `POST`/`PATCH` endpoints require `X-BetterBlog-Site-Token` header matching the installed script token. |
| Email enumeration | Profiles API lookup errors and "not found" responses return the same UI state to the reader — no signal about whether an email exists in Squarespace. |
| Cookie integrity | Verification cookie is opaque to the server — all verification happens via fresh Profiles API call on comment submit, not by trusting the cookie. Cookie is convenience-only. |

---

## 12. Edge Cases

| Scenario | Handling |
|---|---|
| Blogger disables comments globally mid-thread | Existing approved comments remain visible. Form is hidden. New submissions return `403`. |
| Squarespace API key is revoked after being saved | Profiles API call fails at comment submit time. Treat as verification failure (§5.3, step 3b). Surface a warning in the blogger dashboard: "Your Squarespace API key appears to be invalid." |
| Post has no Squarespace native comments | Legacy "Earlier comments" block is hidden entirely. No empty heading shown. BetterBlog comment section renders at normal position. |
| Reader submits comment on a post that just passed its close window (race condition) | API returns `403 comments_closed`. UI shows: "Comments on this post are now closed." |
| Threaded reply submitted to a deleted parent comment | Reply is stored but rendered flat (orphaned) with no parent reference shown. |
| Profiles API rate limit hit | Log server-side. Treat as verification failure (§5.3, step 3b). Do not surface the API error to the reader — they see the same verification modal as "not found". |
| `auto_close_after_days` changed after comments are already closed | Reopens or closes comments retroactively across all posts. This is intentional — the setting is blog-level, not per-post. |

---

## 13. Out of Scope for MVP

The following are explicitly deferred to V2:

- Word/phrase blocklist with auto-hold or auto-reject
- Commenter email blocking
- Community comment flagging (readers flagging each other's comments)
- Comment reactions beyond a single like
- Rich text / Markdown in comment bodies
- Squarespace legacy comment migration tooling (currently read-only display only)
- Comment RSS feed
- Commenter reply notifications ("notify me of replies")
- Bulk moderation actions in the dashboard

---

## 14. Open Questions

| # | Question | Owner | Due |
|---|---|---|---|
| 1 | Which Squarespace plan tier is required for Profiles API access? Confirm against a Basic-plan test site. | Eng | Before build |
| 2 | Confirm current DOM selectors for paywall detection and auth state are accurate across Squarespace 7.0 and 7.1 templates. | Eng | Before build |
| 3 | Decide on the blogger-facing display name used for dashboard replies (blog title vs. configurable name). | Product | Before build |
| 4 | Define exact hCaptcha site key management — one global key vs. per-blog key. | Eng | Before build |
