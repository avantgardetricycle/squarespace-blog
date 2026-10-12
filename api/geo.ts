import type { VercelRequest, VercelResponse } from '@vercel/node'

/**
 * Returns the visitor's country (two-letter ISO code) so the site knows
 * whether to ask for cookie consent before starting Google Analytics.
 *
 * Vercel adds `x-vercel-ip-country` to every request. Nothing is stored or
 * logged here, and the IP address itself is never returned.
 * Routed explicitly in vercel.json so it is not handled by api/index.ts
 * (no Express/Prisma cold start).
 */
export default function handler(req: VercelRequest, res: VercelResponse) {
  const raw = req.headers['x-vercel-ip-country']
  const value = Array.isArray(raw) ? raw[0] : raw
  const country = typeof value === 'string' && /^[A-Za-z]{2}$/.test(value) ? value.toUpperCase() : null
  // Per-visitor answer: never let a shared cache serve one country to everyone.
  res.setHeader('Cache-Control', 'private, no-store')
  res.status(200).json({ country })
}
