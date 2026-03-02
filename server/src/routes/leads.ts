import { Router, Request, Response } from 'express'
import prisma from '../db/index.js'

const router = Router()

// POST /api/leads - Submit interest form (public, no auth)
router.post('/', async (req: Request, res: Response) => {
  try {
    const { email, name } = req.body as { email?: string; name?: string }
    if (!email || typeof email !== 'string') {
      res.status(400).json({ error: 'Email is required' })
      return
    }
    const trimmedEmail = email.trim().toLowerCase()
    if (!trimmedEmail) {
      res.status(400).json({ error: 'Email is required' })
      return
    }
    const trimmedName = typeof name === 'string' ? name.trim() || null : null

    await prisma.customerLead.upsert({
      where: { email: trimmedEmail },
      create: { email: trimmedEmail, name: trimmedName },
      update: { name: trimmedName },
    })

    res.status(201).json({ ok: true })
  } catch (err) {
    console.error('[leads] POST error:', err)
    res.status(500).json({ error: 'Failed to submit' })
  }
})

export default router
