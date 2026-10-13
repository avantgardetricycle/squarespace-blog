import { parseHTML } from 'linkedom'

export const SNAPSHOT_MAX_BYTES = 3 * 1024 * 1024
export const SNAPSHOT_FRESH_MS = 6 * 60 * 60 * 1000
export const POST_SNAPSHOT_CAP = 8

export const SNAPSHOT_CSP = [
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https:",
  "img-src https: data:",
  "font-src https: data:",
  "frame-src https:"
].join('; ')

const LOCKED_FONT_HOST = /use\.typekit\.net|fonts\.adobe\.com|p\.typekit\.net|fast\.fonts\.net|fonts\.typography\.com/i

export type FontGeneric = 'sans' | 'serif' | 'mono'
export type SnapshotQuality = 'http' | 'http-sparse' | 'browser'
export type SnapshotView = 'collection' | 'post'

export interface LockedFontFamily {
  family: string
  generic: FontGeneric
}

interface FontSubstitute {
  google: string
  generic: FontGeneric
}

const CURATED_FONTS: Record<string, FontSubstitute> = {
  'futura-pt': { google: 'Montserrat', generic: 'sans' },
  'proxima-nova': { google: 'Montserrat', generic: 'sans' },
  'brandon-grotesque': { google: 'Montserrat', generic: 'sans' },
  'avenir': { google: 'Nunito Sans', generic: 'sans' },
  'avenir-next': { google: 'Nunito Sans', generic: 'sans' },
  'aktiv-grotesk': { google: 'Inter', generic: 'sans' },
  'ff-meta-web-pro': { google: 'Source Sans 3', generic: 'sans' },
  'poppins': { google: 'Poppins', generic: 'sans' },
  'freight-text-pro': { google: 'Source Serif 4', generic: 'serif' },
  'adobe-garamond-pro': { google: 'EB Garamond', generic: 'serif' },
  'kepler-std': { google: 'Libre Baskerville', generic: 'serif' }
}

const GENERIC_GOOGLE: Record<FontGeneric, string> = {
  sans: 'Source Sans 3',
  serif: 'Source Serif 4',
  mono: 'IBM Plex Mono'
}

const BLOG_MARKER_SELECTOR = [
  '.blog-item',
  '.Blog-item',
  '.BlogList',
  '.blog-list',
  '.blog-grid',
  '.blog-basic-grid',
  '.blog-item-wrapper',
  'article',
  '[data-controller="Blog"]',
  '[data-collection-type="blog"]'
].join(', ')

export interface SanitizeSnapshotOptions {
  pageUrl: string
  siteKey: string
  blogPath: string
  previewFetchUrl: string
  fontCss?: string
  quality?: SnapshotQuality
}

export function stripPasswordParam (url: string): string {
  try {
    const parsed = new URL(url)
    parsed.searchParams.delete('password')
    return parsed.toString()
  } catch {
    return url
  }
}

export function normalizeSourcePath (pathname: string): string {
  let path = pathname || '/'
  if (!path.startsWith('/')) path = `/${path}`
  if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1)
  return path
}

export function resolveSnapshotPageUrl (
  site: { url: string | null; blogPath: string | null },
  view: SnapshotView,
  requestedPath?: string | null
): { pageUrl: string; sourcePath: string } | null {
  if (!site.url) return null
  let origin: string
  let collectionUrl: string
  try {
    const parsed = new URL(site.url)
    origin = parsed.origin
    const hasPath = Boolean(parsed.pathname && parsed.pathname !== '/')
    collectionUrl = hasPath ? site.url.replace(/\/$/, '') : `${origin}${site.blogPath || '/blog'}`
  } catch {
    return null
  }

  if (view === 'post') {
    if (!requestedPath || !requestedPath.trim()) return null
    let postUrl: URL
    try {
      postUrl = new URL(requestedPath.trim(), origin)
    } catch {
      return null
    }
    if (postUrl.origin !== origin) return null
    const sourcePath = normalizeSourcePath(postUrl.pathname)
    return { pageUrl: `${postUrl.origin}${sourcePath}`, sourcePath }
  }

  let collection: URL
  try {
    collection = new URL(collectionUrl)
  } catch {
    return null
  }
  const sourcePath = normalizeSourcePath(collection.pathname)
  return { pageUrl: `${collection.origin}${sourcePath}`, sourcePath }
}

