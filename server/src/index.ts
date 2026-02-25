import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import configRoutes from './routes/config.js'
import authRoutes from './routes/auth.js'
import dashboardRoutes from './routes/dashboard.js'
import checkoutRoutes from './routes/checkout.js'
import stripeWebhookRoutes from './routes/stripe-webhook.js'
import { startQueue, stopQueue } from './queue/index.js'

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(
  cors({
    origin: process.env.APP_URL ?? 'http://localhost:3000',
    credentials: true
  })
)

// Stripe webhook MUST use raw body for signature verification - mount before express.json()
app.use(
  '/api/webhooks/stripe',
  express.raw({ type: 'application/json' }),
  stripeWebhookRoutes
)

app.use(express.json())
app.use(cookieParser())

// Routes
app.use('/api/config', configRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/checkout', checkoutRoutes)

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

// Serve renderer.js from scripts/ (single source of truth for both Configure preview and Squarespace loader)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rendererPath = path.join(__dirname, '../../scripts/renderer.js')
if (fs.existsSync(rendererPath)) {
  app.get('/renderer.js', (_req, res) => {
    res.type('application/javascript')
    res.sendFile(rendererPath)
  })
}

// Serve client static files (when client is built and deployed with server)
const clientDist = path.join(__dirname, '../../client/dist')
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist))
  // SPA fallback: serve index.html for non-API routes
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'))
  })
} else {
  // Client not built (e.g. API-only deploy) - show API info at root
  app.get('/', (_req, res) => {
    res.json({ name: 'BetterBlog API', status: 'ok', docs: '/api/health' })
  })
}

const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})

async function main() {
  await startQueue()
  console.log('pg-boss queue ready (workers run on separate dyno)')
}

main().catch((err) => {
  console.error('Failed to start queue:', err)
  process.exit(1)
})

async function shutdown() {
  console.log('Shutting down...')
  server.close()
  await stopQueue()
  process.exit(0)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
