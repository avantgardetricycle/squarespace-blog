import { getPlanDisplayName } from './planLabels.js'
import { normalizePlanKey, type PlanKey } from './planKeys.js'

export const PLAN_FEATURES = [
  'search',
  'tagCategoryFilters',
  'featuredAndPinned',
  'sorting',
  'comments',
  'basicAnalytics',
  'paywall',
  'emailCapture',
  'kitMailchimp',
  'multipleAuthors',
  'advancedAnalytics'
] as const

export type PlanFeature = (typeof PLAN_FEATURES)[number]

const ESSENTIALS_COLLECTION = ['showcase', 'digest'] as const
const ESSENTIALS_POST = ['feature', 'reporter'] as const
const PROFESSIONAL_COLLECTION = [...ESSENTIALS_COLLECTION, 'newsroom', 'masthead'] as const
const PROFESSIONAL_POST = [...ESSENTIALS_POST, 'writer', 'publisher'] as const
const ALL_COLLECTION = [...PROFESSIONAL_COLLECTION, 'editorial'] as const
const ALL_POST = [...PROFESSIONAL_POST, 'story'] as const

const ESSENTIALS_LAYOUTS = ['showcase', 'digest'] as const
const PROFESSIONAL_LAYOUTS = [...ESSENTIALS_LAYOUTS, 'grid', 'listRows'] as const
const ALL_LAYOUTS = [...PROFESSIONAL_LAYOUTS, 'editorial'] as const

const ESSENTIALS_FEATURES: PlanFeature[] = ['comments']
const PRO_FEATURES: PlanFeature[] = [
  ...ESSENTIALS_FEATURES,
  'search',
  'tagCategoryFilters',
  'featuredAndPinned',
  'sorting',
  'basicAnalytics'
]
const PUBLICATION_FEATURES: PlanFeature[] = [
  ...PRO_FEATURES,
  'paywall',
  'emailCapture',
  'kitMailchimp',
  'multipleAuthors',
  'advancedAnalytics'
]

const MODULE_FEATURE: Record<string, PlanFeature> = {
  searchPosts: 'search',
  filterByCategory: 'tagCategoryFilters',
  filterByTag: 'tagCategoryFilters',
  filterByTagsAndCategories: 'tagCategoryFilters',
  postSort: 'sorting',
  emailCapture: 'emailCapture',
  leadMagnet: 'emailCapture'
}

const FEATURE_PLAN: Record<PlanFeature, PlanKey> = {
  search: 'professional',
  tagCategoryFilters: 'professional',
  featuredAndPinned: 'professional',
  sorting: 'professional',
  comments: 'essentials',
  basicAnalytics: 'professional',
  paywall: 'publication',
  emailCapture: 'publication',
  kitMailchimp: 'publication',
  multipleAuthors: 'publication',
  advancedAnalytics: 'publication'
}

const TEMPLATE_PLAN: Record<string, PlanKey> = {
  showcase: 'essentials',
  digest: 'essentials',
  feature: 'essentials',
  reporter: 'essentials',
  newsroom: 'professional',
  masthead: 'professional',
  writer: 'professional',
  publisher: 'professional',
  editorial: 'publication',
  story: 'publication'
}

export type StoredCapacity = {
  maxSites: number | null
  maxWebsites: number | null
  maxBlogsPerWebsite: number | null
}

export type PlanCapacity = {
  maxSites: number
  maxWebsites: number
  maxBlogsPerWebsite: number
  includedWebsites: number
  extraWebsiteMonthlyUsd: number | null
  extraWebsiteAnnualUsd: number | null
}

export type PublicEntitlements = {
  planKey: PlanKey
  planDisplay: string
  maxWebsites: number | null
  maxBlogsPerWebsite: number | null
  maxSites: number | null
  includedWebsites: number
  extraWebsiteMonthlyUsd: number | null
  extraWebsiteAnnualUsd: number | null
  extraWebsitesAvailable: boolean
  templates: { collection: string[]; post: string[] }
  allowedCollectionLayouts: string[]
  features: Record<PlanFeature, boolean>
  requiredPlan: Record<string, string>
  lockedModules: string[]
}

