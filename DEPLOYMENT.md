# Deployment

## Vercel + Supabase (production)

### Overview

| Component | Role |
| --------- | ---- |
| **Vercel** | Express API (`api/index.ts`), SPA, `loader.js` / `renderer.js`, Stripe webhook |
| **Vercel Queues** | Async Stripe jobs (`checkout.session.completed`, `customer.subscription.updated`) |
| **Supabase** | Postgres for Prisma (`DATABASE_URL` pooler + `DIRECT_URL` for migrations) and Storage for author photos |

There is **no worker dyno**. Stripe webhooks enqueue to Vercel Queues; consumers are `api/queues/*.ts`.

### Supabase setup

1. Create a Supabase project.
2. In **Project Settings → Database**, copy:
   - **Transaction pooler** URI → `DATABASE_URL` (port `6543`, `?pgbouncer=true` for Prisma).
   - **Session / direct** URI → `DIRECT_URL` (port `5432`, for migrations).
3. In **Storage**, create a **public** bucket named `author-photos` (public so Squarespace `<img>` tags work). Leave writes closed to anon; only the service role uploads. The API can also create this bucket on first upload if it is missing.
4. In **Project Settings → API**, copy:
   - **Project URL** → `SUPABASE_URL`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (server only; never expose as `VITE_`)
5. Migrate data from Heroku Postgres (dump/restore) before cutover.
6. Optional: drop legacy `pgboss` schema on Supabase after cutover (no longer used).

### Vercel setup

1. Import the GitHub repo in Vercel.
2. **Framework Preset**: Other (or leave auto). **Root Directory**: repository root (not `server/`). **Output Directory**: leave blank or `client/dist` — [vercel.json](vercel.json) sets `outputDirectory` to `client/dist` after the Vite build. Do not use `public` unless you add that folder.
3. Build uses [vercel.json](vercel.json): `npm run build --workspace=server && npm run build --workspace=client`.
4. Enable **Vercel Queues** on the project (beta).
5. Set environment variables (Production + Preview).

   **Do not set `NODE_ENV=production` in Vercel env vars.** Vercel sets it during install; adding it yourself makes `npm install` skip `devDependencies` and breaks `tsc` / Vite. Use `VERCEL_ENV` or `STRIPE_ENVIRONMENT` for environment-specific behavior instead.

| Variable | Description |
| -------- | ----------- |
| `DATABASE_URL` | Supabase **transaction pooler** (`postgres.[ref]` @ `*.pooler.supabase.com:6543`, `?pgbouncer=true`) — see [docs/SUPABASE_CONNECTION.md](docs/SUPABASE_CONNECTION.md) |
| `DIRECT_URL` | Supabase **session pooler** (`:5432`) or **direct** (`db.[ref].supabase.co:5432`) — for `prisma db push` / CI |
| `SUPABASE_URL` | Supabase project URL (`https://<project-ref>.supabase.co`) — author photo Storage |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase **service_role** key (server only) — author photo uploads |
| `APP_URL` | `https://your-app.vercel.app` or custom domain |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for `https://your-app.vercel.app/api/webhooks/stripe` |
| `STRIPE_ENVIRONMENT` | `sandbox` (Preview / test key) or `live` (Production / live key). Aliases: `test`/`staging` → sandbox; `production`/`prod` → live. If unset, inferred from `STRIPE_SECRET_KEY` (`sk_test` / `sk_live`). |
| `SENDGRID_API_KEY` | SendGrid API key |
| `SENDGRID_MAIL_FROM` | Verified sender |
| `ENCRYPTION_KEY` | 32-byte hex for comment encryption |
| `HCAPTCHA_*` | hCaptcha keys |
| `IS_BETTER_BLOG_LIVE` | `true` when ready for public CTA (checkout + Log in). Set per environment (e.g. `true` on Preview / staging, `false` on Production). Baked into the client at build time; `/api/health` overrides when reachable. |
| `VITE_GA_MEASUREMENT_ID` | GA4 Measurement ID (`G-XXXXXXXXXX`) for the marketing landing page. **Production only** — leave unset on Preview/staging. Analytics only loads on `betterblog.xyz` and `www.betterblog.xyz`. |

6. Stripe Dashboard → Webhooks → endpoint: `https://your-app.vercel.app/api/webhooks/stripe`  
   Events: `checkout.session.completed`, `customer.subscription.updated`.

### API 504 / 60s timeouts

If Vercel logs show `Task timed out after 60 seconds` on `/api/dashboard/me`, `/api/checkout/prices`, etc.:

1. **`DATABASE_URL` on Vercel** must be the Supabase **transaction pooler** (port **6543**, `?pgbouncer=true`), not the direct `5432` URL.
2. Confirm the password and project ref in the connection string match **Project Settings → Database**.
3. After deploy, `/api/health` should respond in under a second (standalone `api/health.ts`, no database). If `/api/health` is fast but other `/api/*` routes time out, the database connection from the Express app is the problem.

The landing page uses the **build-time** `IS_BETTER_BLOG_LIVE` value immediately so the UI does not wait on `/api/health`.

### Staging (`staging.betterblog.xyz`) and Deployment Protection

