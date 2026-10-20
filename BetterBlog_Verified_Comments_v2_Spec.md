# BetterBlog Verified Comments v2 — Email OTP + Squarespace Login
**Version:** 2.0
**Status:** Ready for build
**Supersedes:** `BetterBlog_Comments_Spec.md` §5.3 (Subscriber Verification Flow), §5.4 (Verification Cookie), the verification rows of §6.1, and the settings rule in §4.3 that verification requires an API key. Everything else in that spec still applies.

---

## 0. Summary

Today a reader types an email, we look it up in the Squarespace Profiles API, and if it exists we post their comment with a verified badge. Anyone who knows a member's email can impersonate them. The verification cookie (`bb_verified_sub_{blog_id}`) is unsigned base64 JSON, so it can be forged too.

v2 replaces this with:

1. **Email ownership proof** — the reader enters their email, we send a 6-digit code, they enter it. On success the server issues an opaque **commenter session token** (30-day sliding expiry).
2. **Squarespace login check** — the overlay reports whether the reader is signed in to the Squarespace site, using the logged-in signal from the public Squarespace JSON. A verified comment requires a valid commenter session **and** a logged-in signal on every submit.
3. **Optional contact cross-check** — if the blogger has connected a Squarespace API key, the server also checks that the verified email exists in the site's member list. This is no longer required to turn verification on.

### Accepted risk (do not try to solve in this build)

The logged-in signal is reported by the browser. The server cannot check it. Someone scripting our API could claim to be logged in. They still have to pass the OTP for an email they control, so the worst case is **someone falsely claiming membership under their own verified email**. They cannot impersonate another person. Product has accepted this risk. Record the client's claim on each comment for auditing (§9).

---

## 1. Decisions baked into this spec

Defaults are chosen below; change them here if product disagrees.

| # | Decision | Default in this spec |
|---|---|---|
| D1 | Does verification require an API key? | **No.** The badge requires OTP session + logged-in signal. If a key is connected, the contact cross-check also applies. |
| D2 | Existing verified comments (earned under the old flow) | **Keep their badges.** No backfill. |
| D3 | Extra challenge on comment submit or code send | **None.** Spam control is the per-IP comment rate limit and the OTP send limits. |
| D4 | Profiles → Contacts API migration | **Out of scope.** Put the lookup behind an interface (§7.3) so the swap later touches one file. |
| D5 | Session scope | **Per Squarespace site** (the hostname that owns the snippet), not per blog. One verification works across all blogs on that site. This matches how the API key is already shared per hostname. |

---

## 2. Goals and non-goals

**Goals**
- A verified comment proves the commenter controls that email inbox.
- A verified comment requires the reader to be signed in to the Squarespace site, re-checked on every submit.
- Callers cannot learn from our responses whether an email is a member or contact (no email enumeration).
- Readers verify about once a month per browser, not per comment.
- The comment draft is never lost during verification.

**Non-goals**
- Proving paid membership on the server (no reliable Squarespace API for this; see accepted risk).
- Changing anonymous commenting, moderation, likes, threading, sorting, auto-close, notifications, or paywall rules, except where noted.

---

## 3. What the badge means

`verified_subscriber = TRUE` on a comment means, at submit time:
- the commenter held a valid, unrevoked commenter session for this site, created by entering a code sent to `comments.email`; **and**
- the overlay reported a Squarespace logged-in state; **and**
- if an API key was connected, the email matched a Squarespace site contact (exact, case-insensitive).

Reader-facing tooltip stays **"Verified subscriber"**. Dashboard badge stays **Authenticated**.

---

## 4. Reader flows

The settings and paywall rules for whether the comment section shows at all are unchanged. On paywalled posts, logged-out readers still see no comment section unless the post is a public preview.

### 4.1 Matrix

| Verify on? | Anonymous on? | Reader | Behavior |
|---|---|---|---|
| Off | On | Anyone | **Unchanged.** Anonymous session username, no OTP. Client sends `post_as_anonymous: true`. |
| Off | Off | Anyone | **Unchanged** from current behavior. Do not modify. |
| On | Off | Logged out | Comment list visible, form hidden, **Sign in to comment** link to the site's member login. **Unchanged.** |
| On | Off | Logged in | Verified flow (§4.2). |
| On | On | Logged out | Anonymous session username (unchanged), plus a **Sign in to comment as a member** link. Client sends `post_as_anonymous: true`. |
| On | On | Logged in | Verified flow (§4.2). The email modal also offers **Comment anonymously**. |

