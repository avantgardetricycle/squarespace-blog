import { Router, Request, Response } from 'express'
import prisma from '../db/index.js'

const router = Router()

// GET /api/templates?level=collection|post - List templates for a level (no auth required)
router.get('/', async (req: Request, res: Response) => {
  const level = req.query.level as string
  if (!level || (level !== 'collection' && level !== 'post')) {
    res.status(400).json({ error: 'level query param must be "collection" or "post"' })
    return
  }

  try {
    const templates = await prisma.templateConfig.findMany({
      where: { level },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        templateKey: true,
        name: true,
        description: true,
        collectionConfig: true,
        postConfig: true,
        previewLayout: true,
      },
    })
    res.json({ templates })
  } catch (err) {
    console.error('[templates] GET error:', err)
    res.status(500).json({ error: 'Failed to load templates' })
  }
})

export default router
