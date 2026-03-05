-- Add social_media_links column to site_configs.
-- Run with: psql $DATABASE_URL -f prisma/add_social_media_links.sql
-- Or with Prisma: npx prisma db push
ALTER TABLE "site_configs" ADD COLUMN IF NOT EXISTS "social_media_links" JSONB;
