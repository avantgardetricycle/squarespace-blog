import prisma from '../db/index.js'
import { sendProfilesApiAlertEmail } from './email.js'

const COOLDOWN_MS = 6 * 60 * 60 * 1000

export type ProfilesApiFailureReason =
  | 'profiles_unauthorized'
  | 'profiles_forbidden'
  | 'profiles_http_error'
  | 'profiles_api_exception'

export interface ProfilesApiFailureReport {
  siteId: string
  siteKey: string
  siteName: string | null
  siteUrl: string | null
  status: number | null
  reason: ProfilesApiFailureReason
  errorBodySnippet: string | null
  emailHasPlus: boolean
  emailDomain: string | null
  ownerEmails: Array<string | null | undefined>
}

function parseOpsEmails(): string[] {
  const raw = process.env.PROFILES_API_ALERT_EMAIL ?? ''
  return raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
}

function uniqueEmails(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const value of values) {
    const email = typeof value === 'string' ? value.trim().toLowerCase() : ''
    if (!email || !email.includes('@') || seen.has(email)) continue
    seen.add(email)
    out.push(email)
  }
  return out
}

/** Structured Vercel log + throttled email when Squarespace Profiles verification fails. */
export async function reportSquarespaceProfilesApiFailure(
  report: ProfilesApiFailureReport
): Promise<void> {
  const payload = {
    type: 'squarespace-profiles-api',
    siteId: report.siteId,
    siteKey: report.siteKey,
    siteUrl: report.siteUrl,
    status: report.status,
    reason: report.reason,
    emailHasPlus: report.emailHasPlus,
    emailDomain: report.emailDomain,
    errorBodySnippet: report.errorBodySnippet,
  }
  console.error('[BetterBlog alert] squarespace-profiles-api', payload)
  // #region agent log
  fetch('http://127.0.0.1:7454/ingest/babef855-2138-46ca-93cf-7acd45e00ee4', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'd05d9c' },
    body: JSON.stringify({
      sessionId: 'd05d9c',
      runId: 'post-fix',
      hypothesisId: 'H6',
      location: 'profiles-api-alert.ts:report',
      message: 'profiles API failure alert',
      data: payload,
      timestamp: Date.now(),
    }),
  }).catch(() => {})
  // #endregion

  const cutoff = new Date(Date.now() - COOLDOWN_MS)
  const claimed = await prisma.site.updateMany({
    where: {
      id: report.siteId,
      OR: [{ profilesApiLastAlertAt: null }, { profilesApiLastAlertAt: { lt: cutoff } }],
    },
    data: { profilesApiLastAlertAt: new Date() },
  })
  if (claimed.count === 0) {
    console.log('[BetterBlog alert] squarespace-profiles-api throttled', {
      siteId: report.siteId,
      reason: report.reason,
    })
    return
  }

  const recipients = uniqueEmails([...parseOpsEmails(), ...report.ownerEmails])
  if (recipients.length === 0) {
    console.warn('[BetterBlog alert] squarespace-profiles-api no recipients', {
      siteId: report.siteId,
      hint: 'Set PROFILES_API_ALERT_EMAIL',
    })
    return
  }

  await sendProfilesApiAlertEmail(recipients, {
    siteName: report.siteName || report.siteKey,
    siteUrl: report.siteUrl,
    siteKey: report.siteKey,
    status: report.status,
    reason: report.reason,
    errorBodySnippet: report.errorBodySnippet,
    emailDomain: report.emailDomain,
    emailHasPlus: report.emailHasPlus,
  })
}
