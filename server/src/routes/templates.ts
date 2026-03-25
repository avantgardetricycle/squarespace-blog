import { Router, Request, Response } from 'express'
import prisma from '../db/index.js'

const router = Router()

const CANONICAL_PUBLISHER_POST_TEMPLATE = {
  showDate: true,
  showAuthor: true,
  showReadingTime: true,
  postHeader: {
    imagePosition: 'fullBleed',
    contentAlignment: 'left',
    showBreadcrumbs: false,
    showTags: false,
    showCategories: false
  },
  leftSidebar: {
    show: false,
    modules: [],
    moduleOrder: [],
    width: 200,
    spaceAbove: 0,
    sticky: true
  },
  rightSidebar: {
    show: true,
    modules: ['popularPosts', 'relevantPosts', 'filterByTagsAndCategories'],
    moduleOrder: ['popularPosts', 'relevantPosts', 'filterByTagsAndCategories'],
    width: 300,
    spaceAbove: 0,
    sticky: true
  },
  footerContent: {
    show: true,
    modules: ['authorProfiles', 'relevantPosts', 'leadMagnet'],
    moduleOrder: ['authorProfiles', 'relevantPosts', 'leadMagnet'],
    height: 56,
    contentAlignment: 'left',
    leftPadding: 0,
    rightPadding: 0
  },
  postModules: {
    tableOfContents: { enabled: false, position: 'none', style: 'numbered' },
    breadcrumbs: { enabled: false, position: 'none' },
    authorProfiles: { enabled: true, position: 'footer' },
    popularPosts: { enabled: true, position: 'rightSidebar', count: 5 },
    relevantPosts: { enabled: true, position: 'rightSidebar' },
    emailCapture: {
      enabled: false,
      position: 'none',
      header: 'Subscribe to our newsletter',
      buttonText: 'Subscribe'
    },
    leadMagnet: {
      enabled: true,
      position: 'footer',
      resourceTitle: 'Free resource',
      description: 'Subscribe to get our guide in your inbox.',
      buttonText: 'Get it free'
    }
  }
}

function normalizeTemplateForResponse (
  template: {
    id: string
    templateKey: string
    name: string
    description: string | null
    collectionConfig: unknown
    postConfig: unknown
    previewLayout: string
  },
  level: 'collection' | 'post'
) {
  if (level === 'post' && template.templateKey === 'publisher') {
    const existing = template.postConfig && typeof template.postConfig === 'object'
      ? template.postConfig as Record<string, unknown>
      : {}
    return {
      ...template,
      postConfig: {
        ...existing,
        ...CANONICAL_PUBLISHER_POST_TEMPLATE
      }
    }
  }
  return template
}

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
    const normalized = templates.map((t) => normalizeTemplateForResponse(t, level))
    res.json({ templates: normalized })
  } catch (err) {
    console.error('[templates] GET error:', err)
    res.status(500).json({ error: 'Failed to load templates' })
  }
})

export default router
