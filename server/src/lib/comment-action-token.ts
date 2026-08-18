import crypto from 'crypto'

export type CommentAction = 'approve' | 'spam' | 'hide' | 'view'

const TOKEN_TTL_MS = 72 * 60 * 60 * 1000 // 72 hours

function getSecret(): string {
  const secret = process.env.COMMENT_ACTION_SECRET || process.env.ENCRYPTION_KEY
  if (!secret) throw new Error('COMMENT_ACTION_SECRET or ENCRYPTION_KEY required for comment action tokens')
  return secret
}

export function signCommentActionToken(commentId: string, action: CommentAction): string {
  const secret = getSecret()
  const exp = Date.now() + TOKEN_TTL_MS
  const payload = `${commentId}:${action}:${exp}`
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex')
  return Buffer.from(JSON.stringify({ commentId, action, exp, sig })).toString('base64url')
}

export function verifyCommentActionToken(token: string): { commentId: string; action: CommentAction } | null {
  try {
    const secret = getSecret()
    const decoded = JSON.parse(Buffer.from(token, 'base64url').toString('utf8'))
    const { commentId, action, exp, sig } = decoded
    if (!commentId || !action || !exp || !sig) return null
    if (Date.now() > exp) return null
    const payload = `${commentId}:${action}:${exp}`
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex')
    if (sig !== expected) return null
    if (action !== 'approve' && action !== 'spam' && action !== 'hide' && action !== 'view') return null
    return { commentId, action }
  } catch {
    return null
  }
}
