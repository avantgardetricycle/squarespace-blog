/**
 * Squarespace Blog Overlay - Renderer Script
 *
 * This script renders the custom blog layout overlay.
 * It uses Squarespace's blog JSON data combined with user config.
 *
 * TODO: This is a placeholder. Implement the actual rendering logic.
 */

(function() {
  'use strict';

  window.BlogOverlayRenderer = {
    config: null,

    /**
     * Return the URL of the renderer bundle for loader usage.
     * Keeping a single source of truth for where the renderer is hosted.
     */
    getRendererUrl: function() {
      return 'https://avantgardetricycle.github.io/renderer.js';
    },

    /**
     * Initialize the renderer with user config
     * @param {Object} config - User configuration from the API
     */
    init: function(config) {
      this.config = config;
      console.log('[BlogOverlay] Renderer initialized with config:', config);

      // TODO: Implement actual rendering
      // 1. Find the Squarespace blog container
      // 2. Fetch blog JSON from Squarespace (usually available at /blog?format=json)
      // 3. Render custom layout based on config

      this.render();
    },

    /**
     * Render the blog overlay
     */
    render: function() {
      // Placeholder - find blog section and log info
      const blogSection = document.querySelector('[data-section-type="blog"]') ||
                          document.querySelector('.blog-list') ||
                          document.querySelector('[class*="blog"]');

      if (blogSection) {
        console.log('[BlogOverlay] Found blog section:', blogSection);
        console.log('[BlogOverlay] Layout:', this.config?.layout);
        console.log('[BlogOverlay] Posts per page:', this.config?.postsPerPage);

        // TODO: Replace blog content with custom layout
      } else {
        console.log('[BlogOverlay] No blog section found on this page');
      }
    }
  };
})();
