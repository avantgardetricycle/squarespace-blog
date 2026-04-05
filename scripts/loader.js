(function() {
  'use strict';

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

  function clearBootstrapLoading() {
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
    if (window.__bbBootstrapLoadingActive) return;
    if (!document.documentElement || !document.body) return;
    try {
      window.__bbBootstrapLoadingActive = true;
      window.__bbClearBootstrapLoading = clearBootstrapLoading;

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
    } catch (e) {
      try { window.__bbBootstrapLoadingActive = false; } catch (e2) { /* ignore */ }
    }
  }

  window.__bbClearBootstrapLoading = clearBootstrapLoading;

  // If the script runs after <body> exists (e.g. footer injection), show the spinner immediately
  // instead of waiting for DOMContentLoaded.
  try {
    if (document.body && !isSquarespaceEditingUi()) installBootstrapLoading();
  } catch (earlyBootErr) { /* ignore */ }

  function startLoader() {
    if (isSquarespaceEditingUi()) {
      console.log('[BlogOverlay] Skipping loader: Squarespace editing UI detected');
      return;
    }
    installBootstrapLoading();

    fetch(normalizedApiBase + '/api/config/' + encodeURIComponent(siteKey))
      .then(function(response) {
        if (!response.ok) {
          throw new Error('Blog config HTTP ' + response.status);
        }
        return response.json();
      })
      .then(function(config) {
        var renderer = document.createElement('script');
        var rendererUrl = (config && config.rendererUrl) ? config.rendererUrl : 'https://avantgardetricycle.github.io/squarespace-blog/renderer.js';
        renderer.src = rendererUrl;
        renderer.async = true;

        renderer.onload = function() {
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
        document.head.appendChild(renderer);
      })
      .catch(function(error) {
        clearBootstrapLoading();
        console.error('[BlogOverlay] Failed to fetch config:', error);
        if (error && error.message === 'Failed to fetch') {
          console.error('[BlogOverlay] This often means: (1) Mixed content - use HTTPS for the API when your blog is on HTTPS, or (2) CORS/network - ensure the API server is running and reachable.');
        }
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startLoader, { once: true });
  } else {
    startLoader();
  }
})();
