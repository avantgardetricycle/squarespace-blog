import assert from 'node:assert/strict'
import test from 'node:test'
import {
  digitsOnlyCode,
  codeSendRetryWaitMs,
  codeSendWaitMessage,
  emailSendIsLimited,
  generateOtpCode,
  hashOtpCode,
  ipSendIsLimited,
  ipVerifyIsLimited,
  isPlausibleEmail,
  judgeOtpCode,
  normalizeCommenterEmail,
  otpCodeMatches,
  OTP_MAX_ATTEMPTS,
  guessesLeftMessage,
} from './commenter-otp.js'
import {
  commenterScope,
  hashSessionToken,
  nextSessionExpiry,
  sessionIsValid,
  SESSION_ABSOLUTE_CAP_MS,
  SESSION_TTL_MS,
} from './commenter-session.js'
import { decideVerifiedCommentSubmit, membershipAllowsCodeSend, membershipNotFoundMessage } from './commenter-submit.js'

const PEPPER = 'test-pepper-must-be-at-least-32-characters'

test('otp code is 6 digits from the padded range', () => {
  for (let i = 0; i < 20; i++) {
    const code = generateOtpCode()
    assert.match(code, /^\d{6}$/)
  }
})

test('email normalization keeps dots and plus tags', () => {
  assert.equal(normalizeCommenterEmail('  Sam.Reader+news@Example.com '), 'sam.reader+news@example.com')
  assert.equal(isPlausibleEmail('sam.reader+news@example.com'), true)
  assert.equal(isPlausibleEmail('not-an-email'), false)
})

test('a correct code matches once and a consumed challenge does not', () => {
  const challengeId = 'challenge-1'
  const code = '123456'
  const codeHash = hashOtpCode(challengeId, code, PEPPER)
  assert.equal(otpCodeMatches(codeHash, challengeId, code, PEPPER), true)
  assert.equal(otpCodeMatches(codeHash, challengeId, '000000', PEPPER), false)
  const now = new Date('2026-01-01T00:00:00Z')
  const fresh = judgeOtpCode({
    now,
    expiresAt: new Date(now.getTime() + 60_000),
    consumedAt: null,
    attempts: 0,
    codeMatches: true,
  })
  assert.deepEqual(fresh, { ok: true })
  const again = judgeOtpCode({
    now,
    expiresAt: new Date(now.getTime() + 60_000),
    consumedAt: now,
    attempts: 0,
    codeMatches: true,
  })
  assert.equal(again.ok, false)
  if (!again.ok) assert.equal(again.code, 'invalid_code')
})

test('a code one second after expiry is code_expired', () => {
  const now = new Date('2026-01-01T00:10:01Z')
  const judged = judgeOtpCode({
    now,
    expiresAt: new Date('2026-01-01T00:10:00Z'),
    consumedAt: null,
    attempts: 0,
    codeMatches: true,
  })
  assert.equal(judged.ok, false)
  if (!judged.ok) assert.equal(judged.code, 'code_expired')
})

test('the fifth wrong code kills the challenge and a later correct code stays dead', () => {
  const now = new Date('2026-01-01T00:00:00Z')
  const expiresAt = new Date(now.getTime() + 60_000)
  const fifth = judgeOtpCode({
    now,
    expiresAt,
    consumedAt: null,
    attempts: OTP_MAX_ATTEMPTS - 1,
    codeMatches: false,
  })
  assert.equal(fifth.ok, false)
  if (!fifth.ok) {
    assert.equal(fifth.code, 'too_many_attempts')
    assert.equal(fifth.incrementAttempt, true)
    assert.equal(fifth.guessesLeft, 0)
  }
  const sixth = judgeOtpCode({
    now,
    expiresAt,
    consumedAt: null,
    attempts: OTP_MAX_ATTEMPTS,
    codeMatches: true,
  })
  assert.equal(sixth.ok, false)
  if (!sixth.ok) {
    assert.equal(sixth.code, 'too_many_attempts')
    assert.equal(sixth.guessesLeft, 0)
  }
  const firstWrong = judgeOtpCode({
    now,
    expiresAt,
    consumedAt: null,
    attempts: 0,
    codeMatches: false,
  })
  assert.equal(firstWrong.ok, false)
  if (!firstWrong.ok) assert.equal(firstWrong.guessesLeft, 4)
  assert.equal(guessesLeftMessage(4), "That code isn't right. You have 4 guesses left.")
  assert.equal(guessesLeftMessage(1), "That code isn't right. You have 1 guess left.")
  assert.equal(guessesLeftMessage(0), 'Too many tries. Send a new code.')
})

