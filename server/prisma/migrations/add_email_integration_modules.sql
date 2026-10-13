-- One destination per signup module. API keys stay per platform so a saved Kit or
-- Mailchimp key can be reused by every module that selects that platform.
-- Idempotent: db:migrate re-runs every *.sql after prisma db push.
-- These ALTERs upgrade a site-level row in place when db push has not recreated the table.

ALTER TABLE "site_email_integrations" ADD COLUMN IF NOT EXISTS "destination_kind" TEXT;
ALTER TABLE "site_email_integrations" ADD COLUMN IF NOT EXISTS "tag_id" TEXT;
ALTER TABLE "site_email_integrations" ADD COLUMN IF NOT EXISTS "tag_name" TEXT;
ALTER TABLE "site_email_integrations" ADD COLUMN IF NOT EXISTS "module" TEXT NOT NULL DEFAULT 'collection_newsletter';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_index i
    JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY (i.indkey)
    WHERE i.indrelid = 'site_email_integrations'::regclass
      AND i.indisprimary
      AND a.attname = 'module'
  ) THEN
    ALTER TABLE "site_email_integrations" DROP CONSTRAINT "site_email_integrations_pkey";
    ALTER TABLE "site_email_integrations"
      ADD CONSTRAINT "site_email_integrations_pkey" PRIMARY KEY ("site_id", "module");
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "site_email_credentials" (
    "site_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "api_key_enc" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "site_email_credentials_pkey" PRIMARY KEY ("site_id", "provider")
);

DO $$
BEGIN
  ALTER TABLE "site_email_credentials"
    ADD CONSTRAINT "site_email_credentials_site_id_fkey"
    FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

INSERT INTO "site_email_credentials" ("site_id", "provider", "api_key_enc")
SELECT "site_id", "provider", "api_key_enc"
FROM "site_email_integrations"
WHERE "api_key_enc" IS NOT NULL
  AND "provider" IN ('kit', 'mailchimp')
ON CONFLICT ("site_id", "provider") DO NOTHING;

INSERT INTO "site_email_integrations" (
    "site_id",
    "module",
    "provider",
    "api_key_enc",
    "destination_id",
    "destination_kind",
    "tag_id",
    "tag_name",
    "last_error",
    "last_error_at",
    "last_success_at",
    "updated_at"
)
SELECT
    src."site_id",
    mods.module,
    src."provider",
    src."api_key_enc",
    src."destination_id",
    src."destination_kind",
    src."tag_id",
    src."tag_name",
    src."last_error",
    src."last_error_at",
    src."last_success_at",
    src."updated_at"
FROM "site_email_integrations" src
CROSS JOIN (
    VALUES ('post_newsletter'), ('collection_lead_magnet'), ('post_lead_magnet')
) AS mods(module)
WHERE src."module" = 'collection_newsletter'
  AND NOT EXISTS (
    SELECT 1
    FROM "site_email_integrations" existing
    WHERE existing."site_id" = src."site_id"
      AND existing."module" = mods.module
  );
