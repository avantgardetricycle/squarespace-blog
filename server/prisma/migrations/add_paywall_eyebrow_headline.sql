-- Configurable paywall footer eyebrow and headline copy
ALTER TABLE site_paywall_settings
  ADD COLUMN IF NOT EXISTS eyebrow_text VARCHAR(80),
  ADD COLUMN IF NOT EXISTS headline_text VARCHAR(160);
