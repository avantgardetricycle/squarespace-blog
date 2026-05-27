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

  // The Header injection already added bb-loading-blog synchronously. We
  // (re)assert it here as a belt-and-suspenders fallback for sites that only
  // installed the loader script. Safe to call before <body> exists because the
  // class lives on <html>, and the overlay is rendered via :before/:after
  // pseudo-elements on <html>.
  try {
    if (!isSquarespaceEditingUi()) installBootstrapLoading();
    else clearBootstrapLoading();
  } catch (earlyBootErr) { /* ignore */ }

  function startLoader() {
    if (isSquarespaceEditingUi()) {
      console.log('[BlogOverlay] Skipping loader: Squarespace editing UI detected');
      clearBootstrapLoading();
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
