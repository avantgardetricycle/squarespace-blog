import { randomUUID } from 'crypto'
import prisma from '../db/index.js'
import { generateToken, hashToken } from './auth.js'
import { sendInviteEmailViaSendGrid } from './email.js'
import {
  BETA_SUBSCRIPTION_SOURCE,
  isEntitledSubscription,
  isResubscribableStatus
} from './subscriptionStatus.js'
import { getAppUrl } from './url.js'

export const BETA_INVITE_DAYS = 7
export const BETA_ACCESS_YEARS = 1

export type InviteStatus = 'pending' | 'accepted' | 'expired'

export type BetaTesterSummary = {
  userId: number
  email: string
  name: string | null
  inviteStatus: InviteStatus
  accessUntil: string | null
  accessActive: boolean
  lastLoginAt: string | null
  blogCount: number
}

export type BetaConfigSummary = {
  version: number
  updatedAt: string
  collectionTemplateName: string | null
  postTemplateName: string | null
  showDate: boolean
  showAuthor: boolean
  showReadingTime: boolean
  modules: string[]
}

export type BetaBlogSummary = {
  id: string
  name: string | null
  url: string | null
  createdAt: string
  config: BetaConfigSummary | null
}

export type BetaActivityEvent = {
  id: string
  type: 'login' | 'logout' | 'session_ended' | 'blog_added' | 'blog_removed' | 'config_updated'
  at: string
  summary: string
}

export type BetaTesterUsage = {
  tester: BetaTesterSummary
  blogs: BetaBlogSummary[]
  activity: BetaActivityEvent[]
}

type InviteResult =
  | { ok: true; created: boolean; resent: boolean; userId: number }
  | { ok: false; status: number; error: string }

function addYears(date: Date, years: number): Date {
  const next = new Date(date)
  next.setFullYear(next.getFullYear() + years)
  return next
}

function normalizeEmail(email: string): string | null {
  const normalized = email.trim().toLowerCase()
  if (!normalized.includes('@') || normalized.includes(' ') || normalized.length > 254) return null
  return normalized
}

function deriveInviteStatus(input: {
  hasSession: boolean
  unusedTokenExpiresAt: Date | null
  now?: Date
}): InviteStatus {
  if (input.hasSession) return 'accepted'
  const now = input.now ?? new Date()
  if (input.unusedTokenExpiresAt && input.unusedTokenExpiresAt.getTime() > now.getTime()) {
    return 'pending'
  }
  return 'expired'
}

function formatStamp(date: Date): string {
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
}

function moduleEnabled(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  return (value as { show?: boolean }).show === true
}

function templateName(id: string | null, names: Map<string, string>): string | null {
  if (!id) return null
  return names.get(id) ?? 'Unknown template'
}

function summarizeConfig(
  config: {
    version: number
    createdAt: Date
    collectionTemplateId: string | null
    postTemplateId: string | null
    showDate: boolean
    showAuthor: boolean
    showReadingTime: boolean
    progressBar: unknown
    tableOfContents: unknown
    recentPostsSidebar: unknown
    leftSidebar: unknown
    rightSidebar: unknown
    headerContent: unknown
    socialMediaLinks: unknown
  },
  templateNames: Map<string, string>
): BetaConfigSummary {
  const modules: string[] = []
  if (moduleEnabled(config.progressBar)) modules.push('Progress bar')
  if (moduleEnabled(config.tableOfContents)) modules.push('Table of contents')
  if (moduleEnabled(config.recentPostsSidebar)) modules.push('Recent posts')
  if (moduleEnabled(config.leftSidebar)) modules.push('Left sidebar')
  if (moduleEnabled(config.rightSidebar)) modules.push('Right sidebar')
  if (moduleEnabled(config.headerContent)) modules.push('Header')
  if (moduleEnabled(config.socialMediaLinks)) modules.push('Social links')
  return {
    version: config.version,
    updatedAt: config.createdAt.toISOString(),
    collectionTemplateName: templateName(config.collectionTemplateId, templateNames),
    postTemplateName: templateName(config.postTemplateId, templateNames),
    showDate: config.showDate,
    showAuthor: config.showAuthor,
    showReadingTime: config.showReadingTime,
    modules
  }
}

