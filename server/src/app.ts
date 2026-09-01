import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import express, { type Express } from 'express'
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
import supportRoutes from './routes/support.js'
import analyticsRoutes from './routes/analytics.js'
import captureRoutes from './routes/capture.js'
import commentsRoutes from './routes/comments.js'
import commentActionsRoutes from './routes/comment-actions.js'

export interface CreateAppOptions {
  /** When false, Stripe webhook is served only by `api/webhooks/stripe` (Vercel). */
  mountStripeWebhook?: boolean
}

export function createApp(options: CreateAppOptions = {}): Express {
  const { mountStripeWebhook = true } = options
  const app = express()

  app.set('trust proxy', 1)

  // Vercel rewrites /api/* to the API function; restore the full path before routing.
  app.use((req, _res, next) => {
    const forwarded = req.headers['x-betterblog-original-path']
    const query = req.url?.includes('?') ? req.url.slice(req.url.indexOf('?')) : ''
    if (typeof forwarded === 'string' && forwarded.startsWith('/api')) {
      req.url = forwarded.includes('?') ? forwarded : `${forwarded}${query}`
    } else {
      const pathOnly = req.path || '/'
      if (!pathOnly.startsWith('/api/') && pathOnly !== '/api') {
        req.url = `/api${pathOnly === '/' ? '' : pathOnly}${query}`
      }
    }
    next()
  })

  if (mountStripeWebhook) {
    app.use(
      '/api/webhooks/stripe',
      express.raw({ type: 'application/json' }),
      stripeWebhookRoutes
    )
  }

  app.use(express.json())
  app.use(cookieParser())

  app.use('/api/config', cors({ origin: true, credentials: true }), configRoutes)
  app.use('/api/analytics', cors({ origin: true, credentials: true }), analyticsRoutes)
  app.use('/api/capture', cors({ origin: true, credentials: true }), captureRoutes)
  app.use('/api/comments', cors({ origin: true, credentials: true }), commentsRoutes)
  app.use('/api/auth', cors({ origin: true, credentials: true }), authRoutes)

  const appOrigin = (process.env.APP_URL ?? 'http://localhost:3000').replace(/\/$/, '')
  app.use(
    cors({
      origin: appOrigin,
      credentials: true
    })
  )
  app.use('/api/comment-actions', commentActionsRoutes)
  app.use('/api/dashboard', dashboardRoutes)
  app.use('/api/blog-authors', blogAuthorsRoutes)
  app.use('/api/templates', templatesRoutes)
  app.use('/api/checkout', checkoutRoutes)
  app.use('/api/leads', leadsRoutes)
  app.use('/api/support', supportRoutes)

  app.get('/api/health', (_req, res) => {
    const isBetterBlogLiveEnv = process.env.IS_BETTER_BLOG_LIVE
    const isLive = isBetterBlogLiveEnv === 'true'
    const debug = {
      vercelEnv: process.env.VERCEL_ENV,
      gitBranch: process.env.VERCEL_GIT_COMMIT_REF,
      gitCommitRef: process.env.VERCEL_GIT_COMMIT_REF,
      deploymentId: process.env.VERCEL_DEPLOYMENT_ID,
      isBetterBlogLiveEnv: isBetterBlogLiveEnv ?? null,
    }
    console.info('[BetterBlog/health]', { isLive, ...debug })
    res.json({
      status: 'ok',
      isLive,
      debug,
    })
  })

  const __dirname = path.dirname(fileURLToPath(import.meta.url))
  const scriptsDir = path.join(__dirname, '../../scripts')
  const scriptsDistDir = path.join(scriptsDir, 'dist')
  const useDist =
    process.env.NODE_ENV === 'production' &&
    fs.existsSync(path.join(scriptsDistDir, 'renderer.js'))
  const scriptBase = useDist ? scriptsDistDir : scriptsDir
  const rendererPath = path.join(scriptBase, 'renderer.js')
  const loaderPath = path.join(scriptBase, 'loader.js')
  if (fs.existsSync(rendererPath)) {
    app.get('/renderer.js', (_req, res) => {
      // Stable URL (pasted Header snippets). Short max-age so deploys land
      // quickly; SWR lets repeat visitors reuse the previous file.
      res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=86400')
      res.type('application/javascript')
      res.sendFile(rendererPath)
    })
  }
  if (fs.existsSync(loaderPath)) {
    app.get('/loader.js', (_req, res) => {
      res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=86400')
      res.type('application/javascript')
      res.sendFile(loaderPath)
    })
  }

  const clientDist = path.join(__dirname, '../../client/dist')
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist))
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/')) {
        next()
        return
      }
      res.sendFile(path.join(clientDist, 'index.html'))
    })
  } else {
    app.get('/', (_req, res) => {
      res.json({ name: 'BetterBlog API', status: 'ok', docs: '/api/health' })
    })
  }

  return app
}
