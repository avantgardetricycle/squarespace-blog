ALTER TABLE sites
  ADD COLUMN IF NOT EXISTS squarespace_api_key_invalid_at TIMESTAMPTZ;
ALTER TABLE sites
  ADD COLUMN IF NOT EXISTS squarespace_api_key_alert_email_sent_at TIMESTAMPTZ;
ALTER TABLE sites
  DROP COLUMN IF EXISTS profiles_api_last_alert_at;
