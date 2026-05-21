import 'dotenv/config'
import serverless from 'serverless-http'
import type { VercelRequest, VercelResponse } from '@vercel/node'

type ServerlessHandler = (
  req: VercelRequest,
  res: VercelResponse
) => void | Promise<unknown>

let cached: ServerlessHandler | null = null

function debugLog(hypothesisId: string, message: string, data: Record<string, unknown> = {}): void {
  const payload = {
    sessionId: '3103d6',
    hypothesisId,
    message,
    data: { ...data, vercel: process.env.VERCEL === '1' },
    timestamp: Date.now(),
  }
  console.info('[BetterBlog/debug]', JSON.stringify(payload))
}

async function getHandler(): Promise<ServerlessHandler> {
  if (!cached) {
    const t0 = Date.now()
    debugLog('A', 'getHandler: import app start')
    const { createApp } = await import('../server/dist/app.js')
    debugLog('A', 'getHandler: import app done', { ms: Date.now() - t0 })
    const t1 = Date.now()
    cached = serverless(createApp({ mountStripeWebhook: false })) as ServerlessHandler
    debugLog('B', 'getHandler: serverless wrap done', { ms: Date.now() - t1 })
  }
  return cached
}

export default async function expressHandler(req: VercelRequest, res: VercelResponse) {
  const t0 = Date.now()
  const incomingUrl = req.url ?? '/'
  // serverless-http reduces rewritten /api/* requests to path /api; pass the real path into Express.
  if (incomingUrl.startsWith('/api/')) {
    req.headers['x-betterblog-original-path'] = incomingUrl
  }
  debugLog('C', 'handler entry', {
    method: req.method,
    url: incomingUrl,
    path: (req as { path?: string }).path,
    forwardedPath: req.headers['x-betterblog-original-path'],
  })
  try {
    const fn = await getHandler()
    debugLog('C', 'handler invoking express', { ms: Date.now() - t0 })
    return await fn(req, res)
  } catch (err) {
    debugLog('C', 'handler error', {
      ms: Date.now() - t0,
      error: err instanceof Error ? err.message : String(err),
    })
    throw err
  }
}
