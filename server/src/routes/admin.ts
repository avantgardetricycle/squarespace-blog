import { Router, Request, Response } from 'express'
import { requireAdminSession } from '../middleware/session.js'
import {
  getBetaTesterUsage,
  inviteBetaTester,
  listBetaTesters,
  resendBetaInvite
} from '../lib/beta-testers.js'

const router = Router()

function paramId(value: string | string[] | undefined): number | null {
  const raw = Array.isArray(value) ? value[0] : value
  if (!raw || !/^\d+$/.test(raw)) return null
  const id = Number(raw)
  return Number.isSafeInteger(id) ? id : null
}

router.get('/beta-testers', requireAdminSession, async (_req: Request, res: Response) => {
  try {
    const testers = await listBetaTesters()
    res.json({ testers })
  } catch (err) {
    console.error('List beta testers error:', err)
    res.status(500).json({ error: 'Failed to list beta testers' })
  }
})

router.post('/beta-testers', requireAdminSession, async (req: Request, res: Response) => {
  const { email, name } = (req.body ?? {}) as { email?: unknown; name?: unknown }
  if (typeof email !== 'string') {
    res.status(400).json({ error: 'Email is required' })
    return
  }

  try {
    const result = await inviteBetaTester({
      email,
      name: typeof name === 'string' ? name : null
    })
    if (!result.ok) {
      res.status(result.status).json({ error: result.error })
      return
    }
    const usage = await getBetaTesterUsage(result.userId)
    res.status(result.created ? 201 : 200).json({
      created: result.created,
      resent: result.resent,
      tester: usage?.tester ?? null
    })
  } catch (err) {
    console.error('Invite beta tester error:', err)
    res.status(500).json({ error: 'Failed to invite beta tester' })
  }
})

router.post('/beta-testers/:userId/resend', requireAdminSession, async (req: Request, res: Response) => {
  const userId = paramId(req.params.userId)
  if (userId == null) {
    res.status(400).json({ error: 'Invalid user id' })
    return
  }

  try {
    const result = await resendBetaInvite(userId)
    if (!result.ok) {
      res.status(result.status).json({ error: result.error })
      return
    }
    const usage = await getBetaTesterUsage(userId)
    res.json({ resent: true, tester: usage?.tester ?? null })
  } catch (err) {
    console.error('Resend beta invite error:', err)
    res.status(500).json({ error: 'Failed to resend invite' })
  }
})

router.get('/beta-testers/:userId', requireAdminSession, async (req: Request, res: Response) => {
  const userId = paramId(req.params.userId)
  if (userId == null) {
    res.status(400).json({ error: 'Invalid user id' })
    return
  }

  try {
    const usage = await getBetaTesterUsage(userId)
    if (!usage) {
      res.status(404).json({ error: 'Beta tester not found' })
      return
    }
    res.json(usage)
  } catch (err) {
    console.error('Beta tester usage error:', err)
    res.status(500).json({ error: 'Failed to load beta tester' })
  }
})

export default router
