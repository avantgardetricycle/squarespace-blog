import { Router, Request, Response } from 'express'
import prisma from '../db/index.js'

const router = Router()

/** Merged onto DB template rows when serving Masthead. */
const CANONICAL_MASTHEAD_COLLECTION_TEMPLATE = {
  pagination: { show: true, mode: 'infiniteScroll' as const, postsPerPage: 10 as const },
  leftSidebar: {
    show: false,
    modules: [] as string[],
    moduleOrder: [] as string[],
    width: 240,
    spaceAbove: 0,
    sticky: true
  },
  rightSidebar: {
    show: false,
    modules: [] as string[],
    moduleOrder: [] as string[],
    width: 240,
    spaceAbove: 0,
    sticky: true
  },
  collectionModules: {
    filter: { filterByTags: true, filterByCategories: true },
    sort: {},
    search: {},
    recentPosts: {},
    emailCapture: {
      header: 'Subscribe to our newsletter',
      buttonText: 'Subscribe'
    },
    leadMagnet: {
      resourceTitle: '',
      description: '',
      buttonText: 'Get it free'
    }
  },
  headerContent: {
    show: true,
    modules: ['filterByTagsAndCategories', 'postSort', 'searchPosts'],
    moduleOrder: ['filterByTagsAndCategories', 'postSort', 'searchPosts'],
    height: 48
  },
  footerContent: {
    show: true,
    modules: ['emailCapture'],
    moduleOrder: ['emailCapture'],
    height: 48,
    contentAlignment: 'left' as const,
    leftPadding: 0,
    rightPadding: 0
  },
  featuredArticle: { show: true, position: 'header' as const }
}

/** Merged onto DB template rows when serving Showcase so Configure/preview match product intent. */
const CANONICAL_SHOWCASE_COLLECTION_TEMPLATE = {
  showAuthor: true,
  showReadingTime: true,
  featuredArticle: { show: true, position: 'inLayout' as const },
  headerContent: {
    show: true,
    modules: ['filterByTagsAndCategories', 'searchPosts'],
    moduleOrder: ['filterByTagsAndCategories', 'searchPosts'],
    height: 48
  },
  collectionModules: {
    filter: { filterByTags: true, filterByCategories: true },
    sort: {},
    search: {},
    recentPosts: {},
    emailCapture: {
      header: 'Subscribe to our newsletter',
      buttonText: 'Subscribe'
    },
    leadMagnet: {
      resourceTitle: '',
      description: '',
      buttonText: 'Get it free'
    }
  }
}

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

