import { Router, Request, Response } from 'express'
import { sendCommenterCodeEmail } from '../lib/email.js'
import { runAfterResponse } from '../lib/run-after-response.js'
import { commenterScope, readBearerToken } from '../lib/commenter-session.js'
import { membershipAllowsCodeSend, membershipNotFoundMessage } from '../lib/commenter-submit.js'
import { findSiteContactByEmail } from '../lib/site-contact-lookup.js'
import {
  listRecentEmailSendTimes,
  listRecentIpSendTimes,
  countIpVerifyFailures,
  createCommenterSession,
  createOtpChallenge,
  findValidCommenterSession,
  revokeCommenterToken,
  touchCommenterSession,
  verifyOtpChallenge,
} from '../lib/commenter-auth-store.js'
import {
  OTP_EXPIRES_IN_SEC,
  OTP_RESEND_AFTER_SEC,
  digitsOnlyCode,
  guessesLeftMessage,
  codeSendRetryWaitMs,
  codeSendWaitMessage,
  ipVerifyIsLimited,
  isPlausibleEmail,
  normalizeCommenterEmail,
  otpPepper,
} from '../lib/commenter-otp.js'

type CommentSite = {
  id: string
  siteKey: string
  name: string | null
  url: string | null
  apiKeyEnc: string | null
  ownerEmail: string | null
  notificationEmail: string | null
}

const MAX_DISPLAY_NAME = 100

function accepted(challengeId: string) {
  return {
    challenge_id: challengeId,
    expires_in: OTP_EXPIRES_IN_SEC,
    resend_after: OTP_RESEND_AFTER_SEC,
  }
}

function clientIp(req: Request): string {
  return (req.ip ?? req.socket?.remoteAddress ?? '') || 'unknown'
}

