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
  headerContent: { show: false, tableOfContents: false, breadcrumbs: false }
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