function genericFromStack (stack: string): FontGeneric | null {
  const parts = stack.split(',').map((part) => part.trim().replace(/^['"]|['"]$/g, '').toLowerCase())
  if (parts.includes('monospace') || parts.includes('mono')) return 'mono'
  if (parts.includes('serif') && !parts.includes('sans-serif')) return 'serif'
  if (parts.includes('sans-serif')) return 'sans'
  return null
}

function unquoteFamily (value: string): string {
  return value.trim().replace(/^['"]|['"]$/g, '').trim()
}

export function extractLockedFontFamilies (css: string, stylesheetUrl?: string): LockedFontFamily[] {
  const sheetLocked = Boolean(stylesheetUrl && LOCKED_FONT_HOST.test(stylesheetUrl))
  const families = new Map<string, FontGeneric>()
  const faceRe = /@font-face\s*\{([^}]*)\}/gi
  let match: RegExpExecArray | null
  while ((match = faceRe.exec(css))) {
    const body = match[1] ?? ''
    if (!sheetLocked && !LOCKED_FONT_HOST.test(body)) continue
    const familyMatch = body.match(/font-family\s*:\s*([^;]+)/i)
    if (!familyMatch?.[1]) continue
    const name = unquoteFamily(familyMatch[1])
    if (!name || /^(sans-serif|serif|monospace|cursive|fantasy|system-ui)$/i.test(name)) continue
    if (!families.has(name)) families.set(name, 'sans')
  }

  const stackRe = /font-family\s*:\s*([^;}{]+)/gi
  while ((match = stackRe.exec(css))) {
    const stack = match[1] ?? ''
    const generic = genericFromStack(stack)
    if (!generic) continue
    const parts = stack.split(',').map((part) => unquoteFamily(part).toLowerCase())
    for (const [name] of families) {
      if (parts.includes(name.toLowerCase())) families.set(name, generic)
    }
  }

  return [...families.entries()].map(([family, generic]) => ({ family, generic }))
}

export function substituteForFamily (family: string, generic: FontGeneric): FontSubstitute {
  const curated = CURATED_FONTS[family.toLowerCase()]
  if (curated) return curated
  return { google: GENERIC_GOOGLE[generic], generic }
}

export function rewriteGoogleFontCss (googleCss: string, lockedFamily: string): string {
  const quoted = JSON.stringify(lockedFamily)
  return googleCss.replace(/font-family\s*:\s*(['"])[^'"]+\1/gi, `font-family: ${quoted}`)
}

export function buildSubstituteFontCss (
  families: LockedFontFamily[],
  googleCssByFamily?: Record<string, string>
): string {
  const chunks: string[] = []
  const seen = new Set<string>()
  for (const { family, generic } of families) {
    const key = family.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    const substitute = substituteForFamily(family, generic)
    const googleCss = googleCssByFamily?.[substitute.google]
    if (googleCss && googleCss.trim()) {
      chunks.push(rewriteGoogleFontCss(googleCss, family))
      continue
    }
    const quoted = JSON.stringify(family)
    const localGoogle = JSON.stringify(substitute.google)
    const localGeneric = generic === 'serif' ? 'Georgia' : generic === 'mono' ? 'Menlo' : 'Arial'
    chunks.push(
      `@font-face{font-family:${quoted};src:local(${localGoogle}),local(${JSON.stringify(localGeneric)});font-weight:100 900;font-style:normal;font-display:swap;}`
    )
  }
  return chunks.join('\n')
}

export function typekitKitScriptUrls (html: string, pageUrl: string): string[] {
  const urls: string[] = []
  const re = /<script\b[^>]*\bsrc\s*=\s*["']([^"']*use\.typekit\.net\/[^"']+\.js(?:\?[^"']*)?)["']/gi
  let match: RegExpExecArray | null
  while ((match = re.exec(html))) {
    const raw = match[1]
    if (!raw) continue
    try {
      const abs = new URL(raw, pageUrl)
      if (abs.protocol !== 'https:' && abs.protocol !== 'http:') continue
      abs.protocol = 'https:'
      const href = stripPasswordParam(abs.toString())
      if (!urls.includes(href)) urls.push(href)
    } catch {
      // ignore unparseable kit urls
    }
  }
  return urls.slice(0, 4)
}

function extractJsonObject (text: string, start: number): string | null {
  let depth = 0
  let inString = false
  let escaped = false
  for (let i = start; i < text.length; i++) {
    const char = text[i]
    if (inString) {
      if (escaped) escaped = false
      else if (char === '\\') escaped = true
      else if (char === '"') inString = false
      continue
    }
    if (char === '"') {
      inString = true
      continue
    }
    if (char === '{') depth += 1
    else if (char === '}') {
      depth -= 1
      if (depth === 0) return text.slice(start, i + 1)
    }
  }
  return null
}

function typekitFvd (weight: string, style: string): string {
  const styleChar = style === 'italic' ? 'i' : style === 'oblique' ? 'o' : 'n'
  const numeric = Number.parseInt(weight, 10)
  const digit = Number.isFinite(numeric)
    ? String(Math.min(9, Math.max(1, Math.round(numeric / 100))))
    : '4'
  return `${styleChar}${digit}`
}

/** Typekit's kit script templates the file URL. `l` is woff2. */
export function typekitWoff2Url (srcTemplate: string, subsetId: number | undefined, fvd: string): string | null {
  if (!srcTemplate.includes('{format}')) return null
  const withFormat = srcTemplate
    .replace('{format}{?primer,subset_id,fvd,v}', 'l')
    .replace('{format}', 'l')
  try {
    const url = new URL(withFormat)
    if (url.protocol !== 'https:' || url.hostname !== 'use.typekit.net') return null
    if (subsetId != null && Number.isFinite(subsetId)) url.searchParams.set('subset_id', String(subsetId))
    url.searchParams.set('fvd', fvd)
    return url.toString()
  } catch {
    return null
  }
}

/**
 * Squarespace loads site fonts by running a Typekit kit script. Snapshots strip
 * scripts, so turn the kit config into @font-face rules that point at the same woff2 files.
 */
export function typekitConfigFontCss (kitJs: string): string {
  const marker = kitJs.indexOf('Typekit.config=')
  if (marker < 0) return ''
  const jsonStart = kitJs.indexOf('{', marker)
  if (jsonStart < 0) return ''
  const jsonText = extractJsonObject(kitJs, jsonStart)
  if (!jsonText) return ''
  let config: { fc?: unknown }
  try {
    config = JSON.parse(jsonText) as { fc?: unknown }
  } catch {
    return ''
  }
  if (!Array.isArray(config.fc)) return ''
  const chunks: string[] = []
  const seen = new Set<string>()
  for (const face of config.fc) {
    if (!face || typeof face !== 'object') continue
    const record = face as Record<string, unknown>
    const family = typeof record.family === 'string' ? record.family.trim() : ''
    const src = typeof record.src === 'string' ? record.src : ''
    const descriptors = record.descriptors && typeof record.descriptors === 'object'
      ? record.descriptors as Record<string, unknown>
      : {}
    const weight = descriptors.weight != null ? String(descriptors.weight) : '400'
    const style = typeof descriptors.style === 'string' ? descriptors.style : 'normal'
    const subsetId = typeof descriptors.subset_id === 'number' ? descriptors.subset_id : undefined
    if (!family || !src) continue
    const key = `${family.toLowerCase()}|${weight}|${style}`
    if (seen.has(key)) continue
    const fileUrl = typekitWoff2Url(src, subsetId, typekitFvd(weight, style))
    if (!fileUrl) continue
    seen.add(key)
    chunks.push(
      `@font-face{font-family:${JSON.stringify(family)};src:url(${JSON.stringify(fileUrl)}) format("woff2");font-weight:${weight};font-style:${style};font-display:swap;}`
    )
    if (chunks.length >= 40) break
  }
  return chunks.join('\n')
}

export function googleFontsStylesheetQuery (families: LockedFontFamily[]): string[] {
  const queries = new Set<string>()
  for (const { family, generic } of families) {
    const substitute = substituteForFamily(family, generic)
    queries.add(substitute.google)
  }
  return [...queries]
}

export function scoreSnapshotHtml (html: string): 'http' | 'http-sparse' {
  const { document } = parseHTML(html)
  const hasHeader = Boolean(document.querySelector('header, #header, [role="banner"]'))
  const hasMain = Boolean(document.querySelector('main, #content, [role="main"]'))
  if (!hasHeader && !hasMain) return 'http-sparse'
  const hasBlog = Boolean(document.querySelector(BLOG_MARKER_SELECTOR))
  const text = (document.body?.textContent ?? '').replace(/\s+/g, ' ').trim()
  if (!hasBlog && text.length < 200) return 'http-sparse'
  return 'http'
}

function escapeAttr (value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
}

export function snapshotErrorHtml (message: string): string {
  const safeText = message
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  return `<!doctype html><html data-bb-snapshot="1"><head><meta charset="utf-8"><meta name="bb-snapshot-error" content="${escapeAttr(message)}"></head><body><p>${safeText}</p></body></html>`
}

export function applyPreviewFetchUrl (html: string, previewFetchUrl: string): string {
  const encoded = JSON.stringify(previewFetchUrl)
  if (!/"previewFetchUrl"\s*:/.test(html)) return html
  return html.replace(/"previewFetchUrl"\s*:\s*"(?:\\.|[^"\\])*"/, `"previewFetchUrl":${encoded}`)
}

export function decorateServedSnapshot (
  html: string,
  opts: { quality: string; stale: boolean; fetchedAt: string }
): string {
  const setMeta = (source: string, name: string, content: string): string => {
    const tag = `<meta name="${name}" content="${escapeAttr(content)}">`
    const re = new RegExp(`<meta\\b[^>]*\\bname="${name}"[^>]*>`, 'i')
    if (re.test(source)) return source.replace(re, tag)
    if (/<head[^>]*>/i.test(source)) return source.replace(/<head[^>]*>/i, (open) => `${open}${tag}`)
    return `${tag}${source}`
  }
  let next = setMeta(html, 'bb-snapshot-quality', opts.quality)
  next = setMeta(next, 'bb-snapshot-stale', opts.stale ? '1' : '0')
  next = setMeta(next, 'bb-snapshot-fetched-at', opts.fetchedAt)
  return next
}

function absolutizeCssUrls (css: string, base: string): string {
  const withUrls = css.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, (full, quote: string, raw: string) => {
    const value = raw.trim()
    if (!value || /^(data:|blob:|#)/i.test(value)) return full
    try {
      const abs = stripPasswordParam(new URL(value, base).toString())
      return `url(${quote}${abs}${quote})`
    } catch {
      return full
    }
  })
  return withUrls.replace(/@import\s+(['"])([^'"]+)\1/gi, (full, quote: string, raw: string) => {
    if (/^(data:|#)/i.test(raw.trim())) return full
    try {
      const abs = stripPasswordParam(new URL(raw.trim(), base).toString())
      return `@import ${quote}${abs}${quote}`
    } catch {
      return full
    }
  })
}

function absolutizeSrcset (srcset: string, base: string): string {
  return srcset.split(',').map((part) => {
    const bits = part.trim().split(/\s+/)
    if (!bits[0]) return part.trim()
    try {
      bits[0] = stripPasswordParam(new URL(bits[0], base).toString())
    } catch {
      // keep the original candidate
    }
    return bits.join(' ')
  }).join(', ')
}

function absolutizeUrl (value: string, base: string): string {
  const trimmed = value.trim()
  if (!trimmed || /^(data:|blob:|mailto:|tel:|javascript:|#)/i.test(trimmed)) return trimmed
  try {
    return stripPasswordParam(new URL(trimmed, base).toString())
  } catch {
    return trimmed
  }
}

function readSquarespaceSiteTitle (document: { querySelectorAll: (selector: string) => Iterable<{ textContent?: string | null }> }): string | null {
  for (const script of document.querySelectorAll('script')) {
    const text = script.textContent ?? ''
    if (!text.includes('SQUARESPACE_CONTEXT')) continue
    const match = text.match(/"siteTitle"\s*:\s*"((?:\\.|[^"\\])*)"/)
    if (!match?.[1]) continue
    try {
      return JSON.parse(`"${match[1]}"`) as string
    } catch {
      return match[1]
    }
  }
  return null
}

function removeNodes (document: { querySelectorAll: (selector: string) => ArrayLike<{ remove: () => void }> }, selector: string): void {
  for (const node of Array.from(document.querySelectorAll(selector))) node.remove()
}

export function sanitizeSnapshotHtml (html: string, options: SanitizeSnapshotOptions): string {
  const { document } = parseHTML(html)
  const siteTitle = readSquarespaceSiteTitle(document)
  const quality = options.quality ?? 'http'

  removeNodes(document, 'script, noscript, iframe, base')

  for (const link of [...document.querySelectorAll('link')]) {
    const rel = (link.getAttribute('rel') || '').toLowerCase()
    const as = (link.getAttribute('as') || '').toLowerCase()
    const href = link.getAttribute('href') || ''
    if (rel === 'modulepreload') {
      link.remove()
      continue
    }
    if ((rel === 'preload' || rel === 'prefetch') && (as === 'script' || as === 'worker')) {
      link.remove()
      continue
    }
    if (/\/loader\.js(?:$|\?)|\/renderer\.js(?:$|\?)/i.test(href)) {
      link.remove()
    }
  }

  for (const meta of [...document.querySelectorAll('meta')]) {
    const httpEquiv = (meta.getAttribute('http-equiv') || '').toLowerCase()
    if (
      httpEquiv === 'content-security-policy' ||
      httpEquiv === 'content-security-policy-report-only' ||
      httpEquiv === 'refresh'
    ) {
      meta.remove()
    }
  }

  for (const el of [...document.querySelectorAll('*')]) {
    const toRemove: string[] = []
    for (const attr of [...el.attributes]) {
      if (attr.name.toLowerCase().startsWith('on')) toRemove.push(attr.name)
    }
    for (const name of toRemove) el.removeAttribute(name)
    const href = el.getAttribute('href')
    if (href && /^\s*javascript:/i.test(href)) el.setAttribute('href', '#')
  }

  const urlAttrs = ['src', 'poster', 'data']
  for (const el of [...document.querySelectorAll('[src], [poster], [href], [srcset], [style]')]) {
    for (const name of urlAttrs) {
      const value = el.getAttribute(name)
      if (value) el.setAttribute(name, absolutizeUrl(value, options.pageUrl))
    }
    const href = el.getAttribute('href')
    if (href && !href.startsWith('#')) el.setAttribute('href', absolutizeUrl(href, options.pageUrl))
    const srcset = el.getAttribute('srcset')
    if (srcset) el.setAttribute('srcset', absolutizeSrcset(srcset, options.pageUrl))
    const style = el.getAttribute('style')
    if (style) el.setAttribute('style', absolutizeCssUrls(style, options.pageUrl))
  }
  for (const style of [...document.querySelectorAll('style')]) {
    style.textContent = absolutizeCssUrls(style.textContent ?? '', options.pageUrl)
  }

  const root = document.documentElement
  if (root) root.setAttribute('data-bb-snapshot', '1')

  let head = document.querySelector('head')
  if (!head) {
    head = document.createElement('head')
    if (root) root.insertBefore(head, root.firstChild)
  }
  if (head && !document.querySelector('meta[name="viewport"]')) {
    const viewport = document.createElement('meta')
    viewport.setAttribute('name', 'viewport')
    viewport.setAttribute('content', 'width=device-width, initial-scale=1')
    head.appendChild(viewport)
  }
  if (head && siteTitle && !document.title) {
    const title = document.createElement('title')
    title.textContent = siteTitle
    head.appendChild(title)
  }
  if (head) {
    const qualityMeta = document.createElement('meta')
    qualityMeta.setAttribute('name', 'bb-snapshot-quality')
    qualityMeta.setAttribute('content', quality)
    head.appendChild(qualityMeta)
    const staleMeta = document.createElement('meta')
    staleMeta.setAttribute('name', 'bb-snapshot-stale')
    staleMeta.setAttribute('content', '0')
    head.appendChild(staleMeta)
    const fetchedMeta = document.createElement('meta')
    fetchedMeta.setAttribute('name', 'bb-snapshot-fetched-at')
    fetchedMeta.setAttribute('content', '')
    head.appendChild(fetchedMeta)
    if (options.fontCss && options.fontCss.trim()) {
      const fontStyle = document.createElement('style')
      fontStyle.id = 'bb-snapshot-fonts'
      fontStyle.textContent = options.fontCss
      head.appendChild(fontStyle)
    }
  }

  let body = document.body ?? document.querySelector('body')
  if (!body && root) {
    body = document.createElement('body')
    root.appendChild(body)
  }
  if (body) {
    const init = {
      previewMode: true,
      blogPath: options.blogPath || '/blog',
      siteKey: options.siteKey,
      previewFetchUrl: options.previewFetchUrl
    }
    const json = document.createElement('script')
    json.id = 'bb-snapshot-init'
    json.setAttribute('type', 'application/json')
    json.textContent = JSON.stringify(init).replace(/</g, '\\u003c')
    body.appendChild(json)
    const renderer = document.createElement('script')
    renderer.setAttribute('src', '/renderer.js')
    body.appendChild(renderer)
    const boot = document.createElement('script')
    boot.setAttribute('src', '/snapshot-preview.js')
    body.appendChild(boot)
  }

  const serialized = document.toString()
  return serialized.includes('<!doctype') || serialized.includes('<!DOCTYPE')
    ? serialized
    : `<!doctype html>${serialized}`
}

export function collectStylesheetUrls (html: string, pageUrl: string): string[] {
  const { document } = parseHTML(html)
  const urls: string[] = []
  for (const style of [...document.querySelectorAll('style')]) {
    const text = style.textContent ?? ''
    if (text.trim()) urls.push(`inline:${urls.length}`)
  }
  for (const link of [...document.querySelectorAll('link')]) {
    const rel = (link.getAttribute('rel') || '').toLowerCase()
    const as = (link.getAttribute('as') || '').toLowerCase()
    const href = link.getAttribute('href')
    if (!href) continue
    const isStyle = rel.split(/\s+/).includes('stylesheet') || (rel === 'preload' && as === 'style')
    if (!isStyle) continue
    try {
      const abs = new URL(href, pageUrl)
      if (abs.protocol === 'http:' || abs.protocol === 'https:') urls.push(stripPasswordParam(abs.toString()))
    } catch {
      // ignore unparseable stylesheet hrefs
    }
  }
  return urls.filter((url) => !url.startsWith('inline:')).slice(0, 15)
}

export function inlineStyleText (html: string): string {
  const { document } = parseHTML(html)
  return [...document.querySelectorAll('style')].map((style) => style.textContent ?? '').join('\n')
}
