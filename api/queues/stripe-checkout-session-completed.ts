import 'dotenv/config'
import { handleCallback } from '@vercel/queue'
import type { CheckoutSessionCompletedPayload } from '../../server/dist/stripe/handlers.js'

export const POST = handleCallback(async (payload: CheckoutSessionCompletedPayload) => {
  const { handleCheckoutSessionCompleted } = await import('../../server/dist/stripe/handlers.js')
  await handleCheckoutSessionCompleted(payload)
})
