CREATE TABLE IF NOT EXISTS commenter_otp_challenges (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  hostname TEXT NOT NULL,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  ip TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS commenter_otp_challenges_hostname_email_created_at_idx
  ON commenter_otp_challenges (hostname, email, created_at);

CREATE INDEX IF NOT EXISTS commenter_otp_challenges_ip_created_at_idx
  ON commenter_otp_challenges (ip, created_at);

CREATE TABLE IF NOT EXISTS commenter_sessions (
  id TEXT PRIMARY KEY,
  site_id TEXT REFERENCES sites(id) ON DELETE SET NULL,
  hostname TEXT NOT NULL,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_extended_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  ip TEXT,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS commenter_sessions_hostname_email_idx
  ON commenter_sessions (hostname, email);

CREATE TABLE IF NOT EXISTS commenter_auth_events (
  id TEXT PRIMARY KEY,
  ip TEXT NOT NULL,
  kind TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS commenter_auth_events_ip_kind_created_at_idx
  ON commenter_auth_events (ip, kind, created_at);

ALTER TABLE comments ADD COLUMN IF NOT EXISTS commenter_session_id TEXT REFERENCES commenter_sessions(id) ON DELETE SET NULL;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS client_reported_logged_in BOOLEAN;
