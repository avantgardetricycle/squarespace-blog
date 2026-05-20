import 'dotenv/config'
import { handleCallback } from '@vercel/queue'
import type { SubscriptionUpdatedPayload } from '../../server/dist/stripe/handlers.js'

export const POST = handleCallback(async (payload: SubscriptionUpdatedPayload) => {
  const { handleSubscriptionUpdated } = await import('../../server/dist/stripe/handlers.js')
  await handleSubscriptionUpdated(payload)
})
