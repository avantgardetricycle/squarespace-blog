-- Paywall footer / subscribe settings per site (BetterBlog dashboard)
CREATE TABLE IF NOT EXISTS site_paywall_settings (
  site_id TEXT PRIMARY KEY REFERENCES sites(id) ON DELETE CASCADE,
  subscribe_url TEXT,
  footer_description VARCHAR(160),
  feature_items TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
