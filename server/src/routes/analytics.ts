import { Router, Request, Response } from 'express'
import prisma from '../db/index.js'
import { getSiteBySiteKey } from '../db/index.js'
import { requireSession, SessionUser } from '../middleware/session.js'

const router = Router()

const EVENT_TYPES = ['page_view', 'scroll_depth', 'click', 'search', 'search_click', 'time_on_page'] as const

function parseTimeRange(range: string): { days: number } {
  switch (range) {
    case '7d': return { days: 7 }
    case '30d': return { days: 30 }
    case '90d': return { days: 90 }
    case '12m': return { days: 365 }
    default: return { days: 30 }
  }
}

async function forwardEventsToGA(
  siteId: string,
  rows: Array<{ eventType: string; visitorId: string | null; postId: string | null; postIndex: number | null; url: string | null; payload: object }>,
  visitorId: string | null,
  referrer: string | undefined
): Promise<void> {
  const apiSecret = process.env.GA_API_SECRET
  if (!apiSecret) {
    console.log('[analytics] GA forward skipped: GA_API_SECRET not set')
    return
  }

  const ga = await prisma.siteGoogleAnalytics.findUnique({
    where: { siteId }
  })
  if (!ga || !ga.measurementId || rows.length === 0) {
    if (!ga) console.log('[analytics] GA forward skipped: no GA config for site', siteId)
    else if (!ga.measurementId) console.log('[analytics] GA forward skipped: no measurementId for site', siteId)
    else if (rows.length === 0) console.log('[analytics] GA forward skipped: no events to send')
    return
  }

  const clientId = visitorId ?? `anon_${siteId}_${Date.now()}`
  const includeReferrer = ga.metricsEnabled.length === 0 || ga.metricsEnabled.includes('top_referrers') || ga.metricsEnabled.includes('traffic_sources')
  const events = rows.map((r) => {
    const base: { name: string; params?: Record<string, unknown> } = { name: r.eventType === 'page_view' ? 'page_view' : r.eventType }
    const params: Record<string, unknown> = { site_id: siteId }
    if (referrer && includeReferrer) params.page_referrer = referrer
    if (r.postId) params.post_id = r.postId
    if (r.postIndex != null) params.post_index = r.postIndex
    if ((r.payload as Record<string, unknown>)?.postTitle) params.page_title = (r.payload as Record<string, unknown>).postTitle
    base.params = params
    return base
  })

  const url = `https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(ga.measurementId)}&api_secret=${encodeURIComponent(apiSecret)}`
  console.log('[analytics] GA forward:', ga.measurementId, 'events:', events.map((e) => e.name).join(', '))
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: clientId, events })
  })
  if (!res.ok) {
    console.warn('[analytics] GA forward HTTP', res.status, await res.text())
  }
}

// POST /api/analytics/events - Ingest events from renderer (no auth, validated by siteKey)
router.post('/events', async (req: Request, res: Response) => {
  const body = req.body as { siteKey?: string; siteId?: string; visitorId?: string; events?: Array<{ type: string; postId?: string; postIndex?: number; payload?: object }> }
  const siteKey = body.siteKey
  const siteId = body.siteId
  const visitorId = body.visitorId ?? null
  const events = body.events

  if (!events || !Array.isArray(events) || events.length === 0) {
    res.status(400).json({ error: 'events array is required' })
    return
  }

  let resolvedSiteId: string
  if (siteId) {
    const site = await prisma.site.findFirst({ where: { id: siteId } })
    if (!site || site.status !== 'active') {
      res.status(404).json({ error: 'Site not found or inactive' })
      return
    }
    resolvedSiteId = site.id
  } else if (siteKey) {
    const site = await getSiteBySiteKey(siteKey)
    if (!site || site.status !== 'active') {
      res.status(404).json({ error: 'Site not found or inactive' })
      return
    }
    resolvedSiteId = site.id
  } else {
    res.status(400).json({ error: 'siteKey or siteId is required' })
    return
  }

  const url = typeof req.get('referer') === 'string' ? req.get('referer') ?? undefined : undefined

  const rows = events
    .filter((e) => e && typeof e.type === 'string' && EVENT_TYPES.includes(e.type as (typeof EVENT_TYPES)[number]))
    .map((e) => ({
      siteId: resolvedSiteId,
      eventType: e.type,
      visitorId: visitorId || null,
      postId: e.postId ?? null,
      postIndex: e.postIndex ?? null,
      url: url ?? null,
      payload: (e.payload && typeof e.payload === 'object') ? e.payload : {}
    }))

  if (rows.length === 0) {
    res.status(204).send()
    return
  }

  try {
    await prisma.analyticsEvent.createMany({ data: rows })
  } catch (err) {
    console.error('[analytics] Failed to insert events:', err)
    res.status(500).json({ error: 'Failed to store events' })
    return
  }

  // Forward to GA4 Measurement Protocol if connected (fire-and-forget)
  forwardEventsToGA(resolvedSiteId, rows, visitorId, url).catch((e) =>
    console.error('[analytics] GA forward error:', e)
  )

  res.status(204).send()
})

