import 'dotenv/config'
import { handleCallback } from '@vercel/queue'
import {
  handleSubscriptionUpdated,
  type SubscriptionUpdatedPayload
} from '../../server/dist/stripe/handlers.js'

export const POST = handleCallback(async (payload: SubscriptionUpdatedPayload) => {
  await handleSubscriptionUpdated(payload)
})
