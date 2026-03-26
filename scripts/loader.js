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

  function startLoader() {
    if (isSquarespaceEditingUi()) {
      console.log('[BlogOverlay] Skipping loader: Squarespace editing UI detected');
      return;
    }
    // 2. Fetch config
    fetch(normalizedApiBase + '/api/config/' + encodeURIComponent(siteKey))
      .then(function(response) { return response.json(); })
      .then(function(config) {
        console.log('[BLOGGA BLOGGA] config', config);
        // 3. Load the renderer bundle
        var renderer = document.createElement('script');
        var rendererUrl = (config && config.rendererUrl) ? config.rendererUrl : 'https://avantgardetricycle.github.io/squarespace-blog/renderer.js';
        renderer.src = rendererUrl;
        renderer.async = true;

        renderer.onload = function() {
          if (window.BlogOverlayRenderer && typeof window.BlogOverlayRenderer.init === 'function') {
            window.BlogOverlayRenderer.init(config);
          } else {
            console.error('[BlogOverlay] Renderer loaded, but BlogOverlayRenderer.init was not found');
          }
        };
        document.head.appendChild(renderer);
      })
      .catch(function(error) {
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