test('per-email send limits and ip limits', () => {
  assert.equal(emailSendIsLimited({ last15Min: 2, last24h: 9 }), false)
  assert.equal(emailSendIsLimited({ last15Min: 3, last24h: 3 }), true)
  assert.equal(emailSendIsLimited({ last15Min: 0, last24h: 10 }), true)
  assert.equal(ipSendIsLimited(9), false)
  assert.equal(ipSendIsLimited(10), true)
  assert.equal(ipVerifyIsLimited(29), false)
  assert.equal(ipVerifyIsLimited(30), true)
})

test('a throttled code send says how long to wait', () => {
  const now = new Date('2026-10-20T12:00:00Z')
  const fifteen = [
    new Date(now.getTime() - 14 * 60 * 1000),
    new Date(now.getTime() - 10 * 60 * 1000),
    new Date(now.getTime() - 60 * 1000),
  ]
  const wait = codeSendRetryWaitMs({ now, emailSends: fifteen, ipSends: [] })
  assert.equal(wait, 60 * 1000)
  assert.equal(codeSendWaitMessage(wait), 'Wait 1 minute before requesting a new code.')
  assert.equal(codeSendWaitMessage(45_000), 'Wait 45 seconds before requesting a new code.')
  assert.equal(codeSendWaitMessage(1000), 'Wait 1 second before requesting a new code.')
  assert.equal(codeSendWaitMessage(90 * 60 * 1000), 'Wait 1 hour 30 minutes before requesting a new code.')
  assert.equal(codeSendRetryWaitMs({ now, emailSends: fifteen.slice(0, 2), ipSends: [] }), 0)

  const day = Array.from({ length: 10 }, (_, index) => new Date(now.getTime() - (20 - index) * 60 * 60 * 1000))
  assert.equal(codeSendRetryWaitMs({ now, emailSends: day, ipSends: [] }), 4 * 60 * 60 * 1000)

  const ip = Array.from({ length: 10 }, (_, index) => new Date(now.getTime() - (50 - index) * 60 * 1000))
  assert.equal(codeSendRetryWaitMs({ now, emailSends: [], ipSends: ip }), 10 * 60 * 1000)
  assert.equal(
    codeSendRetryWaitMs({ now, emailSends: fifteen, ipSends: ip }),
    10 * 60 * 1000,
  )
})

test('pasted codes keep digits only', () => {
  assert.equal(digitsOnlyCode('12 3-456'), '123456')
})

test('session expiry slides after 24 hours and never passes the 180 day cap', () => {
  const createdAt = new Date('2026-01-01T00:00:00Z')
  const lastExtendedAt = createdAt
  const expiresAt = new Date(createdAt.getTime() + SESSION_TTL_MS)
  const withinDay = nextSessionExpiry({
    now: new Date(createdAt.getTime() + 23 * 60 * 60 * 1000),
    createdAt,
    lastExtendedAt,
    expiresAt,
  })
  assert.equal(withinDay.extended, false)
  assert.equal(withinDay.expiresAt.getTime(), expiresAt.getTime())

  const later = new Date(createdAt.getTime() + 25 * 60 * 60 * 1000)
  const slid = nextSessionExpiry({ now: later, createdAt, lastExtendedAt, expiresAt })
  assert.equal(slid.extended, true)
  assert.equal(slid.expiresAt.getTime(), later.getTime() + SESSION_TTL_MS)

  const nearCap = new Date(createdAt.getTime() + SESSION_ABSOLUTE_CAP_MS - 5 * 24 * 60 * 60 * 1000)
  const capped = nextSessionExpiry({
    now: nearCap,
    createdAt,
    lastExtendedAt,
    expiresAt,
  })
  assert.equal(capped.expiresAt.getTime(), createdAt.getTime() + SESSION_ABSOLUTE_CAP_MS)
})

