-- Kit can target a form or a tag. Mailchimp can add an optional audience tag.
-- Idempotent: db:migrate re-runs every *.sql after prisma db push.
ALTER TABLE "site_email_integrations" ADD COLUMN IF NOT EXISTS "destination_kind" TEXT;
ALTER TABLE "site_email_integrations" ADD COLUMN IF NOT EXISTS "tag_id" TEXT;
ALTER TABLE "site_email_integrations" ADD COLUMN IF NOT EXISTS "tag_name" TEXT;
