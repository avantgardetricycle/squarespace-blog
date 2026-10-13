import prisma from '../db/index.js'
import { sendTrialDayFourEmail } from './email.js'
import { getAppUrl } from './url.js'

/** Matches checkout `trial_period_days` when Stripe did not store a period end. */
export const TRIAL_LENGTH_DAYS = 7

const MS_PER_DAY = 24 * 60 * 60 * 1000

/**
 * Day 4 is the 24 hours starting three full days after the trial began.
 * A once-daily job includes every trial currently inside that window.
 */
export function isEnteringTrialDayFour(trialStartedAt: Date, now: Date): boolean {
  const ageMs = now.getTime() - trialStartedAt.getTime()
  return ageMs >= 3 * MS_PER_DAY && ageMs < 4 * MS_PER_DAY
}

export function trialDayFourWindow(now: Date): { after: Date; until: Date } {
  return {
    after: new Date(now.getTime() - 4 * MS_PER_DAY),
    until: new Date(now.getTime() - 3 * MS_PER_DAY),
  }
}

export function resolveTrialEndDate(
  currentPeriodEnd: Date | null | undefined,
  trialStartedAt: Date,
  trialLengthDays = TRIAL_LENGTH_DAYS
): Date | null {
  const end =
    currentPeriodEnd ?? new Date(trialStartedAt.getTime() + trialLengthDays * MS_PER_DAY)
  if (Number.isNaN(end.getTime())) return null
  return end
}

/** UTC calendar date, matching the server clock used for the rest of billing timestamps. */
export function formatTrialEndDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

/** Login page, then Account, where the trial can be reviewed or canceled. */
export function trialReminderLoginUrl(appUrl: string): string {
  const base = appUrl.replace(/\/$/, '')
  const params = new URLSearchParams({ returnTo: '/dashboard/account' })
  return `${base}/login?${params.toString()}`
}

export type TrialDayFourReminderStats = {
  matched: number
  emailed: number
  errors: number
}

export async function sendTrialDayFourReminders(now = new Date()): Promise<TrialDayFourReminderStats> {
  const { after, until } = trialDayFourWindow(now)
  const rows = await prisma.subscription.findMany({
    where: {
      status: 'trialing',
      source: 'stripe',
      trialDayFourEmailSentAt: null,
      createdAt: { gt: after, lte: until },
      OR: [{ currentPeriodEnd: null }, { currentPeriodEnd: { gt: now } }],
    },
    select: {
      id: true,
      createdAt: true,
      currentPeriodEnd: true,
      user: { select: { email: true, name: true } },
    },
  })

  const stats: TrialDayFourReminderStats = { matched: rows.length, emailed: 0, errors: 0 }
  const loginUrl = trialReminderLoginUrl(getAppUrl())

  for (const row of rows) {
    const trialEndsAt = resolveTrialEndDate(row.currentPeriodEnd, row.createdAt)
    if (!trialEndsAt || trialEndsAt.getTime() <= now.getTime()) continue
    if (!isEnteringTrialDayFour(row.createdAt, now)) continue

    const email = row.user.email.trim()
    if (!email) continue

    const claimed = await prisma.subscription.updateMany({
      where: { id: row.id, trialDayFourEmailSentAt: null },
      data: { trialDayFourEmailSentAt: now },
    })
    if (claimed.count === 0) continue

    try {
      await sendTrialDayFourEmail(email, {
        trialEndDate: formatTrialEndDate(trialEndsAt),
        loginUrl,
        recipientName: row.user.name,
      })
      stats.emailed += 1
    } catch (err) {
      stats.errors += 1
      console.error('[trial-day-four] send failed', {
        subscriptionId: row.id,
        error: err instanceof Error ? err.message : String(err),
      })
      await prisma.subscription.update({
        where: { id: row.id },
        data: { trialDayFourEmailSentAt: null },
      })
    }
  }

  console.log('[trial-day-four] cron', stats)
  return stats
}
