const LOG_PREFIX = '[BetterBlog/isLive]'

/** Set at build time from `IS_BETTER_BLOG_LIVE` / `VITE_IS_BETTER_BLOG_LIVE` on Vercel. */
export const BUILD_TIME_IS_LIVE = import.meta.env.VITE_IS_BETTER_BLOG_LIVE === 'true'

export const BUILD_TIME_RAW = import.meta.env.VITE_IS_BETTER_BLOG_LIVE

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

export interface IsBetterBlogLiveResolution {
  isLive: boolean
  source: 'health' | 'build-time-fallback'
  reason: string
  buildTimeRaw: string
  buildTimeIsLive: boolean
  health?: {
    ok: boolean
    status: number
    contentType: string | null
    bodyPreview: string
    parsed?: IsBetterBlogLiveHealthResponse
  }
}

function logResolution(resolution: IsBetterBlogLiveResolution): void {
  console.info(LOG_PREFIX, resolution)
}

/**
 * Prefer `/api/health` when reachable; fall back to build-time flag when the request
 * fails (e.g. Vercel Deployment Protection on preview returns 401 for `/api/*`).
 */
export async function resolveIsBetterBlogLive(): Promise<boolean> {
  const base = {
    buildTimeRaw: BUILD_TIME_RAW,
    buildTimeIsLive: BUILD_TIME_IS_LIVE,
  }

  console.info(LOG_PREFIX, 'resolving…', base)

  try {
    const res = await fetch('/api/health')
    const contentType = res.headers.get('content-type')
    const text = await res.text()
    const bodyPreview = text.slice(0, 200)

    let parsed: IsBetterBlogLiveHealthResponse | undefined
    if (contentType?.includes('application/json')) {
      try {
        parsed = JSON.parse(text) as IsBetterBlogLiveHealthResponse
      } catch {
        parsed = undefined
      }
    }

    const healthMeta = {
      ok: res.ok,
      status: res.status,
      contentType,
      bodyPreview,
      parsed,
    }

    if (!res.ok) {
      const resolution: IsBetterBlogLiveResolution = {
        ...base,
        isLive: BUILD_TIME_IS_LIVE,
        source: 'build-time-fallback',
        reason: `health HTTP ${res.status}`,
        health: healthMeta,
      }
      logResolution(resolution)
      return BUILD_TIME_IS_LIVE
    }

    if (typeof parsed?.isLive === 'boolean') {
      const resolution: IsBetterBlogLiveResolution = {
        ...base,
        isLive: parsed.isLive,
        source: 'health',
        reason: 'health.isLive',
        health: healthMeta,
      }
      logResolution(resolution)
      return parsed.isLive
    }

    const resolution: IsBetterBlogLiveResolution = {
      ...base,
      isLive: BUILD_TIME_IS_LIVE,
      source: 'build-time-fallback',
      reason: parsed ? 'health missing isLive' : 'health not JSON',
      health: healthMeta,
    }
    logResolution(resolution)
    return BUILD_TIME_IS_LIVE
  } catch (err) {
    const resolution: IsBetterBlogLiveResolution = {
      ...base,
      isLive: BUILD_TIME_IS_LIVE,
      source: 'build-time-fallback',
      reason: err instanceof Error ? err.message : 'fetch failed',
    }
    logResolution(resolution)
    return BUILD_TIME_IS_LIVE
  }
}
