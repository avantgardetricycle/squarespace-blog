/**
 * Squarespace Blog Overlay - Renderer Script
 *
 * This script renders the custom blog layout overlay.
 * It uses Squarespace's blog JSON data combined with user config.
 */

(function() {
  'use strict';

  /**
   * Adapter: find the best container to render blog content into.
   * Prefers higher-level containers (main, #content, etc.) to preserve inherited styles.
   * @returns {Element|null}
   */
  function findBlogContainer() {
    var BLOG_ITEM_SELECTORS = 'article, .blog-item, .blog-article, .blog-post, .entry, .post, [class*="blog-item"], [class*="blog-article"], [class*="blog-post"]';

    function countBlogItems(el) {
      return el.querySelectorAll(BLOG_ITEM_SELECTORS).length;
    }

    function scoreAndPick(candidates) {
      var best = null;
      var bestScore = 0;
      for (var i = 0; i < candidates.length; i++) {
        var el = candidates[i];
        if (!el || !el.parentNode) continue;
        var score = countBlogItems(el);
        if (score > bestScore) {
          bestScore = score;
          best = el;
        }
      }
      return best;
    }

    // 1. Prefer higher-level containers first (preserves site styles: typography, colors, layout)
    var highLevelSelectors = [
      'main', '#content', '#main', '[role="main"]',
      '.content-wrapper', '.Main-content', '#page',
      '#contentWrapper', '.Index-content', '.blog-content'
    ];
    for (var h = 0; h < highLevelSelectors.length; h++) {
      try {
        var highCandidates = document.querySelectorAll(highLevelSelectors[h]);
        if (highCandidates.length > 0) {
          var picked = scoreAndPick(Array.prototype.slice.call(highCandidates));
          if (picked) return picked;
        }
      } catch (e) { /* invalid selector */ }
    }

    // 2. Blog list container candidates (deeper in DOM)
    var listSelectors = [
      '.blog-list', '.blog-list-wrapper', '.blog-list-container',
      '[class*="blog"][class*="list"]', '.collection-items', '.Index-page',
      '#blogList', '[id*="blog"][id*="list"]'
    ];
    for (var l = 0; l < listSelectors.length; l++) {
      try {
        var listCandidates = document.querySelectorAll(listSelectors[l]);
        if (listCandidates.length > 0) {
          var picked = scoreAndPick(Array.prototype.slice.call(listCandidates));
          if (picked) return picked;
        }
      } catch (e) { /* invalid selector */ }
    }

    // 3. Blog post container candidates (single post view - parent of article/item)
    var postSelectors = [
      '.blog-item', '.blog-article', '.blog-post', '.entry', '.post',
      '[class*="blog-item"]', '[class*="blog-article"]', 'article'
    ];
    var postContainers = [];
    for (var p = 0; p < postSelectors.length; p++) {
      try {
        var postEls = document.querySelectorAll(postSelectors[p]);
        for (var j = 0; j < postEls.length; j++) {
          var parent = postEls[j].parentElement;
          if (parent && postContainers.indexOf(parent) === -1) {
            postContainers.push(parent);
          }
        }
      } catch (e) { /* invalid selector */ }
    }
    if (postContainers.length > 0) {
      var picked = scoreAndPick(postContainers);
      if (picked) return picked;
    }

    // 4. Fallback: main content area, look for blog-ish children
    var mains = document.querySelectorAll('main, #siteWrapper, #content, #main, .main-content, [role="main"]');
    var fallbackCandidates = [];
    for (var m = 0; m < mains.length; m++) {
      var main = mains[m];
      var bloggy = main.querySelectorAll('[class*="blog"], [id*="blog"], article');
      for (var b = 0; b < bloggy.length; b++) {
        fallbackCandidates.push(bloggy[b]);
      }
      if (bloggy.length === 0 && countBlogItems(main) > 0) {
        fallbackCandidates.push(main);
      }
    }
    if (fallbackCandidates.length > 0) {
      return scoreAndPick(fallbackCandidates);
    }

    return null;
  }

  window.BlogOverlayRenderer = {
    config: null,
    items: [],
    _progressScrollHandler: null,
    _tocScrollHandler: null,

    /**
     * Check if current path is a blog route (exact path or post sub-path)
     * @param {string} pathname - Current path (e.g. window.location.pathname)
     * @param {string|null} blogPath - Blog path from config (e.g. /blog, /journal)
     * @returns {boolean}
     */
    _isOnBlogRoute: function(pathname, blogPath) {
      if (!blogPath) return false;
      if (blogPath === '/') {
        return pathname === '/' || pathname === '';
      }
      if (pathname === blogPath) return true;
      if (pathname.indexOf(blogPath + '/') === 0) return true;
      return false;
    },

    /**
     * Initialize the renderer with user config
     * @param {Object} config - User configuration from the API
     *   - previewMode: if true, skip route check and use rootEl/previewFetchUrl
     *   - rootEl: optional DOM element to render into (preview mode)
     *   - previewFetchUrl: optional URL to fetch blog JSON from (preview mode)
     */
    init: function(config) {
      this.config = config || {};
      var previewMode = Boolean(this.config.previewMode);
      var bbPreview = this._hasBbPreviewParam();

      if (!previewMode) {
        var blogPath = this.config.blogPath;
        var pathname = window.location.pathname || '/';
        if (!this._isOnBlogRoute(pathname, blogPath)) {
          console.log('[BlogOverlay] Skipping render: not on blog route (path:', pathname, ', blogPath:', blogPath, ')');
          return;
        }
      }

      var root = this.config.rootEl || findBlogContainer() || document.getElementById('blogga-blogga-root');
      if (!root) {
        console.log('[BlogOverlay] Skipping render: no blog container found');
        return;
      }
      this._root = root;
      this._previewMode = previewMode;
      this._bbPreview = bbPreview;
      console.log('[BlogOverlay] Renderer initialized with config:', this.config, 'showRecentPostsSidebar:', !!this.config.showRecentPostsSidebar);

      var self = this;
      window.addEventListener('hashchange', function() {
        if (self.items.length) self._renderContent(self.items);
        if (bbPreview && window.parent !== window) {
          var idx = self._getSelectedIndexFromHash();
          window.parent.postMessage({ type: 'BETTERBLOG_PREVIEW_POST_SELECTED', postIndex: idx }, '*');
        }
      });

      if (bbPreview) {
        this._setupPreviewMessageListener();
      }

      this.render();
    },

    _hasBbPreviewParam: function() {
      try {
        var params = new URLSearchParams(window.location.search || '');
        return params.get('bbPreview') === '1';
      } catch (e) {
        return false;
      }
    },

    _setupPreviewMessageListener: function() {
      var self = this;
      window.addEventListener('message', function(event) {
        if (event.data && event.data.type === 'BETTERBLOG_PREVIEW_CONFIG' && event.data.config) {
          self.updateConfig(event.data.config);
        }
      });
      if (window.parent !== window) {
        window.parent.postMessage({ type: 'BETTERBLOG_PREVIEW_READY' }, '*');
        var idx = self._getSelectedIndexFromHash();
        window.parent.postMessage({ type: 'BETTERBLOG_PREVIEW_POST_SELECTED', postIndex: idx }, '*');
      }
    },

    updateConfig: function(newConfig) {
      if (!newConfig || typeof newConfig !== 'object') return;
      this.config = Object.assign({}, this.config || {}, newConfig);
      if (this.items.length) {
        this._renderContent(this.items);
      }
    },

    /**
     * Get timestamp from item (Squarespace may use publishedOn, publishOn, or addedOn)
     */
    _getDate: function(item) {
      var ts = item.publishedOn || item.publishOn || item.addedOn;
      return ts ? new Date(ts).toLocaleDateString() : null;
    },

    /**
     * Get author display name from item (legacy single author)
     */
    _getAuthor: function(item) {
      return (item.author && item.author.displayName) ? item.author.displayName : null;
    },

    /**
     * Get author names for a post, respecting defaultAuthorIds and postAuthorOverrides
     */
    _getAuthorsForPost: function(post, cfg) {
      var postId = (post && (post.id || post.fullUrl || post.title)) ? String(post.id || post.fullUrl || post.title) : null;
      var overrides = (cfg && cfg.postAuthorOverrides && typeof cfg.postAuthorOverrides === 'object') ? cfg.postAuthorOverrides : {};
      var defaultIds = Array.isArray(cfg && cfg.defaultAuthorIds) ? cfg.defaultAuthorIds : [];
      var authorMap = (cfg && cfg.authorMap && typeof cfg.authorMap === 'object') ? cfg.authorMap : {};
      var ids = (postId && postId in overrides)
        ? overrides[postId]
        : (defaultIds.length > 0 ? defaultIds : null);
      if (ids && ids.length > 0) {
        var names = [];
        for (var i = 0; i < ids.length; i++) {
          var n = authorMap[ids[i]];
          if (n) names.push(n);
        }
        if (names.length > 0) return names.join(', ');
      }
      if (postId && postId in overrides) return ''; // explicit override with no authors
      return this._getAuthor(post);
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
      var previewMode = Boolean(this.config && this.config.previewMode);

      if (!previewMode) {
        var blogPath = this.config && this.config.blogPath;
        var pathname = window.location.pathname || '/';
        if (!this._isOnBlogRoute(pathname, blogPath)) {
          console.log('[BlogOverlay] Skipping render: not on blog route');
          return;
        }
      }

      var root = this._root || this.config.rootEl || findBlogContainer() || document.getElementById('blogga-blogga-root');
      if (!root) {
        console.log('[BlogOverlay] Skipping render: no blog container found');
        return;
      }

      var fetchUrl = this.config.previewFetchUrl;
      if (!fetchUrl) {
        var blogPath = this.config && this.config.blogPath;
        var fetchPath = (blogPath && blogPath !== '/') ? blogPath : '/blog';
        fetchUrl = fetchPath + '?format=json';
      }
      fetch(fetchUrl)
        .then(function(res) { return res.json(); })
        .then(function(json) {
          var items = Array.isArray(json && json.items) ? json.items : [];
          if (!items.length && json && json.collection && Array.isArray(json.collection.items)) {
            items = json.collection.items;
          }
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
      var root = this._root || document.getElementById('blogga-blogga-root');
      if (root) {
        var h = root.getAttribute('data-navbar-height');
        if (h) return parseInt(h, 10) || 0;
      }
      var headerSelectors = [
        'header', '.Header', '#header', '[data-section-type="header"]',
        '.header-announcement-bar', '.Header-announcementBar',
        '[data-nc-group="header"]', '.Index-nav', '.Index-header'
      ];
      for (var i = 0; i < headerSelectors.length; i++) {
        try {
          var header = document.querySelector(headerSelectors[i]);
          if (header) {
            var height = header.offsetHeight || 0;
            if (height > 0) return height;
          }
        } catch (e) { /* invalid selector */ }
      }
      return 0;
    },

    _getScrollContainer: function() {
      var root = this._root;
      if (!root) return null;
      var el = root.parentElement;
      while (el) {
        var style = window.getComputedStyle(el);
        var overflowY = style.overflowY || style.overflow;
        if (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') return el;
        el = el.parentElement;
      }
      return null;
    },

    _updateProgressBar: function() {
      var track = document.getElementById('blog-overlay-progress');
      var fill = track && track.querySelector('.blog-overlay-progress-fill');
      var article = document.querySelector('#blog-overlay-list article');
      if (!fill || !article) return;

      var scrollY, viewportHeight, postTop, postHeight;
      var position = (this.config && this.config.progressBarPosition) || 'top';
      if (this._previewMode) {
        var scrollContainer = this._getScrollContainer();
        if (!scrollContainer) return;
        scrollY = scrollContainer.scrollTop;
        viewportHeight = scrollContainer.clientHeight;
        var articleRect = article.getBoundingClientRect();
        var containerRect = scrollContainer.getBoundingClientRect();
        postTop = articleRect.top - containerRect.top + scrollContainer.scrollTop;
        postHeight = article.offsetHeight;
      } else {
        scrollY = window.scrollY || document.documentElement.scrollTop;
        if (position === 'top') {
          var navbarHeight = this._getNavbarOffset();
          track.style.top = Math.max(0, navbarHeight - scrollY) + 'px';
          track.style.bottom = 'auto';
        } else {
          track.style.top = 'auto';
          track.style.bottom = '10px';
        }
        viewportHeight = window.innerHeight;
        var rect = article.getBoundingClientRect();
        postTop = rect.top + scrollY;
        postHeight = article.offsetHeight;
      }

      /* Progress = amount of article in view; 100% when user cannot scroll further */
      var amountRead = Math.min(postHeight, Math.max(0, scrollY + viewportHeight - postTop));
      var progress = postHeight > 0 ? (amountRead / postHeight) * 100 : 0;
      progress = Math.min(100, Math.max(0, progress));
      fill.style.width = progress + '%';
    },

    _renderContent: function(items) {
      var self = this;
      var root = this._root || findBlogContainer() || document.getElementById('blogga-blogga-root');
      if (!root) return;

      if (this._progressScrollHandler) {
        var scrollTarget = this._progressScrollTarget || window;
        scrollTarget.removeEventListener('scroll', this._progressScrollHandler, { passive: true });
        this._progressScrollHandler = null;
        this._progressScrollTarget = null;
      }
      if (this._tocScrollHandler) {
        window.removeEventListener('scroll', this._tocScrollHandler, { passive: true });
        this._tocScrollHandler = null;
      }

      var existing = root.querySelector('#blog-overlay-list');
      if (existing) existing.remove();
      var existingProgress = root.querySelector('#blog-overlay-progress');
      if (existingProgress) existingProgress.remove();

      /* Replace original content with our overlay (avoids duplicate content, keeps root for style inheritance) */
      var toRemove = [];
      for (var i = 0; i < root.childNodes.length; i++) {
        var child = root.childNodes[i];
        if (child && child.id !== 'blog-overlay-list' && child.id !== 'blog-overlay-progress') {
          toRemove.push(child);
        }
      }
      for (var r = 0; r < toRemove.length; r++) {
        root.removeChild(toRemove[r]);
      }

      var cfg = this.config || {};
      var showTableOfContents = Boolean(cfg.showTableOfContents);
      var tableOfContentsPosition = (cfg.tableOfContentsPosition === 'right') ? 'right' : 'left';
      var showRecentPostsSidebar = Boolean(cfg.showRecentPostsSidebar);
      var recentPostsCount = Math.max(1, Math.min(50, parseInt(cfg.recentPostsCount, 10) || 5));
      var sidebarPosition = (cfg.sidebarPosition === 'right') ? 'right' : 'left';

      if (showRecentPostsSidebar && items.length > 0) {
        console.log('[BlogOverlay] Rendering Recent Posts sidebar:', { recentPostsCount, sidebarPosition, itemsCount: items.length });
      }
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
      wrapper.className = 'blog-overlay-wrapper';
      wrapper.style.display = 'flex';
      wrapper.style.gap = '24px';
      wrapper.style.padding = '16px';
      wrapper.style.margin = '16px 0';
      var navbarOffset = this._getNavbarOffset();
      if (navbarOffset > 0) {
        wrapper.style.paddingTop = (navbarOffset + 16) + 'px';
      }
      /* Do not set fontFamily - inherit from site for consistent typography */

      var main = document.createElement('div');
      main.className = 'blog-overlay-posts';
      main.style.flex = '1';
      main.style.minWidth = '0';

      var progressTrackForPreview = null;
      var progressBarPosition = (cfg.progressBarPosition === 'bottom') ? 'bottom' : 'top';
      var progressBarThickness = Math.min(12, Math.max(2, parseInt(cfg.progressBarThickness, 10) || 6));
      var progressBarColor = (typeof cfg.progressBarColor === 'string' && /^#[0-9A-Fa-f]{6}$/.test(cfg.progressBarColor)) ? cfg.progressBarColor : '#5B4FE8';
      if (isSinglePost && showProgressBar) {
        var progressTrack = document.createElement('div');
        progressTrack.id = 'blog-overlay-progress';
        progressTrack.style.height = progressBarThickness + 'px';
        progressTrack.style.backgroundColor = 'rgba(0,0,0,0.08)';
        progressTrack.style.zIndex = '9999';
        if (this._previewMode) {
          root.style.position = 'relative';
          progressTrack.style.position = 'absolute';
          progressTrack.style.left = '0';
          progressTrack.style.right = '0';
          if (progressBarPosition === 'bottom') {
            progressTrack.style.bottom = '10px';
            progressTrack.style.top = 'auto';
          } else {
            progressTrack.style.top = '0';
            progressTrack.style.bottom = 'auto';
          }
          progressTrackForPreview = progressTrack;
        } else {
          progressTrack.style.position = 'fixed';
          progressTrack.style.left = '0';
          progressTrack.style.right = '0';
          if (progressBarPosition === 'bottom') {
            progressTrack.style.bottom = '10px';
            progressTrack.style.top = 'auto';
          } else {
            var navbarOffset = this._getNavbarOffset();
            progressTrack.style.top = navbarOffset + 'px';
            progressTrack.style.bottom = 'auto';
            progressTrack.style.transition = 'top 0.05s ease-out';
          }
          wrapper.appendChild(progressTrack);
        }
        var progressFill = document.createElement('div');
        progressFill.className = 'blog-overlay-progress-fill';
        progressFill.style.height = '100%';
        progressFill.style.width = '0%';
        progressFill.style.backgroundColor = progressBarColor;
        progressFill.style.transition = 'width 0.1s ease-out';
        progressTrack.appendChild(progressFill);

        this._progressScrollHandler = function() {
          self._updateProgressBar();
        };
        var scrollTarget = this._previewMode ? this._getScrollContainer() : window;
        this._progressScrollTarget = scrollTarget;
        if (scrollTarget) {
          scrollTarget.addEventListener('scroll', this._progressScrollHandler, { passive: true });
        }
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
            if (navbarOffset > 0) {
              article.style.scrollMarginTop = (navbarOffset + 8) + 'px';
            }

            var h2 = document.createElement('h2');
            h2.className = 'blog-overlay-title';
            h2.style.margin = '0 0 8px 0';
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
            meta.className = 'blog-overlay-meta';
            meta.style.marginBottom = '8px';
            var metaParts = [];
            if (showDate) {
              var dateStr = self._getDate(post);
              if (dateStr) metaParts.push(dateStr);
            }
            if (showAuthor) {
              var authorStr = self._getAuthorsForPost(post, cfg);
              if (authorStr) metaParts.push('by ' + authorStr);
            }
            if (metaParts.length > 0) {
              meta.textContent = metaParts.join(' ');
              article.appendChild(meta);
            }

            var body = document.createElement('div');
            body.className = 'blog-overlay-body';
            body.innerHTML = post.body || '';
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

      if (progressTrackForPreview) {
        root.insertBefore(progressTrackForPreview, root.firstChild);
      }

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
