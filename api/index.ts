import 'dotenv/config'
import serverless from 'serverless-http'
import type { VercelRequest, VercelResponse } from '@vercel/node'

type ServerlessHandler = (
  req: VercelRequest,
  res: VercelResponse
) => void | Promise<unknown>

let cached: ServerlessHandler | null = null

async function getHandler(): Promise<ServerlessHandler> {
  if (!cached) {
    const { createApp } = await import('../server/dist/app.js')
    cached = serverless(createApp({ mountStripeWebhook: false })) as ServerlessHandler
  }
  return cached
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const fn = await getHandler()
  return fn(req, res)
}