test('a session token is rejected for another hostname, and when revoked or expired', () => {
  const now = new Date('2026-06-01T00:00:00Z')
  const session = {
    hostname: 'example.com',
    revokedAt: null,
    expiresAt: new Date(now.getTime() + 1000),
  }
  assert.equal(sessionIsValid(session, 'example.com', now), true)
  assert.equal(sessionIsValid(session, 'other.com', now), false)
  assert.equal(sessionIsValid({ ...session, revokedAt: now }, 'example.com', now), false)
  assert.equal(sessionIsValid({ ...session, expiresAt: now }, 'example.com', now), false)
  assert.equal(commenterScope({ id: 'site-1', url: 'https://www.Example.com/blog' }), 'example.com')
  assert.equal(commenterScope({ id: 'site-1', url: null }), 'site:site-1')
  assert.equal(hashSessionToken('abc'), hashSessionToken('abc'))
  assert.notEqual(hashSessionToken('abc'), hashSessionToken('abd'))
})

test('verified submit matrix', () => {
  const found = { found: true as const, contactId: 'profile-1' }
  const missing = { found: false as const }
  assert.deepEqual(
    decideVerifiedCommentSubmit({
      hasValidSession: true,
      squarespaceLoggedIn: true,
      hasApiKey: false,
      contact: null,
      allowAnonymousComments: false,
    }),
    { action: 'reject', status: 400, code: 'verification_failed' }
  )
  assert.deepEqual(
    decideVerifiedCommentSubmit({
      hasValidSession: true,
      squarespaceLoggedIn: true,
      hasApiKey: true,
      contact: found,
      allowAnonymousComments: false,
    }),
    { action: 'store', contactId: 'profile-1' }
  )
  const notFound = decideVerifiedCommentSubmit({
    hasValidSession: true,
    squarespaceLoggedIn: true,
    hasApiKey: true,
    contact: missing,
    allowAnonymousComments: false,
  })
  assert.equal(notFound.action, 'reject')
  if (notFound.action === 'reject') assert.equal(notFound.code, 'verification_failed')
  const notFoundAnon = decideVerifiedCommentSubmit({
    hasValidSession: true,
    squarespaceLoggedIn: true,
    hasApiKey: true,
    contact: missing,
    allowAnonymousComments: true,
  })
  assert.equal(notFoundAnon.action, 'reject')
  if (notFoundAnon.action === 'reject') assert.equal(notFoundAnon.code, 'verification_failed_anonymous_available')
  const loggedOut = decideVerifiedCommentSubmit({
    hasValidSession: true,
    squarespaceLoggedIn: false,
    hasApiKey: false,
    contact: null,
    allowAnonymousComments: true,
  })
  assert.equal(loggedOut.action, 'reject')
  if (loggedOut.action === 'reject') assert.equal(loggedOut.code, 'squarespace_login_required')
  const noSession = decideVerifiedCommentSubmit({
    hasValidSession: false,
    squarespaceLoggedIn: true,
    hasApiKey: true,
    contact: found,
    allowAnonymousComments: false,
  })
  assert.equal(noSession.action, 'reject')
  if (noSession.action === 'reject') assert.equal(noSession.code, 'commenter_auth_required')
  assert.equal(membershipNotFoundMessage('reader@example.com'), "We couldn't find a membership for reader@example.com.")
  assert.equal(membershipAllowsCodeSend({ hasApiKey: false, contactFound: false }), false)
  assert.equal(membershipAllowsCodeSend({ hasApiKey: false, contactFound: true }), false)
  assert.equal(membershipAllowsCodeSend({ hasApiKey: true, contactFound: true }), true)
  assert.equal(membershipAllowsCodeSend({ hasApiKey: true, contactFound: false }), false)
})
