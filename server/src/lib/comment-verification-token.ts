import crypto from 'crypto'
import prisma from '../db/index.js'
import type { VerificationSession } from './comment-verification-session.js'

const VERIFICATION_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000

export async function readCommentVerificationSession(
  token: string,
  siteId: string
): Promise<VerificationSession | null> {
  const trimmed = token.trim()
  if (!trimmed || trimmed.length > 128) return null
  const row = await prisma.commentVerificationToken.findFirst({
    where: { token: trimmed, siteId },
  })
  if (!row || row.expiresAt.getTime() <= Date.now() || !row.email.trim()) {
    if (row) {
      await prisma.commentVerificationToken.deleteMany({ where: { token: trimmed, siteId } })
    }
    return null
  }
  return {
    email: row.email.trim().toLowerCase(),
    displayName: row.displayName,
    customName: row.customName,
  }
}

export async function saveCommentVerificationSession(input: {
  existingToken?: string | null
  siteId: string
  email: string
  displayName: string
  customName: boolean
}): Promise<string> {
  const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS)
  const existing = input.existingToken?.trim() || ''
  const token =
    existing.length >= 32 && existing.length <= 128 ? existing : crypto.randomBytes(32).toString('hex')
  const displayName = input.displayName.trim().slice(0, 100) || 'Member'
  await prisma.commentVerificationToken.upsert({
    where: { token },
    create: {
      token,
      siteId: input.siteId,
      email: input.email.trim().toLowerCase(),
      displayName,
      customName: input.customName,
      expiresAt,
    },
    update: {
      email: input.email.trim().toLowerCase(),
      displayName,
      customName: input.customName,
      expiresAt,
    },
  })
  return token
}

export async function deleteCommentVerificationSession(token: string, siteId: string): Promise<void> {
  const trimmed = token.trim()
  if (!trimmed) return
  await prisma.commentVerificationToken.deleteMany({ where: { token: trimmed, siteId } })
}