### 4.2 Verified flow (logged-in reader, verification on)

1. The reader writes a comment and clicks **Post Comment** (or **Post reply**). The client keeps the draft (body + `parent_id`) in memory.
2. **If the client has a stored commenter session token:** submit right away (§7). Skip to step 6.
3. **Otherwise open the Email modal:**
   - Title: "Confirm your email"
   - Fields:
     - **Email** (required). Prefilled from the Squarespace JSON if that source exposes the account email (§10.2).
     - **Name, shown with your comment** (required, max 100). Prefilled from the Squarespace JSON first name if exposed.
   - Primary button: **Send code**.
   - If anonymous comments are on, a secondary text button: **Comment anonymously**. This submits the draft with `post_as_anonymous: true`, using the existing anonymous path.
   - **Send code** calls `POST /api/comments/auth/start`.
4. **Code modal** (replaces the Email modal content):
   - Copy: "We sent a 6-digit code to **{email}**. It expires in 10 minutes."
   - One input: `inputmode="numeric"`, `autocomplete="one-time-code"`, `maxlength=6`. Accept pasted codes with spaces or dashes and strip non-digits. Auto-submit when 6 digits are entered.
   - **Resend code**, disabled for 30 seconds after each send, with a countdown.
   - **Use a different email** returns to step 3.
   - Errors render inline under the input (§8.2 codes):
     - `invalid_code` → "That code isn't right. Check the email and try again."
     - `code_expired` → "That code has expired. Send a new one."
     - `too_many_attempts` → "Too many tries. Send a new code."
5. **On successful verify:** store the token (§10.3), close the modal, and submit the saved draft automatically (§7).
6. **On comment success:** clear the draft, clear any inline verification message, and show the comment (or the "awaiting moderation" state as today).
7. **Signed-in line:** whenever a valid token is held, show above the submit button: `Commenting as {display_name} · Sign out`. **Sign out** calls `POST /api/comments/auth/logout` and clears local storage.

### 4.3 Failure handling on submit

Keep the existing visual treatment for persistent messages: a modal, plus the same message inline under the comment button in the site accent color, italic, `font-weight: 400`, 12px. The button stays visible, and the message stays until a comment posts.

| Server code | Client behavior |
|---|---|
| `commenter_auth_required` | Clear any stored token. Open the Email modal (step 3). No inline message. |
| `squarespace_login_required` | Modal: "Sign in to your account on this site to comment as a member." The modal has a **Sign in** link (member login URL, same as the existing sign-in link). If `anonymous_retry_token` is present, also offer **Post anonymously**. Keep the inline message. Keep the commenter session; once the reader signs in again, no new code is needed. |
| `verification_failed` (key connected, contact not found, anonymous off) | Modal plus inline: "We couldn't find a membership for {email}." Keep the session. The next click on the comment button opens the Email modal showing the current email, with **Use a different email** focused. |
| `verification_failed_anonymous_available` | Same as above, plus a confirmation modal: "Post this comment anonymously instead?" Confirming resubmits with `post_as_anonymous: true` and the `anonymous_retry_token`. Cancelling leaves the inline message. |
| `comments_closed`, rate limit, etc. | Unchanged. |

---

## 5. OTP rules

| Rule | Value |
|---|---|
| Code | 6 digits from a CSPRNG (`crypto.randomInt(0, 1_000_000)`, zero-padded). Never `Math.random`. |
| Storage | `HMAC-SHA256(COMMENTER_OTP_PEPPER, challengeId + ":" + code)`. Never store or log the plain code. |
| Expiry | 10 minutes from creation. |
| Attempts | Max 5 verify attempts per challenge. After the 5th wrong code, the challenge is dead (`too_many_attempts`). |
| Single use | Set `consumed_at` on success. A consumed challenge cannot verify again. |
| One live challenge | Creating a challenge for (site, email) invalidates earlier unconsumed challenges for that pair (set `consumed_at`). |
| Compare | Constant time (`crypto.timingSafeEqual`). |
| Email normalization | `trim().toLowerCase()`. Do not strip dots or `+tags`. |

