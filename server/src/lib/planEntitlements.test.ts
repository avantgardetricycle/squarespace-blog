import assert from 'node:assert/strict'
import test from 'node:test'
import {
  canCreateAnotherBlog,
  capacityForPlanChange,
  decideAddBlog,
  newlyLockedViolations,
  resolveEntitlements,
  stripServedConfig,
  websiteHostname,
  type ConfigGateInput
} from './planEntitlements.js'

const site = (url: string) => ({ url })

test('plan caps are 1/2/3 blogs on one website, and Studio starts at 10 websites', () => {
  const essentials = resolveEntitlements({ plan: 'essentials' })
  const professional = resolveEntitlements({ plan: 'professional' })
  const publication = resolveEntitlements({ plan: 'publication' })
  const studio = resolveEntitlements({ plan: 'studio' })

  assert.deepEqual(
    [essentials.maxWebsites, essentials.maxBlogsPerWebsite, essentials.templates.collection],
    [1, 1, ['showcase', 'digest']]
  )
  assert.equal(essentials.features.search, false)
  assert.equal(essentials.features.comments, true)
  assert.equal(essentials.features.paywall, false)

  assert.deepEqual([professional.maxWebsites, professional.maxBlogsPerWebsite], [1, 2])
  assert.equal(professional.templates.collection.includes('newsroom'), true)
  assert.equal(professional.templates.collection.includes('editorial'), false)
  assert.equal(professional.features.comments, true)
  assert.equal(professional.features.paywall, false)
  assert.equal(professional.features.kitMailchimp, false)

  assert.deepEqual([publication.maxWebsites, publication.maxBlogsPerWebsite, publication.maxSites], [1, 3, 3])
  assert.equal(publication.templates.post.includes('story'), true)
  assert.equal(publication.features.advancedAnalytics, true)

  assert.deepEqual([studio.maxWebsites, studio.maxBlogsPerWebsite, studio.includedWebsites], [10, 3, 10])
  assert.equal(studio.extraWebsiteMonthlyUsd, 7)
  assert.equal(studio.extraWebsiteAnnualUsd, 84)
  assert.equal(studio.features.paywall, true)
})

test('an unchanged plan does not lower an existing cap', () => {
  const kept = capacityForPlanChange({
    previousPlanKey: 'professional',
    nextPlanKey: 'professional',
    previous: { maxSites: 3, maxWebsites: 3, maxBlogsPerWebsite: 3 }
  })
  assert.deepEqual(kept, { maxSites: 3, maxWebsites: 3, maxBlogsPerWebsite: 3 })

  const unlimited = capacityForPlanChange({
    previousPlanKey: 'publication',
    nextPlanKey: 'publication',
    previous: { maxSites: null, maxWebsites: null, maxBlogsPerWebsite: null }
  })
  assert.deepEqual(unlimited, { maxSites: null, maxWebsites: null, maxBlogsPerWebsite: null })
})

test('changing plans applies the new caps', () => {
  const next = capacityForPlanChange({
    previousPlanKey: 'publication',
    nextPlanKey: 'essentials',
    previous: { maxSites: null, maxWebsites: null, maxBlogsPerWebsite: null }
  })
  assert.deepEqual(next, { maxSites: 1, maxWebsites: 1, maxBlogsPerWebsite: 1 })
})

test('a pre-migration professional row stays at 3 blogs and 3 websites', () => {
  const entitlements = resolveEntitlements({
    plan: 'professional',
    stored: { maxSites: 3, maxWebsites: null, maxBlogsPerWebsite: null }
  })
  assert.equal(entitlements.maxSites, 3)
  assert.equal(entitlements.maxWebsites, 3)
  assert.equal(entitlements.maxBlogsPerWebsite, 3)
})

test('hostnames ignore www and the path', () => {
  assert.equal(websiteHostname('https://www.Example.com/blog'), 'example.com')
  assert.equal(websiteHostname('https://example.com/journal'), 'example.com')
})

test('Essentials cannot add a second website, Newsroom, or search', () => {
  const entitlements = resolveEntitlements({ plan: 'essentials' })
  const secondSite = decideAddBlog({
    capacity: entitlements,
    sites: [site('https://example.com/blog')],
    nextUrl: 'https://other.com/blog',
    allowExtraWebsite: false
  })
  assert.equal(secondSite.ok, false)
  if (!secondSite.ok) assert.equal(secondSite.code, 'website_limit')

  const incoming: ConfigGateInput = {
    collectionConfig: {
      collectionLayout: 'listRows',
      headerContent: { modules: ['searchPosts'], moduleOrder: ['searchPosts'] }
    },
    collectionTemplateKey: 'newsroom'
  }
  const violations = newlyLockedViolations(entitlements, incoming, {
    collectionConfig: { collectionLayout: 'showcase' },
    collectionTemplateKey: 'showcase'
  })
  assert.equal(violations.some((v) => v.includes('newsroom')), true)
  assert.equal(violations.some((v) => v.includes('Blog search')), true)
})

