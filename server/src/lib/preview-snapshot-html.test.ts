import assert from 'node:assert/strict'
import test from 'node:test'
import {
  applyPreviewFetchUrl,
  buildSubstituteFontCss,
  typekitConfigFontCss,
  typekitKitScriptUrls,
  typekitWoff2Url,
  decorateServedSnapshot,
  extractLockedFontFamilies,
  resolveSnapshotPageUrl,
  rewriteGoogleFontCss,
  sanitizeSnapshotHtml,
  scoreSnapshotHtml,
  snapshotErrorHtml
} from './preview-snapshot-html.js'

const pageUrl = 'https://customer.example/blog'
const fixture = `<!doctype html>
<html>
<head>
  <base href="https://evil.example/">
  <meta http-equiv="Content-Security-Policy" content="script-src 'none'">
  <meta http-equiv="refresh" content="0;url=https://evil.example">
  <link rel="stylesheet" href="/site.css?password=secret">
  <link rel="preload" href="/loader.js" as="script">
  <link rel="modulepreload" href="/chunk.js">
  <style>body{background:url('/bg.png')}</style>
</head>
<body onclick="alert(1)">
  <script src="https://app.betterblog.co/loader.js"></script>
  <script>alert('sqs')</script>
  <noscript>nope</noscript>
  <iframe src="https://evil.example"></iframe>
  <img src="/img.jpg?password=hunter2" srcset="/a.jpg 1x, /b.jpg 2x">
  <a href="/about">About</a>
  <header>Nav</header>
  <main><article class="blog-item">Hello blog post content that is long enough to count as real text for the score function and then some more words so this is clearly a server-rendered blog page.</article></main>
</body>
</html>`

test('score treats a shell without header or main as sparse', () => {
  assert.equal(scoreSnapshotHtml('<html><body><div>hi</div></body></html>'), 'http-sparse')
  assert.equal(
    scoreSnapshotHtml('<html><body><header>H</header><main></main></body></html>'),
    'http-sparse'
  )
  assert.equal(scoreSnapshotHtml(fixture), 'http')
})

