import 'dotenv/config'
import { startQueue, stopQueue } from './queue/index.js'
import { registerStripeWorkers } from './queue/workers.js'

async function main() {
  console.log('[worker] Starting pg-boss worker...')
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
