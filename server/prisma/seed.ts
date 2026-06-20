import 'dotenv/config'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client.js'
import { getDatabaseUrl, getSslConfig } from '../src/lib/db-connection.js'
import { seedPlans } from '../src/lib/plan-seed-data.js'

const pool = new Pool({
  connectionString: getDatabaseUrl(),
  ssl: getSslConfig()
})
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const defaultUserConfig = {
  layout: 'grid',
  postsPerPage: 9,
  showExcerpt: true,
  showDate: true,
  showAuthor: false,
  rendererUrl: '/renderer.js'
}

const defaultSiteConfig = {
  showDate: true,
  showAuthor: false,
  showReadingTime: false,
  progressBar: { show: false, position: null },
  tableOfContents: { show: false, position: null },
  recentPostsSidebar: { show: false, position: null },
  leftSidebar: { show: false, modules: [], width: 240 },
  rightSidebar: { show: false, modules: [], width: 240 },
  headerContent: { show: false, modules: [], height: 48 }
}

async function main() {
  await seedPlans(prisma, ['sandbox'])

  await prisma.$executeRaw`UPDATE subscriptions SET plan = 'essentials' WHERE plan = 'starter'`
  await prisma.$executeRaw`UPDATE subscriptions SET plan = 'professional' WHERE plan = 'pro'`
  await prisma.$executeRaw`UPDATE subscriptions SET plan = 'publication' WHERE plan = 'agency'`
  await prisma.$executeRaw`UPDATE checkout_sessions SET plan = 'essentials' WHERE plan = 'starter'`
  await prisma.$executeRaw`UPDATE checkout_sessions SET plan = 'professional' WHERE plan = 'pro'`
  await prisma.$executeRaw`UPDATE checkout_sessions SET plan = 'publication' WHERE plan = 'agency'`

  // Seed demo user if not exists
  let demoUser = await prisma.user.findUnique({
    where: { email: 'demo@example.com' }
  })
  if (!demoUser) {
    demoUser = await prisma.user.create({
      data: { email: 'demo@example.com' }
    })
    await prisma.config.create({
      data: {
        userId: demoUser.id,
        configJson: JSON.stringify(defaultUserConfig)
      }
    })
    await prisma.subscription.create({
      data: {
        userId: demoUser.id,
        stripeCustomerId: `demo_cus_${demoUser.id}`,
        plan: 'professional',
        status: 'active',
        maxSites: 3
      }
    })
  }

  // Seed demo site and its config if not exists
  let demoSite = await prisma.site.findUnique({
    where: { siteKey: 'demo-site-key' }
  })
  if (!demoSite) {
    demoSite = await prisma.site.create({
      data: {
        userId: demoUser.id,
        siteKey: 'demo-site-key',
        name: 'Demo Site',
        status: 'active',
        channel: 'stable'
      }
    })
    await prisma.siteConfig.create({
      data: {
        siteId: demoSite.id,
        version: 1,
        ...defaultSiteConfig,
        isActive: true
      }
    })
  } else {
    const activeConfig = await prisma.siteConfig.findFirst({
      where: { siteId: demoSite.id, isActive: true }
    })
    if (!activeConfig) {
      await prisma.siteConfig.create({
        data: {
          siteId: demoSite.id,
          version: 1,
          ...defaultSiteConfig,
          isActive: true
        }
      })
    }
  }

  // Seed template configs (collection + post templates)
  const baseCollectionConfig = {
    showDate: true,
    showAuthor: false,
    showReadingTime: false,
    postSort: 'date' as const,
    pagination: { show: false, postsPerPage: 10 },
    leftSidebar: { show: false, modules: [] as string[], width: 240, spaceAbove: 0, sticky: false },
    rightSidebar: { show: false, modules: [] as string[], width: 240, spaceAbove: 0, sticky: false },
    headerContent: { show: false, modules: [] as string[], height: 48 },
    socialMediaLinks: { show: false, platforms: [] as string[] },
    featuredImage: {
      show: true,
      layoutMode: 'leftJustified' as const,
      imageWidthPercent: 40,
      aspectBehavior: 'original' as const,
      aspectRatio: '16:9' as const,
      roundedCorners: 'off' as const,
      shadow: false,
      showCaption: true,
      verticalSpacing: 'normal' as const
    }
  }

  const basePostConfig = {
    ...baseCollectionConfig,
    postHeader: {
      imagePosition: 'fullBleed' as const,
      contentAlignment: 'left' as const,
      contentVerticalAlignment: 'bottom' as const
    },
    progressBar: { show: false, position: 'top' as const, thickness: 6, color: '#5B4FE8' }
  }

  const collectionTemplates = [
    {
      templateKey: 'masthead',
      level: 'collection',
      name: 'The Masthead',
      description: 'Hero-style header with full-width featured post and grid layout.',
      collectionConfig: {
        ...baseCollectionConfig,
        collectionLayout: 'grid',
        gridColumns: 3,
        showDate: true,
        showAuthor: true,
        showReadingTime: true,
        pagination: { show: true, mode: 'infiniteScroll', postsPerPage: 10 },
        leftSidebar: { show: false, modules: [], moduleOrder: [], width: 240, spaceAbove: 0, sticky: false },
        rightSidebar: { show: false, modules: [], moduleOrder: [], width: 240, spaceAbove: 0, sticky: false },
        collectionModules: {
          filter: { filterByTags: false, filterByCategories: true },
          sort: {},
          search: {},
          recentPosts: {},
          emailCapture: {
            header: 'Subscribe to our newsletter',
            buttonText: 'Subscribe'
          },
          leadMagnet: { resourceTitle: '', description: '', buttonText: 'Get it free' }
        },
        headerContent: {
          show: true,
          modules: ['filterByCategory', 'postSort', 'searchPosts'],
          moduleOrder: ['filterByCategory', 'postSort', 'searchPosts'],
          height: 48
        },
        footerContent: {
          show: true,
          modules: ['emailCapture'],
          moduleOrder: ['emailCapture'],
          topPadding: 16
        },
        featuredImage: { ...baseCollectionConfig.featuredImage, layoutMode: 'fullBleed' },
        featuredArticle: { show: true, position: 'header' }
      },
      previewLayout: 'masthead'
    },
    {
      templateKey: 'newsroom',
      level: 'collection',
      name: 'The Newsroom',
      description: 'List layout with in-layout featured post, search, filters, and sort.',
      collectionConfig: {
        ...baseCollectionConfig,
        collectionLayout: 'listRows',
        showDate: true,
        showAuthor: true,
        showReadingTime: true,
        headerContent: {
          show: true,
          modules: ['filterByCategory', 'searchPosts', 'postSort'],
          moduleOrder: ['filterByCategory', 'searchPosts', 'postSort'],
          height: 48
        },
        collectionModules: {
          filter: { filterByTags: false, filterByCategories: true },
          sort: {},
          search: {},
          recentPosts: {},
          emailCapture: {
            header: 'Subscribe to our newsletter',
            buttonText: 'Subscribe'
          },
          leadMagnet: { resourceTitle: '', description: '', buttonText: 'Get it free' }
        },
        leftSidebar: { show: false, modules: [], width: 240, spaceAbove: 0, sticky: false },
        rightSidebar: { show: false, modules: [], width: 240, spaceAbove: 0, sticky: false },
        featuredImage: { ...baseCollectionConfig.featuredImage, layoutMode: 'leftJustified', imageWidthPercent: 30 },
        featuredArticle: { show: true, position: 'inLayout' }
      },
      previewLayout: 'newsroom'
    },
    {
      templateKey: 'digest',
      level: 'collection',
      name: 'The Digest',
      description: 'Featured post at top with sidebar and compact grid.',
      collectionConfig: {
        ...baseCollectionConfig,
        collectionLayout: 'digest',
        gridColumns: 2,
        showDate: true,
        showAuthor: true,
        showReadingTime: true,
        pagination: { show: true, mode: 'pages', postsPerPage: 10 },
        leftSidebar: { show: false, modules: [], moduleOrder: [], width: 240, spaceAbove: 0, sticky: false },
        rightSidebar: {
          show: true,
          modules: ['authorProfiles', 'emailCapture', 'popularPosts', 'filterByCategory'],
          moduleOrder: ['authorProfiles', 'emailCapture', 'popularPosts', 'filterByCategory'],
          width: 280,
          spaceAbove: 0,
          sticky: false
        },
        collectionModules: {
          filter: { filterByTags: false, filterByCategories: true },
          sort: {},
          search: {},
          recentPosts: {},
          popularPosts: { count: 5 },
          emailCapture: {
            header: 'Subscribe to our newsletter',
            buttonText: 'Subscribe'
          },
          leadMagnet: { resourceTitle: '', description: '', buttonText: 'Get it free' }
        },
        headerContent: {
          show: true,
          modules: ['filterByCategory', 'searchPosts', 'postSort'],
          moduleOrder: ['filterByCategory', 'searchPosts', 'postSort'],
          height: 48
        },
        footerContent: {
          show: false,
          modules: [],
          moduleOrder: [],
          topPadding: 16
        },
        featuredImage: { ...baseCollectionConfig.featuredImage, layoutMode: 'fullBleed', imageWidthPercent: 40 },
        featuredArticle: { show: true, position: 'inLayout' }
      },
      previewLayout: 'digest'
    },
    {
      templateKey: 'showcase',
      level: 'collection',
      name: 'The Showcase',
      description: 'Card grid with alternating image layout.',
      collectionConfig: {
        ...baseCollectionConfig,
        showAuthor: true,
        showReadingTime: true,
        collectionLayout: 'showcase',
        gridColumns: 2,
        pagination: { show: true, mode: 'infiniteScroll', postsPerPage: 10 },
        collectionModules: {
          filter: { filterByTags: false, filterByCategories: true },
          sort: {},
          search: {},
          recentPosts: {},
          emailCapture: {
            header: 'Subscribe to our newsletter',
            buttonText: 'Subscribe'
          },
          leadMagnet: { resourceTitle: '', description: '', buttonText: 'Get it free' }
        },
        headerContent: {
          show: true,
          modules: ['filterByCategory', 'postSort', 'searchPosts'],
          moduleOrder: ['filterByCategory', 'postSort', 'searchPosts'],
          height: 48
        },
        featuredImage: { ...baseCollectionConfig.featuredImage, layoutMode: 'leftJustified', imageWidthPercent: 50 },
        featuredArticle: { show: true, position: 'inLayout' }
      },
      previewLayout: 'showcase'
    },
    {
      templateKey: 'editorial',
      level: 'collection',
      name: 'The Editorial',
      description: 'Irregular brick-tile magazine layout.',
      collectionConfig: {
        ...baseCollectionConfig,
        collectionLayout: 'editorial',
        showAuthor: true,
        showReadingTime: true,
        pagination: { show: true, mode: 'pages', postsPerPage: 10 },
        gridColumns: 3,
        headerContent: {
          show: true,
          modules: ['filterByCategory', 'searchPosts', 'postSort'],
          moduleOrder: ['filterByCategory', 'searchPosts', 'postSort'],
          height: 48
        },
        collectionModules: {
          filter: { filterByTags: false, filterByCategories: true },
          sort: {},
          search: {},
          recentPosts: {},
          emailCapture: {
            header: 'Subscribe to our newsletter',
            buttonText: 'Subscribe'
          },
          leadMagnet: { resourceTitle: '', description: '', buttonText: 'Get it free' }
        },
        featuredImage: { ...baseCollectionConfig.featuredImage, layoutMode: 'fullBleed' },
        featuredArticle: { show: true, position: 'inLayout' }
      },
      previewLayout: 'editorial'
    }
  ]

  const postTemplates = [
    {
      templateKey: 'feature',
      level: 'post',
      name: 'The Feature',
      description: 'Centered post header above a full-bleed image, TOC and dual sidebars, rich footer.',
      postConfig: {
        ...basePostConfig,
        showDate: true,
        showAuthor: true,
        showReadingTime: true,
        postHeader: {
          imagePosition: 'fullBleed',
          contentAlignment: 'center',
          contentVerticalAlignment: 'bottom',
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
          sticky: false
        },
        headerContent: { show: false, modules: [], moduleOrder: [], height: 48 },
        footerContent: {
          show: true,
          modules: ['authorProfiles', 'relevantPosts', 'leadMagnet'],
          moduleOrder: ['authorProfiles', 'relevantPosts', 'leadMagnet'],
          topPadding: 16
        },
        socialMediaLinks: {
          show: true,
          platforms: ['facebook', 'x', 'linkedin', 'email']
        },
        featuredImage: { ...baseCollectionConfig.featuredImage, layoutMode: 'fullBleed' },
        postModules: {
          tableOfContents: { enabled: true, position: 'leftSidebar', style: 'bookmark' },
          breadcrumbs: { enabled: true, position: 'none' },
          authorProfiles: { enabled: true, position: 'rightSidebar' },
          popularPosts: { enabled: true, position: 'rightSidebar', count: 5 },
          relevantPosts: { enabled: true, position: 'rightSidebar' },
          leadMagnet: {
            enabled: true,
            position: 'footer',
            resourceTitle: 'Free resource',
            description: 'Subscribe to get our guide in your inbox.',
            buttonText: 'Get it free'
          }
        }
      },
      previewLayout: 'feature'
    },
    {
      templateKey: 'publisher',
      level: 'post',
      name: 'The Publisher',
      description: 'Clean layout with sidebar and full-width image.',
      postConfig: {
        ...basePostConfig,
        showDate: true,
        showAuthor: true,
        showReadingTime: true,
        postHeader: { imagePosition: 'fullBleed', contentAlignment: 'left', contentVerticalAlignment: 'bottom' },
        leftSidebar: { show: false, modules: [], moduleOrder: [], width: 200, spaceAbove: 0, sticky: false },
        rightSidebar: {
          show: true,
          modules: ['popularPosts', 'relevantPosts', 'filterByCategory'],
          moduleOrder: ['popularPosts', 'relevantPosts', 'filterByCategory'],
          width: 300,
          spaceAbove: 0,
          sticky: false
        },
        footerContent: {
          show: true,
          modules: ['authorProfiles', 'relevantPosts'],
          moduleOrder: ['authorProfiles', 'relevantPosts'],
          topPadding: 16
        },
        featuredImage: { ...baseCollectionConfig.featuredImage, layoutMode: 'fullBleed' },
        postModules: {
          tableOfContents: { enabled: false, position: 'none', style: 'numbered' },
          breadcrumbs: { enabled: false, position: 'none' },
          authorProfiles: { enabled: true, position: 'footer' },
          popularPosts: { enabled: true, position: 'rightSidebar', count: 5 },
          relevantPosts: { enabled: true, position: 'rightSidebar' },
          leadMagnet: {
            enabled: false,
            position: 'none',
            resourceTitle: 'Free resource',
            description: 'Subscribe to get our guide in your inbox.',
            buttonText: 'Get it free'
          }
        }
      },
      previewLayout: 'publisher'
    },
    {
      templateKey: 'reporter',
      level: 'post',
      name: 'The Reporter',
      description: 'Split header with story stack on the left and feature image on the right; sidebar modules and a conversion footer.',
      postConfig: {
        ...basePostConfig,
        showDate: true,
        showAuthor: true,
        showReadingTime: true,
        postHeader: {
          imagePosition: 'rightOfInfo',
          contentAlignment: 'left',
          contentVerticalAlignment: 'top',
          showBreadcrumbs: true,
          showTags: true,
          showCategories: true,
          showByline: true
        },
        leftSidebar: { show: false, modules: [], moduleOrder: [], width: 240, spaceAbove: 0, sticky: false },
        rightSidebar: {
          show: true,
          modules: ['authorProfiles', 'relevantPosts'],
          moduleOrder: ['authorProfiles', 'relevantPosts'],
          width: 280,
          spaceAbove: 0,
          sticky: false
        },
        headerContent: { show: false, modules: [], moduleOrder: [], height: 48 },
        footerContent: {
          show: true,
          modules: ['authorProfiles', 'relevantPosts', 'leadMagnet'],
          moduleOrder: ['authorProfiles', 'relevantPosts', 'leadMagnet'],
          topPadding: 16
        },
        socialMediaLinks: { show: false, platforms: [] },
        featuredImage: {
          ...baseCollectionConfig.featuredImage,
          layoutMode: 'rightJustified',
          imageWidthPercent: 38,
          aspectBehavior: 'cropped',
          aspectRatio: '2:3'
        },
        progressBar: { show: true, position: 'top', thickness: 6, color: '#5B4FE8' },
        postModules: {
          tableOfContents: { enabled: false, position: 'none', style: 'numbered' },
          breadcrumbs: { enabled: true, position: 'none' },
          authorProfiles: { enabled: true, position: 'rightSidebar' },
          popularPosts: { enabled: false, position: 'none', count: 5 },
          relevantPosts: { enabled: true, position: 'rightSidebar' },
          leadMagnet: {
            enabled: true,
            position: 'footer',
            resourceTitle: 'Free resource',
            description: 'Subscribe to get our guide in your inbox.',
            buttonText: 'Get it free'
          }
        }
      },
      previewLayout: 'reporter'
    },
    {
      templateKey: 'story',
      level: 'post',
      name: 'The Story',
      description: 'Narrative split header with left feature image and right content stack.',
      postConfig: {
        ...basePostConfig,
        showDate: true,
        showAuthor: true,
        showReadingTime: true,
        postHeader: {
          imagePosition: 'leftOfInfo',
          contentAlignment: 'left',
          contentVerticalAlignment: 'top',
          showBreadcrumbs: true,
          showTags: true,
          showCategories: true,
          showByline: true
        },
        leftSidebar: { show: false, modules: [], moduleOrder: [], width: 240, spaceAbove: 0, sticky: false },
        rightSidebar: { show: false, modules: [], moduleOrder: [], width: 240, spaceAbove: 0, sticky: false },
        headerContent: { show: false, modules: [], moduleOrder: [], height: 56 },
        footerContent: {
          show: true,
          modules: ['authorProfiles', 'leadMagnet'],
          moduleOrder: ['authorProfiles', 'leadMagnet'],
          topPadding: 16
        },
        socialMediaLinks: { show: true, platforms: ['facebook', 'x', 'linkedin', 'email'] },
        featuredImage: { ...baseCollectionConfig.featuredImage, layoutMode: 'leftJustified', imageWidthPercent: 60 },
        postModules: {
          tableOfContents: { enabled: false, position: 'none', style: 'numbered' },
          breadcrumbs: { enabled: true, position: 'none' },
          authorProfiles: { enabled: true, position: 'footer' },
          popularPosts: { enabled: false, position: 'none', count: 5 },
          relevantPosts: { enabled: false, position: 'none' },
          leadMagnet: {
            enabled: true,
            position: 'footer',
            resourceTitle: 'Free resource',
            description: 'Subscribe to get our guide in your inbox.',
            buttonText: 'Get it free'
          }
        }
      },
      previewLayout: 'story'
    },
    {
      templateKey: 'writer',
      level: 'post',
      name: 'The Writer',
      description: 'Minimal layout focused on content.',
      postConfig: {
        ...basePostConfig,
        showDate: true,
        showAuthor: true,
        showReadingTime: true,
        postHeader: {
          imagePosition: 'belowInfo',
          contentAlignment: 'center',
          contentVerticalAlignment: 'top',
          showBreadcrumbs: true,
          showTags: false,
          showCategories: true
        },
        leftSidebar: { show: false, modules: [], moduleOrder: [], width: 200, spaceAbove: 0, sticky: false },
        rightSidebar: { show: false, modules: [], moduleOrder: [], width: 240, spaceAbove: 0, sticky: false },
        footerContent: {
          show: true,
          modules: ['authorProfiles', 'prevNextArticle'],
          moduleOrder: ['authorProfiles', 'prevNextArticle'],
          topPadding: 16
        },
        featuredImage: { ...baseCollectionConfig.featuredImage, show: false },
        postModules: {
          ...basePostConfig.postModules,
          authorProfiles: { enabled: true, position: 'footer' }
        }
      },
      previewLayout: 'writer'
    }
  ]

  for (const t of collectionTemplates) {
    const { sortOrder, ...rest } = t
    const config = rest.collectionConfig as object
    await prisma.templateConfig.upsert({
      where: {
        templateKey_level: { templateKey: t.templateKey, level: t.level }
      },
      create: {
        templateKey: t.templateKey,
        level: t.level,
        name: t.name,
        description: t.description,
        collectionConfig: config,
        postConfig: null,
        previewLayout: t.previewLayout,
        sortOrder
      },
      update: {
        name: t.name,
        description: t.description,
        collectionConfig: config,
        previewLayout: t.previewLayout,
        sortOrder
      }
    })
  }

  for (const t of postTemplates) {
    const { sortOrder, ...rest } = t
    const config = rest.postConfig as object
    await prisma.templateConfig.upsert({
      where: {
        templateKey_level: { templateKey: t.templateKey, level: t.level }
      },
      create: {
        templateKey: t.templateKey,
        level: t.level,
        name: t.name,
        description: t.description,
        collectionConfig: null,
        postConfig: config,
        previewLayout: t.previewLayout,
        sortOrder
      },
      update: {
        name: t.name,
        description: t.description,
        postConfig: config,
        previewLayout: t.previewLayout,
        sortOrder
      }
    })
  }

  console.log('Seed completed')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
