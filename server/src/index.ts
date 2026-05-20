import 'dotenv/config'
import { createApp } from './app.js'

const PORT = Number(process.env.PORT) || 3001
const HOST = process.env.HOST || '0.0.0.0'

const app = createApp({ mountStripeWebhook: true })

const server = app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`)
  if (process.env.STRIPE_QUEUE_INLINE_FALLBACK !== 'false') {
    console.log(
      'Stripe webhooks: inline processing when Vercel Queues unavailable. For queue e2e use `vercel dev` or set STRIPE_QUEUE_INLINE_FALLBACK=false with queue credentials.'
    )
  }
})

async function shutdown() {
  console.log('Shutting down...')
  server.close()
  process.exit(0)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
})
