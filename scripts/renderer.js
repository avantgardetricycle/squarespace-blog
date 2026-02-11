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
      // Determine a target to render into
      var target = document.querySelector('[data-section-type="blog"]') ||
                   document.querySelector('.blog-list') ||
                   document.querySelector('[class*="blog"]') ||
                   document.body;

      // Fetch Squarespace blog JSON and render a preview block
      fetch('/blog?format=json')
        .then(function(res) { return res.json(); })
        .then(function(json) {
          var container = document.createElement('div');
          container.id = 'blog-overlay-json-preview';
          container.style.padding = '16px';
          container.style.margin = '16px 0';
          container.style.border = '1px solid #ddd';
          container.style.background = '#fafafa';
          container.style.fontFamily = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';

          var heading = document.createElement('div');
          heading.textContent = 'Hello, this is the blog JSON';
          heading.style.fontWeight = '600';
          heading.style.marginBottom = '8px';

          var pre = document.createElement('pre');
          pre.textContent = JSON.stringify(json, null, 2);
          pre.style.whiteSpace = 'pre-wrap';
          pre.style.wordBreak = 'break-word';
          pre.style.margin = 0;

          container.appendChild(heading);
          container.appendChild(pre);

          if (target && target.prepend) {
            target.prepend(container);
          } else {
            document.body.prepend(container);
          }

          // Also log to console for debugging
          console.log('[BlogOverlay] Squarespace blog JSON:', json);
        })
        .catch(function(err) {
          console.error('[BlogOverlay] Failed to fetch blog JSON:', err);
        });
    }
  };

  // Expose a lightweight mount API used by loader.js to initialize the renderer
  if (typeof window.mount !== 'function') {
    window.mount = function(params) {
      try {
        var cfg = params && params.config ? params.config : {};
        window.BlogOverlayRenderer.init(cfg);
      } catch (e) {
        console.error('[BlogOverlay] Failed to mount renderer:', e);
      }
    };
  }

})();
