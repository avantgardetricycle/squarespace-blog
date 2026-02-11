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
      // 3. Load the renderer bundle
      const renderer = document.createElement('script');
      renderer.src = '/renderer.js';
      renderer.onload = () => {
        // 4. Call mount({ config })
        window.mount({ config });
      };
      document.head.appendChild(renderer);
    })
    .catch(error => {
      console.error('[BlogOverlay] Failed to fetch config:', error);
    });
})();
