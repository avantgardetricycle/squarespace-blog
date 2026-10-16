-- Website and per-website blog caps. Existing numeric limits are copied onto
-- both new columns so a current subscription is not tightened. Null max_sites
-- (unlimited Publication or beta) stays unlimited.
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "max_websites" INTEGER;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "max_blogs_per_website" INTEGER;
ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "max_websites" INTEGER;
ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "max_blogs_per_website" INTEGER;

UPDATE "subscriptions"
SET
  "max_websites" = "max_sites",
  "max_blogs_per_website" = "max_sites"
WHERE "max_websites" IS NULL
  AND "max_blogs_per_website" IS NULL
  AND "max_sites" IS NOT NULL;

UPDATE "plans"
SET
  "max_websites" = CASE "plan_key"
    WHEN 'essentials' THEN 1
    WHEN 'professional' THEN 1
    WHEN 'publication' THEN 1
    WHEN 'studio' THEN 10
    ELSE "max_websites"
  END,
  "max_blogs_per_website" = CASE "plan_key"
    WHEN 'essentials' THEN 1
    WHEN 'professional' THEN 2
    WHEN 'publication' THEN 3
    WHEN 'studio' THEN 3
    ELSE "max_blogs_per_website"
  END,
  "max_sites" = CASE "plan_key"
    WHEN 'essentials' THEN 1
    WHEN 'professional' THEN 2
    WHEN 'publication' THEN 3
    WHEN 'studio' THEN 30
    ELSE "max_sites"
  END
WHERE "plan_key" IN ('essentials', 'professional', 'publication', 'studio');
