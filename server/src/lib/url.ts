/**
 * Base URL for app links (magic links, checkout redirects, etc.).
 */
export function getAppUrl(): string {
  const url = process.env.APP_URL ?? 'http://localhost:3000'
  return url.replace(/\/$/, '')
}

/** Public support portal URL, linked from transactional emails. */
export function getSupportPortalUrl(): string {
  return `${getAppUrl()}/support`
}