If **Vercel Authentication** (Deployment Protection) is enabled for Preview, browsers cannot call `/api/health` without logging in (401). The landing page used to treat that as “not live.” The client now falls back to the **build-time** value of `IS_BETTER_BLOG_LIVE` for that environment.

After changing `IS_BETTER_BLOG_LIVE`, **redeploy** the branch (env vars are applied at build time for the fallback).

Optional: disable Deployment Protection for Preview, or add `staging.betterblog.xyz` to the protection allowlist, if you want runtime `/api/health` to drive the UI.

### Google Analytics (marketing landing page)

GA4 tracks pricing engagement and the coming-soon email modal on the public landing page (`/`). It does **not** use the customer-blog server-side GA integration in `server/src/routes/analytics.ts`.

**Setup (one-time):**

1. In [Google Analytics](https://analytics.google.com/), create a GA4 property (e.g. "BetterBlog Marketing").
2. Add a **Web** data stream for `https://betterblog.xyz`.
3. Enable **Enhanced measurement** (scrolls, outbound clicks, etc.).
4. Copy the **Measurement ID** (`G-XXXXXXXXXX`).
5. In Vercel → **Production** environment only, set `VITE_GA_MEASUREMENT_ID` to that ID. Redeploy production after adding it.

Analytics is gated in code: gtag loads only when the hostname is `betterblog.xyz` or `www.betterblog.xyz` **and** the env var is set. Staging (`staging.betterblog.xyz`), Preview, and localhost never send events.

**Post-deploy GA4 admin (recommended):**

1. **Realtime** — confirm events on `betterblog.xyz`; confirm zero hits from staging.
2. **Admin → Custom definitions → Create custom dimensions** (Event scope): `trigger_source`, `tier`, `billing_period`.
3. **Admin → Events** — mark `interest_modal_success` as a **Key event** (conversion).
4. **Explore → Funnel exploration** — steps: `interest_modal_open` → `interest_modal_submit` → `interest_modal_success`, broken down by `trigger_source`.

**Key custom events:**

| Event | Purpose |
| ----- | ------- |
| `pricing_section_view` | User scrolled to pricing (≥50% visible) |
| `pricing_tier_cta_click` | Tier card CTA clicked |
| `interest_modal_open` | Coming-soon modal opened (param: `trigger_source`) |
| `interest_modal_submit` | Email form submitted |
| `interest_modal_success` | Email captured successfully |
| `interest_modal_dismiss` | Modal closed without completing (param: `had_input`) |

### Database sync (CI)

[.github/workflows/database-seed.yml](.github/workflows/database-seed.yml) keeps the database schema and reference data aligned with code.

Repository secrets:

- `STAGING_DATABASE_URL` — staging Supabase transaction pooler URL.
- `STAGING_DIRECT_URL` — staging Supabase session/direct URL for Prisma CLI.
- `PRODUCTION_DATABASE_URL` — production Supabase transaction pooler URL.
- `PRODUCTION_DIRECT_URL` — production Supabase session/direct URL for Prisma CLI.

Behavior:

- Pushes to **`develop`** that touch seed- or schema-related files run **`prisma db push`**, apply `server/prisma/migrations/*.sql`, then seed **staging**.
- Pushes to **`main`** with the same path filters run schema sync and seed **production**.
- Manual dispatch can run `staging`, `production`, or `both` (each runs schema sync before seeding).
- Production uses the `production` GitHub Environment, so configure environment protection if you want approval before it runs.
- Production seeding updates reference data only: live Stripe plans and built-in templates. Demo fixtures are staging-only.
- The optional **include_legacy_plan_migration** input updates old `starter` / `pro` / `agency` values in `subscriptions` and `checkout_sessions`; leave it off unless you are intentionally running that one-time cleanup.

Local equivalent:

```bash
cd server
npm run db:sync    # prisma db push + apply prisma/migrations/*.sql
```

### Local development

```bash
# Terminal 1 — API (Stripe webhooks process inline by default)
cp server/.env.example server/.env
npm run dev --workspace=server

# Terminal 2 — Vite client
npm run dev --workspace=client
```

For **Vercel Queues** locally (matches production):

```bash
vercel link
vercel env pull
npm run dev:vercel
```

Set `STRIPE_QUEUE_INLINE_FALLBACK=false` to require queue publish in local API-only mode.

---

## GitHub Pages (loader.js / renderer.js) — optional CDN

The `scripts/` directory can still be deployed to GitHub Pages. Set repository variable **`API_BASE_URL`** to your app URL (e.g. `https://staging.betterblog.xyz`) so [deploy-pages.yml](.github/workflows/deploy-pages.yml) passes it into `scripts/build.mjs`, which injects the API base into `loader.js` **before** minification.

If you serve scripts from Vercel instead, skip Pages deploy and point Squarespace at:

- `https://your-app.vercel.app/loader.js`
- `https://your-app.vercel.app/renderer.js`

---

## Heroku (legacy)

Heroku used `web` + `worker` dynos and pg-boss. That path is retired in favor of Vercel + Vercel Queues. [Procfile](Procfile) now defines `web` only for any transitional Heroku use.