function featureFlags (enabled: readonly PlanFeature[]): Record<PlanFeature, boolean> {
  const on = new Set(enabled)
  return Object.fromEntries(PLAN_FEATURES.map((feature) => [feature, on.has(feature)])) as Record<PlanFeature, boolean>
}

export function planCapacity (planKey: PlanKey): PlanCapacity {
  switch (planKey) {
    case 'essentials':
      return {
        maxWebsites: 1,
        maxBlogsPerWebsite: 1,
        maxSites: 1,
        includedWebsites: 1,
        extraWebsiteMonthlyUsd: null,
        extraWebsiteAnnualUsd: null
      }
    case 'professional':
      return {
        maxWebsites: 1,
        maxBlogsPerWebsite: 2,
        maxSites: 2,
        includedWebsites: 1,
        extraWebsiteMonthlyUsd: null,
        extraWebsiteAnnualUsd: null
      }
    case 'publication':
      return {
        maxWebsites: 1,
        maxBlogsPerWebsite: 3,
        maxSites: 3,
        includedWebsites: 1,
        extraWebsiteMonthlyUsd: null,
        extraWebsiteAnnualUsd: null
      }
    case 'studio':
      return {
        maxWebsites: 10,
        maxBlogsPerWebsite: 3,
        maxSites: 30,
        includedWebsites: 10,
        extraWebsiteMonthlyUsd: 7,
        extraWebsiteAnnualUsd: 84
      }
  }
}

function templatesFor (planKey: PlanKey): { collection: string[]; post: string[] } {
  if (planKey === 'essentials') {
    return { collection: [...ESSENTIALS_COLLECTION], post: [...ESSENTIALS_POST] }
  }
  if (planKey === 'professional') {
    return { collection: [...PROFESSIONAL_COLLECTION], post: [...PROFESSIONAL_POST] }
  }
  return { collection: [...ALL_COLLECTION], post: [...ALL_POST] }
}

function layoutsFor (planKey: PlanKey): string[] {
  if (planKey === 'essentials') return [...ESSENTIALS_LAYOUTS]
  if (planKey === 'professional') return [...PROFESSIONAL_LAYOUTS]
  return [...ALL_LAYOUTS]
}

function featuresFor (planKey: PlanKey): Record<PlanFeature, boolean> {
  if (planKey === 'essentials') return featureFlags(ESSENTIALS_FEATURES)
  if (planKey === 'professional') return featureFlags(PRO_FEATURES)
  return featureFlags(PUBLICATION_FEATURES)
}

export function studioExtraPriceIds (): { monthly: string | null; annual: string | null } {
  const monthly = process.env.STRIPE_STUDIO_EXTRA_WEBSITE_MONTHLY_PRICE_ID?.trim() || null
  const annual = process.env.STRIPE_STUDIO_EXTRA_WEBSITE_ANNUAL_PRICE_ID?.trim() || null
  return { monthly, annual }
}

export function studioExtraPriceIdList (): string[] {
  const ids = studioExtraPriceIds()
  return [ids.monthly, ids.annual].filter((id): id is string => Boolean(id))
}

function requiredPlanMap (): Record<string, string> {
  const map: Record<string, string> = {}
  for (const feature of PLAN_FEATURES) {
    map[feature] = getPlanDisplayName(FEATURE_PLAN[feature])
  }
  for (const [key, plan] of Object.entries(TEMPLATE_PLAN)) {
    map[key] = getPlanDisplayName(plan)
  }
  return map
}

/**
 * Caps stored on a subscription. Null on every field means unlimited (beta or a
 * grandfathered Publication plan). A numeric maxSites with null website columns
 * is a pre-migration row: keep both dimensions at least as loose as that total.
 */
export function resolveStoredCapacity (planKey: PlanKey, stored: StoredCapacity | null | undefined): StoredCapacity {
  if (!stored) return capacityForCheckout(planKey, 0)
  const { maxSites, maxWebsites, maxBlogsPerWebsite } = stored
  if (maxSites == null && maxWebsites == null && maxBlogsPerWebsite == null) {
    return { maxSites: null, maxWebsites: null, maxBlogsPerWebsite: null }
  }
  if (maxWebsites == null && maxBlogsPerWebsite == null && maxSites != null) {
    return { maxSites, maxWebsites: maxSites, maxBlogsPerWebsite: maxSites }
  }
  const defaults = planCapacity(planKey)
  return {
    maxSites: maxSites ?? defaults.maxSites,
    maxWebsites: maxWebsites ?? defaults.maxWebsites,
    maxBlogsPerWebsite: maxBlogsPerWebsite ?? defaults.maxBlogsPerWebsite
  }
}

