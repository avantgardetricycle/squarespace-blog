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
import templatesRoutes from './routes/templates.js'
import leadsRoutes from './routes/leads.js'
import analyticsRoutes from './routes/analytics.js'
import captureRoutes from './routes/capture.js'
import commentsRoutes from './routes/comments.js'
import commentActionsRoutes from './routes/comment-actions.js'
import { startQueue, stopQueue } from './queue/index.js'

const app = express()
const PORT = Number(process.env.PORT) || 3001

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
// Analytics: events come from user blogs (any origin); dashboard fetches with credentials
app.use('/api/analytics', cors({ origin: true, credentials: true }), analyticsRoutes)
// Capture: newsletter/lead magnet submissions from Squarespace (any origin)
app.use('/api/capture', cors({ origin: true, credentials: true }), captureRoutes)
// Comments: reader-facing comment API from overlay (any origin)
app.use('/api/comments', cors({ origin: true, credentials: true }), commentsRoutes)

// All other routes: strict CORS (app origin only)
const appOrigin = (process.env.APP_URL ?? 'http://localhost:3000').replace(/\/$/, '')
app.use(
  cors({
    origin: appOrigin,
    credentials: true
  })
)
app.use('/api/auth', authRoutes)
app.use('/api/comment-actions', commentActionsRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/blog-authors', blogAuthorsRoutes)
app.use('/api/templates', templatesRoutes)
app.use('/api/checkout', checkoutRoutes)
app.use('/api/leads', leadsRoutes)

// Health check - includes isLive for landing page CTA behavior
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    isLive: process.env.IS_BETTER_BLOG_LIVE === 'true',
  })
})

// Serve loader.js and renderer.js from scripts/ (for Squarespace code injection)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const scriptsDir = path.join(__dirname, '../../scripts')
const rendererPath = path.join(scriptsDir, 'renderer.js')
const loaderPath = path.join(scriptsDir, 'loader.js')
if (fs.existsSync(rendererPath)) {
  app.get('/renderer.js', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    res.setHeader('Pragma', 'no-cache')
    res.setHeader('Expires', '0')
    res.setHeader('Surrogate-Control', 'no-store')
    res.type('application/javascript')
    res.sendFile(rendererPath)
  })
}
if (fs.existsSync(loaderPath)) {
  app.get('/loader.js', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    res.setHeader('Pragma', 'no-cache')
    res.setHeader('Expires', '0')
    res.setHeader('Surrogate-Control', 'no-store')
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
  if (process.env.NODE_ENV === 'production') {
    console.log('pg-boss queue ready (Stripe jobs are processed by start:worker / worker dyno)')
  } else {
    console.log(
      'pg-boss queue ready — Stripe webhooks enqueue jobs only; run `npm run dev:worker` in another terminal with the same .env (especially DATABASE_URL). Magic links use APP_URL; use http://localhost:3000 for local UI.'
    )
  }
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
