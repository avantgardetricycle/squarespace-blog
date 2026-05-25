# Migrating Postgres from Heroku to Supabase

This is a one-time cutover checklist. The application code expects:

- `DATABASE_URL` — Supabase **transaction pooler** (port `6543`) for Vercel/server runtime
- `DIRECT_URL` — Supabase **session** connection (port `5432`) for Prisma CLI and GitHub Actions migrations

See **[SUPABASE_CONNECTION.md](./SUPABASE_CONNECTION.md)** for correct URI format, password encoding, and why `supabase db push` does not create Prisma tables.

## Steps

1. Create a Supabase project in the same region you plan to use on Vercel when possible.
2. Copy connection strings from **Project Settings → Database**.
3. Export Heroku data:
   ```bash
   heroku pg:backups:capture -a your-heroku-app
   heroku pg:backups:download -a your-heroku-app -o heroku.dump
   ```
4. Restore into Supabase (use Supabase docs for `pg_restore` / SQL import with your direct URL).
5. Apply any schema drift after restore:
   ```bash
   cd server
   DIRECT_URL="postgresql://..." DATABASE_URL="$DIRECT_URL" npx prisma db push
   for f in prisma/migrations/*.sql; do npx prisma db execute --file "$f"; done
   ```
6. Optional: drop unused `pgboss` schema if it existed on the old database:
   ```sql
   DROP SCHEMA IF EXISTS pgboss CASCADE;
   ```
7. Point Vercel env vars at the new `DATABASE_URL` / `DIRECT_URL`, deploy, and update Stripe webhook URL.
