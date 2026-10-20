import 'dotenv/config'
import type { VercelRequest, VercelResponse } from '@vercel/node'

// #region agent log
console.error('[trial-day-four-debug] module loaded', { at: new Date().toISOString() })
fetch('http://127.0.0.1:7779/ingest/21c07440-19af-4cd8-979a-7d2c134d7467',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'408230'},body:JSON.stringify({sessionId:'408230',hypothesisId:'D',location:'api/cron/trial-day-four-reminder.ts:module',message:'module loaded',data:{at:new Date().toISOString()},timestamp:Date.now()})}).catch(()=>{});
// #endregion

function headerValue(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

/**
 * Daily reminder for Stripe free trials entering day 4.
 * Schedule is every 10 minutes (`*/10 * * * *`) while testing. Routed explicitly in vercel.json
 * so it is not handled by api/index.ts.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const authorization = headerValue(req.headers.authorization)
  // #region agent log
  console.error('[trial-day-four-debug] handler entered', {
    at: new Date().toISOString(),
    method: req.method ?? null,
    host: headerValue(req.headers.host),
    hasAuthorization: Boolean(authorization),
    hasCronSecret: Boolean(process.env.CRON_SECRET),
    hasVercelCronHeader: Boolean(headerValue(req.headers['x-vercel-cron'])),
  })
  fetch('http://127.0.0.1:7779/ingest/21c07440-19af-4cd8-979a-7d2c134d7467',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'408230'},body:JSON.stringify({sessionId:'408230',hypothesisId:'A',location:'api/cron/trial-day-four-reminder.ts:handler',message:'handler entered',data:{method:req.method??null,host:headerValue(req.headers.host),hasAuthorization:Boolean(authorization),hasCronSecret:Boolean(process.env.CRON_SECRET),hasVercelCronHeader:Boolean(headerValue(req.headers['x-vercel-cron']))},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  console.log('[api/cron/trial-day-four-reminder] invoked', {
    at: new Date().toISOString(),
    method: req.method ?? null,
    hasAuthorization: Boolean(authorization),
    userAgent: headerValue(req.headers['user-agent']),
  })

  if (req.method !== 'GET' && req.method !== 'POST') {
    console.log('[api/cron/trial-day-four-reminder] rejected', { reason: 'method' })
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const secret = process.env.CRON_SECRET
  if (!secret) {
    console.error('[api/cron/trial-day-four-reminder] CRON_SECRET is not configured')
    res.status(500).json({ error: 'CRON_SECRET is not configured' })
    return
  }

  if (authorization !== `Bearer ${secret}`) {
    console.log('[api/cron/trial-day-four-reminder] rejected', { reason: 'unauthorized' })
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  try {
    console.log('[api/cron/trial-day-four-reminder] sending')
    // #region agent log
    console.error('[trial-day-four-debug] importing reminder')
    fetch('http://127.0.0.1:7779/ingest/21c07440-19af-4cd8-979a-7d2c134d7467',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'408230'},body:JSON.stringify({sessionId:'408230',hypothesisId:'C',location:'api/cron/trial-day-four-reminder.ts:import',message:'importing reminder',data:{},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    const { sendTrialDayFourReminders } = await import('../../server/dist/lib/trial-day-reminder.js')
    const stats = await sendTrialDayFourReminders()
    console.log('[api/cron/trial-day-four-reminder] finished', stats)
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