export function capacityForCheckout (planKey: PlanKey, extraWebsites = 0): StoredCapacity {
  const base = planCapacity(planKey)
  const extras = planKey === 'studio' ? Math.max(0, extraWebsites) : 0
  const maxWebsites = base.maxWebsites + extras
  return {
    maxWebsites,
    maxBlogsPerWebsite: base.maxBlogsPerWebsite,
    maxSites: maxWebsites * base.maxBlogsPerWebsite
  }
}

/** Null means unlimited and is kept. Otherwise the higher number wins. */
export function keepHigherCap (previous: number | null, next: number | null): number | null {
  if (previous == null || next == null) return null
  return Math.max(previous, next)
}

/**
 * New checkouts use the plan's caps. An unchanged plan never has its stored
 * caps lowered, so existing Professional (3) and Publication (unlimited) rows
 * stay put until the customer changes plan.
 */
export function capacityForPlanChange (args: {
  previousPlanKey: string | null | undefined
  nextPlanKey: PlanKey
  previous: StoredCapacity | null
  extraWebsites?: number
}): StoredCapacity {
  const desired = capacityForCheckout(args.nextPlanKey, args.extraWebsites ?? 0)
  if (!args.previous) return desired
  const planChanged = !args.previousPlanKey || normalizePlanKey(args.previousPlanKey) !== args.nextPlanKey
  if (planChanged) return desired
  const previous = resolveStoredCapacity(normalizePlanKey(args.previousPlanKey), args.previous)
  return {
    maxSites: keepHigherCap(previous.maxSites, desired.maxSites),
    maxWebsites: keepHigherCap(previous.maxWebsites, desired.maxWebsites),
    maxBlogsPerWebsite: keepHigherCap(previous.maxBlogsPerWebsite, desired.maxBlogsPerWebsite)
  }
}

export function resolveEntitlements (input: {
  plan: string | null | undefined
  /** Omit for a visitor with no subscription (plan defaults). Pass the row to honor grandfathered caps. */
  stored?: StoredCapacity | null
  extraWebsitesAvailable?: boolean
}): PublicEntitlements {
  const planKey = input.plan ? normalizePlanKey(input.plan) : 'essentials'
  const catalog = planCapacity(planKey)
  const stored = input.stored === undefined
    ? capacityForCheckout(planKey, 0)
    : resolveStoredCapacity(planKey, input.stored)
  const features = featuresFor(planKey)
  const lockedModules = Object.entries(MODULE_FEATURE)
    .filter(([, feature]) => !features[feature])
    .map(([moduleId]) => moduleId)
  const extraIds = studioExtraPriceIds()
  return {
    planKey,
    planDisplay: getPlanDisplayName(planKey),
    maxWebsites: stored.maxWebsites,
    maxBlogsPerWebsite: stored.maxBlogsPerWebsite,
    maxSites: stored.maxSites,
    includedWebsites: catalog.includedWebsites,
    extraWebsiteMonthlyUsd: catalog.extraWebsiteMonthlyUsd,
    extraWebsiteAnnualUsd: catalog.extraWebsiteAnnualUsd,
    extraWebsitesAvailable: input.extraWebsitesAvailable ?? (planKey === 'studio' && Boolean(extraIds.monthly || extraIds.annual)),
    templates: templatesFor(planKey),
    allowedCollectionLayouts: layoutsFor(planKey),
    features,
    requiredPlan: requiredPlanMap(),
    lockedModules
  }
}

export function websiteHostname (url: string | null | undefined): string | null {
  if (!url || !url.trim()) return null
  try {
    const withProto = /^https?:\/\//i.test(url) ? url : `https://${url}`
    const host = new URL(withProto).hostname.toLowerCase().replace(/^www\./, '')
    return host || null
  } catch {
    return null
  }
}

export function groupWebsites (sites: Array<{ url: string | null }>): Map<string, number> {
  const groups = new Map<string, number>()
  for (const site of sites) {
    const host = websiteHostname(site.url)
    if (!host) continue
    groups.set(host, (groups.get(host) ?? 0) + 1)
  }
  return groups
}

