import 'dotenv/config'
import type { VercelRequest, VercelResponse } from '@vercel/node'

type ExpressHandler = (
  req: VercelRequest,
  res: VercelResponse,
  next?: (err?: unknown) => void
) => void

let cached: ExpressHandler | null = null

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

async function getHandler(): Promise<ExpressHandler> {
  if (!cached) {
    const t0 = Date.now()
    debugLog('A', 'getHandler: import app start')
    const { createApp } = await import('../server/dist/app.js')
    debugLog('A', 'getHandler: import app done', { ms: Date.now() - t0 })
    const t1 = Date.now()
    cached = createApp({ mountStripeWebhook: false }) as ExpressHandler
    debugLog('B', 'getHandler: express app created', { ms: Date.now() - t1 })
  }
  return cached
}

function runExpress(handler: ExpressHandler, req: VercelRequest, res: VercelResponse): Promise<void> {
  return new Promise((resolve, reject) => {
    let settled = false

    const cleanup = () => {
      res.off('finish', onFinish)
      res.off('close', onClose)
    }

    const settle = (event: 'finish' | 'close') => {
      if (settled) return
      settled = true
      cleanup()
      debugLog('K', 'vercel response completed', {
        event,
        headersSent: res.headersSent,
        statusCode: res.statusCode,
      })
      resolve()
    }

    const fail = (err: unknown) => {
      if (settled) return
      settled = true
      cleanup()
      reject(err)
    }

    const onFinish = () => settle('finish')
    const onClose = () => settle('close')

    res.once('finish', onFinish)
    res.once('close', onClose)

    try {
      handler(req, res, (err?: unknown) => {
        if (err) {
          fail(err)
          return
        }
        if (!res.headersSent && !(res as { writableEnded?: boolean }).writableEnded) {
          res.status(404).send('Not Found')
        }
      })
    } catch (err) {
      fail(err)
    }
  })
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
    await runExpress(fn, req, res)
    debugLog('J', 'handler express returned', {
      ms: Date.now() - t0,
      headersSent: res.headersSent,
      statusCode: res.statusCode,
    })
  } catch (err) {
    debugLog('C', 'handler error', {
      ms: Date.now() - t0,
      error: err instanceof Error ? err.message : String(err),
    })
    throw err
  }
}
