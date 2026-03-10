-- Drop api_secret from site_google_analytics (API secret now from env only)
ALTER TABLE "site_google_analytics" DROP COLUMN IF EXISTS "api_secret";
