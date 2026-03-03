import 'dotenv/config'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/prisma/client.js'
import { getDatabaseUrl, getSslConfig } from '../lib/db-connection.js'

const pool = new Pool({
  connectionString: getDatabaseUrl(),
  ssl: getSslConfig()
})
const adapter = new PrismaPg(pool)
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

export interface AuthorSettings {
  defaultAuthorIds?: string[]
  postAuthorOverrides?: Record<string, string[]>
}

export interface SidebarConfig {
  show?: boolean
  modules?: string[]
  width?: number
}

export interface HeaderContentConfig {
  show?: boolean
  tableOfContents?: boolean
  breadcrumbs?: boolean
}

export interface FeaturedImageConfig {
  show?: boolean
  layoutMode?: 'fullBleed' | 'leftJustified' | 'rightJustified'
  imageWidthPercent?: number
  aspectBehavior?: 'original' | 'cropped'
  aspectRatio?: '16:9' | '3:2' | '1:1'
  roundedCorners?: 'off' | 'small' | 'large'
  shadow?: boolean
  showCaption?: boolean
  verticalSpacing?: 'tight' | 'normal' | 'spacious'
}

export interface SiteConfigData {
  showDate?: boolean
  showAuthor?: boolean
  showReadingTime?: boolean
  authorSettings?: AuthorSettings
  progressBar?: { show: boolean; position: string | null; thickness?: number; color?: string }
  tableOfContents?: { show: boolean; position: string }
  recentPostsSidebar?: { show: boolean; position: string }
  leftSidebar?: SidebarConfig
  rightSidebar?: SidebarConfig
  headerContent?: HeaderContentConfig
  featuredImage?: FeaturedImageConfig
}

export async function upsertSiteConfig(siteId: string, data: SiteConfigData) {
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
    const authorSettings = data.authorSettings ?? { defaultAuthorIds: [], postAuthorOverrides: {} }
    const leftSidebar = data.leftSidebar ?? { show: false, modules: [], width: 240 }
    const rightSidebar = data.rightSidebar ?? { show: false, modules: [], width: 240 }
    const headerContent = data.headerContent ?? { show: false, tableOfContents: false, breadcrumbs: false }
    const featuredImage = data.featuredImage ?? {
      show: true,
      layoutMode: 'leftJustified',
      imageWidthPercent: 40,
      aspectBehavior: 'original',
      aspectRatio: '16:9',
      roundedCorners: 'off',
      shadow: false,
      showCaption: true,
      verticalSpacing: 'normal',
    }
    await tx.siteConfig.create({
      data: {
        siteId,
        version: nextVersion,
        showDate: data.showDate ?? true,
        showAuthor: data.showAuthor ?? false,
        showReadingTime: data.showReadingTime ?? false,
        authorSettings: authorSettings as object,
        progressBar: data.progressBar ?? { show: false, position: null, thickness: 6, color: '#5B4FE8' },
        tableOfContents: data.tableOfContents ?? { show: false, position: null },
        recentPostsSidebar: data.recentPostsSidebar ?? { show: false, position: null },
        leftSidebar: leftSidebar as object,
        rightSidebar: rightSidebar as object,
        headerContent: headerContent as object,
        featuredImage: featuredImage as object,
        isActive: true
      }
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
