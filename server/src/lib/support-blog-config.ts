import prisma from '../db/index.js'

function truncate(value: string | null | undefined, max: number): string | null {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.length > max ? `${trimmed.slice(0, max)}…` : trimmed
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function boolFrom(obj: Record<string, unknown> | null, key: string): boolean | undefined {
  if (!obj) return undefined
  const v = obj[key]
  return typeof v === 'boolean' ? v : undefined
}

export async function buildBlogConfigSummary(
  userId: number,
  siteId: string | null | undefined
): Promise<{ siteId: string | null; summary: Record<string, unknown> } | null> {
  const site = siteId
    ? await prisma.site.findFirst({
        where: { id: siteId, userId, deletedAt: null },
        include: {
          blogCommentSettings: true,
          sitePaywallSettings: true,
        },
      })
    : await prisma.site.findFirst({
        where: { userId, status: 'active', deletedAt: null },
        orderBy: { createdAt: 'desc' },
        include: {
          blogCommentSettings: true,
          sitePaywallSettings: true,
        },
      })

  if (!site) {
    return {
      siteId: null,
      summary: { note: 'This account has no blogs connected yet.' },
    }
  }

  const [config, subscription] = await Promise.all([
    prisma.siteConfig.findFirst({
      where: { siteId: site.id, isActive: true },
      orderBy: { version: 'desc' },
    }),
    prisma.subscription.findFirst({
      where: { userId, status: { in: ['trialing', 'active'] } },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  const collection = asRecord(config?.collectionConfig)
  const post = asRecord(config?.postConfig)
  const progressBar = asRecord(config?.progressBar as unknown)
  const toc = asRecord(config?.tableOfContents as unknown)
  const leftSidebar = asRecord(config?.leftSidebar as unknown)
  const rightSidebar = asRecord(config?.rightSidebar as unknown)
  const comments = site.blogCommentSettings
  const paywall = site.sitePaywallSettings

  const summary = {
    blogName: site.name,
    blogUrl: site.url,
    verificationStatus: site.verificationStatus,
    plan: subscription?.plan ?? null,
    subscriptionStatus: subscription?.status ?? null,
    collectionTemplateId: config?.collectionTemplateId ?? null,
    postTemplateId: config?.postTemplateId ?? null,
    showDate: config?.showDate,
    showAuthor: config?.showAuthor,
    showReadingTime: config?.showReadingTime,
    progressBarEnabled: boolFrom(progressBar, 'show') ?? false,
    tableOfContentsEnabled: boolFrom(toc, 'show') ?? false,
    leftSidebarEnabled: boolFrom(leftSidebar, 'show') ?? false,
    rightSidebarEnabled: boolFrom(rightSidebar, 'show') ?? false,
    comments: comments
      ? {
          enabled: comments.commentsEnabled,
          allowNew: comments.allowNewComments,
          allowAnonymous: comments.allowAnonymousComments,
          subscriberVerification: comments.subscriberCommentsEnabled,
          requireApproval: comments.requireApproval,
          autoCloseAfterDays: comments.autoCloseAfterDays,
        }
      : null,
    paywall: {
      detectionState: site.paywallDetectionState,
      mode: site.paywallMode,
      subscribeUrl: truncate(paywall?.subscribeUrl, 200),
      eyebrow: truncate(paywall?.eyebrowText, 80),
      headline: truncate(paywall?.headlineText, 160),
    },
    squarespaceApiKeyInvalid: Boolean(site.squarespaceApiKeyInvalidAt),
    collectionFeaturedArticle: boolFrom(asRecord(collection?.featuredArticle), 'show'),
    postShowComments: boolFrom(asRecord(post), 'showComments'),
  }

  return { siteId: site.id, summary }
}
