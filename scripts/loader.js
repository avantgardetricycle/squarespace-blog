(function() {
  'use strict';

  var BB_LOG = '[BetterBlog][loader]';
  try {
    window.__bbLoaderT0 = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
  } catch (e0) {
    window.__bbLoaderT0 = 0;
  }
  function bbNow() {
    try {
      return typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
    } catch (e) {
      return 0;
    }
  }
  function bbMsSinceLoader() {
    var t = bbNow();
    var t0 = typeof window.__bbLoaderT0 === 'number' ? window.__bbLoaderT0 : t;
    return Math.round((t - t0) * 10) / 10;
  }
  function bbDiag(msg, detail) {
    var row = { tMs: bbMsSinceLoader(), readyState: typeof document !== 'undefined' ? document.readyState : '?', hasBody: !!(typeof document !== 'undefined' && document.body) };
    if (detail && typeof detail === 'object') {
      for (var k in detail) {
        if (Object.prototype.hasOwnProperty.call(detail, k)) row[k] = detail[k];
      }
    }
    console.log(BB_LOG, msg, row);
  }
  bbDiag('loader.js IIFE start (first line executed)');

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
    if (isExplicitPreviewContext()) return false;
    if (hasEditClass(document.documentElement) || hasEditClass(document.body)) return true;
    var markers = [
      'iframe#sqs-site-frame',
      '.sqs-edit-mode',
      '.sqs-editor-window',
      '[data-sqs-editor]',
      '[data-sqs-edit-mode]'
    ];
    for (var i = 0; i < markers.length; i++) {
      try {
        if (document.querySelector(markers[i])) return true;
      } catch (e) {}
    }
    return false;
  }

  // 1. Read attributes from the injected script tag
  var script = document.currentScript;
  var siteKey = script.getAttribute('data-site-key');
  var injectedBase = '__API_BASE_URL__';
  var apiBase = script.getAttribute('data-api-base')
    || (injectedBase !== '__API_' + 'BASE_URL__' ? injectedBase : '')
    || (function() {
      try {
        if (script && script.src) return new URL(script.src).origin;
      } catch (e) {}
      return '';
    })();
  var normalizedApiBase = apiBase.replace(/\/+$/, '');

  console.log('[BLOGGA BLOGGA] data site key', siteKey);
  console.log('[BLOGGA BLOGGA] data api base', apiBase);
  if (!siteKey) {
    console.error('[BlogOverlay] Missing data-site-key attribute');
    return;
  }
  if (!normalizedApiBase) {
    console.error('[BlogOverlay] Missing data-api-base and could not derive from script src');
    return;
  }

  var BB_BOOTSTRAP_STYLE_ID = 'bb-bootstrap-loading-style';
  var BB_BOOTSTRAP_OVERLAY_ID = 'bb-bootstrap-overlay';

  function clearBootstrapLoading(reason) {
    bbDiag('bootstrap overlay CLEAR', { reason: reason || '(no reason)' });
    try {
      document.documentElement.classList.remove('bb-bootstrap-loading');
      var ov = document.getElementById(BB_BOOTSTRAP_OVERLAY_ID);
      if (ov && ov.parentNode) ov.parentNode.removeChild(ov);
      var st = document.getElementById(BB_BOOTSTRAP_STYLE_ID);
      if (st && st.parentNode) st.parentNode.removeChild(st);
    } catch (e) { /* ignore */ }
    try {
      window.__bbBootstrapLoadingActive = false;
    } catch (e2) { /* ignore */ }
  }

  function installBootstrapLoading() {
    if (window.__bbBootstrapLoadingActive) {
      bbDiag('bootstrap install skipped (already active)');
      return;
    }
    if (!document.documentElement || !document.body) {
      bbDiag('bootstrap install skipped (no documentElement or body)');
      return;
    }
    try {
      window.__bbBootstrapLoadingActive = true;
      window.__bbClearBootstrapLoading = clearBootstrapLoading;
      bbDiag('bootstrap INSTALL (inject overlay + lock scroll)');

      if (!document.getElementById(BB_BOOTSTRAP_STYLE_ID)) {
        var style = document.createElement('style');
        style.id = BB_BOOTSTRAP_STYLE_ID;
        style.textContent = [
          'html.bb-bootstrap-loading { overflow: hidden; }',
          '#' + BB_BOOTSTRAP_OVERLAY_ID + '{',
          'position:fixed;inset:0;z-index:2147483646;',
          'display:flex;align-items:center;justify-content:center;',
          'flex-direction:column;gap:16px;',
          'background:rgba(255,255,255,0.97);',
          'font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;',
          '}',
          '#' + BB_BOOTSTRAP_OVERLAY_ID + ' .bb-bootstrap-spinner{',
          'width:40px;height:40px;border-radius:50%;',
          'border:3px solid #e8e6e3;border-top-color:#5B4FE8;',
          'animation:bb-bootstrap-spin 0.75s linear infinite;',
          '}',
          '@keyframes bb-bootstrap-spin{to{transform:rotate(360deg)}}',
          '#' + BB_BOOTSTRAP_OVERLAY_ID + ' .bb-bootstrap-label{',
          'font-size:13px;color:#666;letter-spacing:0.02em;',
          '}'
        ].join('');
        (document.head || document.documentElement).appendChild(style);
      }

      if (!document.getElementById(BB_BOOTSTRAP_OVERLAY_ID)) {
        var overlay = document.createElement('div');
        overlay.id = BB_BOOTSTRAP_OVERLAY_ID;
        overlay.setAttribute('role', 'status');
        overlay.setAttribute('aria-live', 'polite');
        overlay.setAttribute('aria-busy', 'true');
        var sp = document.createElement('div');
        sp.className = 'bb-bootstrap-spinner';
        sp.setAttribute('aria-hidden', 'true');
        var lab = document.createElement('div');
        lab.className = 'bb-bootstrap-label';
        lab.textContent = 'Loading blog…';
        overlay.appendChild(sp);
        overlay.appendChild(lab);
        document.body.appendChild(overlay);
      }

      document.documentElement.classList.add('bb-bootstrap-loading');
      bbDiag('bootstrap install DONE', { overlayInDom: !!document.getElementById(BB_BOOTSTRAP_OVERLAY_ID), htmlHasClass: document.documentElement.classList.contains('bb-bootstrap-loading') });
    } catch (e) {
      bbDiag('bootstrap install FAILED', { error: e && e.message ? e.message : String(e) });
      try { window.__bbBootstrapLoadingActive = false; } catch (e2) { /* ignore */ }
    }
  }

  window.__bbClearBootstrapLoading = clearBootstrapLoading;

  // If the script runs after <body> exists (e.g. footer injection), show the spinner immediately
  // instead of waiting for DOMContentLoaded.
  try {
    if (document.body && !isSquarespaceEditingUi()) {
      bbDiag('early path: body exists, attempting bootstrap before DOMContentLoaded');
      installBootstrapLoading();
    } else {
      bbDiag('early path: skip bootstrap', { hasBody: !!document.body, editingUi: isSquarespaceEditingUi() });
    }
  } catch (earlyBootErr) {
    bbDiag('early bootstrap error', { error: earlyBootErr && earlyBootErr.message ? earlyBootErr.message : String(earlyBootErr) });
  }

  function startLoader() {
    bbDiag('startLoader() invoked');
    if (isSquarespaceEditingUi()) {
      console.log('[BlogOverlay] Skipping loader: Squarespace editing UI detected');
      bbDiag('startLoader aborted: Squarespace editing UI');
      return;
    }
    installBootstrapLoading();

    var configUrl = normalizedApiBase + '/api/config/' + encodeURIComponent(siteKey);
    bbDiag('fetch config START', { url: configUrl });
    var fetchStart = bbNow();
    fetch(configUrl)
      .then(function(response) {
        bbDiag('fetch config response', { status: response.status, ok: response.ok, ms: Math.round((bbNow() - fetchStart) * 10) / 10 });
        if (!response.ok) {
          throw new Error('Blog config HTTP ' + response.status);
        }
        return response.json();
      })
      .then(function(config) {
        console.log('[BLOGGA BLOGGA] config', config);
        var renderer = document.createElement('script');
        var rendererUrl = (config && config.rendererUrl) ? config.rendererUrl : 'https://avantgardetricycle.github.io/squarespace-blog/renderer.js';
        renderer.src = rendererUrl;
        renderer.async = true;
        bbDiag('inject renderer script tag', { rendererUrl: rendererUrl });

        var rendererLoadStart = bbNow();
        renderer.onload = function() {
          bbDiag('renderer.js onload', { msLoad: Math.round((bbNow() - rendererLoadStart) * 10) / 10, hasInit: !!(window.BlogOverlayRenderer && typeof window.BlogOverlayRenderer.init === 'function') });
          if (window.BlogOverlayRenderer && typeof window.BlogOverlayRenderer.init === 'function') {
            window.BlogOverlayRenderer.init(config);
          } else {
            clearBootstrapLoading('renderer onload: BlogOverlayRenderer.init missing');
            console.error('[BlogOverlay] Renderer loaded, but BlogOverlayRenderer.init was not found');
          }
        };
        renderer.onerror = function() {
          clearBootstrapLoading('renderer script onerror');
          console.error('[BlogOverlay] Failed to load renderer.js');
        };
        document.head.appendChild(renderer);
        bbDiag('renderer script appended to head');
      })
      .catch(function(error) {
        clearBootstrapLoading('config fetch catch');
        console.error('[BlogOverlay] Failed to fetch config:', error);
        if (error && error.message === 'Failed to fetch') {
          console.error('[BlogOverlay] This often means: (1) Mixed content - use HTTPS for the API when your blog is on HTTPS, or (2) CORS/network - ensure the API server is running and reachable.');
        }
      });
  }

  if (document.readyState === 'loading') {
    bbDiag('scheduling startLoader on DOMContentLoaded', { readyState: document.readyState });
    document.addEventListener('DOMContentLoaded', function onDomReady() {
      bbDiag('DOMContentLoaded fired → startLoader');
      startLoader();
    }, { once: true });
  } else {
    bbDiag('document already interactive/complete → startLoader immediately', { readyState: document.readyState });
    startLoader();
  }
})();