### 5.1 Rate limits (enforced from Postgres; no in-memory counters on Vercel)

Count rows in `commenter_otp_challenges` within the window.

| Limit | Value |
|---|---|
| Sends per (site, email) | 3 per 15 min, 10 per 24 h |
| Sends per IP (all sites) | 10 per hour |
| Verify attempts per IP | 30 per hour (count failed attempts. Simplest option: an `otp_verify_failures` counter on the challenge, summed by IP in the window. Or a small `commenter_auth_events` table. Pick one; keep it in Postgres). |

### 5.2 No enumeration

- `POST /auth/start` returns **the same 202 body** whether or not the code was sent. The cases are: rate limited for that email, email invalid in a way that passes basic format checks, or a normal send.
  - Exception: malformed input (not an email at all) may return 400.
  - Exception: IP-level rate limiting may return 429, because it isn't tied to the email.
- Send the email **after** responding. Use `waitUntil` from `@vercel/functions` (or the existing background mechanism) so response timing doesn't reveal whether a send happened.
- Membership and contact status are never checked or revealed at `/auth/start` or `/auth/verify`. They are only checked at comment submit, after the reader has proven they own the email.

---

## 6. Commenter sessions

| Rule | Value |
|---|---|
| Token | 32 bytes from CSPRNG, base64url. Returned to the client **once** at verify. |
| Storage | `SHA-256(token)` in `commenter_sessions.token_hash` (unique). Never store or log the raw token. |
| Scope | One Squarespace site (D5). A token is rejected for any other site. |
| Expiry | 30 days, **sliding**. On any authenticated request, if `last_extended_at` is more than 24 h ago, set `expires_at = now + 30d`. Absolute cap: 180 days from `created_at`. |
| Revocation | `revoked_at` set by sign-out, a dashboard action (§12.2), or creating a new session for the same browser (client sends the old token to `/auth/verify` as `replaces_token`, if present). |
| Transport | `Authorization: Bearer <token>` header on API requests. **Not a cookie**: the API is cross-site from the blog, so third-party cookies are unreliable and we don't need CSRF protection for bearer tokens. |

---

## 7. Comment submission (server)

### 7.1 Request changes — `POST /api/comments`

Add the following:

```json
{
  "squarespace_logged_in": true
}
```

The client sends `post_as_anonymous: true` for **every** anonymous submission, including logged-out readers posting under a session username, not only after a failed verification.

Remove the following (ignore if present):
- `verification_cookie_token`
- `email` on verified submissions (the email comes from the session)

Header: `Authorization: Bearer <commenter_session_token>` when the client holds one.

### 7.2 Server logic

```ts
async function submitComment(req) {
  const settings = await loadCommentSettings(blogId);
  // existing checks first: comments enabled, allow new comments, post not closed,
  // paywall visibility rule, body length, IP rate limit (5/hour/blog)

  if (req.body.post_as_anonymous) {
    if (!settings.allow_anonymous_comments) return error(403, 'anonymous_not_allowed');
    return storeAnonymousComment(req);              // unchanged
  }

  if (!settings.subscriber_comments_enabled) {
    return existingNonVerifiedBehavior(req);         // unchanged; do not modify
  }

  // ---- verified path ----
  const session = await findValidCommenterSession(req.bearerToken, siteId);
  if (!session) return error(401, 'commenter_auth_required');
  await touchSession(session);                      // sliding expiry

  const anonymousRetry = settings.allow_anonymous_comments
    ? { anonymous_retry_token: await issueAnonymousRetryToken(req) }
    : {};

  if (req.body.squarespace_logged_in !== true) {
    return error(403, 'squarespace_login_required', anonymousRetry);
  }

  let contactId: string | null = null;
  if (await siteHasValidApiKey(siteId)) {
    const result = await siteContactLookup.findByEmail(siteId, session.email); // §7.3
    if (!result.found) {                            // not found OR lookup error → same response
      if (result.error) logger.warn('contact_lookup_failed', { siteId, kind: result.error });
      return settings.allow_anonymous_comments
        ? error(400, 'verification_failed_anonymous_available', anonymousRetry)
        : error(400, 'verification_failed');
    }
    contactId = result.contactId;
  }

  return storeComment({
    ...req.body,
    display_name: session.display_name,
    email: session.email,
    verified_subscriber: true,
    squarespace_profile_id: contactId,              // existing column; holds profile/contact id
    commenter_session_id: session.id,
    client_reported_logged_in: true,
  });
}
```

