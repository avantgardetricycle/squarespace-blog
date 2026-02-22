import { createHash, randomBytes } from 'crypto'

const TOKEN_BYTES = 32
const SESSION_BYTES = 32

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function generateToken(): string {
  return randomBytes(TOKEN_BYTES).toString('hex')
}

export function generateSessionToken(): string {
  return randomBytes(SESSION_BYTES).toString('hex')
}
