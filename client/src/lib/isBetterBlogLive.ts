/** Do not wait for a hung Express cold start / DB connect on the landing page. */
const HEALTH_FETCH_TIMEOUT_MS = 5_000

/** Set at build time from `IS_BETTER_BLOG_LIVE` / `VITE_IS_BETTER_BLOG_LIVE` on Vercel. */
export const BUILD_TIME_IS_LIVE = import.meta.env.VITE_IS_BETTER_BLOG_LIVE === 'true'

export interface IsBetterBlogLiveHealthDebug {
  vercelEnv?: string
  gitBranch?: string
  gitCommitRef?: string
  isBetterBlogLiveEnv?: string | null
  deploymentId?: string
}

export interface IsBetterBlogLiveHealthResponse {
  status?: string
  isLive?: boolean
  debug?: IsBetterBlogLiveHealthDebug
}

/**
 * Prefer `/api/health` when reachable; fall back to build-time flag when the request
 * fails (e.g. Vercel Deployment Protection on preview returns 401 for `/api/*`).
 */
export async function resolveIsBetterBlogLive(): Promise<boolean> {
  try {
    const res = await fetch('/api/health', {
      signal: AbortSignal.timeout(HEALTH_FETCH_TIMEOUT_MS),
    })
    if (!res.ok) return BUILD_TIME_IS_LIVE

    const contentType = res.headers.get('content-type')
    if (!contentType?.includes('application/json')) return BUILD_TIME_IS_LIVE

    let parsed: IsBetterBlogLiveHealthResponse | undefined
    try {
      parsed = JSON.parse(await res.text()) as IsBetterBlogLiveHealthResponse
    } catch {
      return BUILD_TIME_IS_LIVE
    }

    return typeof parsed?.isLive === 'boolean' ? parsed.isLive : BUILD_TIME_IS_LIVE
  } catch {
    return BUILD_TIME_IS_LIVE
  }
}
