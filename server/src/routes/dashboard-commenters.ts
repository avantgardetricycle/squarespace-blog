import { Router, Request, Response } from 'express'
import prisma from '../db/index.js'
import { requireSession, SessionUser } from '../middleware/session.js'
import { commenterScope } from '../lib/commenter-session.js'
import { normalizeCommenterEmail } from '../lib/commenter-otp.js'
import { revokeCommenterSessionsForEmail } from '../lib/commenter-auth-store.js'
import { loadUserPlanContext } from '../lib/planAccess.js'

const router = Router()

router.post('/revoke', requireSession, async (req: Request, res: Response) => {
  const { user } = req as Request & { user: SessionUser }
  const plan = await loadUserPlanContext(user.id)
  if (!plan.entitlements.features.comments) {
    res.status(403).json({ error: `Comments require the ${plan.entitlements.requiredPlan.comments} plan.` })
    return
  }

  const body = req.body as { site_id?: unknown; email?: unknown }
  const siteId = typeof body.site_id === 'string' ? body.site_id.trim() : ''
  const email = typeof body.email === 'string' ? normalizeCommenterEmail(body.email) : ''
  if (!siteId || !email) {
    res.status(400).json({ error: 'site_id and email are required' })
    return
  }

  const site = await prisma.site.findFirst({
    where: { id: siteId, userId: user.id, deletedAt: null },
    select: { id: true, url: true },
  })
  if (!site) {
    res.status(404).json({ error: 'Site not found' })
    return
  }

  const revoked = await revokeCommenterSessionsForEmail(commenterScope(site), email)
  res.json({ revoked })
})

export default router
