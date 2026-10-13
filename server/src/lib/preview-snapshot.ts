import prisma from '../db/index.js'
import {
  POST_SNAPSHOT_CAP,
  SNAPSHOT_FRESH_MS,
  SNAPSHOT_MAX_BYTES,
  applyPreviewFetchUrl,
  decorateServedSnapshot,
  typekitConfigFontCss,
  typekitKitScriptUrls,
  resolveSnapshotPageUrl,
  sanitizeSnapshotHtml,
  scoreSnapshotHtml,
  type SnapshotQuality,
  type SnapshotView
} from './preview-snapshot-html.js'

const PAGE_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
const RAW_HTML_LIMIT = 5_000_000

export class SnapshotCaptureError extends Error {
  status: number
  constructor (message: string, status = 502) {
    super(message)
    this.name = 'SnapshotCaptureError'
    this.status = status
  }
}

export interface SnapshotSite {
  id: string
  siteKey: string
  url: string | null
  blogPath: string | null
  blogPassword: string | null
  status: string
}

export interface ServedSnapshot {
  html: string
  quality: SnapshotQuality
  fetchedAt: Date
  stale: boolean
}

function appendPassword (url: string, password: string | null | undefined): string {
  if (!password?.trim()) return url
  const parsed = new URL(url)
  parsed.searchParams.set('password', password.trim())
  return parsed.toString()
}

function assertSiteReady (site: SnapshotSite): void {
  if (site.status === 'disabled') {
    throw new SnapshotCaptureError('Site is disabled', 403)
  }
  if (!site.url) {
    throw new SnapshotCaptureError('Site has no URL configured', 400)
  }
}

async function fetchText (url: string, referer: string | null, timeoutMs: number): Promise<{ ok: boolean; status: number; contentType: string; text: string }> {
  const headers: Record<string, string> = {
    'User-Agent': PAGE_UA,
    Accept: 'text/html,application/xhtml+xml,text/css;q=0.9,*/*;q=0.8'
  }
  if (referer) headers.Referer = referer
  const res = await fetch(url, {
    redirect: 'follow',
    headers,
    signal: AbortSignal.timeout(timeoutMs)
  })
  const text = await res.text()
  return {
    ok: res.ok,
    status: res.status,
    contentType: res.headers.get('content-type') || '',
    text
  }
}

async function fetchPageHtml (pageUrl: string, blogPassword: string | null): Promise<string> {
  const url = appendPassword(pageUrl, blogPassword)
  let result: { ok: boolean; status: number; contentType: string; text: string }
  try {
    result = await fetchText(url, pageUrl, 20_000)
  } catch (err) {
    console.error('[preview-snapshot] page fetch failed', err)
    throw new SnapshotCaptureError('Failed to fetch the blog page from Squarespace.')
  }
  if (result.status === 401 || result.status === 403) {
    throw new SnapshotCaptureError('Blog may be password protected. Add your blog password in the dashboard settings.')
  }
  if (!result.ok) {
    throw new SnapshotCaptureError('Failed to fetch the blog page from Squarespace.')
  }
  if (result.text.length > RAW_HTML_LIMIT) {
    throw new SnapshotCaptureError('The blog page is too large to snapshot.')
  }
  const looksHtml = /text\/html|application\/xhtml/i.test(result.contentType) || /^\s*</.test(result.text)
  if (!looksHtml) {
    throw new SnapshotCaptureError('Squarespace did not return an HTML page.')
  }
  return result.text
}

