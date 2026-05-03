import { Router, Request, Response } from 'express'
import prisma from '../db/index.js'
import { requireSession, SessionUser } from '../middleware/session.js'

const router = Router()

// GET /api/blog-authors/:siteKey - List authors for a site (requires auth, must own site)
router.get('/:siteKey', requireSession, async (req: Request, res: Response) => {
  const { user } = req as Request & { user: SessionUser }
  const siteKey = req.params.siteKey as string

  const site = await prisma.site.findFirst({
    where: { siteKey, userId: user.id, deletedAt: null }
  })
  if (!site) {
    res.status(404).json({ error: 'Site not found' })
    return
  }

  const authors = await prisma.blogAuthor.findMany({
    where: { siteId: site.id },
    orderBy: { name: 'asc' }
  })

  res.json(
    authors.map((a) => ({
      id: a.id,
      name: a.name,
      imageUrl: a.imageUrl ?? null,
      bio: a.bio ?? null,
      bioLong: a.bioLong ?? null,
      email: a.email ?? null,
      socialLinks: (a.socialLinks as Record<string, string>) ?? {},
      ingestedFrom: a.ingestedFrom,
      isDefault: a.isDefault
    }))
  )
})

// POST /api/blog-authors - Add a new author (requires auth, must own site)
router.post('/', requireSession, async (req: Request, res: Response) => {
  const { user } = req as Request & { user: SessionUser }
  const body = req.body as {
    siteKey?: string
    name?: string
    ingestedFrom?: string
    isDefault?: boolean
    imageUrl?: string | null
    bio?: string | null
    bioLong?: string | null
    email?: string | null
    socialLinks?: Record<string, string> | null
  }
  const { siteKey, name, ingestedFrom, isDefault, imageUrl, bio, bioLong, email, socialLinks } = body

  if (!siteKey || typeof name !== 'string' || !name.trim()) {
    res.status(400).json({ error: 'siteKey and name are required' })
    return
  }

  const site = await prisma.site.findFirst({
    where: { siteKey, userId: user.id, deletedAt: null }
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
    res.json({
      id: existing.id,
      name: existing.name,
      imageUrl: existing.imageUrl ?? null,
      bio: existing.bio ?? null,
      bioLong: existing.bioLong ?? null,
      email: existing.email ?? null,
      socialLinks: (existing.socialLinks as Record<string, string>) ?? {},
      ingestedFrom: existing.ingestedFrom,
      isDefault: existing.isDefault
    })
    return
  }

  const fromIngestion = ingestedFrom === 'SQUARESPACE'
  const bioLongTrimmed = typeof bioLong === 'string' ? bioLong.slice(0, 1000) : null
  const author = await prisma.blogAuthor.create({
    data: {
      siteId: site.id,
      name: trimmedName,
      ingestedFrom: fromIngestion ? 'SQUARESPACE' : 'BETTER_BLOG',
      isDefault: fromIngestion ? true : Boolean(isDefault),
      imageUrl: typeof imageUrl === 'string' ? imageUrl : null,
      bio: typeof bio === 'string' ? bio : null,
      bioLong: bioLongTrimmed || null,
      email: typeof email === 'string' ? email : null,
      socialLinks: socialLinks && typeof socialLinks === 'object' ? socialLinks : {}
    }
  })

  res.status(201).json({
    id: author.id,
    name: author.name,
    imageUrl: author.imageUrl ?? null,
    bio: author.bio ?? null,
    bioLong: author.bioLong ?? null,
    email: author.email ?? null,
    socialLinks: (author.socialLinks as Record<string, string>) ?? {},
    ingestedFrom: author.ingestedFrom,
    isDefault: author.isDefault
  })
})

// PATCH /api/blog-authors/:id - Update author profile (requires auth, must own site)
router.patch('/:id', requireSession, async (req: Request, res: Response) => {
  const { user } = req as Request & { user: SessionUser }
  const authorId = req.params.id as string
  const body = req.body as {
    name?: string
    imageUrl?: string | null
    bio?: string | null
    bioLong?: string | null
    email?: string | null
    socialLinks?: Record<string, string> | null
  }

  const author = await prisma.blogAuthor.findUnique({
    where: { id: authorId },
    include: { site: true }
  })
  if (!author) {
    res.status(404).json({ error: 'Author not found' })
    return
  }

  const site = await prisma.site.findFirst({
    where: { id: author.siteId, userId: user.id, deletedAt: null }
  })
  if (!site) {
    res.status(404).json({ error: 'Author not found' })
    return
  }

  const data: {
    name?: string
    imageUrl?: string | null
    bio?: string | null
    bioLong?: string | null
    email?: string | null
    socialLinks?: object
  } = {}
  if (body.name !== undefined && typeof body.name === 'string' && body.name.trim()) {
    data.name = body.name.trim()
  }
  if (body.imageUrl !== undefined) data.imageUrl = body.imageUrl ?? null
  if (body.bio !== undefined) data.bio = body.bio ?? null
  if (body.bioLong !== undefined) data.bioLong = body.bioLong != null ? String(body.bioLong).slice(0, 1000) : null
  if (body.email !== undefined) data.email = body.email ?? null
  if (body.socialLinks !== undefined) {
    data.socialLinks =
      body.socialLinks && typeof body.socialLinks === 'object' ? body.socialLinks : {}
  }

  const updated = await prisma.blogAuthor.update({
    where: { id: authorId },
    data
  })

  res.json({
    id: updated.id,
    name: updated.name,
    imageUrl: updated.imageUrl ?? null,
    bio: updated.bio ?? null,
    bioLong: updated.bioLong ?? null,
    email: updated.email ?? null,
    socialLinks: (updated.socialLinks as Record<string, string>) ?? {},
    ingestedFrom: updated.ingestedFrom,
    isDefault: updated.isDefault
  })
})

export default router
