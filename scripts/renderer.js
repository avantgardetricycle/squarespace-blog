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
    _progressScrollHandler: null,
    _tocScrollHandler: null,

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
     * Strip HTML and truncate text to maxLen chars
     */
    _truncateText: function(html, maxLen) {
      if (!html) return '';
      var div = document.createElement('div');
      div.innerHTML = html;
      var text = (div.textContent || div.innerText || '').replace(/\s+/g, ' ').trim();
      if (text.length <= maxLen) return text;
      return text.slice(0, maxLen) + '…';
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

    _updateTocHighlight: function() {
      var articles = document.querySelectorAll('#blog-overlay-list article');
      var tocLinks = document.querySelectorAll('.blog-overlay-toc a[data-post-index]');
      if (!articles.length || !tocLinks.length) return;

      var viewportTop = 100;
      var activeIndex = -1;
      for (var i = articles.length - 1; i >= 0; i--) {
        var rect = articles[i].getBoundingClientRect();
        if (rect.top <= viewportTop) {
          activeIndex = i;
          break;
        }
      }
      if (activeIndex < 0) activeIndex = 0;

      for (var j = 0; j < tocLinks.length; j++) {
        var idx = parseInt(tocLinks[j].getAttribute('data-post-index'), 10);
        if (idx === activeIndex) {
          tocLinks[j].classList.add('blog-overlay-toc-active');
          tocLinks[j].style.fontWeight = '600';
          tocLinks[j].style.color = '#333';
        } else {
          tocLinks[j].classList.remove('blog-overlay-toc-active');
          tocLinks[j].style.fontWeight = '';
          tocLinks[j].style.color = '#0066cc';
        }
      }
    },

    _getNavbarOffset: function() {
      var root = document.getElementById('blogga-blogga-root');
      if (root) {
        var h = root.getAttribute('data-navbar-height');
        if (h) return parseInt(h, 10) || 0;
      }
      var header = document.querySelector('header, .Header, #header, [data-section-type="header"]');
      if (header) return header.offsetHeight || 0;
      return 50;
    },

    _updateProgressBar: function() {
      var track = document.getElementById('blog-overlay-progress');
      var fill = track && track.querySelector('.blog-overlay-progress-fill');
      var article = document.querySelector('#blog-overlay-list article');
      if (!fill || !article) return;
      var scrollY = window.scrollY || document.documentElement.scrollTop;
      var navbarHeight = this._getNavbarOffset();
      track.style.top = Math.max(0, navbarHeight - scrollY) + 'px';

      var rect = article.getBoundingClientRect();
      var postTop = rect.top + scrollY;
      var postHeight = article.offsetHeight;
      var viewportHeight = window.innerHeight;
      var progress = Math.min(100, Math.max(0,
        (scrollY - postTop + viewportHeight) / (postHeight + viewportHeight) * 100
      ));
      fill.style.width = progress + '%';
    },

    _renderContent: function(items) {
      var self = this;
      var root = document.getElementById('blogga-blogga-root');
      if (!root) return;

      if (this._progressScrollHandler) {
        window.removeEventListener('scroll', this._progressScrollHandler, { passive: true });
        this._progressScrollHandler = null;
      }
      if (this._tocScrollHandler) {
        window.removeEventListener('scroll', this._tocScrollHandler, { passive: true });
        this._tocScrollHandler = null;
      }

      var existing = root.querySelector('#blog-overlay-list');
      if (existing) existing.remove();

      var cfg = this.config || {};
      var showTableOfContents = Boolean(cfg.showTableOfContents);
      var tableOfContentsPosition = (cfg.tableOfContentsPosition === 'right') ? 'right' : 'left';
      var showRecentPostsSidebar = Boolean(cfg.showRecentPostsSidebar);
      var recentPostsCount = Math.max(1, Math.min(50, parseInt(cfg.recentPostsCount, 10) || 5));
      var sidebarPosition = (cfg.sidebarPosition === 'right') ? 'right' : 'left';
      var showDate = Boolean(cfg.showDate);
      var showAuthor = Boolean(cfg.showAuthor);
      var showProgressBar = Boolean(cfg.showProgressBar);

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

      if (isSinglePost && showProgressBar) {
        var navbarOffset = this._getNavbarOffset();
        var progressTrack = document.createElement('div');
        progressTrack.id = 'blog-overlay-progress';
        progressTrack.style.position = 'fixed';
        progressTrack.style.top = navbarOffset + 'px';
        progressTrack.style.transition = 'top 0.05s ease-out';
        progressTrack.style.left = '0';
        progressTrack.style.right = '0';
        progressTrack.style.height = '6px';
        progressTrack.style.backgroundColor = 'rgba(0,0,0,0.08)';
        progressTrack.style.zIndex = '9999';
        var progressFill = document.createElement('div');
        progressFill.className = 'blog-overlay-progress-fill';
        progressFill.style.height = '100%';
        progressFill.style.width = '0%';
        progressFill.style.backgroundColor = '#0066cc';
        progressFill.style.transition = 'width 0.1s ease-out';
        progressTrack.appendChild(progressFill);
        wrapper.appendChild(progressTrack);

        this._progressScrollHandler = function() {
          self._updateProgressBar();
        };
        window.addEventListener('scroll', this._progressScrollHandler, { passive: true });
      }

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

      var tocSidebar = null;
      var recentPostsSidebar = null;

      if (showTableOfContents && items.length > 0 && !isSinglePost) {
            tocSidebar = document.createElement('nav');
            tocSidebar.className = 'blog-overlay-toc';
            tocSidebar.style.flexShrink = '0';
            tocSidebar.style.width = '200px';
            tocSidebar.style.padding = '12px';
            tocSidebar.style.background = '#f5f5f5';
            tocSidebar.style.borderRadius = '8px';
            tocSidebar.style.position = 'sticky';
            tocSidebar.style.top = '16px';
            tocSidebar.style.alignSelf = 'flex-start';

            var tocTitle = document.createElement('div');
            tocTitle.textContent = 'Table of Contents';
            tocTitle.style.fontWeight = '600';
            tocTitle.style.marginBottom = '8px';
            tocTitle.style.fontSize = '0.9rem';
            tocSidebar.appendChild(tocTitle);

            for (var i = 0; i < items.length; i++) {
              var tocItem = items[i];
              var tocIdx = i;
              var tocLink = document.createElement('a');
              tocLink.href = '#post-' + i;
              tocLink.setAttribute('data-post-index', String(i));
              tocLink.textContent = tocItem.title || 'Untitled';
              tocLink.style.display = 'block';
              tocLink.style.padding = '4px 0';
              tocLink.style.fontSize = '0.85rem';
              tocLink.style.color = '#0066cc';
              tocLink.style.textDecoration = 'none';
              tocLink.style.lineHeight = '1.3';
              tocLink.onclick = function(index) {
                return function(e) {
                  e.preventDefault();
                  self._setViewHash(index);
                  self._renderContent(self.items);
                };
              }(tocIdx);
              tocSidebar.appendChild(tocLink);
            }

            this._tocScrollHandler = function() {
              self._updateTocHighlight();
            };
            window.addEventListener('scroll', this._tocScrollHandler, { passive: true });
            requestAnimationFrame(function() {
              self._updateTocHighlight();
            });
          }

      if (showRecentPostsSidebar && items.length > 0) {
            recentPostsSidebar = document.createElement('aside');
            recentPostsSidebar.className = 'blog-overlay-recent-posts';
            recentPostsSidebar.style.flexShrink = '0';
            recentPostsSidebar.style.width = '220px';
            recentPostsSidebar.style.padding = '12px';
            recentPostsSidebar.style.background = '#f5f5f5';
            recentPostsSidebar.style.borderRadius = '8px';
            recentPostsSidebar.style.position = 'sticky';
            recentPostsSidebar.style.top = '16px';
            recentPostsSidebar.style.alignSelf = 'flex-start';

            var rpTitle = document.createElement('div');
            rpTitle.textContent = 'Recent Posts';
            rpTitle.style.fontWeight = '600';
            rpTitle.style.marginBottom = '8px';
            rpTitle.style.fontSize = '0.9rem';
            recentPostsSidebar.appendChild(rpTitle);

            var recentItems = items.slice(0, recentPostsCount);
            for (var r = 0; r < recentItems.length; r++) {
              var rpPost = recentItems[r];
              var rpIdx = r;
              var rpEntry = document.createElement('div');
              rpEntry.style.marginBottom = '12px';

              var rpLink = document.createElement('a');
              rpLink.href = '#post-' + rpIdx;
              rpLink.textContent = rpPost.title || 'Untitled';
              rpLink.style.display = 'block';
              rpLink.style.fontSize = '0.9rem';
              rpLink.style.fontWeight = '500';
              rpLink.style.color = '#0066cc';
              rpLink.style.textDecoration = 'none';
              rpLink.style.marginBottom = '4px';
              rpLink.onclick = function(index) {
                return function(e) {
                  e.preventDefault();
                  self._setViewHash(index);
                  self._renderContent(self.items);
                };
              }(rpIdx);
              rpEntry.appendChild(rpLink);

              var rpExcerpt = document.createElement('div');
              rpExcerpt.textContent = self._truncateText(rpPost.body || rpPost.excerpt || '', 120);
              rpExcerpt.style.fontSize = '0.8rem';
              rpExcerpt.style.color = '#666';
              rpExcerpt.style.lineHeight = '1.4';
              rpEntry.appendChild(rpExcerpt);

              recentPostsSidebar.appendChild(rpEntry);
            }
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

          var leftSidebar = document.createElement('div');
          leftSidebar.style.display = 'flex';
          leftSidebar.style.flexDirection = 'column';
          leftSidebar.style.gap = '16px';
          leftSidebar.style.flexShrink = '0';

          var rightSidebar = document.createElement('div');
          rightSidebar.style.display = 'flex';
          rightSidebar.style.flexDirection = 'column';
          rightSidebar.style.gap = '16px';
          rightSidebar.style.flexShrink = '0';

          if (tocSidebar && tableOfContentsPosition === 'left') leftSidebar.appendChild(tocSidebar);
          if (tocSidebar && tableOfContentsPosition === 'right') rightSidebar.appendChild(tocSidebar);
          if (recentPostsSidebar && sidebarPosition === 'left') leftSidebar.appendChild(recentPostsSidebar);
          if (recentPostsSidebar && sidebarPosition === 'right') rightSidebar.appendChild(recentPostsSidebar);

          if (leftSidebar.childNodes.length) wrapper.appendChild(leftSidebar);
          wrapper.appendChild(main);
          if (rightSidebar.childNodes.length) wrapper.appendChild(rightSidebar);

          root.prepend(wrapper);

      if (isSinglePost && showProgressBar) {
        requestAnimationFrame(function() {
          self._updateProgressBar();
        });
      }
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
