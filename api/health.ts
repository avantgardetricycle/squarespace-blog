import type { VercelRequest, VercelResponse } from '@vercel/node'

/**
 * Lightweight health check — does not import Express/Prisma.
 * Routed explicitly in vercel.json so it is not handled by api/index.ts.
 */
export default function handler(_req: VercelRequest, res: VercelResponse) {
  const isBetterBlogLiveEnv = process.env.IS_BETTER_BLOG_LIVE
  const isLive = isBetterBlogLiveEnv === 'true'
  const debug = {
    vercelEnv: process.env.VERCEL_ENV,
    gitBranch: process.env.VERCEL_GIT_COMMIT_REF,
    deploymentId: process.env.VERCEL_DEPLOYMENT_ID,
    isBetterBlogLiveEnv: isBetterBlogLiveEnv ?? null,
    handler: 'api/health.ts',
  }
  console.info('[BetterBlog/health]', { isLive, ...debug })
  res.setHeader('Cache-Control', 'no-store')
  res.status(200).json({ status: 'ok', isLive, debug })
}
