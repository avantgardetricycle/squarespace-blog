/**
 * Returns DATABASE_URL with SSL enforced for Heroku Postgres.
 * Heroku requires encrypted connections; without sslmode=require, connections fail with
 * "no pg_hba.conf entry for host ... no encryption".
 */
export function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error('DATABASE_URL is required')
  }
  if (url.includes('sslmode=')) {
    return url
  }
  // Only add sslmode for non-localhost (e.g. Heroku)
  const isRemote = !url.includes('localhost') && !url.includes('127.0.0.1')
  if (!isRemote) {
    return url
  }
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}sslmode=require`
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
