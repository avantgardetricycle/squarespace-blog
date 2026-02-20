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
    items: [],

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

      var self = this;
      window.addEventListener('hashchange', function() {
        if (self.items.length) self._renderContent(self.items);
      });

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
     * Get selected post index from hash (#post-0, #post-1, etc). Returns -1 for list view.
     */
    _getSelectedIndexFromHash: function() {
      var hash = (window.location.hash || '').replace(/^#/, '');
      if (!hash || hash.indexOf('post-') !== 0) return -1;
      var idx = parseInt(hash.slice(5), 10);
      return isNaN(idx) ? -1 : idx;
    },

    /**
     * Set hash to show single post (index) or list (-1)
     */
    _setViewHash: function(index) {
      if (index < 0) {
        if (window.history.replaceState) {
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        } else {
          window.location.hash = '';
        }
      } else {
        window.location.hash = 'post-' + index;
      }
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

      fetch('/blog?format=json')
        .then(function(res) { return res.json(); })
        .then(function(json) {
          var items = Array.isArray(json && json.items) ? json.items : [];
          self.items = items;
          self._renderContent(items);
          console.log('[BlogOverlay] Rendered', items.length, 'posts from blog JSON');
        })
        .catch(function(err) {
          console.error('[BlogOverlay] Failed to fetch blog JSON:', err);
        });
    },

    _renderContent: function(items) {
      var self = this;
      var root = document.getElementById('blogga-blogga-root');
      if (!root) return;

      var existing = root.querySelector('#blog-overlay-list');
      if (existing) existing.remove();

      var cfg = this.config || {};
      var showTableOfContents = Boolean(cfg.showTableOfContents);
      var showDate = Boolean(cfg.showDate);
      var showAuthor = Boolean(cfg.showAuthor);

      var selectedIndex = this._getSelectedIndexFromHash();
      var displayItems = selectedIndex >= 0 && selectedIndex < items.length
        ? [items[selectedIndex]]
        : items;
      var isSinglePost = displayItems.length === 1 && selectedIndex >= 0;

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

      if (isSinglePost) {
        var backLink = document.createElement('a');
        backLink.href = '#';
        backLink.textContent = '← Back to list';
        backLink.style.display = 'inline-block';
        backLink.style.marginBottom = '16px';
        backLink.style.color = '#0066cc';
        backLink.style.textDecoration = 'none';
        backLink.style.fontSize = '0.9rem';
        backLink.onclick = function(e) {
          e.preventDefault();
          self._setViewHash(-1);
          self._renderContent(self.items);
        };
        main.appendChild(backLink);
      }

      if (showTableOfContents && items.length > 0 && !isSinglePost) {
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
              var idx = i;
              var link = document.createElement('a');
              link.href = '#post-' + i;
              link.textContent = item.title || 'Untitled';
              link.style.display = 'block';
              link.style.padding = '4px 0';
              link.style.fontSize = '0.85rem';
              link.style.color = '#0066cc';
              link.style.textDecoration = 'none';
              link.style.lineHeight = '1.3';
              link.onclick = function(index) {
                return function(e) {
                  e.preventDefault();
                  self._setViewHash(index);
                  self._renderContent(self.items);
                };
              }(idx);
              sidebar.appendChild(link);
            }
            wrapper.appendChild(sidebar);
          }

          for (var j = 0; j < displayItems.length; j++) {
            var post = displayItems[j];
            var postIndex = isSinglePost ? selectedIndex : j;
            var article = document.createElement('article');
            article.id = 'blog-post-' + j;
            article.style.marginBottom = '24px';
            article.style.paddingBottom = '24px';
            article.style.borderBottom = '1px solid #eee';

            var h2 = document.createElement('h2');
            h2.style.margin = '0 0 8px 0';
            h2.style.fontSize = '1.25rem';
            if (!isSinglePost) {
              var titleLink = document.createElement('a');
              titleLink.href = '#post-' + postIndex;
              titleLink.textContent = post.title || 'Untitled';
              titleLink.style.color = 'inherit';
              titleLink.style.textDecoration = 'none';
              titleLink.style.cursor = 'pointer';
              titleLink.onclick = function(index) {
                return function(e) {
                  e.preventDefault();
                  self._setViewHash(index);
                  self._renderContent(self.items);
                };
              }(postIndex);
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

          if (displayItems.length === 0) {
            var empty = document.createElement('div');
            empty.textContent = 'No posts found.';
            main.appendChild(empty);
          }

          wrapper.appendChild(main);
          root.prepend(wrapper);
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
