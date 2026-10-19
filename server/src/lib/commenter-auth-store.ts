import crypto from 'crypto'
import prisma from '../db/index.js'
import {
  generateOtpCode,
  hashOtpCode,
  OTP_TTL_MS,
  otpCodeMatches,
  judgeOtpCode,
  type OtpFailureCode,
} from './commenter-otp.js'
import {
  generateSessionToken,
  hashSessionToken,
  initialSessionExpiry,
  nextSessionExpiry,
  sessionIsValid,
} from './commenter-session.js'

const HOUR_MS = 60 * 60 * 1000
const FIFTEEN_MIN_MS = 15 * 60 * 1000
const DAY_MS = 24 * HOUR_MS

export async function countEmailSends(hostname: string, email: string, now = new Date()) {
  const [last15Min, last24h] = await Promise.all([
    prisma.commenterOtpChallenge.count({
      where: { hostname, email, createdAt: { gte: new Date(now.getTime() - FIFTEEN_MIN_MS) } },
    }),
    prisma.commenterOtpChallenge.count({
      where: { hostname, email, createdAt: { gte: new Date(now.getTime() - DAY_MS) } },
    }),
  ])
  return { last15Min, last24h }
}

export async function countIpSends(ip: string, now = new Date()): Promise<number> {
  return prisma.commenterOtpChallenge.count({
    where: { ip, createdAt: { gte: new Date(now.getTime() - HOUR_MS) } },
  })
}

export async function countIpVerifyFailures(ip: string, now = new Date()): Promise<number> {
  return prisma.commenterAuthEvent.count({
    where: {
      ip,
      kind: 'verify_failure',
      createdAt: { gte: new Date(now.getTime() - HOUR_MS) },
    },
  })
}

export async function recordVerifyFailure(ip: string): Promise<void> {
  await prisma.commenterAuthEvent.create({
    data: { id: crypto.randomUUID(), ip, kind: 'verify_failure' },
  })
}

export async function createOtpChallenge(input: {
  siteId: string
  hostname: string
  email: string
  displayName: string
  pepper: string
  ip: string | null
  userAgent: string | null
  now?: Date
}): Promise<{ id: string; code: string; expiresAt: Date }> {
  const now = input.now ?? new Date()
  const id = crypto.randomUUID()
  const code = generateOtpCode()
  const expiresAt = new Date(now.getTime() + OTP_TTL_MS)
  await prisma.$transaction([
    prisma.commenterOtpChallenge.updateMany({
      where: { hostname: input.hostname, email: input.email, consumedAt: null },
      data: { consumedAt: now },
    }),
    prisma.commenterOtpChallenge.create({
      data: {
        id,
        siteId: input.siteId,
        hostname: input.hostname,
        email: input.email,
        displayName: input.displayName,
        codeHash: hashOtpCode(id, code, input.pepper),
        expiresAt,
        ip: input.ip,
        userAgent: input.userAgent,
        createdAt: now,
      },
    }),
  ])
  return { id, code, expiresAt }
}

export async function verifyOtpChallenge(input: {
  challengeId: string
  code: string
  hostname: string
  pepper: string
  ip: string
  now?: Date
}): Promise<{ ok: true; email: string; displayName: string } | { ok: false; code: OtpFailureCode }> {
  const now = input.now ?? new Date()
  const challenge = await prisma.commenterOtpChallenge.findUnique({ where: { id: input.challengeId } })
  if (!challenge || challenge.hostname !== input.hostname) {
    await recordVerifyFailure(input.ip)
    return { ok: false, code: 'invalid_code' }
  }
  const codeMatches = otpCodeMatches(challenge.codeHash, challenge.id, input.code, input.pepper)
  const judged = judgeOtpCode({
    now,
    expiresAt: challenge.expiresAt,
    consumedAt: challenge.consumedAt,
    attempts: challenge.attempts,
    codeMatches,
  })
  if (!judged.ok) {
    if (judged.incrementAttempt) {
      await prisma.commenterOtpChallenge.update({
        where: { id: challenge.id },
        data: { attempts: { increment: 1 } },
      })
    }
    await recordVerifyFailure(input.ip)
    return { ok: false, code: judged.code }
  }
  await prisma.commenterOtpChallenge.update({
    where: { id: challenge.id },
    data: { consumedAt: now },
  })
  return { ok: true, email: challenge.email, displayName: challenge.displayName }
}

export async function createCommenterSession(input: {
  siteId: string
  hostname: string
  email: string
  displayName: string
  replacesToken: string | null
  ip: string | null
  userAgent: string | null
  now?: Date
}): Promise<{ token: string; expiresAt: Date }> {
  const now = input.now ?? new Date()
  const token = generateSessionToken()
  const expiry = initialSessionExpiry(now)
  if (input.replacesToken) {
    await prisma.commenterSession.updateMany({
      where: { tokenHash: hashSessionToken(input.replacesToken), hostname: input.hostname, revokedAt: null },
      data: { revokedAt: now },
    })
  }
  await prisma.commenterSession.create({
    data: {
      siteId: input.siteId,
      hostname: input.hostname,
      email: input.email,
      displayName: input.displayName,
      tokenHash: hashSessionToken(token),
      createdAt: now,
      lastExtendedAt: expiry.lastExtendedAt,
      expiresAt: expiry.expiresAt,
      ip: input.ip,
      userAgent: input.userAgent,
    },
  })
  return { token, expiresAt: expiry.expiresAt }
}

export async function findValidCommenterSession(token: string | null, hostname: string, now = new Date()) {
  if (!token) return null
  const session = await prisma.commenterSession.findUnique({
    where: { tokenHash: hashSessionToken(token) },
  })
  if (!session || !sessionIsValid(session, hostname, now)) return null
  return session
}

export async function touchCommenterSession<T extends {
  id: string
  createdAt: Date
  lastExtendedAt: Date
  expiresAt: Date
}>(session: T, now = new Date()): Promise<T> {
  const next = nextSessionExpiry({
    now,
    createdAt: session.createdAt,
    lastExtendedAt: session.lastExtendedAt,
    expiresAt: session.expiresAt,
  })
  if (!next.extended) return session
  const updated = await prisma.commenterSession.update({
    where: { id: session.id },
    data: { expiresAt: next.expiresAt, lastExtendedAt: next.lastExtendedAt },
  })
  return updated as unknown as T
}

export async function revokeCommenterToken(token: string | null, hostname: string | null, now = new Date()) {
  if (!token) return
  await prisma.commenterSession.updateMany({
    where: {
      tokenHash: hashSessionToken(token),
      revokedAt: null,
      ...(hostname ? { hostname } : {}),
    },
    data: { revokedAt: now },
  })
}

export async function revokeCommenterSessionsForEmail(hostname: string, email: string, now = new Date()) {
  const result = await prisma.commenterSession.updateMany({
    where: { hostname, email, revokedAt: null },
    data: { revokedAt: now },
  })
  return result.count
}
