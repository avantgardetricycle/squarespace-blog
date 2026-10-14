import 'dotenv/config'
import { handleCallback } from '@vercel/queue'
import type { SubscriptionUpdatedPayload } from '../../server/dist/stripe/handlers.js'

export const POST = handleCallback(async (payload: SubscriptionUpdatedPayload) => {
  const { handleSubscriptionDeleted } = await import('../../server/dist/stripe/handlers.js')
  await handleSubscriptionDeleted(payload)
})
