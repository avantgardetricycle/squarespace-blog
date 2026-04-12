import { Router, Request, Response } from 'express'
import prisma from '../db/index.js'
import { hashToken, generateToken, generateSessionToken } from '../lib/auth.js'
import { sendMagicLinkEmailViaSendGrid } from '../lib/email.js'
import { getAppUrl } from '../lib/url.js'
import { syncSubscriptionFromStripe } from '../lib/stripe.js'

const router = Router()
const SESSION_COOKIE = 'session'
const SESSION_DAYS = 30
const MAGIC_LINK_EXPIRY_MINUTES = 15

/** Restrict post-login redirects to in-app dashboard paths (open-redirect safe). */
function sanitizeAuthReturnTo(raw: unknown): string | null {
  if (raw == null || typeof raw !== 'string') return null
  const s = raw.trim()
  if (!s.startsWith('/dashboard')) return null
  if (s.startsWith('//') || s.includes('\\')) return null
  if (s.length > 2048) return null
  try {
    const fake = new URL(s, 'https://example.com')
    if (fake.username || fake.password) return null
  } catch {
    return null
  }
  return s
}

// POST /api/auth/invite - Send magic link (user must exist)
router.post('/invite', async (req: Request, res: Response) => {
  const { email, returnTo } = req.body as { email?: string; returnTo?: string }

  if (!email || typeof email !== 'string') {
    res.status(400).json({ error: 'Email is required' })
    return
  }

  const normalizedEmail = email.trim().toLowerCase()
  if (!normalizedEmail.includes('@')) {
    res.status(400).json({ error: 'Invalid email' })
    return
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    })

    if (!user) {
      res.status(404).json({ error: 'No account found with that email' })
      return
    }

    const rawToken = generateToken()
    const tokenHash = hashToken(rawToken)
    const expiresAt = new Date()
    expiresAt.setMinutes(expiresAt.getMinutes() + MAGIC_LINK_EXPIRY_MINUTES)

    await prisma.loginToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
        purpose: 'invite'
      }
    })

    const appUrl = getAppUrl()
    const safeReturn = sanitizeAuthReturnTo(returnTo)
    const magicLink =
      `${appUrl}/api/auth/magic?token=${rawToken}` +
      (safeReturn ? `&returnTo=${encodeURIComponent(safeReturn)}` : '')

    await sendMagicLinkEmailViaSendGrid(normalizedEmail, magicLink)

    res.json({ success: true, message: 'Check your email for the magic link' })
  } catch (err) {
    console.error('Invite error:', err)
    res.status(500).json({ error: 'Failed to send magic link' })
  }
})

// GET /api/auth/magic?token=... - Validate token, create session, redirect to dashboard
router.get('/magic', async (req: Request, res: Response) => {
  const token = req.query.token as string | undefined
  const returnToRaw = typeof req.query.returnTo === 'string' ? req.query.returnTo : undefined
  const appUrl = getAppUrl()
  const safeReturn = sanitizeAuthReturnTo(returnToRaw)
  const dashboardUrl = `${appUrl}${safeReturn ?? '/dashboard'}`
  const loginUrl = `${appUrl}/login`

  if (!token) {
    res.redirect(`${loginUrl}?error=missing_token`)
    return
  }

  const tokenHash = hashToken(token)

  try {
    const loginToken = await prisma.loginToken.findFirst({
      where: { tokenHash },
      include: { user: true }
    })

    if (!loginToken) {
      res.redirect(`${loginUrl}?error=invalid_token`)
      return
    }

    if (loginToken.usedAt) {
      res.redirect(`${loginUrl}?error=token_used`)
      return
    }

    if (new Date() > loginToken.expiresAt) {
      res.redirect(`${loginUrl}?error=token_expired`)
      return
    }

    await prisma.loginToken.update({
      where: { id: loginToken.id },
      data: { usedAt: new Date() }
    })

    const sessionToken = generateSessionToken()
    const sessionTokenHash = hashToken(sessionToken)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + SESSION_DAYS)

    await prisma.session.create({
      data: {
        userId: loginToken.userId,
        sessionTokenHash,
        expiresAt
      }
    })

    const isProd = process.env.NODE_ENV === 'production'
    res
      .cookie(SESSION_COOKIE, sessionToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000,
        path: '/'
      })
      .redirect(dashboardUrl)

    // After redirect is queued: sync Stripe in the background so magic-link responses are fast
    // and browsers/proxies are less likely to time out before Set-Cookie is applied.
    const uid = loginToken.userId
    void syncSubscriptionFromStripe(uid)
      .then(() => {
        console.log('[auth/magic] subscription sync complete for userId', uid)
      })
      .catch((err) => {
        console.error('[auth/magic] subscription sync on login failed:', err)
      })
  } catch (err) {
    console.error('Magic link error:', err)
    res.redirect(`${loginUrl}?error=server_error`)
  }
})

// POST /api/auth/logout - Revoke session and clear cookie
router.post('/logout', async (req: Request, res: Response) => {
  const token = req.cookies?.session
  if (token) {
    const tokenHash = hashToken(token)
    await prisma.session.updateMany({
      where: { sessionTokenHash: tokenHash },
      data: { revokedAt: new Date() }
    })
  }
  res
    .clearCookie(SESSION_COOKIE, { path: '/' })
    .json({ success: true })
})

export default router
