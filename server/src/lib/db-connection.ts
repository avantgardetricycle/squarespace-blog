/**
 * Database connection helpers for Prisma + pg adapter.
 *
 * - Local: plain DATABASE_URL, no SSL.
 * - Supabase: pooled DATABASE_URL (port 6543, pgbouncer) at runtime; DIRECT_URL for migrations.
 * - Heroku (legacy): strip sslmode from URL and use rejectUnauthorized: false.
 */
export function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error('DATABASE_URL is required')
  }
  if (!isRemoteDatabase()) {
    return url
  }
  if (isSupabaseDatabase()) {
    return url
  }
  // Heroku: strip sslmode so our ssl config object is used instead
  return url
    .replace(/[?&]sslmode=[^&]+/g, '')
    .replace(/\?&/, '?')
    .replace(/\?$/, '')
}

export function isRemoteDatabase(): boolean {
  const url = process.env.DATABASE_URL ?? ''
  return !url.includes('localhost') && !url.includes('127.0.0.1')
}

export function isSupabaseDatabase(): boolean {
  const url = process.env.DATABASE_URL ?? ''
  const direct = process.env.DIRECT_URL ?? ''
  return url.includes('supabase.co') || direct.includes('supabase.co')
}

/**
 * SSL config for pg when connecting to a remote DB.
 */
export function getSslConfig(): { rejectUnauthorized: boolean } | false {
  if (!isRemoteDatabase()) return false
  if (isSupabaseDatabase()) {
    return { rejectUnauthorized: true }
  }
  return { rejectUnauthorized: false }
}
