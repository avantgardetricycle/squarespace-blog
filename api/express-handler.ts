import 'dotenv/config'
import type { VercelRequest, VercelResponse } from '@vercel/node'

type ExpressHandler = (
  req: VercelRequest,
  res: VercelResponse,
  next?: (err?: unknown) => void
) => void

let cached: ExpressHandler | null = null

async function getHandler(): Promise<ExpressHandler> {
  if (!cached) {
    const { createApp } = await import('../server/dist/app.js')
    cached = createApp({ mountStripeWebhook: false }) as ExpressHandler
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

    const settle = () => {
      if (settled) return
      settled = true
      cleanup()
      resolve()
    }

    const fail = (err: unknown) => {
      if (settled) return
      settled = true
      cleanup()
      reject(err)
    }

    const onFinish = () => settle()
    const onClose = () => settle()

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
  const incomingUrl = req.url ?? '/'
  // #region agent log
  if (incomingUrl.includes('trial-day-four')) {
    console.error('[trial-day-four-debug] catch-all received cron path', {
      at: new Date().toISOString(),
      url: incomingUrl,
      method: req.method ?? null,
      host: req.headers.host ?? null,
    })
    fetch('http://127.0.0.1:7779/ingest/21c07440-19af-4cd8-979a-7d2c134d7467',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'408230'},body:JSON.stringify({sessionId:'408230',hypothesisId:'C',location:'api/express-handler.ts:handler',message:'catch-all received cron path',data:{url:incomingUrl,method:req.method??null,host:req.headers.host??null},timestamp:Date.now()})}).catch(()=>{});
  }
  // #endregion
  // Vercel rewrites /api/* requests to this function; pass the original path into Express.
  if (incomingUrl.startsWith('/api/')) {
    req.headers['x-betterblog-original-path'] = incomingUrl
  }
  const fn = await getHandler()
  await runExpress(fn, req, res)
}