export function orderedWebsiteHosts (sites: Array<{ url: string | null; createdAt?: Date | string | null }>): string[] {
  const firstSeen = new Map<string, number>()
  for (const site of sites) {
    const host = websiteHostname(site.url)
    if (!host) continue
    const at = site.createdAt ? new Date(site.createdAt).getTime() : 0
    const prev = firstSeen.get(host)
    if (prev == null || at < prev) firstSeen.set(host, at)
  }
  return [...firstSeen.entries()].sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0])).map(([host]) => host)
}

export type AddBlogDecision =
  | { ok: true; addsWebsite: boolean; needsExtraWebsite: boolean }
  | { ok: false; code: 'website_limit' | 'blog_limit'; error: string }

export function decideAddBlog (args: {
  capacity: StoredCapacity
  sites: Array<{ url: string | null }>
  nextUrl: string
  allowExtraWebsite: boolean
}): AddBlogDecision {
  const host = websiteHostname(args.nextUrl)
  if (!host) {
    return { ok: false, code: 'website_limit', error: 'Enter a valid website URL.' }
  }
  const groups = groupWebsites(args.sites)
  const blogsHere = groups.get(host) ?? 0
  const addsWebsite = !groups.has(host)
  const websiteCount = groups.size
  const { maxWebsites, maxBlogsPerWebsite, maxSites } = args.capacity

  if (!addsWebsite) {
    if (maxBlogsPerWebsite != null && blogsHere >= maxBlogsPerWebsite) {
      const noun = maxBlogsPerWebsite === 1 ? 'blog' : 'blogs'
      return {
        ok: false,
        code: 'blog_limit',
        error: `This website already has ${maxBlogsPerWebsite} ${noun} on your plan.`
      }
    }
    if (maxSites != null && args.sites.length >= maxSites) {
      return { ok: false, code: 'blog_limit', error: 'Blog limit reached for your plan.' }
    }
    return { ok: true, addsWebsite: false, needsExtraWebsite: false }
  }

  const websiteRoom = maxWebsites == null || websiteCount < maxWebsites
  const totalRoom = maxSites == null || args.sites.length < maxSites
  if (websiteRoom && totalRoom) {
    return { ok: true, addsWebsite: true, needsExtraWebsite: false }
  }
  if (args.allowExtraWebsite) {
    return { ok: true, addsWebsite: true, needsExtraWebsite: true }
  }
  if (!websiteRoom) {
    const noun = (maxWebsites ?? 1) === 1 ? 'website' : 'websites'
    return {
      ok: false,
      code: 'website_limit',
      error: `Your plan includes ${maxWebsites ?? 1} ${noun}.`
    }
  }
  return { ok: false, code: 'blog_limit', error: 'Blog limit reached for your plan.' }
}

export function canCreateAnotherBlog (args: {
  capacity: StoredCapacity
  sites: Array<{ url: string | null }>
  allowExtraWebsite: boolean
}): boolean {
  const groups = groupWebsites(args.sites)
  const { maxWebsites, maxBlogsPerWebsite, maxSites } = args.capacity
  const totalRoom = maxSites == null || args.sites.length < maxSites
  for (const count of groups.values()) {
    const blogRoom = maxBlogsPerWebsite == null || count < maxBlogsPerWebsite
    if (blogRoom && totalRoom) return true
  }
  const websiteRoom = maxWebsites == null || groups.size < maxWebsites
  if ((groups.size === 0 || websiteRoom) && totalRoom) return true
  if (args.allowExtraWebsite && maxWebsites != null && groups.size >= maxWebsites) return true
  return false
}

type JsonRecord = Record<string, unknown>

