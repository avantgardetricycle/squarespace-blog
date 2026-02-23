/**
 * Returns DATABASE_URL for database connections.
 * For remote (Heroku): we strip sslmode from the URL so our ssl: { rejectUnauthorized: false }
 * config takes effect. Including sslmode=require in the URL would overwrite that and cause
 * "unable to get local issuer certificate" on Heroku dynos.
 */
export function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error('DATABASE_URL is required')
  }
  if (!isRemoteDatabase()) {
    return url
  }
  // Strip sslmode so our ssl config object is used instead
  return url
    .replace(/[?&]sslmode=[^&]+/g, '')
    .replace(/\?&/, '?')
    .replace(/\?$/, '')
}

/** Whether we're connecting to a remote DB (e.g. Heroku) */
export function isRemoteDatabase(): boolean {
  const url = process.env.DATABASE_URL ?? ''
  return !url.includes('localhost') && !url.includes('127.0.0.1')
}

/**
 * SSL config for pg when connecting to Heroku Postgres.
 * Heroku dynos lack the full CA chain, causing "unable to get local issuer certificate".
 * rejectUnauthorized: false is the standard workaround for Heroku + pg.
 */
export function getSslConfig(): { rejectUnauthorized: false } | false {
  return isRemoteDatabase() ? { rejectUnauthorized: false } : false
}
