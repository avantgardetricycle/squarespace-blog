CREATE TABLE IF NOT EXISTS preview_snapshots (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  page_kind TEXT NOT NULL,
  source_path TEXT NOT NULL,
  html TEXT NOT NULL,
  quality TEXT NOT NULL,
  byte_size INTEGER NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (site_id, page_kind, source_path)
);

CREATE INDEX IF NOT EXISTS preview_snapshots_site_fetched_at_idx ON preview_snapshots (site_id, fetched_at);
