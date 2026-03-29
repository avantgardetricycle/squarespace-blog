ALTER TABLE sites
ADD COLUMN IF NOT EXISTS paywall_mode TEXT NOT NULL DEFAULT 'auto',
ADD COLUMN IF NOT EXISTS paywall_detection_state TEXT NOT NULL DEFAULT 'unknown',
ADD COLUMN IF NOT EXISTS paywall_detection_source TEXT;