function isRecord (value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function collectModules (node: unknown, into: Set<string>): void {
  if (Array.isArray(node)) {
    for (const item of node) collectModules(item, into)
    return
  }
  if (!isRecord(node)) return
  for (const [key, value] of Object.entries(node)) {
    if ((key === 'modules' || key === 'moduleOrder') && Array.isArray(value)) {
      for (const id of value) {
        if (typeof id === 'string') into.add(id)
      }
    } else {
      collectModules(value, into)
    }
  }
}

function stripModuleArrays (node: unknown, locked: Set<string>): void {
  if (Array.isArray(node)) {
    for (const item of node) stripModuleArrays(item, locked)
    return
  }
  if (!isRecord(node)) return
  for (const [key, value] of Object.entries(node)) {
    if ((key === 'modules' || key === 'moduleOrder') && Array.isArray(value)) {
      node[key] = value.filter((id) => typeof id !== 'string' || !locked.has(id))
    } else {
      stripModuleArrays(value, locked)
    }
  }
}

export type ConfigGateInput = {
  collectionConfig?: unknown
  postConfig?: unknown
  collectionTemplateKey?: string | null
  postTemplateKey?: string | null
  defaultAuthorIds?: string[]
  postAuthorOverrides?: Record<string, string[]>
}

function maxAuthorList (input: ConfigGateInput): number {
  let max = input.defaultAuthorIds?.length ?? 0
  for (const ids of Object.values(input.postAuthorOverrides ?? {})) {
    if (Array.isArray(ids)) max = Math.max(max, ids.length)
  }
  return max
}

function layoutOf (config: unknown): string | null {
  if (!isRecord(config)) return null
  return typeof config.collectionLayout === 'string' ? config.collectionLayout : null
}

function featuredOn (config: unknown): boolean {
  if (!isRecord(config)) return false
  const featured = config.featuredArticle
  return isRecord(featured) && featured.show === true
}

function sortOf (config: unknown): string {
  if (!isRecord(config)) return 'date'
  return config.postSort === 'az' || config.postSort === 'popularity' ? config.postSort : 'date'
}

function filtersOn (config: unknown): boolean {
  if (!isRecord(config)) return false
  const modules = config.collectionModules
  if (!isRecord(modules) || !isRecord(modules.filter)) return false
  return modules.filter.filterByTags === true || modules.filter.filterByCategories === true
}

/**
 * Violations that are new compared with the stored config. Features already
 * saved stay in the database so an upgrade can turn them back on.
 */
export function newlyLockedViolations (
  entitlements: PublicEntitlements,
  incoming: ConfigGateInput,
  existing: ConfigGateInput | null
): string[] {
  const violations: string[] = []
  const features = entitlements.features
  const required = entitlements.requiredPlan
  const prior = existing ?? {}

  const incomingModules = new Set<string>()
  const existingModules = new Set<string>()
  collectModules(incoming.collectionConfig, incomingModules)
  collectModules(incoming.postConfig, incomingModules)
  collectModules(prior.collectionConfig, existingModules)
  collectModules(prior.postConfig, existingModules)

  const seen = new Set<string>()
  for (const moduleId of incomingModules) {
    if (existingModules.has(moduleId)) continue
    const feature = MODULE_FEATURE[moduleId]
    if (!feature || features[feature] || seen.has(feature)) continue
    seen.add(feature)
    violations.push(`${moduleLabel(moduleId)} requires the ${required[feature]} plan.`)
  }

  if (!features.featuredAndPinned && featuredOn(incoming.collectionConfig) && !featuredOn(prior.collectionConfig)) {
    violations.push(`Featured and pinned posts require the ${required.featuredAndPinned} plan.`)
  }
  if (!features.sorting && sortOf(incoming.collectionConfig) !== 'date' && sortOf(prior.collectionConfig) === 'date') {
    violations.push(`Sorting options require the ${required.sorting} plan.`)
  }
  if (!features.tagCategoryFilters && filtersOn(incoming.collectionConfig) && !filtersOn(prior.collectionConfig)) {
    violations.push(`Tag and category filters require the ${required.tagCategoryFilters} plan.`)
  }

  const incomingLayout = layoutOf(incoming.collectionConfig)
  const existingLayout = layoutOf(prior.collectionConfig)
  if (
    incomingLayout &&
    incomingLayout !== existingLayout &&
    !entitlements.allowedCollectionLayouts.includes(incomingLayout)
  ) {
    violations.push(`That blog layout requires a higher plan.`)
  }

  if (
    incoming.collectionTemplateKey &&
    incoming.collectionTemplateKey !== (prior.collectionTemplateKey ?? null) &&
    !entitlements.templates.collection.includes(incoming.collectionTemplateKey)
  ) {
    const planName = required[incoming.collectionTemplateKey] ?? 'a higher'
    violations.push(`The ${incoming.collectionTemplateKey} template requires the ${planName} plan.`)
  }
  if (
    incoming.postTemplateKey &&
    incoming.postTemplateKey !== (prior.postTemplateKey ?? null) &&
    !entitlements.templates.post.includes(incoming.postTemplateKey)
  ) {
    const planName = required[incoming.postTemplateKey] ?? 'a higher'
    violations.push(`The ${incoming.postTemplateKey} template requires the ${planName} plan.`)
  }

  if (!features.multipleAuthors && maxAuthorList(incoming) > 1 && maxAuthorList(incoming) > maxAuthorList(prior)) {
    violations.push(`Multiple authors require the ${required.multipleAuthors} plan.`)
  }

  return violations
}

function moduleLabel (moduleId: string): string {
  switch (moduleId) {
    case 'searchPosts': return 'Blog search'
    case 'filterByCategory':
    case 'filterByTag':
    case 'filterByTagsAndCategories': return 'Tag and category filters'
    case 'postSort': return 'Sorting options'
    case 'emailCapture': return 'Email sign-up'
    case 'leadMagnet': return 'Lead magnets'
    default: return moduleId
  }
}

export type ServedConfig = {
  collectionConfig: JsonRecord
  postConfig: JsonRecord
  collectionTemplateDisallowed: boolean
  postTemplateDisallowed: boolean
  defaultAuthorIds: string[]
  postAuthorOverrides: Record<string, string[]>
}

export function stripServedConfig (
  entitlements: PublicEntitlements,
  input: ConfigGateInput
): ServedConfig {
  const collectionConfig = isRecord(input.collectionConfig)
    ? JSON.parse(JSON.stringify(input.collectionConfig)) as JsonRecord
    : {}
  const postConfig = isRecord(input.postConfig)
    ? JSON.parse(JSON.stringify(input.postConfig)) as JsonRecord
    : {}
  const locked = new Set(entitlements.lockedModules)
  stripModuleArrays(collectionConfig, locked)
  stripModuleArrays(postConfig, locked)

  if (!entitlements.features.featuredAndPinned && isRecord(collectionConfig.featuredArticle)) {
    collectionConfig.featuredArticle = { ...collectionConfig.featuredArticle, show: false, featuredPostId: null }
  }
  if (!entitlements.features.sorting) collectionConfig.postSort = 'date'
  if (!entitlements.features.tagCategoryFilters && isRecord(collectionConfig.collectionModules)) {
    const modules = collectionConfig.collectionModules
    if (isRecord(modules.filter)) {
      modules.filter = { ...modules.filter, filterByTags: false, filterByCategories: false }
    }
  }
  const layout = layoutOf(collectionConfig)
  if (layout && !entitlements.allowedCollectionLayouts.includes(layout)) {
    collectionConfig.collectionLayout = 'showcase'
  }

  const collectionTemplateDisallowed = Boolean(
    input.collectionTemplateKey &&
    !entitlements.templates.collection.includes(input.collectionTemplateKey)
  )
  const postTemplateDisallowed = Boolean(
    input.postTemplateKey &&
    !entitlements.templates.post.includes(input.postTemplateKey)
  )

  let defaultAuthorIds = [...(input.defaultAuthorIds ?? [])]
  const postAuthorOverrides: Record<string, string[]> = {}
  for (const [postId, ids] of Object.entries(input.postAuthorOverrides ?? {})) {
    postAuthorOverrides[postId] = [...ids]
  }
  if (!entitlements.features.multipleAuthors) {
    defaultAuthorIds = defaultAuthorIds.slice(0, 1)
    for (const postId of Object.keys(postAuthorOverrides)) {
      postAuthorOverrides[postId] = postAuthorOverrides[postId].slice(0, 1)
    }
  }

  return {
    collectionConfig,
    postConfig,
    collectionTemplateDisallowed,
    postTemplateDisallowed,
    defaultAuthorIds,
    postAuthorOverrides
  }
}

export function templateRequiredPlan (templateKey: string): string {
  const plan = TEMPLATE_PLAN[templateKey]
  return plan ? getPlanDisplayName(plan) : getPlanDisplayName('publication')
}
