import 'dotenv/config'
import { handleCallback } from '@vercel/queue'
import type { InvoiceSubscriptionPayload } from '../../server/dist/stripe/handlers.js'

export const POST = handleCallback(async (payload: InvoiceSubscriptionPayload) => {
  const { handleInvoiceSubscriptionSync } = await import('../../server/dist/stripe/handlers.js')
  await handleInvoiceSubscriptionSync(payload)
})
