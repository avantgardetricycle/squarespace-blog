/**
 * Squarespace Blog Overlay - Renderer Script
 *
 * This script renders the custom blog layout overlay.
 * It uses Squarespace's blog JSON data combined with user config.
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
      var root = document.getElementById('blogga-blogga-root');
      if (!root) {
        console.log('[BlogOverlay] Skipping render: #blogga-blogga-root not found');
        return;
      }

      this.config = config;
      console.log('[BlogOverlay] Renderer initialized with config:', config);
      this.render();
    },

    /**
     * Get timestamp from item (Squarespace may use publishedOn, publishOn, or addedOn)
     */
    _getDate: function(item) {
      var ts = item.publishedOn || item.publishOn || item.addedOn;
      return ts ? new Date(ts).toLocaleDateString() : null;
    },

    /**
     * Get author display name from item
     */
    _getAuthor: function(item) {
      return (item.author && item.author.displayName) ? item.author.displayName : null;
    },

    /**
     * Get overlay base path (e.g. /blogga-blogga or /).
     * Uses data-overlay-base on #blogga-blogga-root if set; otherwise derives from first path segment.
     */
    _getOverlayBase: function() {
      var root = document.getElementById('blogga-blogga-root');
      if (root) {
        var base = root.getAttribute('data-overlay-base');
        if (base) return base.replace(/\/+$/, '') || '/';
      }
      var path = window.location.pathname || '/';
      var segments = path.split('/').filter(Boolean);
      if (segments.length === 0) return '/';
      return '/' + segments[0];
    },

    /**
     * Get post path from URL if we're on a single-post view
     */
    _getPostPathFromUrl: function() {
      var base = this._getOverlayBase();
      var path = window.location.pathname || '/';
      if (path === base || path === base + '/') return null;
      var postPath = path.slice(base.length).replace(/^\//, '');
      return postPath || null;
    },

    /**
     * Build overlay URL for a post (stays on overlay page instead of Squarespace blog)
     */
    _getOverlayPostUrl: function(fullUrl) {
      if (!fullUrl) return null;
      var path = fullUrl.replace(/^\//, '');
      var base = this._getOverlayBase();
      return base === '/' ? '/' + path : base + '/' + path;
    },

    /**
     * Render the blog overlay
     */
    render: function() {
      var self = this;
      var root = document.getElementById('blogga-blogga-root');
      if (!root) {
        console.log('[BlogOverlay] Skipping render: #blogga-blogga-root not found');
        return;
      }

      var cfg = this.config || {};
      var showTableOfContents = Boolean(cfg.showTableOfContents);
      var showDate = Boolean(cfg.showDate);
      var showAuthor = Boolean(cfg.showAuthor);

      var postPath = this._getPostPathFromUrl();
      var fetchUrl = postPath ? '/' + postPath + '?format=json' : '/blog?format=json';

      fetch(fetchUrl)
        .then(function(res) { return res.json(); })
        .then(function(json) {
          var items = [];
          if (postPath) {
            var single = json.item || (json.items && json.items[0]) || (json.id ? json : null);
            items = single ? [single] : [];
          } else {
            items = Array.isArray(json && json.items) ? json.items : [];
          }

          var wrapper = document.createElement('div');
          wrapper.id = 'blog-overlay-list';
          wrapper.style.display = 'flex';
          wrapper.style.gap = '24px';
          wrapper.style.padding = '16px';
          wrapper.style.margin = '16px 0';
          wrapper.style.fontFamily = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';

          var main = document.createElement('div');
          main.className = 'blog-overlay-posts';
          main.style.flex = '1';
          main.style.minWidth = '0';

          if (postPath && items.length > 0) {
            var backLink = document.createElement('a');
            backLink.href = self._getOverlayBase();
            backLink.textContent = '← Back to list';
            backLink.style.display = 'inline-block';
            backLink.style.marginBottom = '16px';
            backLink.style.color = '#0066cc';
            backLink.style.textDecoration = 'none';
            backLink.style.fontSize = '0.9rem';
            main.appendChild(backLink);
          }

          if (showTableOfContents && items.length > 0 && !postPath) {
            var sidebar = document.createElement('nav');
            sidebar.className = 'blog-overlay-toc';
            sidebar.style.flexShrink = '0';
            sidebar.style.width = '200px';
            sidebar.style.padding = '12px';
            sidebar.style.background = '#f5f5f5';
            sidebar.style.borderRadius = '8px';
            sidebar.style.position = 'sticky';
            sidebar.style.top = '16px';
            sidebar.style.alignSelf = 'flex-start';

            var tocTitle = document.createElement('div');
            tocTitle.textContent = 'Table of Contents';
            tocTitle.style.fontWeight = '600';
            tocTitle.style.marginBottom = '8px';
            tocTitle.style.fontSize = '0.9rem';
            sidebar.appendChild(tocTitle);

            for (var i = 0; i < items.length; i++) {
              var item = items[i];
              var slug = 'blog-post-' + i;
              var link = document.createElement('a');
              link.href = '#' + slug;
              link.textContent = item.title || 'Untitled';
              link.style.display = 'block';
              link.style.padding = '4px 0';
              link.style.fontSize = '0.85rem';
              link.style.color = '#0066cc';
              link.style.textDecoration = 'none';
              link.style.lineHeight = '1.3';
              link.onclick = function(id) {
                return function(e) {
                  e.preventDefault();
                  var el = document.getElementById(id);
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                };
              }(slug);
              sidebar.appendChild(link);
            }
            wrapper.appendChild(sidebar);
          }

          for (var j = 0; j < items.length; j++) {
            var post = items[j];
            var article = document.createElement('article');
            article.id = 'blog-post-' + j;
            article.style.marginBottom = '24px';
            article.style.paddingBottom = '24px';
            article.style.borderBottom = '1px solid #eee';

            var h2 = document.createElement('h2');
            h2.style.margin = '0 0 8px 0';
            h2.style.fontSize = '1.25rem';
            var postUrl = self._getOverlayPostUrl(post.fullUrl);
            if (postUrl) {
              var titleLink = document.createElement('a');
              titleLink.href = postUrl;
              titleLink.textContent = post.title || 'Untitled';
              titleLink.style.color = 'inherit';
              titleLink.style.textDecoration = 'none';
              h2.appendChild(titleLink);
            } else {
              h2.textContent = post.title || 'Untitled';
            }
            article.appendChild(h2);

            var meta = document.createElement('div');
            meta.style.fontSize = '0.875rem';
            meta.style.color = '#666';
            meta.style.marginBottom = '8px';
            var metaParts = [];
            if (showDate) {
              var dateStr = self._getDate(post);
              if (dateStr) metaParts.push(dateStr);
            }
            if (showAuthor) {
              var authorStr = self._getAuthor(post);
              if (authorStr) metaParts.push('by ' + authorStr);
            }
            if (metaParts.length > 0) {
              meta.textContent = metaParts.join(' ');
              article.appendChild(meta);
            }

            var body = document.createElement('div');
            body.innerHTML = post.body || '';
            body.style.lineHeight = '1.6';
            article.appendChild(body);
            main.appendChild(article);
          }

          if (items.length === 0) {
            var empty = document.createElement('div');
            empty.textContent = 'No posts found.';
            main.appendChild(empty);
          }

          wrapper.appendChild(main);
          root.prepend(wrapper);

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
