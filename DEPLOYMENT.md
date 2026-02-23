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

By default, only the web dyno runs. Enable the worker for each app:

```bash
heroku ps:scale worker=1 -a your-staging-app
heroku ps:scale worker=1 -a your-prod-app
```

## Deploy

```bash
git push heroku main
# or, for pipeline: connect GitHub and use automatic deploys
```

## Stripe Webhooks

Create separate webhook endpoints for staging and prod:

- Staging: `https://your-staging-app.herokuapp.com/api/webhooks/stripe`
- Prod: `https://your-prod-app.herokuapp.com/api/webhooks/stripe`

Use the corresponding signing secret in each app's config.