export function createCommentAuthRouter(deps: {
  getSiteToken: (req: Request) => string | null
  getSite: (siteToken: string) => Promise<CommentSite | null>
}): Router {
  const router = Router()

  async function resolveSite(req: Request, res: Response): Promise<CommentSite | null> {
    const siteToken = deps.getSiteToken(req)
    if (!siteToken) {
      res.status(400).json({ code: 'invalid_request', error: 'Site token required' })
      return null
    }
    const site = await deps.getSite(siteToken)
    if (!site) {
      res.status(404).json({ error: 'Site not found or subscription required' })
      return null
    }
    return site
  }

  router.post('/start', async (req: Request, res: Response) => {
    const site = await resolveSite(req, res)
    if (!site) return

    let pepper = ''
    try {
      pepper = otpPepper()
    } catch {
      console.error('[commenter-auth] COMMENTER_OTP_PEPPER is not configured')
      res.status(500).json({ error: 'Comment verification is unavailable.' })
      return
    }

    const body = req.body as { email?: unknown }
    const emailRaw = typeof body.email === 'string' ? body.email : ''
    const email = normalizeCommenterEmail(emailRaw)
    if (!isPlausibleEmail(email)) {
      res.status(400).json({ code: 'invalid_request', error: 'Enter an email address.' })
      return
    }

    if (!site.apiKeyEnc) {
      res.status(400).json({ code: 'verification_unavailable', error: 'Comment verification is unavailable.' })
      return
    }

    const contact = await findSiteContactByEmail({
      siteId: site.id,
      siteKey: site.siteKey,
      siteName: site.name,
      siteUrl: site.url,
      apiKeyEnc: site.apiKeyEnc,
      email,
      ownerEmails: [site.ownerEmail, site.notificationEmail],
    })
    if (!contact.found && contact.error) {
      console.warn('[commenter-auth] contact_lookup_failed', { siteId: site.id, kind: contact.error })
    }
    if (!contact.found || !membershipAllowsCodeSend({ hasApiKey: true, contactFound: true })) {
      res.status(400).json({
        code: 'verification_failed',
        error: membershipNotFoundMessage(email),
      })
      return
    }
    const displayName = contact.displayName.slice(0, MAX_DISPLAY_NAME)

    const ip = clientIp(req)
    const userAgent = (req.get('user-agent') ?? '').slice(0, 500)
    const hostname = commenterScope(site)

    const now = new Date()
    const [emailSends, ipSends] = await Promise.all([
      listRecentEmailSendTimes(hostname, email, now),
      listRecentIpSendTimes(ip, now),
    ])
    const waitMs = codeSendRetryWaitMs({ now, emailSends, ipSends })
    if (waitMs > 0) {
      const retryAfterSeconds = Math.max(1, Math.ceil(waitMs / 1000))
      res.setHeader('Retry-After', String(retryAfterSeconds))
      res.status(429).json({
        code: 'rate_limited',
        error: codeSendWaitMessage(waitMs),
        retry_after_seconds: retryAfterSeconds,
      })
      return
    }

    const challenge = await createOtpChallenge({
      siteId: site.id,
      hostname,
      email,
      displayName,
      pepper,
      ip,
      userAgent: userAgent || null,
    })
    const blogName = site.name?.trim() || hostname
    runAfterResponse(sendCommenterCodeEmail(email, challenge.code, blogName))
    res.status(202).json(accepted(challenge.id))
  })

  router.post('/verify', async (req: Request, res: Response) => {
    const site = await resolveSite(req, res)
    if (!site) return

    let pepper = ''
    try {
      pepper = otpPepper()
    } catch {
      console.error('[commenter-auth] COMMENTER_OTP_PEPPER is not configured')
      res.status(500).json({ error: 'Comment verification is unavailable.' })
      return
    }

    const body = req.body as { challenge_id?: unknown; code?: unknown; replaces_token?: unknown }
    const challengeId = typeof body.challenge_id === 'string' ? body.challenge_id.trim() : ''
    const code = digitsOnlyCode(typeof body.code === 'string' ? body.code : '')
    const replacesToken = typeof body.replaces_token === 'string' ? body.replaces_token.trim() : ''
    const ip = clientIp(req)
    const hostname = commenterScope(site)

    if (ipVerifyIsLimited(await countIpVerifyFailures(ip))) {
      res.status(429).json({ code: 'rate_limited', error: 'Rate limit exceeded. Try again later.' })
      return
    }

    if (!challengeId || code.length !== 6) {
      res.status(400).json({ code: 'invalid_code', error: "That code isn't right. Check the email and try again." })
      return
    }

    const verified = await verifyOtpChallenge({
      challengeId,
      code,
      hostname,
      pepper,
      ip,
    })
    if (!verified.ok) {
      const message =
        verified.code === 'code_expired'
          ? 'That code has expired. Send a new one.'
          : typeof verified.guessesLeft === 'number'
            ? guessesLeftMessage(verified.guessesLeft)
            : verified.code === 'too_many_attempts'
              ? 'Too many tries. Send a new code.'
              : "That code isn't right. Check the email and try again."
      res.status(400).json({
        code: verified.code,
        error: message,
        ...(typeof verified.guessesLeft === 'number' ? { guesses_left: verified.guessesLeft } : {}),
      })
      return
    }

    const userAgent = (req.get('user-agent') ?? '').slice(0, 500)
    const session = await createCommenterSession({
      siteId: site.id,
      hostname,
      email: verified.email,
      displayName: verified.displayName,
      replacesToken: replacesToken || null,
      ip,
      userAgent: userAgent || null,
    })
    res.status(200).json({
      session_token: session.token,
      email: verified.email,
      display_name: verified.displayName,
      expires_at: session.expiresAt.toISOString(),
    })
  })

  router.get('/me', async (req: Request, res: Response) => {
    const site = await resolveSite(req, res)
    if (!site) return
    const hostname = commenterScope(site)
    const session = await findValidCommenterSession(readBearerToken(req), hostname)
    if (!session) {
      res.status(401).json({ code: 'commenter_auth_required', error: 'Confirm your email to comment.' })
      return
    }
    const touched = await touchCommenterSession(session)
    res.status(200).json({
      email: touched.email,
      display_name: touched.displayName,
      expires_at: touched.expiresAt.toISOString(),
    })
  })

  router.post('/logout', async (req: Request, res: Response) => {
    const siteToken = deps.getSiteToken(req)
    const site = siteToken ? await deps.getSite(siteToken) : null
    const hostname = site ? commenterScope(site) : null
    await revokeCommenterToken(readBearerToken(req), hostname)
    res.status(204).end()
  })

  return router
}