Error bodies keep the existing shape: `{ code, error, ...extra }`. `error` is the human-readable message the overlay shows.

### 7.3 Contact lookup interface

```ts
interface SiteContactLookup {
  findByEmail(siteId: string, email: string):
    Promise<{ found: true; contactId: string; firstName?: string }
          | { found: false; error?: 'unauthorized' | 'rate_limited' | 'network' | 'unknown' }>;
}
```

- Implement it now by wrapping the **existing Profiles API call**. Compare `profile.email.toLowerCase() === email` exactly.
- A `401` from Squarespace keeps the existing behavior: surface the dashboard warning that the API key is invalid.
- The Contacts API replacement (D4) is a later swap of this one implementation.

---

## 8. API

All endpoints require the existing `X-BetterBlog-Site-Token` header, which resolves the site. CORS: allow the site's origins (as today), plus the `Authorization` header.

### 8.1 `POST /api/comments/auth/start`

```json
{ "blog_id": "uuid", "email": "reader@example.com", "display_name": "Sam" }
```

- Validates email format and `display_name` (1–100 chars, trimmed).
- Applies the rate limits in §5.1. If a per-email limit is hit, return the same 202 and don't send.
- Creates the challenge and sends the email after responding.
- **202** `{ "challenge_id": "uuid", "expires_in": 600, "resend_after": 30 }`
- **400** `{ code: "invalid_request" }`, **429** `{ code: "rate_limited" }` (IP-level only).

### 8.2 `POST /api/comments/auth/verify`

```json
{ "challenge_id": "uuid", "code": "123456", "replaces_token": "optional-old-token" }
```

- **200** `{ "session_token": "...", "email": "...", "display_name": "...", "expires_at": "ISO" }`
- **400** `{ code: "invalid_code" | "code_expired" | "too_many_attempts" }`. An unknown `challenge_id` returns `invalid_code`.
- On success, mark the challenge consumed, create the session (copy `email` and `display_name` from the challenge), and revoke `replaces_token` if it belongs to the same site.

### 8.3 `GET /api/comments/auth/me`

Uses the bearer token.
- **200** `{ email, display_name, expires_at }`. Applies sliding expiry.
- **401** `{ code: "commenter_auth_required" }`.

The overlay calls this once when the comment section loads, if it holds a token, to render the signed-in line and drop dead tokens.

### 8.4 `POST /api/comments/auth/logout`

Uses the bearer token. Revokes the session. Always **204**.

### 8.5 Dashboard (blogger session auth)

| Method | Path | Purpose |
|---|---|---|
| `PATCH` | `/api/dashboard/comments/:id` | Existing. Also accept `{ verified_subscriber: false }` to remove a badge. |
| `POST` | `/api/dashboard/commenters/revoke` | `{ site_id, email }` → revoke all sessions for that email on that site. Returns `{ revoked: n }`. |

---

## 9. Data model (Prisma)

Add to `server/prisma/schema.prisma`, then apply with `npx prisma db push` using `DIRECT_URL` (see `SUPABASE_CONNECTION.md`). Match the existing `Site` / `Blog` id types and relation names. Adjust the `siteId` type below if the `sites` id is not a `String`.

```prisma
model CommenterOtpChallenge {
  id              String    @id @default(uuid()) @db.Uuid
  siteId          String    @map("site_id")
  blogId          String?   @map("blog_id")          // for email copy (blog title)
  email           String                              // normalized
  displayName     String    @map("display_name")
  codeHash        String    @map("code_hash")
  attempts        Int       @default(0)
  expiresAt       DateTime  @map("expires_at")
  consumedAt      DateTime? @map("consumed_at")
  ip              String?
  userAgent       String?   @map("user_agent")
  createdAt       DateTime  @default(now()) @map("created_at")

  @@index([siteId, email, createdAt])
  @@index([ip, createdAt])
  @@map("commenter_otp_challenges")
}

model CommenterSession {
  id              String    @id @default(uuid()) @db.Uuid
  siteId          String    @map("site_id")
  email           String
  displayName     String    @map("display_name")
  tokenHash       String    @unique @map("token_hash")
  createdAt       DateTime  @default(now()) @map("created_at")
  lastExtendedAt  DateTime  @default(now()) @map("last_extended_at")
  expiresAt       DateTime  @map("expires_at")
  revokedAt       DateTime? @map("revoked_at")
  ip              String?
  userAgent       String?   @map("user_agent")

  @@index([siteId, email])
  @@map("commenter_sessions")
}
```

