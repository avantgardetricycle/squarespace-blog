# BetterBlog Support Tab & AI Chatbot — Technical Specification
**Version:** 1.0 — MVP  
**Status:** Draft  
**Authors:** BetterBlog Team

---

## 1. Overview

This spec covers the Support tab in the BetterBlog dashboard: a self-serve AI chatbot grounded in BetterBlog's documentation, paired with a human escalation path via a contact form. The chatbot handles the majority of "how do I" questions instantly; the contact form captures bugs and edge cases that need human review. All conversations are logged for product research.

The two goals are deliberately ordered:
1. **Speed for users** — most questions answered in seconds without waiting for a reply
2. **Signal for the team** — a searchable log of what users are actually confused about

---

## 2. UI Structure

The Support tab lives at `/dashboard/support`. It has two modes, toggled via tabs at the top of the panel.

```
┌──────────────────────────────────────────────────────┐
│  Support                                             │
│                                                      │
│  [Ask BetterBlog]          [Contact Us]              │
│  ───────────────                                     │
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │                                                │  │
│  │  Hi! Ask me anything about BetterBlog —        │  │
│  │  setup, templates, analytics, comments,        │  │
│  │  or troubleshooting.                           │  │
│  │                                                │  │
│  │  ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄  │  │
│  │                                                │  │
│  │  [chat thread renders here]                    │  │
│  │                                                │  │
│  │  ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄  │  │
│  │                                                │  │
│  │  [Ask a question...                   ] [→]   │  │
│  │                                                │  │
│  │  Still stuck? [Send this to the team →]        │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

**Contact Us tab:**

```
┌──────────────────────────────────────────────────────┐
│  Support                                             │
│                                                      │
│  [Ask BetterBlog]          [Contact Us]              │
│                             ────────────             │
│                                                      │
│  Subject                                             │
│  [                                          ]        │
│                                                      │
│  What's happening?                                   │
│  [                                          ]        │
│  [                                          ]        │
│  [                                          ]        │
│                                                      │
│  Screenshot (optional)                               │
│  [Attach file]                                       │
│                                                      │
│  [Send to BetterBlog Team]                           │
│                                                      │
│  We typically respond within one business day.       │
└──────────────────────────────────────────────────────┘
```

### 2.1 UI Behavior Notes

- **"Still stuck? Send this to the team"** always visible at the bottom of the chat panel. Clicking it pre-populates the Contact Us form with the full chat transcript so the user doesn't have to re-explain.
- The chatbot panel opens with the welcome message shown above. No "type your first message to get started" friction.
- Suggested starter questions shown below the welcome message on first load (before any user input):

```
  Try asking:
  "How do I install BetterBlog on my Squarespace site?"
  "Why isn't my template change showing up live?"
  "How does verified subscriber commenting work?"
  "What does the Avg Read Percent metric measure?"
```

- Chat history persists within the session (page reload clears it). No cross-session persistence for MVP — each Support tab visit starts a fresh conversation. The conversation is logged server-side regardless.
- Streaming responses: the chatbot streams tokens as they are generated rather than waiting for the full response. This is critical for perceived speed — a 3-second streaming response feels faster than a 2-second wait followed by a full block of text.

---

## 3. System Architecture

### 3.1 Components

```
Browser (Dashboard)
    │
    ├── Chat UI (React)
    │       │ POST /api/support/chat
    │       │ (streaming SSE response)
    │       │
    └── Contact Form
            │ POST /api/support/contact
            │

BetterBlog API Server
    │
    ├── /api/support/chat
    │       ├── Authenticates user (session)
    │       ├── Builds prompt (system + docs context + conversation history)
    │       ├── Calls Anthropic API (claude-sonnet-4-6, streaming)
    │       ├── Streams response back to browser
    │       └── Logs conversation to DB async
    │
    └── /api/support/contact
            ├── Validates fields
            ├── Stores ticket in DB
            └── Sends email notification to team

Database
    ├── support_conversations
    └── support_tickets
