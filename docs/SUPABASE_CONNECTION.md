# Supabase connection strings (BetterBlog)

This app uses **Prisma**, not Supabase SQL migrations. `supabase link` and `supabase db push` do **not** create tables. Use **`npx prisma db push`** from the `server/` directory.

## Correct URL shapes

Replace `[PASSWORD]` with your database password. If the password contains `@`, `#`, `%`, or `/`, [URL-encode](https://developer.mozilla.org/en-US/docs/Glossary/Percent-encoding) it (e.g. `%` → `%25`).

Project ref in examples: `tpmahlvbytelstlledkz` (from your Supabase host). Region: `aws-1-us-west-2` (from the pooler host in the dashboard).

### `DATABASE_URL` (Vercel / runtime — transaction pooler)

Use **pooler host**, port **6543**, username **`postgres.[project-ref]`**, and `pgbouncer=true` for Prisma:

```bash
postgresql://postgres.tpmahlvbytelstlledkz:[PASSWORD]@aws-1-us-west-2.pooler.supabase.com:6543/postgres?pgbouncer=true
```

### `DIRECT_URL` (Prisma CLI — session pooler or direct)

**Option A — Session pooler (recommended in dashboard “Session mode”):**

```bash
postgresql://postgres.tpmahlvbytelstlledkz:[PASSWORD]@aws-1-us-west-2.pooler.supabase.com:5432/postgres
```

**Option B — Direct database host (bypasses pooler):**

```bash
postgresql://postgres:[PASSWORD]@db.tpmahlvbytelstlledkz.supabase.co:5432/postgres
```

Note: direct host uses username `postgres` (no `.project-ref` suffix). Pooler URLs use `postgres.[project-ref]`.

## What was wrong in staging (common mistakes)

| Variable | Problem |
| -------- | ------- |
| `DATABASE_URL` | Used `db....supabase.co:6543` with user `postgres`. Port 6543 belongs on **`*.pooler.supabase.com`**, not `db.*`. User must be `postgres.[ref]`. Missing `?pgbouncer=true`. |
| `DIRECT_URL` | Shape is close (session pooler on 5432). Use this (or Option B) for `prisma db push`, not the broken `DATABASE_URL`. |

Copy strings from **Supabase → Project Settings → Database → Connect** (URI tab), not from memory.

## Local TLS: `SUPABASE_SSL_NO_VERIFY`

If `npm run db:check` fails with **self-signed certificate in certificate chain**, add to `server/.env`:

```bash
SUPABASE_SSL_NO_VERIFY=true
```

This only affects local `pg` / Prisma CLI connections. Do **not** set this on Vercel.

## Prisma `db push` must use `DIRECT_URL` (port 5432)

If `npx prisma db push` shows **port 6543** in the datasource line, it is using the transaction pooler and may **hang**. Ensure `DIRECT_URL` is set in `server/.env` (session pooler `:5432` or direct `db.[ref].supabase.co:5432`). This repo’s `prisma.config.ts` routes schema commands to `DIRECT_URL` automatically.

## Apply the schema (tables in Table Editor)

1. In Supabase dashboard, confirm project ref matches the host in your URLs (`tpmahlvbytelstlledkz`).
2. Create `server/.env` from `server/.env.example` and set **`DIRECT_URL`** to Option A or B above (with encoded password).
3. From repo root:

   ```bash
   cd server
   npx prisma db push
   ```

4. Apply extra SQL files:

   ```bash
   for f in prisma/migrations/*.sql; do
     echo "Applying $f"
     npx prisma db execute --file "$f"
   done
   ```

5. In Supabase **Table Editor**, schema **`public`**, refresh — you should see `users`, `sites`, `configs`, etc.

6. Test connection:

   ```bash
   npm run db:check --workspace=server
   ```

7. Update **Vercel Preview** env vars with the corrected `DATABASE_URL` and `DIRECT_URL`, then **redeploy**.

## `supabase link` vs this repo

`supabase link` only stores CLI metadata under `supabase/.temp/`. This repo has **no** `supabase/migrations/`. If link points at a **different** project ref than Vercel (`swvod...` vs `tpma...`), CLI commands target the wrong database. Either re-link to the same project you use on Vercel, or ignore Supabase CLI and use Prisma only.

## Password encoding example

If your password is literally `ffY%OtBJ3H8%hrcH`, encode `%` as `%25`:

```text
ffY%25OtBJ3H8%25hrcH
```

Use the encoded value in the connection URI. If login still fails, reset the database password in Supabase to a string without special characters and update Vercel + `server/.env`.
