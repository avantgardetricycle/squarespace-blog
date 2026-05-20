# Deployment

## Vercel + Supabase (production)

### Overview

| Component | Role |
| --------- | ---- |
| **Vercel** | Express API (`api/index.ts`), SPA, `loader.js` / `renderer.js`, Stripe webhook |
| **Vercel Queues** | Async Stripe jobs (`checkout.session.completed`, `customer.subscription.updated`) |
| **Supabase** | Postgres for Prisma (`DATABASE_URL` pooler + `DIRECT_URL` for migrations) |

There is **no worker dyno**. Stripe webhooks enqueue to Vercel Queues; consumers are `api/queues/*.ts`.

### Supabase setup

1. Create a Supabase project.
2. In **Project Settings → Database**, copy:
   - **Transaction pooler** URI → `DATABASE_URL` (port `6543`, `?pgbouncer=true` for Prisma).
   - **Session / direct** URI → `DIRECT_URL` (port `5432`, for migrations).
3. Migrate data from Heroku Postgres (dump/restore) before cutover.
4. Optional: drop legacy `pgboss` schema on Supabase after cutover (no longer used).

### Vercel setup

1. Import the GitHub repo in Vercel.
2. **Framework Preset**: Other (or leave auto). **Root Directory**: repository root (not `server/`). **Output Directory**: leave blank or `client/dist` — [vercel.json](vercel.json) sets `outputDirectory` to `client/dist` after the Vite build. Do not use `public` unless you add that folder.
3. Build uses [vercel.json](vercel.json): `npm run build --workspace=server && npm run build --workspace=client`.
4. Enable **Vercel Queues** on the project (beta).
5. Set environment variables (Production + Preview).

   **Do not set `NODE_ENV=production` in Vercel env vars.** Vercel sets it during install; adding it yourself makes `npm install` skip `devDependencies` and breaks `tsc` / Vite. Use `VERCEL_ENV` or `STRIPE_ENVIRONMENT` for environment-specific behavior instead.

| Variable | Description |
| -------- | ----------- |
| `DATABASE_URL` | Supabase **pooled** connection string |
| `DIRECT_URL` | Supabase **direct** connection string (migrations CI only if not running migrate on Vercel) |
| `APP_URL` | `https://your-app.vercel.app` or custom domain |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for `https://your-app.vercel.app/api/webhooks/stripe` |
| `STRIPE_ENVIRONMENT` | `sandbox` or `live` |
| `SENDGRID_API_KEY` | SendGrid API key |
| `SENDGRID_MAIL_FROM` | Verified sender |
| `ENCRYPTION_KEY` | 32-byte hex for comment encryption |
| `HCAPTCHA_*` | hCaptcha keys |
| `IS_BETTER_BLOG_LIVE` | `true` when ready for public CTA (checkout + Log in). Set per environment (e.g. `true` on Preview / staging, `false` on Production). Baked into the client at build time; `/api/health` overrides when reachable. |

6. Stripe Dashboard → Webhooks → endpoint: `https://your-app.vercel.app/api/webhooks/stripe`  
   Events: `checkout.session.completed`, `customer.subscription.updated`.

### Staging (`staging.betterblog.xyz`) and Deployment Protection

If **Vercel Authentication** (Deployment Protection) is enabled for Preview, browsers cannot call `/api/health` without logging in (401). The landing page used to treat that as “not live.” The client now falls back to the **build-time** value of `IS_BETTER_BLOG_LIVE` for that environment.

After changing `IS_BETTER_BLOG_LIVE`, **redeploy** the branch (env vars are applied at build time for the fallback).

Optional: disable Deployment Protection for Preview, or add `staging.betterblog.xyz` to the protection allowlist, if you want runtime `/api/health` to drive the UI.

### Database migrations (CI)

[.github/workflows/database-migrate.yml](.github/workflows/database-migrate.yml) runs on `main` when `server/prisma/**` changes (and on manual dispatch).

Repository secrets:

- `DIRECT_URL` (preferred) or `DATABASE_URL` — **direct** Supabase URL for `prisma db push` and SQL files.

Manual seed: Actions → Database migrate → Run workflow → enable **run_seed**.

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

The `scripts/` directory can still be deployed to GitHub Pages. Set repository variable **`API_BASE_URL`** to your Vercel app URL (e.g. `https://your-app.vercel.app`) so [deploy-pages.yml](.github/workflows/deploy-pages.yml) injects it into `loader.js`.

If you serve scripts from Vercel instead, skip Pages deploy and point Squarespace at:

- `https://your-app.vercel.app/loader.js`
- `https://your-app.vercel.app/renderer.js`

---

## Heroku (legacy)

Heroku used `web` + `worker` dynos and pg-boss. That path is retired in favor of Vercel + Vercel Queues. [Procfile](Procfile) now defines `web` only for any transitional Heroku use.