async function sendBetaMagicLink(userId: number, email: string): Promise<void> {
  const rawToken = generateToken()
  const tokenHash = hashToken(rawToken)
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + BETA_INVITE_DAYS)

  await prisma.loginToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
      purpose: 'invite'
    }
  })

  const magicLink = `${getAppUrl()}/api/auth/magic?token=${rawToken}`
  await sendInviteEmailViaSendGrid(email, magicLink)
}

const testerInclude = {
  user: {
    select: {
      id: true,
      email: true,
      name: true,
      sessions: {
        orderBy: { createdAt: 'desc' as const },
        take: 1,
        select: { createdAt: true }
      },
      loginTokens: {
        where: { usedAt: null },
        orderBy: { createdAt: 'desc' as const },
        take: 1,
        select: { expiresAt: true }
      },
      sites: {
        where: { status: 'active', deletedAt: null },
        select: { id: true }
      }
    }
  }
}

type TesterRow = {
  userId: number
  status: string
  source: string
  currentPeriodEnd: Date | null
  user: {
    id: number
    email: string
    name: string | null
    sessions: { createdAt: Date }[]
    loginTokens: { expiresAt: Date }[]
    sites: { id: string }[]
  }
}

function toSummary(row: TesterRow): BetaTesterSummary {
  const lastLogin = row.user.sessions[0]?.createdAt ?? null
  return {
    userId: row.user.id,
    email: row.user.email,
    name: row.user.name,
    inviteStatus: deriveInviteStatus({
      hasSession: Boolean(lastLogin),
      unusedTokenExpiresAt: row.user.loginTokens[0]?.expiresAt ?? null
    }),
    accessUntil: row.currentPeriodEnd?.toISOString() ?? null,
    accessActive: isEntitledSubscription(row),
    lastLoginAt: lastLogin?.toISOString() ?? null,
    blogCount: row.user.sites.length
  }
}

async function loadTesterRow(userId: number): Promise<TesterRow | null> {
  const row = await prisma.subscription.findFirst({
    where: { userId, source: BETA_SUBSCRIPTION_SOURCE },
    orderBy: { createdAt: 'desc' },
    include: testerInclude
  })
  return row
}

export async function listBetaTesters(): Promise<BetaTesterSummary[]> {
  const rows = await prisma.subscription.findMany({
    where: { source: BETA_SUBSCRIPTION_SOURCE },
    orderBy: { createdAt: 'desc' },
    include: testerInclude
  })
  const seen = new Set<number>()
  const testers: BetaTesterSummary[] = []
  for (const row of rows) {
    if (seen.has(row.userId)) continue
    seen.add(row.userId)
    testers.push(toSummary(row))
  }
  return testers
}

export async function getBetaTesterUsage(userId: number): Promise<BetaTesterUsage | null> {
  const summaryRow = await loadTesterRow(userId)
  if (!summaryRow) return null

  const [sessions, sites] = await Promise.all([
    prisma.session.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        createdAt: true,
        lastSeenAt: true,
        expiresAt: true,
        revokedAt: true
      }
    }),
    prisma.site.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        url: true,
        createdAt: true,
        deletedAt: true,
        siteConfigs: {
          orderBy: { version: 'desc' },
          select: {
            id: true,
            version: true,
            createdAt: true,
            isActive: true,
            showDate: true,
            showAuthor: true,
            showReadingTime: true,
            collectionTemplateId: true,
            postTemplateId: true,
            progressBar: true,
            tableOfContents: true,
            recentPostsSidebar: true,
            leftSidebar: true,
            rightSidebar: true,
            headerContent: true,
            socialMediaLinks: true
          }
        }
      }
    })
  ])

  const templateIds = [
    ...new Set(
      sites.flatMap((site) =>
        site.siteConfigs.flatMap((config) =>
          [config.collectionTemplateId, config.postTemplateId].filter((id): id is string => Boolean(id))
        )
      )
    )
  ]
  const templateRows = templateIds.length
    ? await prisma.templateConfig.findMany({
        where: { id: { in: templateIds } },
        select: { id: true, name: true }
      })
    : []
  const templateNames = new Map(templateRows.map((row) => [row.id, row.name]))

  const blogs: BetaBlogSummary[] = sites
    .filter((site) => site.deletedAt == null)
    .map((site) => {
      const active = site.siteConfigs.find((config) => config.isActive) ?? site.siteConfigs[0] ?? null
      return {
        id: site.id,
        name: site.name,
        url: site.url,
        createdAt: site.createdAt.toISOString(),
        config: active ? summarizeConfig(active, templateNames) : null
      }
    })

  const activity: BetaActivityEvent[] = []
  const now = new Date()

  for (const session of sessions) {
    activity.push({
      id: `login-${session.id}`,
      type: 'login',
      at: session.createdAt.toISOString(),
      summary: `Logged in · last seen ${formatStamp(session.lastSeenAt)}`
    })
    if (session.revokedAt) {
      activity.push({
        id: `logout-${session.id}`,
        type: 'logout',
        at: session.revokedAt.toISOString(),
        summary: 'Logged out'
      })
    } else if (session.expiresAt.getTime() <= now.getTime()) {
      activity.push({
        id: `ended-${session.id}`,
        type: 'session_ended',
        at: session.expiresAt.toISOString(),
        summary: `Session ended · last seen ${formatStamp(session.lastSeenAt)}`
      })
    }
  }

  for (const site of sites) {
    const label = site.name?.trim() || site.url || 'Untitled blog'
    activity.push({
      id: `blog-added-${site.id}`,
      type: 'blog_added',
      at: site.createdAt.toISOString(),
      summary: `Added blog ${label}`
    })
    if (site.deletedAt) {
      activity.push({
        id: `blog-removed-${site.id}`,
        type: 'blog_removed',
        at: site.deletedAt.toISOString(),
        summary: `Removed blog ${label}`
      })
    }
    for (const config of site.siteConfigs) {
      activity.push({
        id: `config-${config.id}`,
        type: 'config_updated',
        at: config.createdAt.toISOString(),
        summary: config.version === 1
          ? `Initial config for ${label}`
          : `Updated config for ${label} (v${config.version})`
      })
    }
  }

  activity.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0))

  return {
    tester: toSummary(summaryRow),
    blogs,
    activity: activity.slice(0, 200)
  }
}