const CANONICAL_FEATURE_POST_TEMPLATE = {
  showDate: true,
  showAuthor: true,
  showReadingTime: true,
  postHeader: {
    imagePosition: 'fullBleed',
    contentAlignment: 'center',
    fullBleedLayout: 'stacked',
    showBreadcrumbs: true,
    showTags: true,
    showCategories: true
  },
  leftSidebar: {
    show: true,
    modules: ['tableOfContents'],
    moduleOrder: ['tableOfContents'],
    width: 240,
    spaceAbove: 0,
    sticky: true
  },
  rightSidebar: {
    show: true,
    modules: ['authorProfiles', 'relevantPosts', 'popularPosts'],
    moduleOrder: ['authorProfiles', 'relevantPosts', 'popularPosts'],
    width: 280,
    spaceAbove: 0,
    sticky: true
  },
  headerContent: { show: false, modules: [] as string[], moduleOrder: [] as string[], height: 48 },
  footerContent: {
    show: true,
    modules: ['authorProfiles', 'relevantPosts', 'emailCapture', 'leadMagnet'],
    moduleOrder: ['authorProfiles', 'relevantPosts', 'emailCapture', 'leadMagnet'],
    height: 56,
    contentAlignment: 'left',
    leftPadding: 0,
    rightPadding: 0
  },
  socialMediaLinks: {
    show: true,
    platforms: ['facebook', 'x', 'linkedin', 'email']
  },
  featuredImage: {
    show: true,
    layoutMode: 'fullBleed',
    imageWidthPercent: 40,
    aspectBehavior: 'original',
    aspectRatio: '16:9',
    roundedCorners: 'off',
    shadow: false,
    showCaption: true,
    verticalSpacing: 'normal'
  },
  postModules: {
    tableOfContents: { enabled: true, position: 'leftSidebar', style: 'bookmark' },
    breadcrumbs: { enabled: true, position: 'none' },
    authorProfiles: { enabled: true, position: 'rightSidebar' },
    popularPosts: { enabled: true, position: 'rightSidebar', count: 5 },
    relevantPosts: { enabled: true, position: 'rightSidebar' },
    emailCapture: {
      enabled: true,
      position: 'footer',
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

const CANONICAL_WRITER_POST_TEMPLATE = {
  showDate: true,
  showAuthor: true,
  showReadingTime: true,
  postHeader: {
    imagePosition: 'belowInfo',
    contentAlignment: 'center',
    showBreadcrumbs: true,
    showTags: false,
    showCategories: true
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
    show: false,
    modules: [],
    moduleOrder: [],
    width: 240,
    spaceAbove: 0,
    sticky: true
  },
  footerContent: {
    show: true,
    modules: ['authorProfiles', 'prevNextArticle'],
    moduleOrder: ['authorProfiles', 'prevNextArticle'],
    height: 56,
    contentAlignment: 'left',
    leftPadding: 0,
    rightPadding: 0
  },
  featuredImage: {
    show: false
  },
  postModules: {
    authorProfiles: { enabled: true, position: 'footer' }
  }
}

const CANONICAL_REPORTER_POST_TEMPLATE = {
  showDate: true,
  showAuthor: true,
  showReadingTime: true,
  postHeader: {
    imagePosition: 'rightOfInfo',
    contentAlignment: 'left',
    showBreadcrumbs: true,
    showTags: true,
    showCategories: true,
    showByline: true
  },
  leftSidebar: {
    show: false,
    modules: [],
    moduleOrder: [],
    width: 240,
    spaceAbove: 0,
    sticky: true
  },
  rightSidebar: {
    show: true,
    modules: ['authorProfiles', 'relevantPosts', 'emailCapture'],
    moduleOrder: ['authorProfiles', 'relevantPosts', 'emailCapture'],
    width: 280,
    spaceAbove: 0,
    sticky: true
  },
  headerContent: { show: false, modules: [] as string[], moduleOrder: [] as string[], height: 48 },
  footerContent: {
    show: true,
    modules: ['authorProfiles', 'relevantPosts', 'leadMagnet'],
    moduleOrder: ['authorProfiles', 'relevantPosts', 'leadMagnet'],
    height: 56,
    contentAlignment: 'left',
    leftPadding: 0,
    rightPadding: 0
  },
  socialMediaLinks: { show: false, platforms: [] as string[] },
  featuredImage: {
    show: true,
    layoutMode: 'rightJustified',
    imageWidthPercent: 38,
    aspectBehavior: 'original',
    aspectRatio: '16:9',
    roundedCorners: 'off',
    shadow: false,
    showCaption: true,
    verticalSpacing: 'normal'
  },
  progressBar: { show: true, position: 'top', thickness: 6, color: '#5B4FE8' },
  postModules: {
    tableOfContents: { enabled: false, position: 'none', style: 'numbered' },
    breadcrumbs: { enabled: true, position: 'none' },
    authorProfiles: { enabled: true, position: 'rightSidebar' },
    popularPosts: { enabled: false, position: 'none', count: 5 },
    relevantPosts: { enabled: true, position: 'rightSidebar' },
    emailCapture: {
      enabled: true,
      position: 'rightSidebar',
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

const CANONICAL_STORY_POST_TEMPLATE = {
  showDate: true,
  showAuthor: true,
  showReadingTime: true,
  postHeader: {
    imagePosition: 'leftOfInfo',
    contentAlignment: 'left',
    showBreadcrumbs: true,
    showTags: true,
    showCategories: true,
    showByline: true
  },
  leftSidebar: {
    show: false,
    modules: [],
    moduleOrder: [],
    width: 240,
    spaceAbove: 0,
    sticky: true
  },
  rightSidebar: {
    show: false,
    modules: [],
    moduleOrder: [],
    width: 240,
    spaceAbove: 0,
    sticky: true
  },
  headerContent: { show: false, modules: [] as string[], moduleOrder: [] as string[], height: 56 },
  footerContent: {
    show: true,
    modules: ['authorProfiles', 'leadMagnet'],
    moduleOrder: ['authorProfiles', 'leadMagnet'],
    height: 56,
    contentAlignment: 'left',
    leftPadding: 0,
    rightPadding: 0
  },
  socialMediaLinks: { show: true, platforms: ['facebook', 'x', 'linkedin', 'email'] },
  featuredImage: {
    show: true,
    layoutMode: 'leftJustified',
    imageWidthPercent: 60,
    aspectBehavior: 'original',
    aspectRatio: '16:9',
    roundedCorners: 'off',
    shadow: false,
    showCaption: true,
    verticalSpacing: 'normal'
  },
  postModules: {
    tableOfContents: { enabled: false, position: 'none', style: 'numbered' },
    breadcrumbs: { enabled: true, position: 'none' },
    authorProfiles: { enabled: true, position: 'footer' },
    popularPosts: { enabled: false, position: 'none', count: 5 },
    relevantPosts: { enabled: false, position: 'none' },
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
  if (level === 'post' && template.templateKey === 'writer') {
    const existing = template.postConfig && typeof template.postConfig === 'object'
      ? template.postConfig as Record<string, unknown>
      : {}
    return {
      ...template,
      postConfig: {
        ...existing,
        ...CANONICAL_WRITER_POST_TEMPLATE
      }
    }
  }
  if (level === 'post' && template.templateKey === 'feature') {
    const existing = template.postConfig && typeof template.postConfig === 'object'
      ? template.postConfig as Record<string, unknown>
      : {}
    return {
      ...template,
      postConfig: {
        ...existing,
        ...CANONICAL_FEATURE_POST_TEMPLATE
      }
    }
  }
  if (level === 'post' && template.templateKey === 'reporter') {
    const existing = template.postConfig && typeof template.postConfig === 'object'
      ? template.postConfig as Record<string, unknown>
      : {}
    return {
      ...template,
      postConfig: {
        ...existing,
        ...CANONICAL_REPORTER_POST_TEMPLATE
      }
    }
  }
  if (level === 'post' && template.templateKey === 'story') {
    const existing = template.postConfig && typeof template.postConfig === 'object'
      ? template.postConfig as Record<string, unknown>
      : {}
    return {
      ...template,
      postConfig: {
        ...existing,
        ...CANONICAL_STORY_POST_TEMPLATE
      }
    }
  }
  if (level === 'collection' && template.templateKey === 'masthead') {
    const existing = template.collectionConfig && typeof template.collectionConfig === 'object'
      ? template.collectionConfig as Record<string, unknown>
      : {}
    return {
      ...template,
      collectionConfig: {
        ...existing,
        ...CANONICAL_MASTHEAD_COLLECTION_TEMPLATE
      }
    }
  }
  if (level === 'collection' && template.templateKey === 'showcase') {
    const existing = template.collectionConfig && typeof template.collectionConfig === 'object'
      ? template.collectionConfig as Record<string, unknown>
      : {}
    return {
      ...template,
      collectionConfig: {
        ...existing,
        ...CANONICAL_SHOWCASE_COLLECTION_TEMPLATE
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
