(function() {
  'use strict';

  try {
    window.__bbPerf = window.__bbPerf || {};
    if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
      window.__bbPerf.loaderEval = performance.now();
    }
  } catch (ePerfInit) { /* ignore */ }

  function perfMark(name) {
    try {
      if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
        window.__bbPerf = window.__bbPerf || {};
        window.__bbPerf[name] = performance.now();
      }
    } catch (e) { /* ignore */ }
  }

  function hasEditClass(el) {
    if (!el || !el.classList) return false;
    return el.classList.contains('sqs-edit-mode-active')
      || el.classList.contains('sqs-edit-mode')
      || el.classList.contains('sqs-site-styles-editing');
  }

  function isExplicitPreviewContext() {
    try {
      var params = new URLSearchParams(window.location.search || '');
      return params.get('bbPreview') === '1';
    } catch (e) {
      return false;
    }
  }

  function isSquarespaceEditingUi() {
    // #region agent log
    var _dbg = { hypothesisId: 'H1', location: 'loader.js:isSquarespaceEditingUi' };
    try {
      _dbg.isPreview = isExplicitPreviewContext();
      _dbg.htmlClasses = document.documentElement ? document.documentElement.className : '(no html)';
      _dbg.bodyClasses = document.body ? document.body.className : '(no body)';
      _dbg.bodyExists = !!document.body;
      _dbg.hasEditClassHtml = hasEditClass(document.documentElement);
      _dbg.hasEditClassBody = hasEditClass(document.body);
      _dbg.inIframe = window.parent !== window;
      _dbg.pathname = window.location.pathname;
      _dbg.href = window.location.href;
    } catch (e) { _dbg.earlyErr = String(e); }
    // #endregion
    if (isExplicitPreviewContext()) return false;
    if (hasEditClass(document.documentElement) || hasEditClass(document.body)) return true;
    var markers = [
      'iframe#sqs-site-frame',
      '.sqs-edit-mode',
      '.sqs-editor-window',
      '[data-sqs-editor]',
      '[data-sqs-edit-mode]'
    ];
    // #region agent log
    _dbg.markerResults = {};
    // #endregion
    for (var i = 0; i < markers.length; i++) {
      try {
        // #region agent log
        _dbg.markerResults[markers[i]] = !!document.querySelector(markers[i]);
        // #endregion
        if (document.querySelector(markers[i])) return true;
      } catch (e) {}
    }
    // #region agent log
    _dbg.result = false;
    console.warn('[BB-DEBUG-7918cd] isSquarespaceEditingUi', JSON.stringify(_dbg));
    fetch('http://127.0.0.1:7779/ingest/21c07440-19af-4cd8-979a-7d2c134d7467',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'7918cd'},body:JSON.stringify({sessionId:'7918cd',location:'loader.js:isSquarespaceEditingUi',message:'edit detection result',data:_dbg,timestamp:Date.now(),hypothesisId:'H1'})}).catch(function(){});
    // #endregion
    return false;
  }

  function normalizeBlogPath(blogPath) {
    var raw = (blogPath && String(blogPath).trim()) || '/blog';
    if (raw === '/') return '/';
    if (raw.charAt(0) !== '/') raw = '/' + raw;
    return raw.replace(/\/+$/, '') || '/blog';
  }

  /** KEEP IN SYNC with client/src/lib/betterBlogInstallationSnippet.ts pathMatchesBlogPrefix. */
  function pathMatchesPrefix(pathname, prefix) {
    if (!prefix) return false;
    var path = pathname || '/';
    if (prefix === '/') return path === '/' || path === '';
    return path === prefix || path.indexOf(prefix + '/') === 0;
  }

  function matchBlogEntry(pathname, entries) {
    var withPath = [];
    for (var i = 0; i < entries.length; i++) {
      if (entries[i] && entries[i].blogPath) withPath.push(entries[i]);
    }
    withPath.sort(function (a, b) {
      return String(b.blogPath).length - String(a.blogPath).length;
    });
    for (var j = 0; j < withPath.length; j++) {
      if (pathMatchesPrefix(pathname, withPath[j].blogPath)) return withPath[j];
    }
    return null;
  }

  function parseBlogEntries(el) {
    if (!el) return [];
    var blogsAttr = el.getAttribute('data-blogs');
    if (blogsAttr && String(blogsAttr).trim()) {
      try {
        var parsed = JSON.parse(blogsAttr);
        if (Object.prototype.toString.call(parsed) === '[object Array]') {
          var fromJson = [];
          for (var bi = 0; bi < parsed.length; bi++) {
            var row = parsed[bi] || {};
            var key = row.siteKey ? String(row.siteKey).trim() : '';
            if (!key) continue;
            fromJson.push({
              siteKey: key,
              blogPath: row.blogPath ? normalizeBlogPath(row.blogPath) : null
            });
          }
          if (fromJson.length) return fromJson;
        }
      } catch (eParse) { /* fall through to data-site-key */ }
    }
    var singleKey = el.getAttribute('data-site-key');
    if (!singleKey || !String(singleKey).trim()) return [];
    var pathAttr = el.getAttribute('data-blog-path');
    return [{
      siteKey: String(singleKey).trim(),
      blogPath: pathAttr && String(pathAttr).trim() ? normalizeBlogPath(pathAttr) : null
    }];
  }

  // 1. Read attributes from the injected script tag
  var script = document.currentScript;
  if (!script) {
    var scripts = document.getElementsByTagName('script');
    for (var si = scripts.length - 1; si >= 0; si--) {
      var candidate = scripts[si];
      if (candidate && candidate.src && candidate.src.indexOf('loader.js') >= 0) {
        script = candidate;
        break;
      }
    }
  }
  var blogEntries = parseBlogEntries(script);
  var pathnameNow = (typeof location !== 'undefined' && location.pathname) ? location.pathname : '/';
  var knownPathEntries = [];
  var unknownPathEntries = [];
  for (var ei = 0; ei < blogEntries.length; ei++) {
    if (blogEntries[ei].blogPath) knownPathEntries.push(blogEntries[ei]);
    else unknownPathEntries.push(blogEntries[ei]);
  }
  var matchedEntry = knownPathEntries.length ? matchBlogEntry(pathnameNow, knownPathEntries) : null;
  var siteKey = matchedEntry
    ? matchedEntry.siteKey
    : (unknownPathEntries.length
      ? unknownPathEntries[0].siteKey
      : (blogEntries[0] ? blogEntries[0].siteKey : null));
  var onKnownBlogRoute = Boolean(matchedEntry);
  var hasUnknownBlogPaths = unknownPathEntries.length > 0;
  // Placeholder is replaced at build time (see scripts/build.mjs) BEFORE minify.
  // Do not compare to the placeholder string — terser constant-folds that away.
  // After injection the value starts with "ht" (https://); the placeholder starts with "__".
  var injectedApiBase = '__API_BASE_URL__';
  var attrApiBase = script && script.getAttribute('data-api-base');
  var apiBase = '';
  if (attrApiBase && String(attrApiBase).trim()) {
    apiBase = String(attrApiBase).trim();
  } else if (injectedApiBase && injectedApiBase.slice(0, 2) === 'ht') {
    apiBase = injectedApiBase;
  } else {
    try {
      if (script && script.src) apiBase = new URL(script.src).origin;
    } catch (e) {}
  }
  var normalizedApiBase = apiBase.replace(/\/+$/, '');

  if (!blogEntries.length || !siteKey) {
    console.error('[BlogOverlay] Missing data-site-key / data-blogs attribute');
    return;
  }
  if (!normalizedApiBase) {
    console.error('[BlogOverlay] Missing data-api-base and could not derive from script src');
    return;
  }
  // Combined snippet lists every collection path. If none match, this page is
  // not a BetterBlog route — leave native Squarespace alone (do not install
  // or clear the shared overlay; another snippet/loader may own it).
  if (knownPathEntries.length && !hasUnknownBlogPaths && !onKnownBlogRoute) {
    return;
  }

  // Single source of truth for the loading state. The Header injection's inline
  // <style id="bb-critical-preload-style"> already drives this class; we mirror
  // both the class and the style here so the loader still works on older sites
  // that haven't re-pasted the Header snippet, or in iframes where only the
  // loader script is injected.
  var BB_LOADING_CLASS = 'bb-loading-blog';
  var BB_STYLE_ID = 'bb-critical-preload-style';

  // Legacy ids/classes from earlier mitigations — clean them up if present so a
  // partially-upgraded install doesn't leave stale overlays around.
  var BB_LEGACY_OVERLAY_ID = 'bb-bootstrap-overlay';
  var BB_LEGACY_STYLE_ID = 'bb-bootstrap-loading-style';
  var BB_LEGACY_CLASS = 'bb-bootstrap-loading';

  /**
   * Inject the same critical CSS the Header snippet uses. No-op when the
   * Header snippet was pasted (style element already exists).
   * KEEP IN SYNC with client/src/lib/betterBlogInstallationSnippet.ts.
   */
  function ensureCriticalStyle() {
    if (!document.head && !document.documentElement) return;
    if (document.getElementById(BB_STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = BB_STYLE_ID;
    style.textContent = [
      'html.' + BB_LOADING_CLASS + ' body{visibility:hidden!important;}',
      'html.' + BB_LOADING_CLASS + '::before{content:"";position:fixed;inset:0;background:#ffffff;z-index:2147483646;}',
      'html.' + BB_LOADING_CLASS + '::after{content:"";position:fixed;top:50%;left:50%;width:40px;height:40px;margin:-20px 0 0 -20px;border:3px solid #e8e6e3;border-top-color:#5B4FE8;border-radius:50%;animation:bb-bootstrap-spin 0.75s linear infinite;z-index:2147483647;}',
      '@keyframes bb-bootstrap-spin{to{transform:rotate(360deg)}}'
    ].join('');
    (document.head || document.documentElement).appendChild(style);
  }

  function removeLegacyOverlay() {
    try {
      var ov = document.getElementById(BB_LEGACY_OVERLAY_ID);
      if (ov && ov.parentNode) ov.parentNode.removeChild(ov);
      var ls = document.getElementById(BB_LEGACY_STYLE_ID);
      if (ls && ls.parentNode) ls.parentNode.removeChild(ls);
      if (document.documentElement && document.documentElement.classList) {
        document.documentElement.classList.remove(BB_LEGACY_CLASS);
      }
    } catch (e) { /* ignore */ }
  }

  /**
   * Remove the loading state only after BetterBlog has had at least one frame
   * to paint its own content. Otherwise a single browser frame can show the
   * native Squarespace blog between when our content lands in the DOM and when
   * it actually paints.
   *
   * - Double requestAnimationFrame flushes layout and paint commit.
   * - document.fonts.ready (capped at 600ms) avoids a font-swap reflow flash.
   */
  function clearBootstrapLoading() {
    var doRemove = function () {
      try {
        if (document.documentElement && document.documentElement.classList) {
          document.documentElement.classList.remove(BB_LOADING_CLASS);
        }
      } catch (e) { /* ignore */ }
      removeLegacyOverlay();
      try { window.__bbBootstrapLoadingActive = false; } catch (e) { /* ignore */ }
      perfMark('visible');
      try {
        if (window.BlogOverlayRenderer && typeof window.BlogOverlayRenderer._perfOnVisible === 'function') {
          window.BlogOverlayRenderer._perfOnVisible();
        }
      } catch (eVis) { /* ignore */ }
    };

    var scheduleRemove = function () {
      if (typeof requestAnimationFrame !== 'function') return doRemove();
      requestAnimationFrame(function () {
        requestAnimationFrame(doRemove);
      });
    };

    try {
      var fontsReady = document.fonts && document.fonts.ready;
      if (fontsReady && typeof fontsReady.then === 'function') {
        var settled = false;
        var fontsTimeoutId = setTimeout(function () {
          if (!settled) { settled = true; scheduleRemove(); }
        }, 600);
        fontsReady.then(
          function () {
            if (!settled) { settled = true; clearTimeout(fontsTimeoutId); scheduleRemove(); }
          },
          function () {
            if (!settled) { settled = true; clearTimeout(fontsTimeoutId); scheduleRemove(); }
          }
        );
      } else {
        scheduleRemove();
      }
    } catch (e) {
      scheduleRemove();
    }
  }

  function installBootstrapLoading() {
    if (window.__bbBootstrapLoadingActive) return;
    if (!document.documentElement) return;
    try {
      window.__bbBootstrapLoadingActive = true;
      window.__bbClearBootstrapLoading = clearBootstrapLoading;
      ensureCriticalStyle();
      document.documentElement.classList.add(BB_LOADING_CLASS);
    } catch (e) {
      try { window.__bbBootstrapLoadingActive = false; } catch (e2) { /* ignore */ }
    }
  }

  window.__bbClearBootstrapLoading = clearBootstrapLoading;
  window.__bbInstallBootstrapLoading = installBootstrapLoading;

  // The Header injection already added bb-loading-blog synchronously when the
  // path matches a listed collection. Re-assert only when this loader owns the
  // current route so a sibling loader on the same Header cannot hide non-blog
  // pages or fight over the overlay.
  try {
    var _earlyEditResult = isSquarespaceEditingUi();
    var _inIframeEarly = false;
    try { _inIframeEarly = window.parent !== window; } catch (e) { _inIframeEarly = true; }
    // #region agent log
    console.warn('[BB-DEBUG-7918cd] loader early boot: isEditUi=' + _earlyEditResult + ' inIframe=' + _inIframeEarly + ' bbLoadingClass=' + (document.documentElement ? document.documentElement.classList.contains('bb-loading-blog') : 'N/A'));
    // #endregion
    if (_inIframeEarly && !isExplicitPreviewContext()) {
      // #region agent log
      console.warn('[BB-DEBUG-7918cd] loader: IFRAME detected, skipping bootstrap overlay (hypothesisId=H2_FIX)');
      // #endregion
      clearBootstrapLoading();
    } else if (_earlyEditResult) {
      clearBootstrapLoading();
    } else if (onKnownBlogRoute) {
      installBootstrapLoading();
    }
  } catch (earlyBootErr) { /* ignore */ }

  var configPromise = null;

  function fetchConfig() {
    if (configPromise) return configPromise;
    perfMark('configRequest');
    configPromise = fetch(normalizedApiBase + '/api/config/' + encodeURIComponent(siteKey))
      .then(function(response) {
        if (!response.ok) {
          throw new Error('Blog config HTTP ' + response.status);
        }
        return response.json();
      })
      .then(function(config) {
        perfMark('configResponse');
        return config;
      });
    return configPromise;
  }

  function appendRendererScript(config) {
    var renderer = document.createElement('script');
    var rendererUrl = (config && config.rendererUrl) ? config.rendererUrl : 'https://avantgardetricycle.github.io/squarespace-blog/renderer.js';
    renderer.src = rendererUrl;
    renderer.async = true;

    renderer.onload = function() {
      perfMark('rendererLoaded');
      if (window.BlogOverlayRenderer && typeof window.BlogOverlayRenderer.init === 'function') {
        window.BlogOverlayRenderer.init(config);
      } else {
        clearBootstrapLoading();
        console.error('[BlogOverlay] Renderer loaded, but BlogOverlayRenderer.init was not found');
      }
    };
    renderer.onerror = function() {
      clearBootstrapLoading();
      console.error('[BlogOverlay] Failed to load renderer.js');
    };

    perfMark('rendererRequest');
    var head = document.head || document.getElementsByTagName('head')[0];
    if (head) {
      head.appendChild(renderer);
      return;
    }
    var waited = 0;
    var waitForHead = setInterval(function() {
      waited += 1;
      var h = document.head || document.getElementsByTagName('head')[0];
      if (h) {
        clearInterval(waitForHead);
        h.appendChild(renderer);
      } else if (waited > 200) {
        clearInterval(waitForHead);
        clearBootstrapLoading();
        console.error('[BlogOverlay] document.head not available; cannot load renderer');
      }
    }, 10);
  }

  function beginOwnedLoader(config) {
    if (window.__bbLoaderStarted) return;
    window.__bbLoaderStarted = true;
    var _inIframeStart = false;
    try { _inIframeStart = window.parent !== window; } catch (e) { _inIframeStart = true; }
    if (!_inIframeStart || isExplicitPreviewContext()) {
      installBootstrapLoading();
    } else {
      // #region agent log
      console.warn('[BB-DEBUG-7918cd] startLoader: IFRAME detected, skipping installBootstrapLoading (hypothesisId=H2_FIX)');
      // #endregion
    }
    appendRendererScript(config);
  }

  function configMatchesCurrentPath(config) {
    var bp = config && config.blogPath ? normalizeBlogPath(config.blogPath) : '';
    return pathMatchesPrefix(pathnameNow, bp);
  }

  function startLoader() {
    if (isSquarespaceEditingUi()) {
      console.log('[BlogOverlay] Skipping loader: Squarespace editing UI detected');
      clearBootstrapLoading();
      return;
    }
    if (window.__bbLoaderStarted) return;

    function onConfigError(error) {
      // Only lift the overlay if this page is a blog we intended to own.
      // Off-route / sibling-blog failures must not uncover native chrome
      // that another loader is still covering.
      if (onKnownBlogRoute) clearBootstrapLoading();
      console.error('[BlogOverlay] Failed to fetch config:', error);
      if (error && error.message === 'Failed to fetch') {
        console.error('[BlogOverlay] This often means: (1) Mixed content - use HTTPS for the API when your blog is on HTTPS, or (2) CORS/network - ensure the API server is running and reachable.');
      }
    }

    if (onKnownBlogRoute) {
      fetchConfig()
        .then(function(config) {
          beginOwnedLoader(config);
        })
        .catch(onConfigError);
      return;
    }

    // Legacy Header snippets only have data-site-key. Fetch config to learn
    // the collection path, then bail without clearing if this is not our route
    // (another pasted loader may own the current collection).
    fetchConfig()
      .then(function(config) {
        if (!configMatchesCurrentPath(config)) return;
        beginOwnedLoader(config);
      })
      .catch(onConfigError);
  }

  // Start immediately — do not wait for DOMContentLoaded. The config fetch begins
  // inside startLoader; only appending the renderer <script> needs document.head.
  var _startEditResult = isSquarespaceEditingUi();
  // #region agent log
  console.warn('[BB-DEBUG-7918cd] loader startLoader gate: isEditUi=' + _startEditResult);
  // #endregion
  if (!_startEditResult) {
    startLoader();
  }
})();