const GA_METRICS = ['traffic_sources', 'top_referrers', 'new_vs_returning'] as const

// GET /api/analytics/ga/:siteKey - Get Google Analytics config (requires auth)
router.get('/ga/:siteKey', requireSession, async (req: Request, res: Response) => {
  const { user } = req as Request & { user: SessionUser }
  const siteKey = req.params.siteKey as string
  const site = await prisma.site.findFirst({
    where: { siteKey, userId: user.id },
    include: { googleAnalytics: true }
  })
  if (!site) {
    res.status(404).json({ error: 'Site not found' })
    return
  }
  const ga = site.googleAnalytics
  if (!ga) {
    res.json({ connected: false, measurementId: null, metricsEnabled: [] })
    return
  }
  res.json({
    connected: true,
    measurementId: ga.measurementId,
    metricsEnabled: ga.metricsEnabled
  })
})

// PUT /api/analytics/ga/:siteKey - Save Google Analytics config (requires auth)
router.put('/ga/:siteKey', requireSession, async (req: Request, res: Response) => {
  const { user } = req as Request & { user: SessionUser }
  const siteKey = req.params.siteKey as string
  const body = req.body as { measurementId?: string; metricsEnabled?: string[] }
  const measurementId = typeof body.measurementId === 'string' ? body.measurementId.trim() : ''
  const metricsEnabled = Array.isArray(body.metricsEnabled)
    ? body.metricsEnabled.filter((m): m is string => typeof m === 'string' && GA_METRICS.includes(m as (typeof GA_METRICS)[number]))
    : []

  if (!measurementId || !/^G-[A-Z0-9]+$/i.test(measurementId)) {
    res.status(400).json({ error: 'Valid GA4 Measurement ID (G-XXXXXXXXX) is required' })
    return
  }

  const site = await prisma.site.findFirst({
    where: { siteKey, userId: user.id },
    include: { googleAnalytics: true }
  })
  if (!site) {
    res.status(404).json({ error: 'Site not found' })
    return
  }

  try {
    if (site.googleAnalytics) {
      await prisma.siteGoogleAnalytics.update({
        where: { siteId: site.id },
        data: {
          measurementId,
          metricsEnabled: metricsEnabled.length > 0 ? metricsEnabled : GA_METRICS.slice()
        }
      })
    } else {
      await prisma.siteGoogleAnalytics.create({
        data: {
          siteId: site.id,
          measurementId,
          metricsEnabled: metricsEnabled.length > 0 ? metricsEnabled : GA_METRICS.slice()
        }
      })
    }
    res.json({ success: true })
  } catch (err) {
    console.error('[analytics] GA save error:', err)
    res.status(500).json({ error: 'Failed to save Google Analytics config' })
  }
})

