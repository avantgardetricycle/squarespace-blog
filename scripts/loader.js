(function() {
  'use strict';

  // 1. Read data-site-key
  const script = document.currentScript;
  const siteKey = script.getAttribute('data-site-key');

  console.log('[BLOGGA BLOGGA] data site key', siteKey)
  if (!siteKey) {
    console.error('[BlogOverlay] Missing data-site-key attribute');
    return;
  }

  // 2. Fetch config
  fetch(`https://tribal-intelligent-rankings-manually.trycloudflare.com/api/config/${encodeURIComponent(siteKey)}`)
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
