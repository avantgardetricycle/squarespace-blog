import 'dotenv/config'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client.js'
import { getDatabaseUrl, getSslConfig } from '../src/lib/db-connection.js'

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

const SANDBOX_PLANS = [
  { planKey: 'starter', cadence: 'monthly', stripePriceId: 'price_1T3n4I8ZBrL80ZhKCBhjfxN6', maxSites: 1 },
  { planKey: 'starter', cadence: 'annual', stripePriceId: 'price_1T3n4I8ZBrL80ZhKU3trEwlH', maxSites: 1 },
  { planKey: 'pro', cadence: 'monthly', stripePriceId: 'price_1T3n6Z8ZBrL80ZhKp1l74rkZ', maxSites: 3 },
  { planKey: 'pro', cadence: 'annual', stripePriceId: 'price_1T3n6x8ZBrL80ZhKYlDlh55g', maxSites: 3 },
  { planKey: 'agency', cadence: 'monthly', stripePriceId: 'price_1T3n7f8ZBrL80ZhK4dECtOgR', maxSites: null },
  { planKey: 'agency', cadence: 'annual', stripePriceId: 'price_1T3n8F8ZBrL80ZhKriIEl6H9', maxSites: null },
] as const

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
  // Seed plans (sandbox)
  for (const p of SANDBOX_PLANS) {
    const stripePriceLabel = `better_blog_${p.planKey}_${p.cadence}_usd`
    await prisma.plan.upsert({
      where: {
        planKey_cadence_stripeEnvironment: {
          planKey: p.planKey,
          cadence: p.cadence,
          stripeEnvironment: 'sandbox'
        }
      },
      create: {
        planKey: p.planKey,
        cadence: p.cadence,
        stripePriceId: p.stripePriceId,
        stripePriceLabel,
        maxSites: p.maxSites,
        stripeEnvironment: 'sandbox'
      },
      update: {
        stripePriceId: p.stripePriceId,
        stripePriceLabel,
        maxSites: p.maxSites
      }
    })
  }

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
        plan: 'pro',
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
    leftSidebar: { show: false, modules: [] as string[], width: 240, spaceAbove: 0, sticky: true },
    rightSidebar: { show: false, modules: [] as string[], width: 240, spaceAbove: 0, sticky: true },
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
        filterStyle: 'pills' as const,
        headerContent: { show: true, modules: ['searchPosts', 'filterByCategory', 'filterByTag', 'postSort'], height: 48 },
        rightSidebar: { show: true, modules: ['searchPosts', 'filterByCategory', 'filterByTag', 'postSort'], width: 240, spaceAbove: 0, sticky: true },
        featuredImage: { ...baseCollectionConfig.featuredImage, layoutMode: 'fullBleed' }
      },
      previewLayout: 'masthead'
    },
    {
      templateKey: 'newsroom',
      level: 'collection',
      name: 'The Newsroom',
      description: 'List layout with prominent search and filter tabs.',
      collectionConfig: {
        ...baseCollectionConfig,
        collectionLayout: 'listRows',
        filterStyle: 'pills' as const,
        headerContent: { show: true, modules: ['searchPosts', 'filterByCategory', 'filterByTag', 'postSort'], height: 48 },
        leftSidebar: { show: false, modules: [], width: 240, spaceAbove: 0, sticky: true },
        rightSidebar: { show: false, modules: [], width: 240, spaceAbove: 0, sticky: true },
        featuredImage: { ...baseCollectionConfig.featuredImage, layoutMode: 'leftJustified', imageWidthPercent: 30 }
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
        collectionLayout: 'grid',
        gridColumns: 2,
        rightSidebar: { show: true, modules: ['searchPosts', 'filterByCategory', 'filterByTag', 'postSort'], width: 280, spaceAbove: 0, sticky: true },
        featuredImage: { ...baseCollectionConfig.featuredImage, layoutMode: 'leftJustified', imageWidthPercent: 40 }
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
        collectionLayout: 'grid',
        gridColumns: 2,
        filterStyle: 'pills' as const,
        headerContent: { show: true, modules: ['filterByCategory', 'filterByTag', 'searchPosts', 'postSort'], height: 48 },
        featuredImage: { ...baseCollectionConfig.featuredImage, layoutMode: 'leftJustified', imageWidthPercent: 50 }
      },
      previewLayout: 'showcase'
    },
    {
      templateKey: 'editorial',
      level: 'collection',
      name: 'The Editorial',
      description: 'Grid layout with filter bar.',
      collectionConfig: {
        ...baseCollectionConfig,
        collectionLayout: 'grid',
        gridColumns: 3,
        filterStyle: 'pills' as const,
        headerContent: { show: true, modules: ['filterByCategory', 'filterByTag', 'searchPosts', 'postSort'], height: 48 },
        featuredImage: { ...baseCollectionConfig.featuredImage, layoutMode: 'fullBleed' }
      },
      previewLayout: 'editorial'
    }
  ]

  const postTemplates = [
    {
      templateKey: 'feature',
      level: 'post',
      name: 'The Feature',
      description: 'Dual-rail layout with sidebar and featured image.',
      postConfig: {
        ...basePostConfig,
        leftSidebar: { show: true, modules: ['tableOfContents', 'authorProfiles'], width: 220, spaceAbove: 0, sticky: true },
        rightSidebar: { show: false, modules: [], width: 240, spaceAbove: 0, sticky: true },
        headerContent: { show: true, modules: ['breadcrumbs', 'tableOfContents'], height: 48 },
        featuredImage: { ...baseCollectionConfig.featuredImage, layoutMode: 'leftJustified', imageWidthPercent: 40 }
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
        leftSidebar: { show: true, modules: ['tableOfContents'], width: 200, spaceAbove: 0, sticky: true },
        featuredImage: { ...baseCollectionConfig.featuredImage, layoutMode: 'fullBleed' }
      },
      previewLayout: 'publisher'
    },
    {
      templateKey: 'reporter',
      level: 'post',
      name: 'The Reporter',
      description: 'Compact layout with image and metadata.',
      postConfig: {
        ...basePostConfig,
        featuredImage: { ...baseCollectionConfig.featuredImage, layoutMode: 'leftJustified', imageWidthPercent: 35 },
        progressBar: { show: true, position: 'top', thickness: 6, color: '#5B4FE8' }
      },
      previewLayout: 'reporter'
    },
    {
      templateKey: 'story',
      level: 'post',
      name: 'The Story',
      description: 'Immersive layout with header and footer zones.',
      postConfig: {
        ...basePostConfig,
        headerContent: { show: true, modules: ['breadcrumbs', 'tableOfContents'], height: 56 },
        featuredImage: { ...baseCollectionConfig.featuredImage, layoutMode: 'fullBleed' }
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
        leftSidebar: { show: true, modules: ['authorProfiles'], width: 200, spaceAbove: 0, sticky: true },
        featuredImage: { ...baseCollectionConfig.featuredImage, layoutMode: 'leftJustified', imageWidthPercent: 30 }
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
