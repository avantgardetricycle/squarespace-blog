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
