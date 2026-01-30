/**
 * Squarespace Blog Overlay - Loader Script
 *
 * This script is injected into Squarespace via Code Injection.
 * It fetches the user's config and loads the renderer bundle.
 *
 * Usage:
 * <script src="https://your-domain.com/loader.js" data-token="USER_TOKEN"></script>
 */

(function() {
  'use strict';

  // Get the token from the script tag
  const scriptTag = document.currentScript;
  const token = scriptTag?.getAttribute('data-token');

  if (!token) {
    console.error('[BlogOverlay] No data-token attribute found on script tag');
    return;
  }

  // Configuration
  const API_BASE = scriptTag.getAttribute('data-api') || 'https://your-domain.com';

  // Fetch user config
  async function loadConfig() {
    try {
      const response = await fetch(`${API_BASE}/api/config/${token}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch config: ${response.status}`);
      }

      const config = await response.json();

      // Load the renderer script
      if (config.rendererUrl) {
        loadRenderer(config.rendererUrl, config);
      }
    } catch (error) {
      console.error('[BlogOverlay] Failed to load config:', error);
    }
  }

  // Load and initialize the renderer
  function loadRenderer(url, config) {
    const script = document.createElement('script');
    script.src = url;
    script.onload = function() {
      // The renderer will expose a global init function
      if (window.BlogOverlayRenderer?.init) {
        window.BlogOverlayRenderer.init(config);
      }
    };
    script.onerror = function() {
      console.error('[BlogOverlay] Failed to load renderer script');
    };
    document.head.appendChild(script);
  }

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadConfig);
  } else {
    loadConfig();
  }
})();
