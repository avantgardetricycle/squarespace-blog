-- Users table: stores user accounts and their unique tokens
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token TEXT UNIQUE NOT NULL,
  email TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Configs table: stores user blog configurations as JSON
CREATE TABLE IF NOT EXISTS configs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  config_json TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_users_token ON users(token);

-- Index for user_id foreign key
CREATE INDEX IF NOT EXISTS idx_configs_user_id ON configs(user_id);

-- Sites table: stores site identity, rollout channel, and lifecycle state
CREATE TABLE IF NOT EXISTS sites (
  id TEXT PRIMARY KEY NOT NULL DEFAULT (
    lower(hex(randomblob(4))) || '-' ||
    lower(hex(randomblob(2))) || '-' ||
    '4' || substr(lower(hex(randomblob(2))), 2) || '-' ||
    substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))), 2) || '-' ||
    lower(hex(randomblob(6)))
  ),
  site_key TEXT NOT NULL UNIQUE,
  name TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  channel TEXT NOT NULL DEFAULT 'stable' CHECK (channel IN ('stable', 'beta')),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Explicit index for site_key lookups from public script key
CREATE INDEX IF NOT EXISTS idx_sites_site_key ON sites(site_key);

-- Site domains table: hostnames mapped to a site
CREATE TABLE IF NOT EXISTS site_domains (
  id TEXT PRIMARY KEY NOT NULL DEFAULT (
    lower(hex(randomblob(4))) || '-' ||
    lower(hex(randomblob(2))) || '-' ||
    '4' || substr(lower(hex(randomblob(2))), 2) || '-' ||
    substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))), 2) || '-' ||
    lower(hex(randomblob(6)))
  ),
  site_id TEXT NOT NULL,
  hostname TEXT NOT NULL,
  is_primary INTEGER NOT NULL DEFAULT 0 CHECK (is_primary IN (0, 1)),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
);

-- Index for site_id foreign key
CREATE INDEX IF NOT EXISTS idx_site_domains_site_id ON site_domains(site_id);

-- Site configs table: versioned config blobs for each site
CREATE TABLE IF NOT EXISTS site_configs (
  id TEXT PRIMARY KEY NOT NULL DEFAULT (
    lower(hex(randomblob(4))) || '-' ||
    lower(hex(randomblob(2))) || '-' ||
    '4' || substr(lower(hex(randomblob(2))), 2) || '-' ||
    substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))), 2) || '-' ||
    lower(hex(randomblob(6)))
  ),
  site_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  config_json TEXT NOT NULL CHECK (json_valid(config_json)),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
);

-- Index for site_id foreign key
CREATE INDEX IF NOT EXISTS idx_site_configs_site_id ON site_configs(site_id);

-- Ensure a site has at most one active config
CREATE UNIQUE INDEX IF NOT EXISTS idx_site_configs_one_active_per_site
ON site_configs(site_id)
WHERE is_active = 1;

-- Subscriptions table: billing plan and lifecycle state per site
CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY NOT NULL DEFAULT (
    lower(hex(randomblob(4))) || '-' ||
    lower(hex(randomblob(2))) || '-' ||
    '4' || substr(lower(hex(randomblob(2))), 2) || '-' ||
    substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))), 2) || '-' ||
    lower(hex(randomblob(6)))
  ),
  site_id TEXT NOT NULL UNIQUE,
  plan TEXT NOT NULL CHECK (plan IN ('free', 'starter', 'pro', 'agency')),
  status TEXT NOT NULL CHECK (status IN ('trialing', 'active', 'past_due', 'canceled')),
  current_period_end DATETIME,
  cancel_at_period_end INTEGER NOT NULL DEFAULT 0 CHECK (cancel_at_period_end IN (0, 1)),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
);

-- Keep updated_at in sync whenever a subscription row changes
CREATE TRIGGER IF NOT EXISTS trg_subscriptions_updated_at
AFTER UPDATE ON subscriptions
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE subscriptions
  SET updated_at = CURRENT_TIMESTAMP
  WHERE id = OLD.id;
END;

-- Keep updated_at in sync whenever a site row changes
CREATE TRIGGER IF NOT EXISTS trg_sites_updated_at
AFTER UPDATE ON sites
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE sites
  SET updated_at = CURRENT_TIMESTAMP
  WHERE id = OLD.id;
END;