`comments` table — add the following:

| Column | Type | Notes |
|---|---|---|
| `commenter_session_id` | uuid, nullable | FK to `commenter_sessions.id`, `ON DELETE SET NULL` |
| `client_reported_logged_in` | boolean, nullable | Audit field. NULL for comments created before v2. |

**Cleanup:** delete challenges older than 24 h, and sessions where `expires_at` or `revoked_at` is more than 30 days in the past. Use an existing scheduled job if there is one. Otherwise run an opportunistic delete in `/auth/start` with a 1% chance per call.

**Secrets:** add `COMMENTER_OTP_PEPPER` (32+ random bytes) to Vercel and `server/.env.example`.

---

## 10. Overlay changes

### 10.1 Remove

- All reads and writes of `bb_verified_sub_*` cookies. On init, **delete** any existing `bb_verified_sub_*` cookie (set an expired cookie with the same name and path).
- Sending `email` or `verification_cookie_token` on verified submits.

### 10.2 Squarespace login state

- Implement `getSquarespaceLoginState(): 'logged_in' | 'logged_out' | 'unknown'` from the **public Squarespace JSON**.
  - If the codebase already reads this, reuse it.
  - Otherwise add it, and document the exact JSON path in a code comment. **TODO(confirm): field path.**
  - Fall back to the existing `.user-accounts-panel .auth/.unauth` DOM check if the JSON is unavailable.
  - Treat `unknown` as `logged_out` for gating the verified path.
- If the same JSON exposes the account email and first name, use them **only** to prefill the Email modal. Never send them to the server as proof.
- Re-evaluate on the existing MutationObserver / auth-change hook and on Squarespace Ajax navigation. If the state changes, re-render the form per §4.1 without losing the draft.
- Send `squarespace_logged_in: state === 'logged_in'` on every non-anonymous submit.

### 10.3 Token storage

- Key: `bb_commenter_session:{siteKey}` in `localStorage` on the blog's origin.
- Wrap every read and write in `try/catch`. If storage throws or is unavailable (Safari private mode, blocked storage), keep the token in memory for the page lifetime.
- Clear on sign-out, on any `401 commenter_auth_required`, and when replaced by a new verify.
- Safari's tracking prevention may evict script-set storage after about 7 days of no visits. A reader who comes back after that simply verifies again. No special handling.

### 10.4 UI

- Build the Email and Code modals with the existing modal component and styles.
- Focus management: focus the first field on open, trap focus inside, Esc closes, and return focus to the comment button.
- Accessibility: label every input, and announce errors through `aria-live="polite"`.
- The draft must survive opening and closing modals, switching emails, and resending codes.

---

## 11. Code email

Reuse the transactional email service already used for dashboard magic links.

- **From name:** the blog title, as used elsewhere (`{blogName}`), falling back to the Squarespace site title. From address: the existing BetterBlog sending domain. No reply-to.
- **Subject:** `{code} is your code to comment on {blogName}`
- **Body (text + simple HTML):**
  > Your code is **{code}**. It expires in 10 minutes.
  > Enter it on {blogName} to post your comment.
  > If you didn't ask for this, you can ignore this email.
- No links in the email.
- Never log the rendered body.

---

## 12. Settings, dashboard, docs

### 12.1 Settings

- **Verify subscriber comments** is no longer disabled when no API key is connected (D1).
  - New helper text: "Readers confirm their email with a one-time code and must be signed in to your site to get a verified badge."
- The API key section stays, relabeled as optional: "Optional: also check commenters against your Squarespace member list."
- On first successful key connect, still auto-enable verification (existing behavior).
- Update `blog_comment_settings` validation: remove the rule that `subscriber_comments_enabled` requires a stored key.

### 12.2 Moderation dashboard

- In comment metadata, show **Email verified** for comments with `commenter_session_id` set.
- New per-comment actions on verified comments:
  - **Remove verified badge**: PATCH `verified_subscriber: false`.
  - **Sign out this commenter**: confirm dialog, then `POST /api/dashboard/commenters/revoke`. Toast: "Signed out on all devices. They'll need a new code to comment as verified."

