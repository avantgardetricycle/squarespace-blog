import crypto from 'crypto'

export const OTP_TTL_MS = 10 * 60 * 1000
export const OTP_MAX_ATTEMPTS = 5
export const OTP_EXPIRES_IN_SEC = 600
export const OTP_RESEND_AFTER_SEC = 30
export const OTP_EMAIL_WINDOW_15_MIN = 3
export const OTP_EMAIL_WINDOW_24_H = 10
export const OTP_IP_SENDS_PER_HOUR = 10
export const OTP_IP_VERIFY_FAILURES_PER_HOUR = 30

export type OtpFailureCode = 'invalid_code' | 'code_expired' | 'too_many_attempts'

export function normalizeCommenterEmail(email: string): string {
  return email.trim().toLowerCase()
}

/** Basic shape only. Addresses that pass this always get the same 202 from /auth/start. */
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
}): { ok: true } | { ok: false; code: OtpFailureCode; incrementAttempt: boolean } {
  if (input.consumedAt) return { ok: false, code: 'invalid_code', incrementAttempt: false }
  if (input.expiresAt.getTime() <= input.now.getTime()) {
    return { ok: false, code: 'code_expired', incrementAttempt: false }
  }
  if (input.attempts >= OTP_MAX_ATTEMPTS) {
    return { ok: false, code: 'too_many_attempts', incrementAttempt: false }
  }
  if (!input.codeMatches) {
    const next = input.attempts + 1
    return {
      ok: false,
      code: next >= OTP_MAX_ATTEMPTS ? 'too_many_attempts' : 'invalid_code',
      incrementAttempt: true,
    }
  }
  return { ok: true }
}

export function emailSendIsLimited(counts: { last15Min: number; last24h: number }): boolean {
  return counts.last15Min >= OTP_EMAIL_WINDOW_15_MIN || counts.last24h >= OTP_EMAIL_WINDOW_24_H
}

export function ipSendIsLimited(sendsInLastHour: number): boolean {
  return sendsInLastHour >= OTP_IP_SENDS_PER_HOUR
}

export function ipVerifyIsLimited(failuresInLastHour: number): boolean {
  return failuresInLastHour >= OTP_IP_VERIFY_FAILURES_PER_HOUR
}
