import 'dotenv/config'
import type { VercelRequest, VercelResponse } from '@vercel/node'

/**
 * Daily reminder for Stripe free trials entering day 4.
 * Schedule is 11:59pm UTC (59 23 * * *). Routed explicitly in vercel.json
 * so it is not handled by api/index.ts.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const secret = process.env.CRON_SECRET
  if (!secret) {
    console.error('[api/cron/trial-day-four-reminder] CRON_SECRET is not configured')
    res.status(500).json({ error: 'CRON_SECRET is not configured' })
    return
  }

  const header = req.headers.authorization
  const token = Array.isArray(header) ? header[0] : header
  if (token !== `Bearer ${secret}`) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  try {
    const { sendTrialDayFourReminders } = await import('../../server/dist/lib/trial-day-reminder.js')
    const stats = await sendTrialDayFourReminders()
    res.setHeader('Cache-Control', 'no-store')
    if (stats.errors > 0) {
      res.status(500).json({ ok: false, ...stats })
      return
    }
    res.status(200).json({ ok: true, ...stats })
  } catch (err) {
    console.error('[api/cron/trial-day-four-reminder]', err)
    res.status(500).json({ error: 'Cron failed' })
  }
}