```

### 3.2 Why Server-Side Proxy

The Anthropic API call is made from BetterBlog's server, not directly from the browser. This is non-negotiable for two reasons: the API key is never exposed to the client, and the documentation context (which may include internal content) is assembled server-side and never sent to the browser.

---

## 4. Chatbot Implementation

### 4.1 Model

`claude-sonnet-4-6` — correct balance of quality and latency for a support context. Opus is unnecessary for documentation Q&A; Haiku is too terse for nuanced troubleshooting explanations.

### 4.2 Documentation Context Strategy

For MVP, BetterBlog's full documentation is included in the system prompt on every request. This is simpler than RAG (no vector database, no chunking logic, no retrieval step) and works correctly for a documentation set of this size.

**Estimated documentation size:** ~30,000–50,000 tokens when fully written. Well within Claude's context window. Re-evaluate if docs grow beyond ~80,000 tokens, at which point a RAG architecture becomes worth the complexity.

The documentation is compiled at server startup into a single string from the markdown source files in the `/docs` directory. The compiled string is cached in memory and refreshed whenever docs are updated (webhook from the docs repo, or on deploy). No per-request file reads.

### 4.3 System Prompt

```
You are BetterBlog Support, a helpful assistant for users of BetterBlog
— a Squarespace blog enhancement plugin.

Your job is to answer questions about BetterBlog based only on the
documentation provided below. Follow these rules precisely:

1. Answer only from the documentation. If a question is not covered,
   say so honestly: "I don't have information about that in our docs.
   You can send this question to the team using the button below."

2. Never invent features, settings, or behaviors that are not in the
   documentation, even if they sound plausible.

3. Be concise and direct. Users are troubleshooting — they want the
   answer, not a preamble. Use short paragraphs. Use numbered steps
   for procedures.

4. When a question is about Squarespace behavior rather than BetterBlog
   behavior, say so clearly: "This is controlled by Squarespace, not
   BetterBlog." Then answer if the docs cover it, or suggest the user
   check Squarespace's own help center.

5. Do not speculate about future features or roadmap.

6. Do not apologize excessively. If you can't answer, say so once
   and move on.

---

BETTERBLOG DOCUMENTATION

{compiled_docs_string}
```

### 4.4 Request / Response Flow

**Request to `/api/support/chat`:**

```json
{
  "messages": [
    { "role": "user", "content": "How do I install BetterBlog?" },
    { "role": "assistant", "content": "To install BetterBlog..." },
    { "role": "user", "content": "What if I'm on Squarespace 7.0?" }
  ]
}
```

The full conversation history is sent on every request (up to the last 20 messages — truncate older messages beyond that to manage context). The system prompt with docs is always included server-side and is never part of the client-side message array.

**Response:** Server-sent events (SSE) stream. Each event is a content delta:

```
data: {"delta": "To"}
data: {"delta": " install"}
data: {"delta": " Better"}
data: {"delta": "Blog"}
data: {"delta": "..."}
data: {"done": true, "conversation_id": "uuid"}
```

The `conversation_id` returned on `done` is used by the "Send this to the team" escalation path to attach the full transcript to the contact form submission.

### 4.5 Logging

Every conversation is logged asynchronously after the response completes (does not block streaming). The log captures enough to be useful for product research without storing anything sensitive.

```sql
CREATE TABLE support_conversations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blog_id         UUID REFERENCES blogs(id),      -- which blog the user was working on
  account_id      UUID REFERENCES accounts(id),
  messages        JSONB NOT NULL,                  -- full turn-by-turn transcript
  escalated       BOOLEAN NOT NULL DEFAULT FALSE,  -- true if user clicked "send to team"
  escalated_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_support_conversations_account ON support_conversations(account_id);