test('Professional cannot add a second website, a paywall module, or Kit', () => {
  const entitlements = resolveEntitlements({ plan: 'professional' })
  const secondSite = decideAddBlog({
    capacity: entitlements,
    sites: [site('https://example.com/blog')],
    nextUrl: 'https://other.com/blog',
    allowExtraWebsite: false
  })
  assert.equal(secondSite.ok, false)

  const secondBlog = decideAddBlog({
    capacity: entitlements,
    sites: [site('https://example.com/blog')],
    nextUrl: 'https://example.com/journal',
    allowExtraWebsite: false
  })
  assert.equal(secondBlog.ok, true)

  const violations = newlyLockedViolations(entitlements, {
    collectionConfig: {
      headerContent: { modules: ['emailCapture'], moduleOrder: ['emailCapture'] }
    }
  }, { collectionConfig: {} })
  assert.equal(violations.some((v) => v.includes('Email sign-up')), true)
  assert.equal(entitlements.features.kitMailchimp, false)
  assert.equal(entitlements.features.paywall, false)
})

test('Publication allows a third blog on one website and blocks a second website', () => {
  const entitlements = resolveEntitlements({ plan: 'publication' })
  const sites = [site('https://example.com/blog'), site('https://example.com/news')]
  const third = decideAddBlog({
    capacity: entitlements,
    sites,
    nextUrl: 'https://example.com/notes',
    allowExtraWebsite: false
  })
  assert.equal(third.ok, true)

  const fourth = decideAddBlog({
    capacity: entitlements,
    sites: [...sites, site('https://example.com/notes')],
    nextUrl: 'https://example.com/extra',
    allowExtraWebsite: false
  })
  assert.equal(fourth.ok, false)

  const otherSite = decideAddBlog({
    capacity: entitlements,
    sites: [site('https://example.com/blog')],
    nextUrl: 'https://other.com/blog',
    allowExtraWebsite: false
  })
  assert.equal(otherSite.ok, false)
  assert.equal(entitlements.features.paywall, true)
})

test('Studio can open a second website and is blocked at 4 blogs on one website', () => {
  const entitlements = resolveEntitlements({ plan: 'studio' })
  const second = decideAddBlog({
    capacity: entitlements,
    sites: [site('https://example.com/blog')],
    nextUrl: 'https://client.com/blog',
    allowExtraWebsite: true
  })
  assert.deepEqual(second, { ok: true, addsWebsite: true, needsExtraWebsite: false })

  const blogs = [
    site('https://example.com/a'),
    site('https://example.com/b'),
    site('https://example.com/c')
  ]
  const fourth = decideAddBlog({
    capacity: entitlements,
    sites: blogs,
    nextUrl: 'https://example.com/d',
    allowExtraWebsite: true
  })
  assert.equal(fourth.ok, false)
  if (!fourth.ok) assert.equal(fourth.code, 'blog_limit')

  const eleventh = decideAddBlog({
    capacity: entitlements,
    sites: Array.from({ length: 10 }, (_, i) => site(`https://client${i}.com/blog`)),
    nextUrl: 'https://client10.com/blog',
    allowExtraWebsite: true
  })
  assert.deepEqual(eleventh, { ok: true, addsWebsite: true, needsExtraWebsite: true })

  const blockedEleventh = decideAddBlog({
    capacity: entitlements,
    sites: Array.from({ length: 10 }, (_, i) => site(`https://client${i}.com/blog`)),
    nextUrl: 'https://client10.com/blog',
    allowExtraWebsite: false
  })
  assert.equal(blockedEleventh.ok, false)

  const full = Array.from({ length: 10 }, (_, i) => [
    site(`https://client${i}.com/a`),
    site(`https://client${i}.com/b`),
    site(`https://client${i}.com/c`)
  ]).flat()
  assert.equal(canCreateAnotherBlog({
    capacity: entitlements,
    sites: full,
    allowExtraWebsite: false
  }), false)
})

test('the live config drops locked modules and falls back from a locked layout', () => {
  const entitlements = resolveEntitlements({ plan: 'essentials' })
  const served = stripServedConfig(entitlements, {
    collectionConfig: {
      collectionLayout: 'editorial',
      featuredArticle: { show: true, position: 'header' },
      postSort: 'az',
      headerContent: { modules: ['searchPosts', 'recentPosts'], moduleOrder: ['searchPosts', 'recentPosts'] },
      collectionModules: { filter: { filterByTags: true, filterByCategories: true } }
    },
    collectionTemplateKey: 'editorial',
    postTemplateKey: 'story',
    defaultAuthorIds: ['a', 'b']
  })
  const header = served.collectionConfig.headerContent as { modules: string[] }
  assert.deepEqual(header.modules, ['recentPosts'])
  assert.equal(served.collectionConfig.collectionLayout, 'showcase')
  assert.equal(served.collectionConfig.postSort, 'date')
  assert.equal((served.collectionConfig.featuredArticle as { show: boolean }).show, false)
  assert.equal(served.collectionTemplateDisallowed, true)
  assert.equal(served.postTemplateDisallowed, true)
  assert.deepEqual(served.defaultAuthorIds, ['a'])
})

test('a locked feature that is already saved is not a new violation', () => {
  const entitlements = resolveEntitlements({ plan: 'essentials' })
  const config: ConfigGateInput = {
    collectionConfig: { headerContent: { modules: ['searchPosts'], moduleOrder: ['searchPosts'] } },
    collectionTemplateKey: 'showcase'
  }
  assert.deepEqual(newlyLockedViolations(entitlements, config, config), [])
})
