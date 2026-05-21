/** Structured logs for Vercel Functions (console) and local debug ingest. */
export function debugLog(
  hypothesisId: string,
  message: string,
  data: Record<string, unknown> = {}
): void {
  const payload = {
    sessionId: '3103d6',
    hypothesisId,
    location: 'server',
    message,
    data: { ...data, vercel: process.env.VERCEL === '1', region: process.env.VERCEL_REGION },
    timestamp: Date.now(),
  }
  console.info('[BetterBlog/debug]', JSON.stringify(payload))
  if (process.env.VERCEL !== '1') {
    // #region agent log
    fetch('http://127.0.0.1:7779/ingest/21c07440-19af-4cd8-979a-7d2c134d7467', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '3103d6' },
      body: JSON.stringify(payload),
    }).catch(() => {})
    // #endregion
  }
}
