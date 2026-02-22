import 'dotenv/config'
import { PrismaClient } from '../generated/prisma/client.js'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'

const dbUrl = process.env.DATABASE_URL ?? 'file:./data.db'
const adapter = new PrismaBetterSqlite3({ url: dbUrl })
const prisma = new PrismaClient({ adapter })

// Re-export Prisma types for consumers
export type { Site, SiteConfig, User, Config } from '../generated/prisma/client.js'

export async function getSiteBySiteKey(siteKey: string) {
  return prisma.site.findUnique({
    where: { siteKey }
  })
}

export async function getActiveSiteConfig(siteId: string) {
  return prisma.siteConfig.findFirst({
    where: { siteId, isActive: true }
  })
}

export async function upsertSiteConfig(siteId: string, configJson: string) {
  await prisma.$transaction(async (tx) => {
    await tx.siteConfig.updateMany({
      where: { siteId, isActive: true },
      data: { isActive: false }
    })
    const maxVersion = await tx.siteConfig.aggregate({
      where: { siteId },
      _max: { version: true }
    })
    const nextVersion = (maxVersion._max.version ?? 0) + 1
    await tx.siteConfig.create({
      data: { siteId, version: nextVersion, configJson, isActive: true }
    })
  })
}

export async function getUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email }
  })
}

export async function getConfigByUserId(userId: number) {
  return prisma.config.findFirst({
    where: { userId },
    orderBy: { updatedAt: 'desc' }
  })
}

export async function upsertConfig(userId: number, configJson: string) {
  const existing = await getConfigByUserId(userId)
  if (existing) {
    await prisma.config.update({
      where: { id: existing.id },
      data: { configJson }
    })
  } else {
    await prisma.config.create({
      data: { userId, configJson }
    })
  }
}

export default prisma
