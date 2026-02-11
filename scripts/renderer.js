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

      // Fetch Squarespace blog JSON and render a list of titles and bodies
      fetch('/blog?format=json')
        .then(function(res) { return res.json(); })
        .then(function(json) {
          var container = document.createElement('div');
          container.id = 'blog-overlay-list';
          container.style.padding = '16px';
          container.style.margin = '16px 0';
          container.style.border = '1px solid #ddd';
          container.style.background = '#fafafa';
          container.style.fontFamily = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';

          var heading = document.createElement('div');
          heading.textContent = 'Hello, this is the blog JSON';
          heading.style.fontWeight = '600';
          heading.style.marginBottom = '8px';

          var list = document.createElement('div');
          list.className = 'blog-overlay-posts';

          var items = Array.isArray(json && json.items) ? json.items : [];
          for (var i = 0; i < items.length; i++) {
            var item = items[i];
            var article = document.createElement('article');
            article.style.marginBottom = '24px';

            var h2 = document.createElement('h2');
            h2.textContent = item.title || 'Untitled';
            h2.style.margin = '0 0 8px 0';

            var body = document.createElement('div');
            body.innerHTML = item.body || '';

            article.appendChild(h2);
            article.appendChild(body);
            list.appendChild(article);
          }

          if (items.length === 0) {
            var empty = document.createElement('div');
            empty.textContent = 'No posts found.';
            list.appendChild(empty);
          }

          container.appendChild(heading);
          container.appendChild(list);

          if (target && target.prepend) {
            target.prepend(container);
          } else {
            document.body.prepend(container);
          }

          // Log for debugging
          console.log('[BlogOverlay] Rendered', items.length, 'posts from blog JSON');
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