### 12.3 Docs to update in the same PR

- `comments.md`: the "Anonymous vs verified subscriber comments" section and the three toggle walkthroughs (code step, signed-in line, sign out, API key now optional).
- `troubleshooting.md`: replace "Subscriber comments aren't being verified" with the code flow. Add "Readers aren't receiving the code" (spam folder, resend after 30 s, rate limits).
- `BetterBlog_Comments_Spec.md`: mark §5.3, §5.4 and the §4.3 key rule as superseded by this doc.

---

## 13. Rollout

1. Deploy the schema, then server and overlay **together**. The overlay is served from the app domain. Make sure `loader.js` / overlay bundle cache-busting picks up the new version.
2. After deploy, the server ignores `verification_cookie_token`. Old cookies are deleted client-side on first load (§10.1).
3. Existing `verified_subscriber = TRUE` comments keep their badge (D2). `client_reported_logged_in` and `commenter_session_id` stay NULL on them.

---

## 14. Security checklist

- [ ] Codes and tokens come only from `crypto` CSPRNG.
- [ ] No plain codes, tokens, or code emails in logs, error trackers, or analytics. Scrub the `Authorization` header in request logging.
- [ ] Code compare and token-hash lookup are constant time, or index lookup by hash only.
- [ ] `/auth/start` response body and status are identical for sent vs. per-email rate-limited vs. any other email-dependent outcome.
- [ ] A session token from site A is rejected on site B.
- [ ] Revoked or expired sessions return `commenter_auth_required`.
- [ ] `comments.email` is still never returned by public endpoints.
- [ ] Contact lookup errors and not-found produce the same reader-facing response.

---

## 15. Acceptance tests

**OTP**
1. A correct code within 10 min returns 200 with a token. The same code a second time returns `invalid_code`.
2. A code at 10 min + 1 s returns `code_expired`.
3. A 6th attempt after 5 wrong codes returns `too_many_attempts`, even with the right code.
4. A new `/auth/start` for the same email invalidates the previous challenge.
5. A 4th send within 15 min for the same email returns 202 but no email is sent.

**Sessions**
6. `/auth/me` more than 24 h after the last extension moves `expires_at` forward by 30 days. It never goes past `created_at + 180d`.
7. Logout, then `/auth/me`, returns 401.
8. The dashboard revoke signs out every session for that email on the site.

**Submit matrix** (with and without an API key connected)
9. Verify on, valid session, logged in, no key → 201, `verified_subscriber = true`.
10. Verify on, valid session, logged in, key connected, contact found → 201 verified.
11. Same as 10, contact not found → `verification_failed` (anonymous off) or `verification_failed_anonymous_available` with a retry token (anonymous on). No comment is stored.
12. Verify on, valid session, `squarespace_logged_in: false` → 403 `squarespace_login_required`. The session is not revoked.
13. Verify on, no token → 401 `commenter_auth_required`.
14. `post_as_anonymous: true` with anonymous off → 403. With anonymous on → 201 anonymous, unchanged from today.
15. Verify off → behavior identical to before this change.

**Overlay**
16. Logged-in reader, no token: draft → Email modal → Code modal → comment posts automatically with the original draft and `parent_id`.
17. Reader returning with a token: no modal, comment posts directly, signed-in line shown.
18. With `localStorage` throwing, the flow still completes; the token lives in memory only.
19. The Squarespace session logs out mid-page: the form switches to the sign-in state and the draft is kept. After signing back in, no new code is required.
20. A legacy `bb_verified_sub_*` cookie is deleted on load.
21. Keyboard-only: both modals can be completed, Esc closes them, and focus returns to the comment button.

---

## 16. Out of scope / follow-ups

- **Contacts API swap** (D4): replace the Profiles implementation of `SiteContactLookup`, and require a key with Contacts (Read).
- **Gated-content check:** a stronger membership hint than "logged in". The overlay fetches a paywalled post's JSON and reports whether the body is present. It is still reported by the browser.
- **Server-side paid-membership signal** from the Orders API, pending the test-site experiment.
- **Squarespace OAuth Extension:** avoids the API key plan gating and enables webhooks.
- **Readers changing their display name** after verifying.
