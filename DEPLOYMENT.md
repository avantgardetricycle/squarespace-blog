# Deployment

## GitHub Pages (loader.js / renderer.js)

The `scripts/` directory is deployed to GitHub Pages on push to `main`. The loader fetches config from your API; when served from GitHub Pages it cannot infer the API URL from the script origin.

**Required:** Set the `API_BASE_URL` repository variable so the loader knows where to fetch config:

1. GitHub repo → Settings → Secrets and variables → Actions → Variables
2. Add `API_BASE_URL` = your Heroku app URL (e.g. `https://your-staging-app.herokuapp.com`)

The deploy workflow injects this into `loader.js` before publishing. Without it, users must include `data-api-base` in their Squarespace snippet.

---

# Heroku Deployment

## Overview

The app uses separate dynos for web (API) and worker (pg-boss job processing):

- **web**: Express API, Stripe webhooks, health checks
- **worker**: Processes Stripe webhook jobs (e.g. checkout.session.completed)
- **release**: Runs `prisma db push` before each deploy to sync schema

## Required Config Vars

Set these for each Heroku app (staging and prod):

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Auto-set when Heroku Postgres add-on is attached. SSL is enforced automatically for remote hosts. |
| `APP_URL` | Base URL for CORS, magic links, etc. When client is served from the same Heroku app, use the Heroku URL (e.g. `https://your-app.herokuapp.com`) |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret (create endpoint for each app's URL) |
| `STRIPE_ENVIRONMENT` | `sandbox` for staging, `live` for prod |
| `SENDGRID_API_KEY` | SendGrid API key for transactional email |
| `SENDGRID_MAIL_FROM` | Sender address (e.g. `BetterBlog <no-reply@example.com>`) |

## Scaling the Worker

`app.json` defines the formation (web + worker) so **new** pipeline apps get the worker scaled automatically. For **existing** apps created before this was added, run once per app:

```bash
heroku ps:scale worker=1 -a your-staging-app
heroku ps:scale worker=1 -a your-prod-app
```

After that, the worker starts with every deploy.

## Deploy

```bash
git push heroku main
# or, for pipeline: connect GitHub and use automatic deploys
```

## Stripe plan prices (`plans` table)

Sandbox price IDs and `stripe_price_label` values for Essentials / Professional / Publication are updated via:

- `server/prisma/seed.ts` (local `npm run db:seed` or equivalent), and/or
- `server/prisma/migrations/update_plans_sandbox_stripe_2025.sql` (run manually on Heroku Postgres when you cannot re-seed).

Internal `plan_key` values remain `starter`, `pro`, and `agency`.

## Stripe Webhooks

Create separate webhook endpoints for staging and prod:

- Staging: `https://your-staging-app.herokuapp.com/api/webhooks/stripe`
- Prod: `https://your-prod-app.herokuapp.com/api/webhooks/stripe`

Use the corresponding signing secret in each app's config.

Subscribe to these events in the Stripe Dashboard:
- `checkout.session.completed`
- `customer.subscription.updated`

## Local Development: Running the Worker

The worker is a **separate process** from the API server. Jobs are queued by the server but processed by the worker. For Stripe webhooks to update your database, you must run the worker:

```bash
# In a separate terminal (from project root):
npm run dev:worker
```

Or from the server workspace: `npm run dev:worker --workspace=server`

When the worker starts, you should see:
```
[worker] Starting pg-boss worker...
[worker] Subscribed to queue: stripe.checkout.session.completed
[worker] Subscribed to queue: stripe.customer.subscription.updated
[worker] pg-boss workers registered. Listening for jobs on: ...
```
