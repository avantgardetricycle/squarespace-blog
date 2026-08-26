/**
 * Database connection helpers for Prisma + pg adapter.
 *
 * - Local: plain DATABASE_URL, no SSL.
 * - Supabase: pooled DATABASE_URL (port 6543, pgbouncer) at runtime; DIRECT_URL for migrations.
 * - Heroku (legacy): strip sslmode from URL and use rejectUnauthorized: false.
 */
function appendPoolerQueryParams(url: string): string {
  try {
    const parsed = new URL(url)
    if (!parsed.searchParams.has('pgbouncer') && parsed.port === '6543') {
      parsed.searchParams.set('pgbouncer', 'true')
    }
    if (!parsed.searchParams.has('connect_timeout')) {
      parsed.searchParams.set('connect_timeout', '15')
    }
    return parsed.toString()
  } catch {
    return url
  }
}

export function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error('DATABASE_URL is required')
  }
  if (!isRemoteDatabase()) {
    return url
  }
  if (isSupabaseDatabase()) {
    return appendPoolerQueryParams(url)
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

/** Set `SUPABASE_SSL_NO_VERIFY=true` in server/.env (local) or CI secrets. */
export function isSupabaseSslNoVerify(): boolean {
  return (process.env.SUPABASE_SSL_NO_VERIFY ?? '').trim().toLowerCase() === 'true'
}

/**
 * Supabase pooler TLS often presents a chain Node/pg rejects (self-signed in chain).
 * Relax verification locally (opt-in), on Vercel, and in GitHub Actions.
 */
export function shouldRelaxSupabaseTls(): boolean {
  return isSupabaseSslNoVerify() || process.env.VERCEL === '1' || process.env.GITHUB_ACTIONS === 'true'
}

/**
 * SSL config for pg when connecting to a remote DB.
 */
export function getSslConfig(): { rejectUnauthorized: boolean } | false {
  if (!isRemoteDatabase()) return false
  if (isSupabaseDatabase()) {
    if (shouldRelaxSupabaseTls()) {
      return { rejectUnauthorized: false }
    }
    return { rejectUnauthorized: true }
  }
  return { rejectUnauthorized: false }
}

/**
 * Append Prisma-compatible sslmode for Supabase TLS issues.
 * Used by prisma.config.ts for CLI commands only.
 */
export function applySupabaseSslModeForPrisma(url: string): string {
  if (!shouldRelaxSupabaseTls() || !url.includes('supabase.co')) return url
  try {
    const parsed = new URL(url)
    if (!parsed.searchParams.has('sslmode')) {
      parsed.searchParams.set('sslmode', 'no-verify')
    }
    return parsed.toString()
  } catch {
    return url
  }
}
