import crypto from 'crypto'

export const OTP_TTL_MS = 10 * 60 * 1000
export const OTP_MAX_ATTEMPTS = 5
export const OTP_EXPIRES_IN_SEC = 600
export const OTP_RESEND_AFTER_SEC = 30
export const OTP_EMAIL_WINDOW_15_MIN = 3
export const OTP_EMAIL_WINDOW_15_MIN_MS = 15 * 60 * 1000
export const OTP_EMAIL_WINDOW_24_H = 10
export const OTP_EMAIL_WINDOW_24_H_MS = 24 * 60 * 60 * 1000
export const OTP_IP_SENDS_PER_HOUR = 10
export const OTP_IP_SENDS_WINDOW_MS = 60 * 60 * 1000
export const OTP_IP_VERIFY_FAILURES_PER_HOUR = 30

export type OtpFailureCode = 'invalid_code' | 'code_expired' | 'too_many_attempts'

export function normalizeCommenterEmail(email: string): string {
  return email.trim().toLowerCase()
}

/** Basic shape only. A real address that is over the send limit gets a wait message instead of a code. */
export function isPlausibleEmail(email: string): boolean {
  if (!email || email.length > 254 || /\s/.test(email)) return false
  const at = email.indexOf('@')
  if (at <= 0 || at !== email.lastIndexOf('@')) return false
  const domain = email.slice(at + 1)
  if (!domain || domain.startsWith('.') || domain.endsWith('.') || !domain.includes('.')) return false
  return true
}

export function otpPepper(): string {
  const pepper = process.env.COMMENTER_OTP_PEPPER ?? ''
  if (pepper.length < 32) {
    throw new Error('COMMENTER_OTP_PEPPER is not configured')
  }
  return pepper
}

export function generateOtpCode(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, '0')
}

export function hashOtpCode(challengeId: string, code: string, pepper: string): string {
  return crypto.createHmac('sha256', pepper).update(`${challengeId}:${code}`).digest('hex')
}

export function otpCodeMatches(codeHash: string, challengeId: string, code: string, pepper: string): boolean {
  const actual = hashOtpCode(challengeId, code, pepper)
  const left = Buffer.from(codeHash)
  const right = Buffer.from(actual)
  if (left.length !== right.length) return false
  return crypto.timingSafeEqual(left, right)
}

export function digitsOnlyCode(raw: string): string {
  return raw.replace(/\D/g, '')
}

/**
 * Decide one verify attempt.
 * A challenge is dead after 5 wrong codes. A later correct code still returns too_many_attempts.
 */
export function judgeOtpCode(input: {
  now: Date
  expiresAt: Date
  consumedAt: Date | null
  attempts: number
  codeMatches: boolean
}): { ok: true } | { ok: false; code: OtpFailureCode; incrementAttempt: boolean; guessesLeft?: number } {
  if (input.consumedAt) return { ok: false, code: 'invalid_code', incrementAttempt: false }
  if (input.expiresAt.getTime() <= input.now.getTime()) {
    return { ok: false, code: 'code_expired', incrementAttempt: false }
  }
  if (input.attempts >= OTP_MAX_ATTEMPTS) {
    return { ok: false, code: 'too_many_attempts', incrementAttempt: false, guessesLeft: 0 }
  }
  if (!input.codeMatches) {
    const next = input.attempts + 1
    const guessesLeft = Math.max(0, OTP_MAX_ATTEMPTS - next)
    return {
      ok: false,
      code: guessesLeft === 0 ? 'too_many_attempts' : 'invalid_code',
      incrementAttempt: true,
      guessesLeft,
    }
  }
  return { ok: true }
}

export function guessesLeftMessage(guessesLeft: number): string {
  if (guessesLeft <= 0) return 'Too many tries. Send a new code.'
  const label = guessesLeft === 1 ? 'guess' : 'guesses'
  return `That code isn't right. You have ${guessesLeft} ${label} left.`
}

export function emailSendIsLimited(counts: { last15Min: number; last24h: number }): boolean {
  return counts.last15Min >= OTP_EMAIL_WINDOW_15_MIN || counts.last24h >= OTP_EMAIL_WINDOW_24_H
}

/** Milliseconds until fewer than `limit` timestamps remain inside `windowMs`. */
export function waitUntilSendAllowed(createdAts: Date[], now: Date, windowMs: number, limit: number): number {
  if (createdAts.length < limit) return 0
  const times = createdAts.map((date) => date.getTime()).sort((a, b) => a - b)
  const pivot = times[times.length - limit]
  return Math.max(0, pivot + windowMs - now.getTime())
}

export function codeSendRetryWaitMs(input: { now: Date; emailSends: Date[]; ipSends: Date[] }): number {
  const since15 = input.now.getTime() - OTP_EMAIL_WINDOW_15_MIN_MS
  const in15Min = input.emailSends.filter((date) => date.getTime() >= since15)
  return Math.max(
    waitUntilSendAllowed(in15Min, input.now, OTP_EMAIL_WINDOW_15_MIN_MS, OTP_EMAIL_WINDOW_15_MIN),
    waitUntilSendAllowed(input.emailSends, input.now, OTP_EMAIL_WINDOW_24_H_MS, OTP_EMAIL_WINDOW_24_H),
    waitUntilSendAllowed(input.ipSends, input.now, OTP_IP_SENDS_WINDOW_MS, OTP_IP_SENDS_PER_HOUR),
  )
}

export function codeSendWaitMessage(waitMs: number): string {
  const seconds = Math.max(1, Math.ceil(waitMs / 1000))
  if (seconds < 60) {
    return `Wait ${seconds} ${seconds === 1 ? 'second' : 'seconds'} before requesting a new code.`
  }
  const minutes = Math.ceil(seconds / 60)
  if (minutes < 60) {
    return `Wait ${minutes} ${minutes === 1 ? 'minute' : 'minutes'} before requesting a new code.`
  }
  const hours = Math.floor(minutes / 60)
  const remMinutes = minutes % 60
  if (remMinutes === 0) {
    return `Wait ${hours} ${hours === 1 ? 'hour' : 'hours'} before requesting a new code.`
  }
  return `Wait ${hours} ${hours === 1 ? 'hour' : 'hours'} ${remMinutes} ${remMinutes === 1 ? 'minute' : 'minutes'} before requesting a new code.`
}

export function ipSendIsLimited(sendsInLastHour: number): boolean {
  return sendsInLastHour >= OTP_IP_SENDS_PER_HOUR
}

export function ipVerifyIsLimited(failuresInLastHour: number): boolean {
  return failuresInLastHour >= OTP_IP_VERIFY_FAILURES_PER_HOUR
}
