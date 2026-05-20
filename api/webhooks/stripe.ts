import 'dotenv/config'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { processStripeWebhook } from '../../server/dist/stripe/webhook.js'

export const config = {
  api: {
    bodyParser: false
  }
}

async function readRawBody(req: VercelRequest): Promise<Buffer> {
  if (Buffer.isBuffer(req.body)) {
    return req.body
  }
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    const rawBody = await readRawBody(req)
    const result = await processStripeWebhook(rawBody, req.headers['stripe-signature'] as string | undefined)
    res.status(result.status).json(result.body)
  } catch (err) {
    console.error('[api/webhooks/stripe]', err)
    res.status(500).json({ error: 'Webhook handler failed' })
  }
}
