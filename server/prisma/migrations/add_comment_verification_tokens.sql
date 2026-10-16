CREATE TABLE IF NOT EXISTS comment_verification_tokens (
  token TEXT PRIMARY KEY,
  site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL,
  custom_name BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS comment_verification_tokens_site_id_idx
  ON comment_verification_tokens (site_id);

CREATE INDEX IF NOT EXISTS comment_verification_tokens_expires_at_idx
  ON comment_verification_tokens (expires_at);