// DELETE /api/analytics/ga/:siteKey - Disconnect Google Analytics (requires auth)
router.delete('/ga/:siteKey', requireSession, async (req: Request, res: Response) => {
  const { user } = req as Request & { user: SessionUser }
  const siteKey = req.params.siteKey as string
  const site = await prisma.site.findFirst({
    where: { siteKey, userId: user.id },
    include: { googleAnalytics: true }
  })
  if (!site) {
    res.status(404).json({ error: 'Site not found' })
    return
  }
  if (site.googleAnalytics) {
    await prisma.siteGoogleAnalytics.delete({
      where: { siteId: site.id }
    })
  }
    res.json({ success: true })
})

function parseLeadsTimeRange(range: string): { since: Date } {
  switch (range) {
    case '7d': {
      const since = new Date()
      since.setDate(since.getDate() - 7)
      return { since }
    }
    case '30d': {
      const since = new Date()
      since.setDate(since.getDate() - 30)
      return { since }
    }
    case '90d': {
      const since = new Date()
      since.setDate(since.getDate() - 90)
      return { since }
    }
    case '12m': {
      const since = new Date()
      since.setDate(since.getDate() - 365)
      return { since }
    }
    case 'all':
      return { since: new Date(0) }
    default: {
      const since = new Date()
      since.setDate(since.getDate() - 30)
      return { since }
    }
  }
}

