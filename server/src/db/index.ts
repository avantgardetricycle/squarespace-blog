import Database from 'better-sqlite3'
import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const db = new Database(join(__dirname, '../../data.db'))

// Enable foreign keys
db.pragma('foreign_keys = ON')

// Initialize schema
const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8')
db.exec(schema)

// Seed demo user if not exists
const demoUser = db.prepare('SELECT * FROM users WHERE token = ?').get('demo-token-123')
if (!demoUser) {
  db.prepare('INSERT INTO users (token, email) VALUES (?, ?)').run('demo-token-123', 'demo@example.com')
  const user = db.prepare('SELECT id FROM users WHERE token = ?').get('demo-token-123') as { id: number }
  const defaultConfig = JSON.stringify({
    layout: 'grid',
    postsPerPage: 9,
    showExcerpt: true,
    showDate: true,
    showAuthor: false,
    rendererUrl: '/renderer.js'
  })
  db.prepare('INSERT INTO configs (user_id, config_json) VALUES (?, ?)').run(user.id, defaultConfig)
}

// Seed demo site and its config if not exists
const demoSite = db.prepare('SELECT * FROM sites WHERE site_key = ?').get('demo-site-key') as { id: string } | undefined
const defaultConfig = JSON.stringify({
  showAuthor: false,
  showDate: true,
  showTableOfContents: false,
  tableOfContentsPosition: 'left',
  showProgressBar: false,
  showRecentPostsSidebar: false,
  recentPostsCount: 5,
  sidebarPosition: 'left',
  rendererUrl: 'https://avantgardetricycle.github.io/squarespace-blog/renderer.js'
})
if (!demoSite) {
  db.prepare(
    'INSERT INTO sites (site_key, name, status, channel) VALUES (?, ?, ?, ?)'
  ).run('demo-site-key', 'Demo Site', 'active', 'stable')
  const site = db.prepare('SELECT id FROM sites WHERE site_key = ?').get('demo-site-key') as { id: string }
  db.prepare(
    'INSERT INTO site_configs (site_id, version, config_json, is_active) VALUES (?, ?, ?, ?)'
  ).run(site.id, 1, defaultConfig, 1)
} else {
  const activeConfig = db.prepare(
    'SELECT id FROM site_configs WHERE site_id = ? AND is_active = 1'
  ).get(demoSite.id)
  if (!activeConfig) {
    db.prepare(
      'INSERT INTO site_configs (site_id, version, config_json, is_active) VALUES (?, ?, ?, ?)'
    ).run(demoSite.id, 1, defaultConfig, 1)
  }
}

export interface Site {
  id: string
  site_key: string
  name: string | null
  status: string
  channel: string
  created_at: string
  updated_at: string
}

export interface SiteConfig {
  id: string
  site_id: string
  version: number
  config_json: string
  is_active: number
  created_at: string
}

export function getSiteBySiteKey(siteKey: string): Site | undefined {
  return db.prepare('SELECT * FROM sites WHERE site_key = ?').get(siteKey) as Site | undefined
}

export function getActiveSiteConfig(siteId: string): SiteConfig | undefined {
  return db.prepare(
    'SELECT * FROM site_configs WHERE site_id = ? AND is_active = 1 LIMIT 1'
  ).get(siteId) as SiteConfig | undefined
}

export function upsertSiteConfig(siteId: string, configJson: string): void {
  const insert = db.transaction(() => {
    db.prepare('UPDATE site_configs SET is_active = 0 WHERE site_id = ? AND is_active = 1').run(siteId)
    const row = db.prepare(
      'SELECT COALESCE(MAX(version), 0) + 1 AS next_version FROM site_configs WHERE site_id = ?'
    ).get(siteId) as { next_version: number }
    db.prepare(
      'INSERT INTO site_configs (site_id, version, config_json, is_active) VALUES (?, ?, ?, ?)'
    ).run(siteId, row.next_version, configJson, 1)
  })
  insert()
}

export interface User {
  id: number
  token: string
  email: string | null
  created_at: string
}

export interface Config {
  id: number
  user_id: number
  config_json: string
  updated_at: string
}

export function getUserByToken(token: string): User | undefined {
  return db.prepare('SELECT * FROM users WHERE token = ?').get(token) as User | undefined
}

export function getConfigByUserId(userId: number): Config | undefined {
  return db.prepare('SELECT * FROM configs WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1').get(userId) as Config | undefined
}

export function upsertConfig(userId: number, configJson: string): void {
  const existing = getConfigByUserId(userId)
  if (existing) {
    db.prepare('UPDATE configs SET config_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(configJson, existing.id)
  } else {
    db.prepare('INSERT INTO configs (user_id, config_json) VALUES (?, ?)').run(userId, configJson)
  }
}

export default db
