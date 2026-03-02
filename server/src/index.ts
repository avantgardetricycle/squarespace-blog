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
import blogAuthorsRoutes from './routes/blog-authors.js'
import { startQueue, stopQueue } from './queue/index.js'

const app = express()
const PORT = process.env.PORT || 3001

app.set('trust proxy', 1)

// Stripe webhook MUST use raw body for signature verification - mount before express.json()
app.use(
  '/api/webhooks/stripe',
  express.raw({ type: 'application/json' }),
  stripeWebhookRoutes
)

app.use(express.json())
app.use(cookieParser())

// Config endpoint: allow any origin (loader runs on user blogs - arbitrary custom domains)
// credentials: true so Configure page can POST with session cookie; loader uses GET without credentials
// Must be after cookieParser so POST /api/config receives the session cookie
// Must be before general CORS so permissive CORS applies to config routes
app.use('/api/config', cors({ origin: true, credentials: true }), configRoutes)

// All other routes: strict CORS (app origin only)
const appOrigin = (process.env.APP_URL ?? 'http://localhost:3000').replace(/\/$/, '')
app.use(
  cors({
    origin: appOrigin,
    credentials: true
  })
)
app.use('/api/auth', authRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/blog-authors', blogAuthorsRoutes)
app.use('/api/checkout', checkoutRoutes)

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

// Serve loader.js and renderer.js from scripts/ (for Squarespace code injection)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const scriptsDir = path.join(__dirname, '../../scripts')
const rendererPath = path.join(scriptsDir, 'renderer.js')
const loaderPath = path.join(scriptsDir, 'loader.js')
if (fs.existsSync(rendererPath)) {
  app.get('/renderer.js', (_req, res) => {
    res.type('application/javascript')
    res.sendFile(rendererPath)
  })
}
if (fs.existsSync(loaderPath)) {
  app.get('/loader.js', (_req, res) => {
    res.type('application/javascript')
    res.sendFile(loaderPath)
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

const HOST = process.env.HOST || '0.0.0.0'
const server = app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`)
})

async function main() {
  await startQueue()
  console.log('pg-boss queue ready (workers run on separate dyno)')
}

main().catch((err) => {
  console.error('Failed to start queue (API will still work):', err)
})

async function shutdown() {
  console.log('Shutting down...')
  server.close()
  await stopQueue()
  process.exit(0)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

// Prevent unhandled promise rejections from crashing the process
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
})
