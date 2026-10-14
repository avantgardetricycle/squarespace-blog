/**
 * Squarespace blog passwords must be recoverable: the server sends them back to
 * Squarespace as ?password= when fetching a protected blog. Store them with the
 * same AES-256-GCM helper used for API keys, marked so older plaintext rows can
 * still be read until they are rewritten.
 */
import { decrypt, encrypt } from './encryption.js'

export const BLOG_PASSWORD_PREFIX = 'enc:v1:'

export function isSealedBlogPassword (value: string | null | undefined): boolean {
  return typeof value === 'string' && value.trim().startsWith(BLOG_PASSWORD_PREFIX)
}

/** Encrypt a blog password for storage. Blank input clears it. */
export function sealBlogPassword (password: string | null | undefined): string | null {
  if (password == null) return null
  const trimmed = password.trim()
  if (!trimmed) return null
  return BLOG_PASSWORD_PREFIX + encrypt(trimmed)
}

/**
 * Recover the Squarespace password from a stored value.
 * Values without the seal prefix are legacy plaintext.
 */
export function readBlogPassword (stored: string | null | undefined): string | null {
  if (stored == null) return null
  const value = stored.trim()
  if (!value) return null
  if (!isSealedBlogPassword(value)) return value
  return decrypt(value.slice(BLOG_PASSWORD_PREFIX.length))
}