export async function inviteBetaTester(input: {
  email: string
  name?: string | null
}): Promise<InviteResult> {
  const email = normalizeEmail(input.email)
  if (!email) return { ok: false, status: 400, error: 'Invalid email' }

  const name = typeof input.name === 'string' && input.name.trim() ? input.name.trim() : null
  const existing = await prisma.user.findUnique({
    where: { email },
    include: { subscriptions: true }
  })

  if (existing) {
    const blockingStripe = existing.subscriptions.find(
      (sub) => sub.source !== BETA_SUBSCRIPTION_SOURCE && !isResubscribableStatus(sub.status)
    )
    if (blockingStripe) {
      return { ok: false, status: 409, error: 'This email already has a Stripe subscription.' }
    }

    const beta = existing.subscriptions.find((sub) => sub.source === BETA_SUBSCRIPTION_SOURCE)
    if (beta) {
      if (name && !existing.name) {
        await prisma.user.update({ where: { id: existing.id }, data: { name } })
      }
      await sendBetaMagicLink(existing.id, email)
      return { ok: true, created: false, resent: true, userId: existing.id }
    }

    await prisma.subscription.create({
      data: {
        userId: existing.id,
        stripeCustomerId: `beta_${randomUUID()}`,
        plan: 'publication',
        status: 'active',
        maxSites: null,
        source: BETA_SUBSCRIPTION_SOURCE,
        currentPeriodEnd: addYears(new Date(), BETA_ACCESS_YEARS)
      }
    })
    if (name) {
      await prisma.user.update({ where: { id: existing.id }, data: { name } })
    }
    await sendBetaMagicLink(existing.id, email)
    return { ok: true, created: true, resent: false, userId: existing.id }
  }

  const user = await prisma.user.create({
    data: {
      email,
      name,
      subscriptions: {
        create: {
          stripeCustomerId: `beta_${randomUUID()}`,
          plan: 'publication',
          status: 'active',
          maxSites: null,
          source: BETA_SUBSCRIPTION_SOURCE,
          currentPeriodEnd: addYears(new Date(), BETA_ACCESS_YEARS)
        }
      }
    }
  })
  await sendBetaMagicLink(user.id, email)
  return { ok: true, created: true, resent: false, userId: user.id }
}

export async function resendBetaInvite(userId: number): Promise<InviteResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      subscriptions: {
        where: { source: BETA_SUBSCRIPTION_SOURCE },
        take: 1
      }
    }
  })
  if (!user || user.subscriptions.length === 0) {
    return { ok: false, status: 404, error: 'Beta tester not found' }
  }
  await sendBetaMagicLink(user.id, user.email)
  return { ok: true, created: false, resent: true, userId: user.id }
}
