/** Set at build time from `IS_BETTER_BLOG_LIVE` / `VITE_IS_BETTER_BLOG_LIVE` on Vercel. */
export const BUILD_TIME_IS_LIVE = import.meta.env.VITE_IS_BETTER_BLOG_LIVE === 'true'

/**
 * Prefer `/api/health` when reachable; fall back to build-time flag when the request
 * fails (e.g. Vercel Deployment Protection on preview returns 401 for `/api/*`).
 */
export async function resolveIsBetterBlogLive(): Promise<boolean> {
  try {
    const res = await fetch('/api/health')
    if (!res.ok) return BUILD_TIME_IS_LIVE
    const data = (await res.json()) as { isLive?: boolean }
    if (typeof data.isLive === 'boolean') return data.isLive
    return BUILD_TIME_IS_LIVE
  } catch {
    return BUILD_TIME_IS_LIVE
  }
}
