import { Router, Request, Response } from 'express'
import prisma from '../db/index.js'
import { requireSession, SessionUser } from '../middleware/session.js'

const router = Router()

// GET /api/blog-authors/:siteKey - List authors for a site (requires auth, must own site)
router.get('/:siteKey', requireSession, async (req: Request, res: Response) => {
  const { user } = req as Request & { user: SessionUser }
  const siteKey = req.params.siteKey as string

  const site = await prisma.site.findFirst({
    where: { siteKey, userId: user.id }
  })
  if (!site) {
    res.status(404).json({ error: 'Site not found' })
    return
  }

  const authors = await prisma.blogAuthor.findMany({
    where: { siteId: site.id },
    orderBy: { name: 'asc' }
  })

  res.json(authors.map((a) => ({ id: a.id, name: a.name, ingestedFrom: a.ingestedFrom, isDefault: a.isDefault })))
})

// POST /api/blog-authors - Add a new author (requires auth, must own site)
router.post('/', requireSession, async (req: Request, res: Response) => {
  const { user } = req as Request & { user: SessionUser }
  const { siteKey, name, ingestedFrom, isDefault } = req.body

  if (!siteKey || typeof name !== 'string' || !name.trim()) {
    res.status(400).json({ error: 'siteKey and name are required' })
    return
  }

  const site = await prisma.site.findFirst({
    where: { siteKey, userId: user.id }
  })
  if (!site) {
    res.status(404).json({ error: 'Site not found' })
    return
  }

  const trimmedName = name.trim()
  const existing = await prisma.blogAuthor.findUnique({
    where: { siteId_name: { siteId: site.id, name: trimmedName } }
  })
  if (existing) {
    res.json({ id: existing.id, name: existing.name, ingestedFrom: existing.ingestedFrom, isDefault: existing.isDefault })
    return
  }

  const fromIngestion = ingestedFrom === 'SQUARESPACE'
  const author = await prisma.blogAuthor.create({
    data: {
      siteId: site.id,
      name: trimmedName,
      ingestedFrom: fromIngestion ? 'SQUARESPACE' : 'BETTER_BLOG',
      isDefault: fromIngestion ? true : Boolean(isDefault)
    }
  })

  res.status(201).json({ id: author.id, name: author.name, ingestedFrom: author.ingestedFrom, isDefault: author.isDefault })
})

export default router
