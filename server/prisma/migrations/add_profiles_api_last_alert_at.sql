ALTER TABLE sites
  ADD COLUMN IF NOT EXISTS profiles_api_last_alert_at TIMESTAMPTZ;
