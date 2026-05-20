import 'dotenv/config'
import { handleCallback } from '@vercel/queue'
import {
  handleCheckoutSessionCompleted,
  type CheckoutSessionCompletedPayload
} from '../../server/dist/stripe/handlers.js'

export const POST = handleCallback(async (payload: CheckoutSessionCompletedPayload) => {
  await handleCheckoutSessionCompleted(payload)
})