export async function fetchBrowserlessHtml (pageUrl: string): Promise<string | null> {
  const token = process.env.BROWSERLESS_TOKEN
  if (!token) return null
  const endpoint = (process.env.BROWSERLESS_URL || 'https://chrome.browserless.io/content').replace(/\/$/, '')
  try {
    const res = await fetch(`${endpoint}?token=${encodeURIComponent(token)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: pageUrl,
        gotoOptions: { waitUntil: 'networkidle2', timeout: 25000 },
        rejectResourceTypes: ['media']
      }),
      signal: AbortSignal.timeout(40_000)
    })
    if (!res.ok) {
      console.error('[preview-snapshot] browserless status', res.status)
      return null
    }
    const text = await res.text()
    if (!text || text.length > RAW_HTML_LIMIT || !/<\s*html/i.test(text)) return null
    return text
  } catch (err) {
    console.error('[preview-snapshot] browserless failed', err)
    return null
  }
}

async function fontCssForPage (rawHtml: string, pageUrl: string): Promise<string> {
  const chunks: string[] = []
  for (const kitUrl of typekitKitScriptUrls(rawHtml, pageUrl)) {
    try {
      const result = await fetchText(kitUrl, pageUrl, 8_000)
      if (!result.ok || !result.text.includes('Typekit.config')) continue
      const css = typekitConfigFontCss(result.text)
      if (css) chunks.push(css)
    } catch {
      // A missing kit should not fail the snapshot. Site CSS still loads.
    }
  }
  return chunks.join('\n')
}

export async function captureSnapshotHtml (
  site: SnapshotSite,
  view: SnapshotView,
  requestedPath?: string | null
): Promise<{ html: string; quality: SnapshotQuality; sourcePath: string }> {
  assertSiteReady(site)
  const target = resolveSnapshotPageUrl(site, view, requestedPath)
  if (!target) {
    throw new SnapshotCaptureError(
      view === 'post' ? 'That post URL is not on this site.' : 'Site URL is invalid.',
      400
    )
  }

  let raw = await fetchPageHtml(target.pageUrl, site.blogPassword)
  let quality: SnapshotQuality = scoreSnapshotHtml(raw)
  if (quality === 'http-sparse') {
    const rendered = await fetchBrowserlessHtml(appendPassword(target.pageUrl, site.blogPassword))
    if (rendered) {
      raw = rendered
      quality = 'browser'
    }
  }

  const fontCss = await fontCssForPage(raw, target.pageUrl)
  const html = sanitizeSnapshotHtml(raw, {
    pageUrl: target.pageUrl,
    siteKey: site.siteKey,
    blogPath: site.blogPath || '/blog',
    previewFetchUrl: previewBlogFetchUrl(site.siteKey, view, target.sourcePath),
    fontCss,
    quality
  })
  if (Buffer.byteLength(html, 'utf8') > SNAPSHOT_MAX_BYTES) {
    throw new SnapshotCaptureError('The blog page is too large to snapshot.')
  }
  return { html, quality, sourcePath: target.sourcePath }
}

async function prunePostSnapshots (siteId: string): Promise<void> {
  const posts = await prisma.previewSnapshot.findMany({
    where: { siteId, pageKind: 'post' },
    orderBy: { fetchedAt: 'desc' },
    select: { id: true }
  })
  const extra = posts.slice(POST_SNAPSHOT_CAP).map((row) => row.id)
  if (extra.length === 0) return
  await prisma.previewSnapshot.deleteMany({ where: { id: { in: extra } } })
}

export async function storeSnapshot (
  site: SnapshotSite,
  view: SnapshotView,
  requestedPath?: string | null
): Promise<{ html: string; quality: SnapshotQuality; fetchedAt: Date; sourcePath: string }> {
  const captured = await captureSnapshotHtml(site, view, requestedPath)
  const fetchedAt = new Date()
  await prisma.previewSnapshot.upsert({
    where: {
      siteId_pageKind_sourcePath: {
        siteId: site.id,
        pageKind: view,
        sourcePath: captured.sourcePath
      }
    },
    create: {
      siteId: site.id,
      pageKind: view,
      sourcePath: captured.sourcePath,
      html: captured.html,
      quality: captured.quality,
      byteSize: Buffer.byteLength(captured.html, 'utf8'),
      fetchedAt
    },
    update: {
      html: captured.html,
      quality: captured.quality,
      byteSize: Buffer.byteLength(captured.html, 'utf8'),
      fetchedAt
    }
  })
  if (view === 'post') await prunePostSnapshots(site.id)
  return { ...captured, fetchedAt }
}

export function previewBlogFetchUrl (siteKey: string, view: SnapshotView, sourcePath: string): string {
  const base = `/api/config/blog-preview/${encodeURIComponent(siteKey)}`
  if (view !== 'post' || !sourcePath || sourcePath === '/') return base
  return `${base}?postPath=${encodeURIComponent(sourcePath)}`
}

function serveRow (
  row: { html: string; quality: string; fetchedAt: Date },
  stale: boolean,
  previewFetchUrl: string
): ServedSnapshot {
  const quality: SnapshotQuality = row.quality === 'browser' || row.quality === 'http-sparse' ? row.quality : 'http'
  const withFetch = applyPreviewFetchUrl(row.html, previewFetchUrl)
  return {
    html: decorateServedSnapshot(withFetch, {
      quality,
      stale,
      fetchedAt: row.fetchedAt.toISOString()
    }),
    quality,
    fetchedAt: row.fetchedAt,
    stale
  }
}

export async function getServedSnapshot (
  site: SnapshotSite,
  view: SnapshotView,
  requestedPath?: string | null
): Promise<ServedSnapshot> {
  assertSiteReady(site)
  const target = resolveSnapshotPageUrl(site, view, requestedPath)
  if (!target) {
    throw new SnapshotCaptureError(
      view === 'post' ? 'That post URL is not on this site.' : 'Site URL is invalid.',
      400
    )
  }
  const existing = await prisma.previewSnapshot.findUnique({
    where: {
      siteId_pageKind_sourcePath: {
        siteId: site.id,
        pageKind: view,
        sourcePath: target.sourcePath
      }
    }
  })
  const previewFetchUrl = previewBlogFetchUrl(site.siteKey, view, target.sourcePath)
  if (existing) {
    const age = Date.now() - existing.fetchedAt.getTime()
    return serveRow(existing, age >= SNAPSHOT_FRESH_MS, previewFetchUrl)
  }
  const stored = await storeSnapshot(site, view, requestedPath)
  return serveRow(stored, false, previewFetchUrl)
}

export async function refreshStaleCollectionSnapshots (limit = 5): Promise<{ refreshed: number; failed: number }> {
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
  const rows = await prisma.previewSnapshot.findMany({
    where: {
      pageKind: 'collection',
      fetchedAt: { lt: dayAgo },
      site: {
        deletedAt: null,
        status: 'active',
        OR: [
          { updatedAt: { gte: twoWeeksAgo } },
          { previewSnapshots: { some: { fetchedAt: { gte: twoWeeksAgo } } } }
        ]
      }
    },
    include: { site: true },
    orderBy: { fetchedAt: 'asc' },
    take: limit
  })

  let refreshed = 0
  let failed = 0
  for (const row of rows) {
    try {
      const stored = await storeSnapshot(row.site, 'collection')
      if (stored.sourcePath !== row.sourcePath) {
        await prisma.previewSnapshot.delete({ where: { id: row.id } })
      }
      refreshed += 1
    } catch (err) {
      failed += 1
      console.error('[preview-snapshot] cron refresh failed', row.site.siteKey, err)
    }
  }
  return { refreshed, failed }
}