test('sanitizer strips scripts, absolutizes assets, and does not set base href', () => {
  const html = sanitizeSnapshotHtml(fixture, {
    pageUrl,
    siteKey: 'site_key',
    blogPath: '/blog',
    previewFetchUrl: '/api/config/blog-preview/site_key',
    fontCss: '@font-face{font-family:"futura-pt";src:local("Arial");}',
    quality: 'http'
  })
  assert.equal(/<base\b/i.test(html), false)
  assert.equal(/loader\.js/i.test(html), false)
  assert.equal(/alert\(/i.test(html), false)
  assert.equal(/<iframe\b/i.test(html), false)
  assert.equal(/<noscript\b/i.test(html), false)
  assert.equal(/onclick=/i.test(html), false)
  assert.equal(/content-security-policy/i.test(html), false)
  assert.equal(/http-equiv="refresh"/i.test(html), false)
  assert.equal(/password=/i.test(html), false)
  assert.match(html, /href="https:\/\/customer\.example\/site\.css"/)
  assert.match(html, /url\(['"]?https:\/\/customer\.example\/bg\.png['"]?\)/)
  assert.match(html, /src="https:\/\/customer\.example\/img\.jpg"/)
  assert.match(html, /href="https:\/\/customer\.example\/about"/)
  assert.match(html, /data-bb-snapshot="1"/)
  assert.match(html, /src="\/renderer\.js"/)
  assert.match(html, /src="\/snapshot-preview\.js"/)
  assert.match(html, /"previewMode":true/)
  assert.match(html, /"previewFetchUrl":"\/api\/config\/blog-preview\/site_key"/)
  assert.match(html, /id="bb-snapshot-fonts"/)
  assert.equal((html.match(/name="viewport"/g) || []).length, 1)
})

test('sanitizer keeps an existing viewport meta', () => {
  const html = sanitizeSnapshotHtml(
    '<html><head><meta name="viewport" content="width=800"></head><body><header></header><main><article class="blog-item">x</article></main></body></html>',
    {
      pageUrl,
      siteKey: 's',
      blogPath: '/blog',
      previewFetchUrl: '/api/config/blog-preview/s'
    }
  )
  assert.equal((html.match(/name="viewport"/g) || []).length, 1)
  assert.match(html, /content="width=800"/)
})

test('resolveSnapshotPageUrl stays on the customer origin', () => {
  const site = { url: 'https://customer.example', blogPath: '/journal' }
  assert.deepEqual(resolveSnapshotPageUrl(site, 'collection'), {
    pageUrl: 'https://customer.example/journal',
    sourcePath: '/journal'
  })
  assert.deepEqual(resolveSnapshotPageUrl(site, 'post', '/journal/hello-world'), {
    pageUrl: 'https://customer.example/journal/hello-world',
    sourcePath: '/journal/hello-world'
  })
  assert.equal(resolveSnapshotPageUrl(site, 'post', 'https://evil.example/post'), null)
  assert.deepEqual(resolveSnapshotPageUrl({ url: 'https://customer.example/journal/', blogPath: '/ignored' }, 'collection'), {
    pageUrl: 'https://customer.example/journal',
    sourcePath: '/journal'
  })
})

test('locked font families are substituted under the original family name', () => {
  const css = `
    @font-face { font-family: "futura-pt"; src: url(https://use.typekit.net/af/kit.woff2); }
    p { font-family: "futura-pt", serif; }
    @font-face { font-family: "proxima-nova"; src: url(proxima.woff2); }
  `
  const fromPage = extractLockedFontFamilies(css)
  assert.deepEqual(fromPage, [{ family: 'futura-pt', generic: 'serif' }])

  const fromKit = extractLockedFontFamilies(css, 'https://use.typekit.net/abc.css')
  assert.equal(fromKit.some((family) => family.family === 'proxima-nova'), true)

  const google = `@font-face{font-family:'Montserrat';font-weight:400;src:url(https://fonts.gstatic.com/s/montserrat/v1/a.woff2) format('woff2');}`
  const substituted = buildSubstituteFontCss(
    [{ family: 'futura-pt', generic: 'serif' }],
    { Montserrat: google }
  )
  assert.match(substituted, /font-family: "futura-pt"/)
  assert.match(substituted, /fonts\.gstatic\.com\/s\/montserrat\/v1\/a\.woff2/)
  assert.equal(/font-family:\s*'Montserrat'/.test(substituted), false)
  assert.equal(rewriteGoogleFontCss(google, 'futura-pt').includes('"futura-pt"'), true)
})

test('typekit kit script becomes the real woff2 faces', () => {
  const html = `<html><head>
    <script src="//use.typekit.net/ik/abc.js"></script>
  </head><body><header></header><main><article class="blog-item">Hello blog</article></main></body></html>`
  assert.deepEqual(typekitKitScriptUrls(html, 'https://customer.example/blog'), [
    'https://use.typekit.net/ik/abc.js'
  ])
  const kit = `window.Typekit.config={"fc":[
    {"family":"proxima-nova","src":"https://use.typekit.net/af/4b22bb/00000000000000007735e601/31/{format}{?primer,subset_id,fvd,v}","descriptors":{"weight":"400","style":"normal","subset_id":2}},
    {"family":"proxima-nova","src":"https://use.typekit.net/af/6eb0e3/00000000000000007758cf8f/31/{format}{?primer,subset_id,fvd,v}","descriptors":{"weight":"400","style":"italic","subset_id":2}}
  ]};`
  const css = typekitConfigFontCss(kit)
  assert.match(css, /font-family:"proxima-nova"/)
  assert.match(css, /use\.typekit\.net\/af\/4b22bb\/00000000000000007735e601\/31\/l\?subset_id=2&fvd=n4/)
  assert.match(css, /fvd=i4/)
  assert.match(css, /format\("woff2"\)/)
  assert.equal(typekitWoff2Url('https://evil.example/{format}', 2, 'n4'), null)
})

test('applyPreviewFetchUrl points a post snapshot at that post JSON', () => {
  const html = sanitizeSnapshotHtml('<html><head></head><body><header></header><main><article>ok</article></main></body></html>', {
    pageUrl,
    siteKey: 's',
    blogPath: '/blog',
    previewFetchUrl: '/api/config/blog-preview/s'
  })
  const next = applyPreviewFetchUrl(html, '/api/config/blog-preview/s?postPath=%2Fblog%2Fhello')
  assert.match(next, /"previewFetchUrl":"\/api\/config\/blog-preview\/s\?postPath=%2Fblog%2Fhello"/)
  assert.equal((next.match(/previewFetchUrl/g) || []).length, 1)
})

test('decorateServedSnapshot marks a stale snapshot', () => {
  const html = sanitizeSnapshotHtml('<html><head></head><body><header></header><main><article>ok</article></main></body></html>', {
    pageUrl,
    siteKey: 's',
    blogPath: '/blog',
    previewFetchUrl: '/api/config/blog-preview/s',
    quality: 'http-sparse'
  })
  const served = decorateServedSnapshot(html, {
    quality: 'http-sparse',
    stale: true,
    fetchedAt: '2026-04-01T00:00:00.000Z'
  })
  assert.match(served, /name="bb-snapshot-quality" content="http-sparse"/)
  assert.match(served, /name="bb-snapshot-stale" content="1"/)
  assert.match(served, /name="bb-snapshot-fetched-at" content="2026-04-01T00:00:00.000Z"/)
})

test('snapshot error html is inert', () => {
  const html = snapshotErrorHtml('Blog may be password protected. <script>')
  assert.match(html, /name="bb-snapshot-error"/)
  assert.equal(/<script/i.test(html), false)
  assert.match(html, /&lt;script&gt;/)
})