// GET /api/analytics/:siteKey/leads - Leads & subscribers (requires auth, must own site)
router.get('/:siteKey/leads', requireSession, async (req: Request, res: Response) => {
  const { user } = req as Request & { user: SessionUser }
  const siteKey = req.params.siteKey as string
  const format = (req.query.format as string) === 'csv' ? 'csv' : 'json'
  const typeFilter = req.query.type as string | undefined
  const timeRange = (req.query.timeRange as string) || '30d'

  const site = await prisma.site.findFirst({
    where: { siteKey, userId: user.id }
  })
  if (!site) {
    res.status(404).json({ error: 'Site not found' })
    return
  }

  const { since } = parseLeadsTimeRange(timeRange)

  const where: { siteId: string; createdAt?: { gte: Date }; type?: string } = {
    siteId: site.id,
    createdAt: { gte: since }
  }
  if (typeFilter === 'newsletter' || typeFilter === 'lead_magnet') {
    where.type = typeFilter
  }

  const leads = await prisma.leadCapture.findMany({
    where,
    orderBy: { createdAt: 'desc' }
  })

  const newsletterCount = leads.filter((l) => l.type === 'newsletter').length
  const leadMagnetCount = leads.filter((l) => l.type === 'lead_magnet').length

  if (format === 'csv') {
    const header = 'email,name,type,resourceTitle,createdAt'
    const rows = leads.map((l) => {
      const escaped = (s: string) => {
        if (s.includes(',') || s.includes('"') || s.includes('\n')) {
          return '"' + s.replace(/"/g, '""') + '"'
        }
        return s
      }
      return [l.email, l.name ?? '', l.type, l.resourceTitle ?? '', l.createdAt.toISOString()].map(escaped).join(',')
    })
    const csv = [header, ...rows].join('\n')
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="leads-${siteKey}-${new Date().toISOString().slice(0, 10)}.csv"`)
    res.send(csv)
    return
  }

  res.json({
    summary: {
      totalNewsletter: newsletterCount,
      totalLeadMagnet: leadMagnetCount,
      total: leads.length
    },
    leads: leads.map((l) => ({
      id: l.id,
      email: l.email,
      name: l.name,
      type: l.type,
      resourceTitle: l.resourceTitle,
      createdAt: l.createdAt.toISOString()
    }))
  })
})

// GET /api/analytics/:siteKey - Dashboard aggregates (requires auth, must own site)
router.get('/:siteKey', requireSession, async (req: Request, res: Response) => {
  const { user } = req as Request & { user: SessionUser }
  const siteKey = req.params.siteKey as string
  const timeRange = (req.query.timeRange as string) || '30d'
  const mostReadPeriod = (req.query.mostReadPeriod as string) || '30days'

  const site = await prisma.site.findFirst({
    where: { siteKey, userId: user.id }
  })
  if (!site) {
    res.status(404).json({ error: 'Site not found' })
    return
  }

  const { days } = parseTimeRange(timeRange)
  const since = new Date()
  since.setDate(since.getDate() - days)

  const mostReadDays = mostReadPeriod === 'week' ? 7 : mostReadPeriod === '30days' ? 30 : 99999
  const mostReadSince = mostReadDays < 99999 ? new Date(Date.now() - mostReadDays * 24 * 60 * 60 * 1000) : new Date(0)

  try {
    const events = await prisma.analyticsEvent.findMany({
      where: { siteId: site.id, occurredAt: { gte: since } },
      orderBy: { occurredAt: 'asc' }
    })

    const pageViews = events.filter((e) => e.eventType === 'page_view')
    const scrollDepths = events.filter((e) => e.eventType === 'scroll_depth')
    const clicks = events.filter((e) => e.eventType === 'click')
    const searches = events.filter((e) => e.eventType === 'search')
    const searchClicks = events.filter((e) => e.eventType === 'search_click')
    const timeOnPage = events.filter((e) => e.eventType === 'time_on_page')

    const uniqueVisitors = new Set(pageViews.map((e) => e.visitorId).filter(Boolean)).size
    const totalPageViews = pageViews.length

    const avgTimeSeconds =
      timeOnPage.length > 0
        ? timeOnPage.reduce((sum, e) => sum + (Number((e.payload as { seconds?: number })?.seconds) || 0), 0) / timeOnPage.length
        : 0
    const avgTimeFormatted = formatDuration(avgTimeSeconds)

    const maxDepthBySession = new Map<string, number>()
    for (const e of scrollDepths) {
      const key = `${e.visitorId ?? 'anon'}-${e.postId ?? 'list'}-${e.occurredAt.toISOString().slice(0, 10)}`
      const depth = Number((e.payload as { depth?: number })?.depth) || 0
      const current = maxDepthBySession.get(key) ?? 0
      maxDepthBySession.set(key, Math.max(current, depth))
    }
    const avgReadPercent =
      maxDepthBySession.size > 0
        ? Array.from(maxDepthBySession.values()).reduce((a, b) => a + b, 0) / maxDepthBySession.size
        : 0

    const byDate = new Map<string, { views: number; uniqueVisitors: Set<string> }>()
    for (const e of pageViews) {
      const d = e.occurredAt.toISOString().slice(0, 10)
      const entry = byDate.get(d) ?? { views: 0, uniqueVisitors: new Set<string>() }
      entry.views += 1
      if (e.visitorId) entry.uniqueVisitors.add(e.visitorId)
      byDate.set(d, entry)
    }
    const pageViewsData = Array.from(byDate.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, v]) => ({
        date: formatChartDate(date),
        views: v.views,
        uniqueVisitors: v.uniqueVisitors.size
      }))

    const postViews = new Map<string, { views: number; readDepths: number[]; timeSeconds: number[]; postTitle?: string; authorName?: string }>()
    for (const e of pageViews) {
      if (e.postId) {
        const p = (e.payload as { postTitle?: string; authorName?: string }) ?? {}
        const entry = postViews.get(e.postId) ?? { views: 0, readDepths: [], timeSeconds: [], postTitle: p.postTitle, authorName: p.authorName }
        entry.views += 1
        if (p.postTitle) entry.postTitle = p.postTitle
        if (p.authorName) entry.authorName = p.authorName
        postViews.set(e.postId, entry)
      }
    }
    for (const e of scrollDepths) {
      if (e.postId) {
        const entry = postViews.get(e.postId)
        if (entry) {
          const d = Number((e.payload as { depth?: number })?.depth)
          if (d) entry.readDepths.push(d)
        }
      }
    }
    for (const e of timeOnPage) {
      const pid = (e.payload as { postId?: string })?.postId ?? e.postId
      if (pid) {
        const entry = postViews.get(pid)
        if (entry) {
          const s = Number((e.payload as { seconds?: number })?.seconds)
          if (s) entry.timeSeconds.push(s)
        }
      }
    }

    const mostReadPageViews = pageViews.filter((e) => e.occurredAt >= mostReadSince)
    const mostReadScrollDepths = scrollDepths.filter((e) => e.occurredAt >= mostReadSince)
    const mostReadTimeOnPage = timeOnPage.filter((e) => e.occurredAt >= mostReadSince)

    const mostReadPostViews = new Map<string, { views: number; readDepths: number[]; timeSeconds: number[]; postTitle?: string; authorName?: string }>()
    for (const e of mostReadPageViews) {
      if (e.postId) {
        const p = (e.payload as { postTitle?: string; authorName?: string }) ?? {}
        const entry = mostReadPostViews.get(e.postId) ?? { views: 0, readDepths: [], timeSeconds: [], postTitle: p.postTitle, authorName: p.authorName }
        entry.views += 1
        if (p.postTitle) entry.postTitle = p.postTitle
        if (p.authorName) entry.authorName = p.authorName
        mostReadPostViews.set(e.postId, entry)
      }
    }
    for (const e of mostReadScrollDepths) {
      if (e.postId) {
        const entry = mostReadPostViews.get(e.postId)
        if (entry) {
          const d = Number((e.payload as { depth?: number })?.depth)
          if (d) entry.readDepths.push(d)
        }
      }
    }
    for (const e of mostReadTimeOnPage) {
      const pid = (e.payload as { postId?: string })?.postId ?? e.postId
      if (pid) {
        const entry = mostReadPostViews.get(pid)
        if (entry) {
          const s = Number((e.payload as { seconds?: number })?.seconds)
          if (s) entry.timeSeconds.push(s)
        }
      }
    }

    const mostReadPosts = Array.from(mostReadPostViews.entries())
      .map(([postId, v]) => {
        const readPercent = v.readDepths.length > 0 ? Math.round(v.readDepths.reduce((a, b) => a + b, 0) / v.readDepths.length) : 0
        const avgTime = v.timeSeconds.length > 0 ? v.timeSeconds.reduce((a, b) => a + b, 0) / v.timeSeconds.length : 0
        return {
          postId,
          title: v.postTitle ?? 'Untitled',
          views: v.views,
          readPercent,
          avgTimeOnPage: formatDuration(avgTime),
          author: v.authorName ?? 'Unknown'
        }
      })
      .sort((a, b) => b.views - a.views)
      .slice(0, 5)

    const clickCounts = new Map<string, number>()
    for (const e of clicks) {
      const el = (e.payload as { element?: string })?.element ?? 'unknown'
      clickCounts.set(el, (clickCounts.get(el) ?? 0) + 1)
    }
    const clickTrackingData = Array.from(clickCounts.entries())
      .map(([element, clicks]) => ({
        element: formatElementName(element),
        clicks,
        ctr: totalPageViews > 0 ? Math.round((clicks / totalPageViews) * 1000) / 10 : 0
      }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 8)

    const searchTerms = new Map<string, { searches: number; clicks: number }>()
    for (const e of searches) {
      const term = (e.payload as { term?: string })?.term ?? ''
      if (term) {
        const entry = searchTerms.get(term) ?? { searches: 0, clicks: 0 }
        entry.searches += 1
        searchTerms.set(term, entry)
      }
    }
    for (const e of searchClicks) {
      const term = (e.payload as { term?: string })?.term ?? ''
      if (term) {
        const entry = searchTerms.get(term) ?? { searches: 0, clicks: 0 }
        entry.clicks += 1
        searchTerms.set(term, entry)
      }
    }
    const searchAnalyticsData = Array.from(searchTerms.entries())
      .map(([term, v]) => ({
        term,
        searches: v.searches,
        clicks: v.clicks,
        ctr: v.searches > 0 ? Math.round((v.clicks / v.searches) * 1000) / 10 : 0
      }))
      .sort((a, b) => b.searches - a.searches)
      .slice(0, 10)

    const authorStats = new Map<string, { posts: Set<string>; views: number; readDepths: number[]; timeSeconds: number[] }>()
    for (const [postId, v] of postViews.entries()) {
      const author = v.authorName ?? 'Unknown'
      const entry = authorStats.get(author) ?? { posts: new Set(), views: 0, readDepths: [], timeSeconds: [] }
      entry.posts.add(postId)
      entry.views += v.views
      entry.readDepths.push(...v.readDepths)
      entry.timeSeconds.push(...v.timeSeconds)
      authorStats.set(author, entry)
    }
    const authorAnalyticsData = Array.from(authorStats.entries()).map(([name, v]) => ({
      name,
      posts: v.posts.size,
      totalViews: v.views,
      avgReadPercent: v.readDepths.length > 0 ? Math.round(v.readDepths.reduce((a, b) => a + b, 0) / v.readDepths.length) : 0,
      avgTimeOnPage: v.timeSeconds.length > 0 ? formatDuration(v.timeSeconds.reduce((a, b) => a + b, 0) / v.timeSeconds.length) : '0:00',
      engagement: 7
    }))
    authorAnalyticsData.sort((a, b) => b.totalViews - a.totalViews)

    const depthBuckets = [0, 0, 0, 0]
    for (const maxDepth of maxDepthBySession.values()) {
      if (maxDepth <= 25) depthBuckets[0]++
      else if (maxDepth <= 50) depthBuckets[1]++
      else if (maxDepth <= 75) depthBuckets[2]++
      else depthBuckets[3]++
    }
    const readPercentDistribution = [
      { range: '0-25%', count: depthBuckets[0], color: '#ef4444' },
      { range: '26-50%', count: depthBuckets[1], color: '#f59e0b' },
      { range: '51-75%', count: depthBuckets[2], color: '#10B981' },
      { range: '76-100%', count: depthBuckets[3], color: '#5B4FE8' }
    ]

    const prevSince = new Date(since)
    prevSince.setDate(prevSince.getDate() - days)
    const prevEvents = await prisma.analyticsEvent.findMany({
      where: { siteId: site.id, eventType: 'page_view', occurredAt: { gte: prevSince, lt: since } }
    })
    const prevViews = prevEvents.length
    const pctChange = prevViews > 0 ? Math.round(((totalPageViews - prevViews) / prevViews) * 1000) / 10 : 0

    res.json({
      keyMetrics: {
        totalPageViews,
        uniqueVisitors,
        avgTimeOnPage: avgTimeFormatted,
        avgReadPercent: Math.round(avgReadPercent),
        pctChange
      },
      pageViewsData,
      mostReadPosts,
      clickTrackingData,
      searchAnalyticsData,
      authorAnalyticsData,
      readPercentDistribution
    })
  } catch (err) {
    console.error('[analytics] GET error:', err)
    res.status(500).json({ error: 'Failed to load analytics' })
  }
})

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function formatChartDate(isoDate: string): string {
  const d = new Date(isoDate)
  const mon = d.toLocaleDateString('en-US', { month: 'short' })
  const day = d.getDate()
  return `${mon} ${day}`
}

function formatElementName(element: string): string {
  const map: Record<string, string> = {
    toc: 'TOC Links',
    breadcrumb: 'Breadcrumb Navigation',
    relatedPosts: 'Related Posts Widget',
    relevantPosts: 'Relevant Posts Widget',
    authorBio: 'Author Bio Link',
    shareTwitter: 'Social Share - Twitter',
    shareX: 'Social Share - X',
    shareFacebook: 'Social Share - Facebook',
    shareLinkedIn: 'Social Share - LinkedIn',
    categoryTag: 'Category Tags',
    newsletterCta: 'Newsletter CTA',
    recentPosts: 'Recent Posts Widget'
  }
  return map[element] ?? element
}

export default router