CREATE INDEX idx_support_conversations_created ON support_conversations(created_at);
CREATE INDEX idx_support_conversations_escalated ON support_conversations(escalated);
```

### 4.6 Rate Limiting

- 20 messages per user per hour (prevents abuse; generous enough for real troubleshooting sessions)
- If limit hit: "You've sent a lot of messages — take a short break or send your question directly to the team."
- No rate limit on the contact form (it's already human-gated by the form fields)

---

## 5. Contact Form Implementation

### 5.1 Fields

| Field | Required | Notes |
|---|---|---|
| Subject | Yes | Free text, max 120 chars |
| Description | Yes | Free text, max 3000 chars. Pre-populated with transcript if escalated from chat. |
| Screenshot | No | PNG/JPG/GIF, max 5MB, single file |
| Account email | Auto | Populated from session — not editable by user |
| Blog URL | Auto | Populated from currently active blog context — not editable |
| Conversation ID | Auto | Populated from chat session if escalated — not shown to user |

### 5.2 On Submit

1. Validate required fields
2. Upload screenshot to storage if present (return URL)
3. Store ticket in `support_tickets` table
4. Send email to `support@betterblog.xyz` with all fields, screenshot link, and chat transcript link
5. If `conversation_id` present, mark that conversation as `escalated = true` in `support_conversations`
6. Show confirmation: "Sent! We'll get back to you at [email] within one business day."

```sql
CREATE TABLE support_tickets (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id          UUID REFERENCES accounts(id),
  blog_id             UUID REFERENCES blogs(id),
  subject             TEXT NOT NULL,
  description         TEXT NOT NULL,
  screenshot_url      TEXT,
  conversation_id     UUID REFERENCES support_conversations(id),
  account_email       TEXT NOT NULL,
  blog_url            TEXT,
  status              TEXT NOT NULL DEFAULT 'open'
                        CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 6. Internal Dashboard (Team-Facing)

A minimal internal view at `/internal/support` (authenticated to team accounts only).

### 6.1 Conversation Log View

- Table of all conversations, sorted by most recent
- Columns: date, account email, blog URL, message count, escalated (Y/N)
- Click to expand full transcript
- Filter by: escalated only, date range, account
- No tagging or categorization for MVP — that's a manual process done offline

### 6.2 Ticket View

- Table of open tickets with status, subject, account, date
- Click to view full ticket detail including transcript link if escalated from chat
- Status can be updated (open → in progress → resolved) manually
- No ticketing workflow automation for MVP

### 6.3 What to Do With the Data

The conversation log is primarily useful in aggregate. After the first 30–60 days of usage, review it by:

1. **Frequency count:** which topics appear most often (manually at MVP scale — tagging can be added later)
2. **Escalation rate by topic:** conversations that ended with escalation indicate either missing docs or a confusing feature
3. **Dead-end detection:** conversations where the chatbot said "I don't have information about that" — these are direct documentation gaps

---

## 7. Documentation Structure — Full Topic Outline

The following is the complete outline of documentation that must exist for the chatbot to be useful. Topics marked **[EXISTS]** are covered by existing internal specs and need to be adapted into user-facing language. Topics marked **[MISSING]** are gaps that need to be written from scratch before launch.

---

### Getting Started
- What is BetterBlog? **[MISSING]** — one-page product overview written for a Squarespace user, not a developer
- How BetterBlog works (overlay model, script injection, no Squarespace code changes) **[MISSING]**
- Supported Squarespace plans and versions (7.0 vs 7.1, plan requirements) **[MISSING]**
- BetterBlog plan comparison (Essentials / Professional / Publication) **[MISSING]**

### Installation
- Installing BetterBlog on your Squarespace site **[MISSING]** — step by step with screenshots
- Where to find your script snippet **[MISSING]**
- Adding a blog in BetterBlog **[MISSING]**
- What to do if changes aren't showing up live **[MISSING]**
- Installing on multiple Squarespace sites **[MISSING]**
- Removing BetterBlog from your site **[MISSING]**

### Collection Settings
- Overview of the Collection tab **[EXISTS — adapt from Cursor inventory]**
- Show Date / Reading Time / Excerpt / Author toggles **[EXISTS]**
- Collection layout and templates overview **[EXISTS]**
- Configuring the Featured Article **[EXISTS]**
- Setting up Pagination **[EXISTS]**
- Header modules: Filter, Search, Sort — enabling and positioning **[EXISTS]**
- Sidebars: enabling, setting width, sticky behavior **[EXISTS]**
- Footer modules: Email Capture and Lead Magnet **[EXISTS]**
- Popular Posts and Recent Posts modules **[EXISTS]**

### Post Settings
- Overview of the Post tab **[EXISTS — adapt from Cursor inventory]**
- Show Date / Reading Time / Author toggles **[EXISTS]**
- Progress Bar: top vs bottom position, color, thickness **[EXISTS]**
- Post header: image layout modes, text placement, breadcrumbs **[EXISTS]**
- Table of Contents: enabling, position, styles **[EXISTS]**
- Sidebars on post pages **[EXISTS]**
- Social Sharing Links **[EXISTS]**
- Footer modules on post pages: Related Posts, Previous/Next, Author Profiles **[EXISTS]**
- Author Profiles: adding, editing, and deleting authors **[EXISTS]**
- Per-post author override **[EXISTS]**

### Templates
- What are templates and how do they work **[MISSING]** — user-facing explanation of template locking
- Collection templates: Showcase, Newsroom, Masthead, Editorial, Digest **[EXISTS — needs user-facing write-up per template]**
- Post templates: Reporter, Feature, Writer, Story, Publisher **[EXISTS — needs user-facing write-up per template]**
- Switching templates **[MISSING]**
- What gets locked when you apply a template **[MISSING]** — the concept of template-owned controls needs plain-language explanation
- Mixing collection and post templates **[MISSING]**

### Comments
- How BetterBlog comments work **[EXISTS — adapt from comments spec]**
- Enabling and configuring comments **[EXISTS]**
- Anonymous commenting **[EXISTS]**
- Verified subscriber commenting (paywalled blogs) **[EXISTS]**
- Connecting your Squarespace API key **[EXISTS]**
- Comment moderation: the dashboard queue **[EXISTS]**
- Approving, hiding, and deleting comments **[EXISTS]**
- Replying to comments from the dashboard **[EXISTS]**
- Email notifications for new comments **[EXISTS]**
- Auto-closing comments after N days **[EXISTS]**
- Comment likes and threaded replies **[EXISTS]**
- What happens to existing Squarespace comments **[EXISTS]**

### Paywall & Membership
- How BetterBlog handles paywalled blogs **[EXISTS — adapt from paywall spec]**
- Overview mode vs posts-only mode — what each looks like **[EXISTS]**
- The paywall footer: what it shows and how to customize it **[EXISTS]**
- Configuring your subscribe URL **[EXISTS]**
- Members-only post teasers on the collection page **[EXISTS]**
- What logged-in members see vs logged-out readers **[EXISTS]**
- Squarespace's two account types and why they matter **[MISSING]** — the customer account vs member account distinction is non-obvious and a real source of confusion

### Analytics
- Overview of the Analytics dashboard **[EXISTS — adapt from Cursor inventory]**
- Time range filter **[EXISTS]**
- Total Page Views, Unique Visitors, Avg Time on Page, Avg Read Percent **[EXISTS]**
- Per-Post Analytics: sorting and filtering **[EXISTS]**
- Click Tracking: what elements are tracked **[EXISTS]**
- Read Percent Distribution **[EXISTS]**
- Search Analytics **[EXISTS]**
- Per-Author Analytics **[EXISTS]**
- Connecting Google Analytics **[EXISTS]**
- Leads & Subscribers: email capture and lead magnet signups **[EXISTS]**
- Downloading the leads CSV **[EXISTS]**

### Account & Billing
- BetterBlog plans and what's included **[MISSING]**
- Starting a free trial **[MISSING]**
- Upgrading or changing your plan **[MISSING]**
- Canceling your subscription **[MISSING]**
- What happens when a subscription expires **[MISSING]**
- Logging in with a magic link **[MISSING]**
- Updating your billing information **[MISSING]**

### Troubleshooting
- Changes aren't showing up on my live site **[MISSING]**
- BetterBlog isn't loading at all **[MISSING]**
- The wrong template is showing **[MISSING]**
- My sidebar is overlapping the header **[MISSING]** — addresses the layout bug class explicitly
- My Squarespace API key shows as invalid **[MISSING]**
- Subscriber comments aren't being verified **[MISSING]**
- Analytics aren't tracking **[MISSING]**
- My paywall footer isn't showing **[MISSING]**
- Comments aren't appearing after approval **[MISSING]**
- I see "Comments are closed" but I didn't set a close date **[MISSING]**
- The progress bar isn't appearing **[MISSING]**

### Known Squarespace Behaviors
- This page covers BetterBlog-adjacent Squarespace behaviors that frequently cause confusion **[MISSING — all entries below are new]**
- Why your API key might suddenly stop working (plan changes, key deletion)
- The difference between a Squarespace customer account and a member account
- Why you can't edit an API key's permissions (must delete and recreate)
- How Squarespace's paywall modes work (overview+posts vs posts-only)
- Why the "View" button in the Squarespace account drawer may appear disabled
- Squarespace 7.0 vs 7.1 — what's different for BetterBlog users

---

## 8. Documentation Gap Summary

Of the topics outlined above, the following categories have the most significant gaps and should be prioritized before launch, roughly in order:

1. **Troubleshooting** — entirely missing as user-facing content; highest value for the chatbot since frustrated users are the ones most likely to use support
2. **Getting Started / Installation** — missing as user-facing content; likely the highest-volume topic for new users
3. **Known Squarespace Behaviors** — entirely missing; covers the class of issues that aren't BetterBlog bugs but cause significant confusion (the two-account-system issue, API key invalidation, paywall modes)
4. **Account & Billing** — entirely missing; users will absolutely ask about trial, cancellation, and magic-link login
5. **Templates** — exists internally but needs user-facing write-ups per template and a clear explanation of what template locking means in practice

Topics in the Collection, Post, Comments, Paywall, and Analytics sections largely exist in internal spec form and need to be converted to user-facing language — this is primarily a writing task, not a research task.

---

## 9. API Endpoint Specification

### `POST /api/support/chat`

Authenticated (session required). Streams response via SSE.

**Request:**
```json
{
  "messages": [
    { "role": "user", "content": "string" },
    { "role": "assistant", "content": "string" }
  ]
}
```

**Constraints:**
- `messages` array: max 20 entries (older messages truncated client-side before sending)
- Last message must be role `user`
- Each message content: max 2000 chars

**Response:** SSE stream
```
Content-Type: text/event-stream

data: {"delta": "string"}   // repeated
data: {"done": true, "conversation_id": "uuid"}
```

**Errors:**
```json
{ "error": "rate_limited", "retry_after": 3600 }
{ "error": "unauthorized" }
{ "error": "invalid_request", "message": "string" }
```

---

### `POST /api/support/contact`

Authenticated (session required). Accepts `multipart/form-data` for screenshot upload.

**Fields:** `subject`, `description`, `screenshot` (file, optional), `conversation_id` (optional)

**Response:**
```json
{ "ticket_id": "uuid", "message": "Sent! We'll reply to you@example.com within one business day." }
```

---

### `GET /api/support/conversations` (internal only)

Team accounts only. Returns paginated list of conversations.

**Query params:** `page`, `per_page`, `escalated` (boolean filter), `from`, `to` (date range), `account_id`

---

## 10. Security Considerations

| Concern | Mitigation |
|---|---|
| API key exposure | Anthropic API key stored in server environment variables. Never transmitted to client. |
| Prompt injection | User messages are passed as `user` role content, not concatenated into the system prompt. System prompt is server-side only and never visible to client. |
| Docs exposure | Compiled docs string is never sent to browser — it exists only in the server-side system prompt. |
| Rate limiting | 20 messages/user/hour enforced server-side. Client-side rate limit display only. |
| PII in logs | Conversation logs store full message content. Access restricted to team accounts. No public endpoint exposes logs. Review for GDPR compliance before EU launch. |
| File upload | Screenshot uploads virus-scanned before storage. MIME type validated server-side (not just extension). Max 5MB enforced at API layer, not just UI layer. |

---

## 11. Out of Scope for MVP

- Cross-session chat history persistence
- Chatbot topic tagging or auto-categorization
- Automated ticket routing or assignment
- SLA tracking or escalation timers
- In-chat file/screenshot sharing
- Proactive support triggers (e.g. "you've been on this page for 5 minutes, need help?")
- RAG / vector database architecture (deferred until docs outgrow context window)
- Public-facing documentation site (docs are chatbot context only for MVP — a public docs site is a separate project)

---

## 12. Open Questions

| # | Question | Owner | Due |
|---|---|---|---|
| 1 | Where do support ticket email notifications go? Dedicated support inbox, Linear, or another tool? | Product | Before build |
| 2 | Should the Support tab be accessible during a free trial, or only on paid plans? | Product | Before build |
| 3 | Is there a docs repository already, or does one need to be created? What format (markdown files, Notion, etc.)? | Eng | Before build |
| 4 | Should the chatbot have visibility into the user's current blog configuration to give more specific answers? (e.g. "You have the Masthead template applied, which locks pagination mode.") This would require passing blog config into the system prompt — high value but adds complexity. | Product | Before build |
| 5 | GDPR: conversation logs include user questions which may contain PII. Define retention policy and deletion behavior before EU launch. | Legal/Eng | Before EU launch |
