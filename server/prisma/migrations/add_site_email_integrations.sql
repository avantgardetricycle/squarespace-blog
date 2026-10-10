-- Site-level email destination (BetterBlog, Kit, or Mailchimp).
-- Idempotent: db:migrate re-runs every *.sql after prisma db push.
CREATE TABLE IF NOT EXISTS "site_email_integrations" (
    "site_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'betterblog',
    "api_key_enc" TEXT,
    "destination_id" TEXT,
    "last_error" TEXT,
    "last_error_at" TIMESTAMP(3),
    "last_success_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "site_email_integrations_pkey" PRIMARY KEY ("site_id")
);

DO $$
BEGIN
  ALTER TABLE "site_email_integrations"
    ADD CONSTRAINT "site_email_integrations_site_id_fkey"
    FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
