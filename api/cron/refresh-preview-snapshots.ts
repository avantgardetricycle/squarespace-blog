import 'dotenv/config'
import type { VercelRequest, VercelResponse } from '@vercel/node'

/**
 * Daily refresh of stale customizer preview snapshots.
 * Routed explicitly in vercel.json so it is not handled by api/index.ts.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const secret = process.env.CRON_SECRET
  if (!secret) {
    console.error('[api/cron/refresh-preview-snapshots] CRON_SECRET is not configured')
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
    const { refreshStaleCollectionSnapshots } = await import('../../server/dist/lib/preview-snapshot.js')
    const stats = await refreshStaleCollectionSnapshots(5)
    res.setHeader('Cache-Control', 'no-store')
    res.status(200).json({ ok: true, ...stats })
  } catch (err) {
    console.error('[api/cron/refresh-preview-snapshots]', err)
    res.status(500).json({ error: 'Cron failed' })
  }
}
