(function() {
  'use strict';

  // 1. Read attributes from the injected script tag
  const script = document.currentScript;
  const siteKey = script.getAttribute('data-site-key');
  const injectedBase = '__API_BASE_URL__';
  let apiBase = script.getAttribute('data-api-base')
    || (injectedBase !== '__API_' + 'BASE_URL__' ? injectedBase : '')
    || (function() {
      try {
        if (script && script.src) return new URL(script.src).origin;
      } catch (e) {}
      return '';
    })();
  const normalizedApiBase = apiBase.replace(/\/+$/, '');

  console.log('[BLOGGA BLOGGA] data site key', siteKey)
  console.log('[BLOGGA BLOGGA] data api base', apiBase)
  if (!siteKey) {
    console.error('[BlogOverlay] Missing data-site-key attribute');
    return;
  }
  if (!normalizedApiBase) {
    console.error('[BlogOverlay] Missing data-api-base and could not derive from script src');
    return;
  }

  // 2. Fetch config
  fetch(`${normalizedApiBase}/api/config/${encodeURIComponent(siteKey)}`)
    .then(response => response.json())
    .then(config => {
      console.log('[BLOGGA BLOGGA] config', config)
      // 3. Load the renderer bundle
      const renderer = document.createElement('script');
      const rendererUrl = (config && config.rendererUrl) ? config.rendererUrl : 'https://avantgardetricycle.github.io/squarespace-blog/renderer.js';
      renderer.src = rendererUrl;
      renderer.async = true;
      
      renderer.onload = () => {
        if (window.BlogOverlayRenderer && typeof window.BlogOverlayRenderer.init === 'function') {
          window.BlogOverlayRenderer.init(config);
        } else {
          console.error('[BlogOverlay] Renderer loaded, but BlogOverlayRenderer.init was not found');
        }
      };
      document.head.appendChild(renderer);
    })
    .catch(error => {
      console.error('[BlogOverlay] Failed to fetch config:', error);
    });
})();
