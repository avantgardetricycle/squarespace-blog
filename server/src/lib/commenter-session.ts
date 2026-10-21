import crypto from 'crypto'
import type { Request } from 'express'
import { websiteHostname } from './planEntitlements.js'

export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000
export const SESSION_SLIDE_AFTER_MS = 24 * 60 * 60 * 1000
export const SESSION_ABSOLUTE_CAP_MS = 180 * 24 * 60 * 60 * 1000

export function commenterScope(site: { id: string; url: string | null | undefined }): string {
  return websiteHostname(site.url) ?? `site:${site.id}`
}

export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('base64url')
}

export function hashSessionToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export function readBearerToken(req: Request): string | null {
  const header = req.get('authorization') ?? ''
  const match = /^Bearer\s+(\S+)/i.exec(header.trim())
  const token = match?.[1]?.trim() ?? ''
  return token || null
}

export function initialSessionExpiry(now: Date): { expiresAt: Date; lastExtendedAt: Date } {
  return {
    expiresAt: new Date(now.getTime() + SESSION_TTL_MS),
    lastExtendedAt: now,
  }
}

export function sessionIsValid(
  session: { hostname: string; revokedAt: Date | null; expiresAt: Date },
  hostname: string,
  now: Date
): boolean {
  if (session.hostname !== hostname) return false
  if (session.revokedAt) return false
  if (session.expiresAt.getTime() <= now.getTime()) return false
  return true
}

/**
 * Sliding 30-day expiry, extended only when the last extension was more than 24 hours ago.
 * expiresAt never moves past createdAt + 180 days.
 */
export function nextSessionExpiry(input: {
  now: Date
  createdAt: Date
  lastExtendedAt: Date
  expiresAt: Date
}): { expiresAt: Date; lastExtendedAt: Date; extended: boolean } {
  const elapsed = input.now.getTime() - input.lastExtendedAt.getTime()
  if (elapsed <= SESSION_SLIDE_AFTER_MS) {
    return {
      expiresAt: input.expiresAt,
      lastExtendedAt: input.lastExtendedAt,
      extended: false,
    }
  }
  const cap = input.createdAt.getTime() + SESSION_ABSOLUTE_CAP_MS
  const proposed = input.now.getTime() + SESSION_TTL_MS
  return {
    expiresAt: new Date(Math.min(proposed, cap)),
    lastExtendedAt: input.now,
    extended: true,
  }
}
