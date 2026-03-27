import 'dotenv/config'
import { startQueue, stopQueue } from './queue/index.js'
import { registerStripeWorkers } from './queue/workers.js'
import { getAppUrl } from './lib/url.js'

async function main() {
  const appUrl = getAppUrl()
  console.log('[worker] Starting pg-boss worker...')
  console.log('[worker] APP_URL (magic links & redirects):', appUrl)
  if (!appUrl.includes('localhost') && process.env.NODE_ENV !== 'production') {
    console.warn(
      '[worker] APP_URL is not localhost — onboarding emails will link there, not your local Vite app. For local dev set APP_URL=http://localhost:3000'
    )
  }
  await startQueue()
  await registerStripeWorkers()
  console.log('[worker] pg-boss workers registered. Listening for jobs on:')
  console.log('[worker]   - stripe.checkout.session.completed')
  console.log('[worker]   - stripe.customer.subscription.updated')
}

main().catch((err) => {
  console.error('Failed to start worker:', err)
  process.exit(1)
})

async function shutdown() {
  console.log('Shutting down worker...')
  await stopQueue()
  process.exit(0)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
