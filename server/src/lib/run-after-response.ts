import { waitUntil } from '@vercel/functions'

/** Keep work alive after the HTTP response. Falls back to a floating promise outside Vercel. */
export function runAfterResponse(work: Promise<unknown>): void {
  const pending = work.catch((err) => {
    const message = err instanceof Error ? err.message : 'background task failed'
    console.error('[commenter-auth] background task failed:', message.replace(/\b\d{6}\b/g, '******'))
  })
  try {
    waitUntil(pending)
  } catch {
    void pending
  }
}
