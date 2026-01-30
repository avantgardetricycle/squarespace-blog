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
