import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client.js'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'

const dbUrl = process.env.DATABASE_URL ?? 'file:./data.db'
const adapter = new PrismaBetterSqlite3({ url: dbUrl })
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
  showAuthor: false,
  showDate: true,
  showTableOfContents: false,
  tableOfContentsPosition: 'left',
  showProgressBar: false,
  showRecentPostsSidebar: false,
  recentPostsCount: 5,
  sidebarPosition: 'left',
  rendererUrl: 'https://avantgardetricycle.github.io/squarespace-blog/renderer.js'
}

async function main() {
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
        configJson: JSON.stringify(defaultSiteConfig),
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
          configJson: JSON.stringify(defaultSiteConfig),
          isActive: true
        }
      })
    }
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
