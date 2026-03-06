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
    _searchQuery: '',
    _categoryFilter: '',
    _progressScrollHandler: null,
    _progressScrollTarget: null,
    _tocScrollHandler: null,
    _tocScrollTarget: null,

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
          var idx = self._getSelectedIndex(self.items);
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
        if (event.data && event.data.type === 'BETTERBLOG_PREVIEW_SELECT_POST' && typeof event.data.postIndex === 'number') {
          var idx = event.data.postIndex;
          if (self.items.length > 0 && idx >= 0 && idx < self.items.length) {
            window.location.hash = '#post-' + idx;
          }
        }
      });
      if (window.parent !== window) {
        window.parent.postMessage({ type: 'BETTERBLOG_PREVIEW_READY' }, '*');
        var idx = self._getSelectedIndex(self.items);
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
     * Supports: author.displayName, authors[0].displayName, contributors[0].displayName
     */
    _getAuthor: function(item) {
      if (!item) return null;
      var a = item.author;
      if (a && a.displayName && typeof a.displayName === 'string') return a.displayName.trim();
      var arr = item.authors || item.contributors;
      if (Array.isArray(arr) && arr.length > 0) {
        var first = arr[0];
        if (first && (first.displayName || first.fullName)) {
          var name = (first.displayName || first.fullName || '').trim();
          if (name) return name;
        }
      }
      return null;
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
     * Estimate reading time in minutes from HTML body (~200 wpm)
     */
    _getReadingTimeMinutes: function(html) {
      if (!html || typeof html !== 'string') return 0;
      var div = document.createElement('div');
      div.innerHTML = html;
      var text = (div.textContent || div.innerText || '').replace(/\s+/g, ' ').trim();
      var words = text ? text.split(/\s+/).length : 0;
      return Math.max(1, Math.ceil(words / 200));
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
     * Strip HTML to plain text
     */
    _stripHtml: function(html) {
      if (!html || typeof html !== 'string') return '';
      var div = document.createElement('div');
      div.innerHTML = html;
      return (div.textContent || div.innerText || '').replace(/\s+/g, ' ').trim();
    },

    /**
     * Exact substring search over posts: titles, excerpts, and body text (case-insensitive)
     */
    _searchPosts: function(items, query) {
      if (!query || typeof query !== 'string') return items;
      var q = query.toLowerCase();
      var results = [];
      for (var i = 0; i < items.length; i++) {
        var post = items[i];
        var title = (post.title || '').toLowerCase();
        var excerpt = (post.excerpt || '').toLowerCase();
        var bodyText = this._stripHtml(post.body || '').toLowerCase();
        var searchable = title + ' ' + excerpt + ' ' + bodyText;
        if (searchable.indexOf(q) !== -1) results.push(post);
      }
      return results;
    },

    /**
     * Get category names for a post (supports category, categories array, objects with title/name)
     */
    _getPostCategories: function(post) {
      if (!post) return [];
      var cats = [];
      if (post.category) {
        cats.push(String(post.category));
      }
      if (post.categories && Array.isArray(post.categories)) {
        for (var i = 0; i < post.categories.length; i++) {
          var c = post.categories[i];
          var name = typeof c === 'string' ? c : (c && (c.title || c.name)) ? String(c.title || c.name) : null;
          if (name && cats.indexOf(name) === -1) cats.push(name);
        }
      }
      return cats;
    },

    /**
     * Filter posts by category name (case-insensitive)
     */
    _filterPostsByCategory: function(items, categoryName) {
      if (!categoryName || typeof categoryName !== 'string') return items;
      var q = categoryName.toLowerCase();
      var results = [];
      for (var i = 0; i < items.length; i++) {
        var post = items[i];
        var cats = this._getPostCategories(post);
        for (var j = 0; j < cats.length; j++) {
          if (cats[j].toLowerCase() === q) {
            results.push(post);
            break;
          }
        }
      }
      return results;
    },

    /**
     * Inline SVG icons for share links (avoids CORS when renderer runs in cross-origin iframe)
     */
    _shareIconSvg: function(platform) {
      var w = 20; var h = 20;
      var svgs = {
        facebook: '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>',
        instagram: '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>',
        x: '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>',
        reddit: '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.88-7.004 4.88-3.874 0-7.004-2.186-7.004-4.88 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/></svg>',
        linkedin: '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>',
        email: '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>',
        pinterest: '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/></svg>',
        whatsapp: '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>'
      };
      return svgs[platform] || '';
    },

    /**
     * Normalize share URL: fix double-encoding (%2520 -> %20) so shared links work correctly.
     * Decodes once then re-encodes path to ensure single-encoded form.
     */
    _normalizeShareUrl: function(url) {
      if (!url || typeof url !== 'string') return '';
      var result;
      try {
        var decoded = decodeURIComponent(url);
        if (decoded !== url && decoded.indexOf(' ') !== -1) {
          result = decoded.replace(/ /g, '%20');
        } else {
          result = url.replace(/%2520/g, '%20');
        }
      } catch (e) {
        result = url.replace(/%2520/g, '%20');
      }
      console.log('[BlogOverlay] _normalizeShareUrl: in=', JSON.stringify(url), 'out=', JSON.stringify(result));
      return result;
    },

    /**
     * Encode URL so spaces in path become %20 (fixes parsing on X, Email, Reddit)
     */
    _encodeShareUrl: function(url) {
      if (!url || typeof url !== 'string') return '';
      url = this._normalizeShareUrl(url);
      var result;
      if (url.indexOf(' ') === -1) {
        result = url;
      } else {
        try {
          if (url.indexOf('http') === 0) {
            var u = new URL(url);
            var segments = u.pathname.split('/').filter(Boolean);
            var encoded = segments.map(function(s) { return encodeURIComponent(s); }).join('/');
            result = u.origin + '/' + encoded + (u.search || '') + (u.hash || '');
          } else {
            result = url.replace(/ /g, '%20');
          }
        } catch (e) {
          result = url.replace(/ /g, '%20');
        }
      }
      console.log('[BlogOverlay] _encodeShareUrl: in=', JSON.stringify(url), 'out=', JSON.stringify(result));
      return result;
    },

    /**
     * Create share link elements for enabled platforms (uses inline SVG to avoid CORS).
     * Passes raw URL so browser encodes once when navigating - avoids double-encoding.
     * @param {string} shareUrl - URL to share
     * @param {string} title - Post title for description
     * @param {string[]} platforms - Platform keys
     * @param {string} baseUrl - Base URL (unused)
     * @param {string} [imageUrl] - Optional image URL for Pinterest
     */
    _createShareLinks: function(shareUrl, title, platforms, baseUrl, imageUrl) {
      if (!platforms || platforms.length === 0) return null;
      console.log('[BlogOverlay] _createShareLinks: shareUrl (input)=', JSON.stringify(shareUrl));
      var normalized = this._normalizeShareUrl(shareUrl || '');
      var encodedShareUrl = this._encodeShareUrl(normalized);
      console.log('[BlogOverlay] _createShareLinks: normalized=', JSON.stringify(normalized), 'encodedShareUrl=', JSON.stringify(encodedShareUrl));
      var encTitle = encodeURIComponent(title || '');
      var wrap = document.createElement('div');
      wrap.className = 'blog-overlay-share-links';
      wrap.style.display = 'flex';
      wrap.style.gap = '8px';
      wrap.style.alignItems = 'center';
      wrap.setAttribute('aria-label', 'Share');
      for (var p = 0; p < platforms.length; p++) {
        var platform = platforms[p];
        var href = '';
        if (platform === 'facebook') href = 'https://www.facebook.com/sharer/sharer.php?u=' + encodedShareUrl;
        else if (platform === 'instagram') href = 'https://www.instagram.com/';
        else if (platform === 'x') href = 'https://twitter.com/intent/tweet?url=' + encodedShareUrl + '&text=' + encTitle;
        else if (platform === 'email') {
          href = 'mailto:?subject=' + encTitle + '&body=' + encodedShareUrl;
          console.log('[BlogOverlay] _createShareLinks: email body (raw, browser will encode)=', encodedShareUrl);
        }
        else if (platform === 'reddit') href = 'https://reddit.com/submit?url=' + encodedShareUrl + '&title=' + encTitle;
        else if (platform === 'linkedin') href = 'https://www.linkedin.com/sharing/share-offsite/?url=' + encodedShareUrl;
        else if (platform === 'pinterest') {
          href = 'https://pinterest.com/pin/create/button/?url=' + encodedShareUrl + '&description=' + encTitle + (imageUrl ? '&media=' + imageUrl : '');
        }
        else if (platform === 'whatsapp') href = 'https://api.whatsapp.com/send?text=' + encodedShareUrl;
        else continue;
        console.log('[BlogOverlay] _createShareLinks: platform=', platform, 'href (first 120 chars)=', href ? href.substring(0, 120) + (href.length > 120 ? '...' : '') : '');
        var a = document.createElement('a');
        a.href = href;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.setAttribute('aria-label', 'Share on ' + (platform === 'x' ? 'X' : platform === 'whatsapp' ? 'WhatsApp' : platform.charAt(0).toUpperCase() + platform.slice(1)));
        var svg = this._shareIconSvg(platform);
        if (svg) {
          a.style.color = '#666';
          a.innerHTML = svg;
        }
        wrap.appendChild(a);
      }
      return wrap.childNodes.length > 0 ? wrap : null;
    },

    /**
     * Get absolute URL for a post (uses post.fullUrl from Squarespace).
     * Normalizes double-encoding (%2520 -> %20) so links and native share work correctly.
     */
    _getPostUrl: function(post) {
      var rawUrl = post.fullUrl || '';
      if (!rawUrl) return '';
      var url = this._normalizeShareUrl(rawUrl);
      if (url.indexOf('http') === 0) {
        console.log('[BlogOverlay] _getPostUrl: post.fullUrl=', JSON.stringify(rawUrl), 'returned=', JSON.stringify(url));
        return url;
      }
      var origin = typeof window !== 'undefined' ? window.location.origin : '';
      var result = origin + (url.charAt(0) === '/' ? '' : '/') + url;
      console.log('[BlogOverlay] _getPostUrl: post.fullUrl=', JSON.stringify(rawUrl), 'returned=', JSON.stringify(result));
      return result;
    },

    /**
     * Get blog index URL (for "Back to list" link)
     */
    _getBlogIndexUrl: function() {
      if (typeof window === 'undefined') return '';
      var blogPath = this.config && this.config.blogPath;
      if (!blogPath || blogPath === '/') {
        var first = this.items && this.items[0];
        if (first && first.fullUrl) {
          var u = first.fullUrl;
          var pathPart = u.indexOf('http') === 0 ? new URL(u).pathname : (u.charAt(0) === '/' ? u : '/' + u);
          var lastSlash = pathPart.lastIndexOf('/');
          blogPath = lastSlash > 0 ? pathPart.slice(0, lastSlash) : '/blog';
        } else {
          blogPath = '/blog';
        }
      }
      return window.location.origin + blogPath + (window.location.search || '');
    },

    /**
     * Normalize path for comparison (decode to handle %20 vs space mismatch)
     */
    _normalizePathForMatch: function(p) {
      if (!p || typeof p !== 'string') return '';
      var s = p.replace(/\/+$/, '') || '/';
      try {
        return decodeURIComponent(s);
      } catch (e) {
        return s;
      }
    },

    /**
     * Get selected post index from current path (matches post.fullUrl). Returns -1 for list view.
     */
    _getSelectedIndexFromPath: function(items) {
      if (!items || items.length === 0 || typeof window === 'undefined') return -1;
      var pathname = (window.location.pathname || '/').replace(/\/+$/, '') || '/';
      var pathnameNorm = this._normalizePathForMatch(pathname);
      for (var i = 0; i < items.length; i++) {
        var postUrl = items[i].fullUrl || '';
        if (!postUrl) continue;
        var postPath;
        try {
          postPath = postUrl.indexOf('http') === 0 ? new URL(postUrl).pathname : (postUrl.charAt(0) === '/' ? postUrl : '/' + postUrl);
        } catch (e) {
          postPath = postUrl.charAt(0) === '/' ? postUrl : '/' + postUrl;
        }
        postPath = postPath.replace(/\/+$/, '') || '/';
        var postPathNorm = this._normalizePathForMatch(postPath);
        if (pathnameNorm === postPathNorm) {
          console.log('[BlogOverlay] _getSelectedIndexFromPath: matched pathname', pathnameNorm, 'to post', i);
          return i;
        }
      }
      if (pathname.indexOf('/') !== pathname.lastIndexOf('/')) {
        console.log('[BlogOverlay] _getSelectedIndexFromPath: no match. pathname=', JSON.stringify(pathname), 'pathnameNorm=', JSON.stringify(pathnameNorm), 'first post fullUrl=', items[0] ? JSON.stringify(items[0].fullUrl) : '');
      }
      return -1;
    },

    /**
     * Get selected post index from hash (#post-0, etc). Returns -1 for list view. Fallback for legacy links.
     */
    _getSelectedIndexFromHash: function() {
      var hash = (window.location.hash || '').replace(/^#/, '');
      if (!hash || hash.indexOf('post-') !== 0) return -1;
      var idx = parseInt(hash.slice(5), 10);
      return isNaN(idx) ? -1 : idx;
    },

    /**
     * Get selected post index: path first (actual post URLs), then hash (legacy)
     */
    _getSelectedIndex: function(items) {
      var fromPath = this._getSelectedIndexFromPath(items);
      if (fromPath >= 0) return fromPath;
      return this._getSelectedIndexFromHash();
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
          var website = json && json.website ? json.website : (json && json.websiteSettings ? { title: json.websiteSettings.title } : null);
          var collection = json && json.collection ? json.collection : null;
          self._blogMeta = {
            siteTitle: (website && website.title) ? String(website.title) : '',
            blogName: (collection && (collection.title || collection.navigationTitle)) ? String(collection.title || collection.navigationTitle) : 'Blog'
          };
          self._renderContent(items);
          console.log('[BlogOverlay] Rendered', items.length, 'posts from blog JSON');
        })
        .catch(function(err) {
          console.error('[BlogOverlay] Failed to fetch blog JSON:', err);
        });
    },

    _updateTocHighlight: function() {
      var tocLinks = document.querySelectorAll('.blog-overlay-toc a');
      if (!tocLinks.length) return;

      var headingLinks = document.querySelectorAll('.blog-overlay-toc a[data-heading-index]');
      if (headingLinks.length > 0) {
        var viewportTop = 120;
        var activeIdx = -1;
        for (var hi = headingLinks.length - 1; hi >= 0; hi--) {
          var headingEl = document.getElementById('toc-' + hi);
          if (headingEl) {
            var rect = headingEl.getBoundingClientRect();
            if (rect.top <= viewportTop) {
              activeIdx = hi;
              break;
            }
          }
        }
        if (activeIdx < 0) activeIdx = 0;
        for (var hj = 0; hj < headingLinks.length; hj++) {
          var idx = parseInt(headingLinks[hj].getAttribute('data-heading-index'), 10);
          if (idx === activeIdx) {
            headingLinks[hj].classList.add('blog-overlay-toc-active');
            headingLinks[hj].style.fontWeight = '600';
            headingLinks[hj].style.color = '#333';
          } else {
            headingLinks[hj].classList.remove('blog-overlay-toc-active');
            headingLinks[hj].style.fontWeight = '';
            headingLinks[hj].style.color = '';
          }
        }
        return;
      }

      var articles = document.querySelectorAll('#blog-overlay-list article');
      var postLinks = document.querySelectorAll('.blog-overlay-toc a[data-post-index]');
      if (!articles.length || !postLinks.length) return;

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

      for (var j = 0; j < postLinks.length; j++) {
        var idx = parseInt(postLinks[j].getAttribute('data-post-index'), 10);
        if (idx === activeIndex) {
          postLinks[j].classList.add('blog-overlay-toc-active');
          postLinks[j].style.fontWeight = '600';
          postLinks[j].style.color = '#333';
        } else {
          postLinks[j].classList.remove('blog-overlay-toc-active');
          postLinks[j].style.fontWeight = '';
          postLinks[j].style.color = '';
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
        var tocTarget = this._tocScrollTarget || window;
        tocTarget.removeEventListener('scroll', this._tocScrollHandler, { passive: true });
        this._tocScrollHandler = null;
        this._tocScrollTarget = null;
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

      var baseCfg = this.config || {};
      var selectedIndex = this._getSelectedIndex(items);
      var searchQuery = this._searchQuery || '';
      var hasSearchQuery = searchQuery.trim().length > 0;
      var categoryFilter = this._categoryFilter || '';
      var hasCategoryFilter = categoryFilter.trim().length > 0;
      var baseItems = hasSearchQuery ? this._searchPosts(items, searchQuery) : items;
      var filteredItems = hasCategoryFilter ? this._filterPostsByCategory(baseItems, categoryFilter) : baseItems;
      var displayItems = (selectedIndex >= 0 && selectedIndex < items.length && !hasSearchQuery && !hasCategoryFilter)
        ? [items[selectedIndex]]
        : filteredItems;
      var isSinglePost = displayItems.length === 1 && selectedIndex >= 0 && !hasSearchQuery && !hasCategoryFilter;
      var levelCfg = isSinglePost ? (baseCfg.postConfig && typeof baseCfg.postConfig === 'object' ? baseCfg.postConfig : baseCfg) : (baseCfg.collectionConfig && typeof baseCfg.collectionConfig === 'object' ? baseCfg.collectionConfig : baseCfg);
      var cfg = Object.assign({}, baseCfg, levelCfg);
      var recentPostsCount = Math.max(1, Math.min(50, parseInt(cfg.recentPostsCount, 10) || 5));
      var leftSidebarCfg = cfg.leftSidebar && typeof cfg.leftSidebar === 'object' ? cfg.leftSidebar : null;
      var rightSidebarCfg = cfg.rightSidebar && typeof cfg.rightSidebar === 'object' ? cfg.rightSidebar : null;
      var headerContentCfg = cfg.headerContent && typeof cfg.headerContent === 'object' ? cfg.headerContent : null;
      var useLevelConfig = (baseCfg.collectionConfig && typeof baseCfg.collectionConfig === 'object') || (baseCfg.postConfig && typeof baseCfg.postConfig === 'object');
      var showTableOfContents = Boolean(cfg.showTableOfContents);
      var tableOfContentsPosition = (cfg.tableOfContentsPosition === 'right') ? 'right' : 'left';
      var showRecentPostsSidebar = Boolean(cfg.showRecentPostsSidebar);
      var sidebarPosition = (cfg.sidebarPosition === 'right') ? 'right' : 'left';
      if (!useLevelConfig) {
        if (!leftSidebarCfg && cfg.showTableOfContents) {
          leftSidebarCfg = cfg.tableOfContentsPosition === 'left' ? { show: true, modules: ['tableOfContents'], width: 200 } : null;
        }
        if (!rightSidebarCfg && cfg.showTableOfContents) {
          rightSidebarCfg = cfg.tableOfContentsPosition === 'right' ? { show: true, modules: ['tableOfContents'], width: 200 } : null;
        }
        if (!leftSidebarCfg && cfg.showRecentPostsSidebar) {
          leftSidebarCfg = cfg.sidebarPosition === 'left' ? { show: true, modules: ['recentPosts'], width: 220 } : leftSidebarCfg;
        }
        if (!rightSidebarCfg && cfg.showRecentPostsSidebar) {
          rightSidebarCfg = cfg.sidebarPosition === 'right' ? { show: true, modules: ['recentPosts'], width: 220 } : rightSidebarCfg;
        }
      } else {
        if (!leftSidebarCfg) leftSidebarCfg = { show: false, modules: [], width: 240 };
        if (!rightSidebarCfg) rightSidebarCfg = { show: false, modules: [], width: 240 };
      }
      var showDate = Boolean(cfg.showDate);
      var showAuthor = Boolean(cfg.showAuthor);
      var showReadingTime = Boolean(cfg.showReadingTime);
      var fiCfg = cfg.featuredImage && typeof cfg.featuredImage === 'object' ? cfg.featuredImage : {};

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
      var pb = cfg.progressBar && typeof cfg.progressBar === 'object' ? cfg.progressBar : {};
      var showProgressBar = Boolean(pb.show ?? cfg.showProgressBar);
      var progressBarPosition = (pb.position === 'bottom' || cfg.progressBarPosition === 'bottom') ? 'bottom' : 'top';
      var progressBarThickness = Math.min(12, Math.max(2, parseInt(pb.thickness || cfg.progressBarThickness, 10) || 6));
      var progressBarColor = (typeof (pb.color || cfg.progressBarColor) === 'string' && /^#[0-9A-Fa-f]{6}$/.test(pb.color || cfg.progressBarColor || '')) ? (pb.color || cfg.progressBarColor) : '#5B4FE8';
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
        backLink.href = self._getBlogIndexUrl();
        backLink.textContent = '← Back to list';
        backLink.style.display = 'inline-block';
        backLink.style.marginBottom = '16px';
        backLink.style.textDecoration = 'none';
        backLink.style.fontSize = '0.9rem';
        main.appendChild(backLink);
      }

      function createTocModule(sidebarWidth) {
        if (items.length === 0) return null;
        var el = document.createElement('nav');
        el.className = 'blog-overlay-toc';
        el.style.flexShrink = '0';
        el.style.width = (sidebarWidth || 200) + 'px';
        el.style.padding = '12px';
        el.style.background = '#f5f5f5';
        el.style.borderRadius = '8px';
        el.style.position = 'sticky';
        el.style.top = '16px';
        el.style.alignSelf = 'flex-start';
        var tocTitle = document.createElement('div');
        tocTitle.textContent = 'Table of Contents';
        tocTitle.style.fontWeight = '600';
        tocTitle.style.marginBottom = '8px';
        tocTitle.style.fontSize = '0.9rem';
        el.appendChild(tocTitle);

        if (isSinglePost && selectedIndex >= 0 && selectedIndex < items.length) {
          var post = items[selectedIndex];
          var bodyHtml = post.body || '';
          var parseDiv = document.createElement('div');
          parseDiv.innerHTML = bodyHtml;
          var headings = parseDiv.querySelectorAll('h1, h2, h3, h4, h5, h6');
          if (headings.length > 0) {
            for (var hi = 0; hi < headings.length; hi++) {
              var h = headings[hi];
              var level = parseInt(h.tagName.charAt(1), 10);
              var tocLink = document.createElement('a');
              tocLink.href = '#toc-' + hi;
              tocLink.setAttribute('data-heading-index', String(hi));
              tocLink.textContent = (h.textContent || '').trim() || 'Section ' + (hi + 1);
              tocLink.style.display = 'block';
              tocLink.style.padding = '4px 0';
              tocLink.style.fontSize = level <= 2 ? '0.85rem' : '0.8rem';
              tocLink.style.textDecoration = 'none';
              tocLink.style.lineHeight = '1.3';
              tocLink.style.paddingLeft = ((level - 1) * 8) + 'px';
              el.appendChild(tocLink);
            }
          } else {
            var titleLink = document.createElement('a');
            titleLink.href = '#toc-0';
            titleLink.textContent = post.title || 'Untitled';
            titleLink.style.display = 'block';
            titleLink.style.padding = '4px 0';
            titleLink.style.fontSize = '0.85rem';
            titleLink.style.textDecoration = 'none';
            titleLink.style.lineHeight = '1.3';
            el.appendChild(titleLink);
          }
          self._tocScrollHandler = function() { self._updateTocHighlight(); };
          var scrollTarget = self._getScrollContainer() || window;
          scrollTarget.addEventListener('scroll', self._tocScrollHandler, { passive: true });
          self._tocScrollTarget = scrollTarget;
          requestAnimationFrame(function() { self._updateTocHighlight(); });
          return el;
        }

        for (var i = 0; i < items.length; i++) {
          var tocItem = items[i];
          var tocUrl = self._getPostUrl(tocItem);
          var tocLink = document.createElement('a');
          tocLink.href = tocUrl || '#post-' + i;
          tocLink.setAttribute('data-post-index', String(i));
          tocLink.textContent = tocItem.title || 'Untitled';
          tocLink.style.display = 'block';
          tocLink.style.padding = '4px 0';
          tocLink.style.fontSize = '0.85rem';
          tocLink.style.textDecoration = 'none';
          tocLink.style.lineHeight = '1.3';
          el.appendChild(tocLink);
        }
        self._tocScrollHandler = function() { self._updateTocHighlight(); };
        var scrollTarget = self._getScrollContainer() || window;
        scrollTarget.addEventListener('scroll', self._tocScrollHandler, { passive: true });
        self._tocScrollTarget = scrollTarget;
        requestAnimationFrame(function() { self._updateTocHighlight(); });
        return el;
      }
      function createRecentPostsModule(sidebarWidth) {
        if (items.length === 0) return null;
        var el = document.createElement('aside');
        el.className = 'blog-overlay-recent-posts';
        el.style.flexShrink = '0';
        el.style.width = (sidebarWidth || 220) + 'px';
        el.style.padding = '12px';
        el.style.background = '#f5f5f5';
        el.style.borderRadius = '8px';
        el.style.position = 'sticky';
        el.style.top = '16px';
        el.style.alignSelf = 'flex-start';
        var rpTitle = document.createElement('div');
        rpTitle.textContent = 'Recent Posts';
        rpTitle.style.fontWeight = '600';
        rpTitle.style.marginBottom = '8px';
        rpTitle.style.fontSize = '0.9rem';
        el.appendChild(rpTitle);
        var recentItems = items.slice(0, recentPostsCount);
        for (var r = 0; r < recentItems.length; r++) {
          var rpPost = recentItems[r];
          var rpUrl = self._getPostUrl(rpPost);
          var rpEntry = document.createElement('div');
          rpEntry.style.marginBottom = '12px';
          var rpLink = document.createElement('a');
          rpLink.href = rpUrl || '#post-' + r;
          rpLink.textContent = rpPost.title || 'Untitled';
          rpLink.style.display = 'block';
          rpLink.style.fontSize = '0.9rem';
          rpLink.style.fontWeight = '500';
          rpLink.style.textDecoration = 'none';
          rpLink.style.marginBottom = '4px';
          rpEntry.appendChild(rpLink);
          var rpExcerpt = document.createElement('div');
          rpExcerpt.textContent = self._truncateText(rpPost.body || rpPost.excerpt || '', 120);
          rpExcerpt.style.fontSize = '0.8rem';
          rpExcerpt.style.color = '#666';
          rpExcerpt.style.lineHeight = '1.4';
          rpEntry.appendChild(rpExcerpt);
          el.appendChild(rpEntry);
        }
        return el;
      }
      function createRelevantPostsModule(sidebarWidth) {
        if (items.length === 0) return null;
        var el = document.createElement('aside');
        el.className = 'blog-overlay-relevant-posts';
        el.style.flexShrink = '0';
        el.style.width = (sidebarWidth || 220) + 'px';
        el.style.padding = '12px';
        el.style.background = '#f5f5f5';
        el.style.borderRadius = '8px';
        el.style.position = 'sticky';
        el.style.top = '16px';
        el.style.alignSelf = 'flex-start';
        var rpTitle = document.createElement('div');
        rpTitle.textContent = 'Relevant Posts';
        rpTitle.style.fontWeight = '600';
        rpTitle.style.marginBottom = '8px';
        rpTitle.style.fontSize = '0.9rem';
        el.appendChild(rpTitle);
        var relevantItems = isSinglePost && selectedIndex >= 0 ? items.filter(function(_, i) { return i !== selectedIndex; }).slice(0, 5) : items.slice(0, 5);
        for (var r = 0; r < relevantItems.length; r++) {
          var rpIdx = items.indexOf(relevantItems[r]);
          if (rpIdx < 0) continue;
          var rpPost = relevantItems[r];
          var rpUrl = self._getPostUrl(rpPost);
          var rpEntry = document.createElement('div');
          rpEntry.style.marginBottom = '12px';
          var rpLink = document.createElement('a');
          rpLink.href = rpUrl || '#post-' + rpIdx;
          rpLink.textContent = rpPost.title || 'Untitled';
          rpLink.style.display = 'block';
          rpLink.style.fontSize = '0.9rem';
          rpLink.style.fontWeight = '500';
          rpLink.style.textDecoration = 'none';
          rpEntry.appendChild(rpLink);
          el.appendChild(rpEntry);
        }
        return el;
      }
      function buildSidebarModules(sidebarCfg) {
        if (!sidebarCfg || !sidebarCfg.show || !Array.isArray(sidebarCfg.modules) || sidebarCfg.modules.length === 0) return [];
        var width = Math.min(400, Math.max(160, sidebarCfg.width || 240));
        var mods = [];
        for (var m = 0; m < sidebarCfg.modules.length; m++) {
          var mod = sidebarCfg.modules[m];
          var el = null;
          if (mod === 'tableOfContents') el = createTocModule(width);
          else if (mod === 'recentPosts') el = createRecentPostsModule(width);
          else if (mod === 'relevantPosts') el = createRelevantPostsModule(width);
          else if (mod === 'searchPosts' || mod === 'postSearch') {
            var searchWrap = document.createElement('div');
            searchWrap.style.width = '100%';
            var searchInput = document.createElement('input');
            searchInput.type = 'text';
            searchInput.placeholder = 'Search posts…';
            searchInput.setAttribute('aria-label', 'Search posts');
            searchInput.value = self._searchQuery || '';
            searchInput.style.width = '100%';
            searchInput.style.padding = '8px 12px';
            searchInput.style.fontSize = '0.9rem';
            searchInput.style.border = '1px solid #ddd';
            searchInput.style.borderRadius = '6px';
            searchInput.style.outline = 'none';
            searchInput.style.boxSizing = 'border-box';
            searchInput.onfocus = function() { searchInput.style.borderColor = '#5B4FE8'; searchInput.style.boxShadow = '0 0 0 2px rgba(91,79,232,0.2)'; };
            searchInput.onblur = function() { searchInput.style.borderColor = '#ddd'; searchInput.style.boxShadow = ''; };
            searchInput.oninput = function() { self._searchQuery = searchInput.value; self._focusSearchInput = true; self._renderContent(self.items); };
            searchInput.onkeydown = function(e) { if (e.key === 'Escape') { searchInput.value = ''; self._searchQuery = ''; self._renderContent(self.items); searchInput.blur(); } };
            searchInput.className = 'blog-overlay-search-input';
            searchWrap.appendChild(searchInput);
            el = searchWrap;
          } else if (mod === 'filterByCategory' || mod === 'filterByTag' || mod === 'filterByTagsAndCategories') {
            var ph = document.createElement('span');
            ph.style.fontSize = '0.8rem';
            ph.style.color = '#999';
            ph.textContent = 'Filter by Tags & Categories (coming soon)';
            el = ph;
          }
          if (el) mods.push(el);
        }
        return mods;
      }
      var leftModules = buildSidebarModules(leftSidebarCfg);
      var rightModules = buildSidebarModules(rightSidebarCfg);

          for (var j = 0; j < displayItems.length; j++) {
            var post = displayItems[j];
            var postIndex = isSinglePost ? selectedIndex : items.indexOf(post);
            var fiShow = Boolean(fiCfg.show !== false);
            var fiLayout = fiCfg.layoutMode === 'fullBleed' ? 'fullBleed' : fiCfg.layoutMode === 'rightJustified' ? 'rightJustified' : 'leftJustified';
            var fiImageWidth = Math.min(60, Math.max(25, parseInt(fiCfg.imageWidthPercent, 10) || 40));
            var fiAspect = fiCfg.aspectBehavior === 'cropped' ? 'cropped' : 'original';
            var fiRatio = (fiCfg.aspectRatio === '3:2' ? '3:2' : fiCfg.aspectRatio === '1:1' ? '1:1' : '16:9');
            var fiRounded = (fiCfg.roundedCorners === 'small' ? 'small' : fiCfg.roundedCorners === 'large' ? 'large' : 'off');
            var fiShadow = Boolean(fiCfg.shadow);
            var fiCaption = Boolean(fiCfg.showCaption !== false);
            var fiSpacing = (fiCfg.verticalSpacing === 'tight' ? 'tight' : fiCfg.verticalSpacing === 'spacious' ? 'spacious' : 'normal');
            var article = document.createElement('article');
            article.id = 'blog-post-' + j;
            article.style.marginBottom = '24px';
            article.style.paddingBottom = '24px';
            article.style.borderBottom = '1px solid #eee';
            if (navbarOffset > 0) {
              article.style.scrollMarginTop = (navbarOffset + 8) + 'px';
            }

            var imgUrl = post.assetUrl || post.thumbnailUrl || (post.assets && post.assets[0] && post.assets[0].assetUrl) || null;
            var imgCaption = (post.asset && post.asset.caption) ? post.asset.caption : (post.caption || null);
            var isSideBySide = (fiLayout === 'leftJustified' || fiLayout === 'rightJustified') && fiShow && imgUrl;
            var rowEl = null;
            var contentEl = null;
            if (isSideBySide) {
              rowEl = document.createElement('div');
              rowEl.style.display = 'flex';
              rowEl.style.flexDirection = fiLayout === 'rightJustified' ? 'row-reverse' : 'row';
              rowEl.style.gap = '20px';
              rowEl.style.alignItems = 'flex-start';
              rowEl.style.marginBottom = (fiSpacing === 'tight' ? '12px' : fiSpacing === 'spacious' ? '28px' : '20px');
              contentEl = document.createElement('div');
              contentEl.style.flex = '1';
              contentEl.style.minWidth = '0';
            }
            if (fiShow && imgUrl) {
              var fiWrap = document.createElement('div');
              fiWrap.className = 'blog-overlay-featured-image';
              if (fiLayout === 'fullBleed') {
                fiWrap.style.marginBottom = (fiSpacing === 'tight' ? '12px' : fiSpacing === 'spacious' ? '28px' : '20px');
                fiWrap.style.marginLeft = '-16px';
                fiWrap.style.marginRight = '-16px';
                fiWrap.style.width = 'calc(100% + 32px)';
              } else if (isSideBySide) {
                fiWrap.style.flex = '0 0 ' + fiImageWidth + '%';
                fiWrap.style.minWidth = '0';
              }
              var fiInner = document.createElement('div');
              fiInner.style.overflow = 'hidden';
              fiInner.style.position = 'relative';
              if (fiRounded === 'small') fiInner.style.borderRadius = '6px';
              else if (fiRounded === 'large') fiInner.style.borderRadius = '12px';
              if (fiShadow) fiInner.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
              if (fiAspect === 'cropped') {
                fiInner.style.aspectRatio = fiRatio.replace(':', ' / ');
                fiInner.style.width = '100%';
              }
              var img = document.createElement('img');
              img.src = imgUrl;
              img.alt = post.title || '';
              img.style.width = '100%';
              img.style.height = '100%';
              img.style.display = 'block';
              img.style.objectFit = fiAspect === 'cropped' ? 'cover' : 'contain';
              img.style.objectPosition = 'center';
              fiInner.appendChild(img);
              fiWrap.appendChild(fiInner);
              if (fiCaption && imgCaption) {
                var capEl = document.createElement('div');
                capEl.className = 'blog-overlay-featured-caption';
                capEl.textContent = imgCaption;
                capEl.style.fontSize = '0.85rem';
                capEl.style.color = '#666';
                capEl.style.marginTop = '6px';
                capEl.style.fontStyle = 'italic';
                fiWrap.appendChild(capEl);
              }
              if (isSideBySide) {
                rowEl.appendChild(fiWrap);
              } else {
                article.appendChild(fiWrap);
              }
            }

            var h2 = document.createElement('h2');
            h2.className = 'blog-overlay-title';
            h2.style.margin = '0 0 8px 0';
            if (!isSinglePost) {
              var postUrl = self._getPostUrl(post);
              var titleLink = document.createElement('a');
              titleLink.href = postUrl || '#post-' + postIndex;
              titleLink.textContent = post.title || 'Untitled';
              titleLink.style.color = 'inherit';
              titleLink.style.textDecoration = 'none';
              titleLink.style.cursor = 'pointer';
              h2.appendChild(titleLink);
            } else {
              h2.textContent = post.title || 'Untitled';
            }
            var appendTo = isSideBySide ? contentEl : article;
            appendTo.appendChild(h2);

            var metaRow = document.createElement('div');
            metaRow.className = 'blog-overlay-meta-row';
            metaRow.style.display = 'flex';
            metaRow.style.justifyContent = 'space-between';
            metaRow.style.alignItems = 'center';
            metaRow.style.marginBottom = '8px';
            metaRow.style.gap = '12px';
            metaRow.style.flexWrap = 'wrap';
            var metaParts = [];
            if (showDate) {
              var dateStr = self._getDate(post);
              if (dateStr) metaParts.push(dateStr);
            }
            if (showAuthor) {
              var authorStr = self._getAuthorsForPost(post, cfg);
              if (authorStr) metaParts.push(authorStr);
            }
            if (showReadingTime) {
              var mins = self._getReadingTimeMinutes(post.body);
              metaParts.push(mins === 1 ? '1 min read' : mins + ' min read');
            }
            if (metaParts.length > 0) {
              var meta = document.createElement('div');
              meta.className = 'blog-overlay-meta';
              meta.textContent = metaParts.join(' · ');
              metaRow.appendChild(meta);
            }
            var smCfg = cfg.socialMediaLinks && typeof cfg.socialMediaLinks === 'object' ? cfg.socialMediaLinks : null;
            var showShare = smCfg && smCfg.show && Array.isArray(smCfg.platforms) && smCfg.platforms.length > 0;
            var shareUrl = self._getPostUrl(post);
            if (!shareUrl && typeof window !== 'undefined') {
              shareUrl = window.location.origin + window.location.pathname + (window.location.search || '') + '#post-' + postIndex;
            }
            if (showShare) console.log('[BlogOverlay] share link: post.fullUrl=', JSON.stringify(post.fullUrl), 'shareUrl=', JSON.stringify(shareUrl));
            var shareImageUrl = post.assetUrl || post.thumbnailUrl || (post.assets && post.assets[0] && post.assets[0].assetUrl) || null;
            var shareLinks = showShare ? self._createShareLinks(shareUrl, post.title || 'Untitled', smCfg.platforms, cfg.baseUrl, shareImageUrl) : null;
            if (shareLinks) {
              shareLinks.style.marginLeft = 'auto';
              metaRow.appendChild(shareLinks);
            }
            if (metaRow.childNodes.length > 0) appendTo.appendChild(metaRow);

            var body = document.createElement('div');
            body.className = 'blog-overlay-body';
            body.innerHTML = post.body || '';
            if (isSinglePost) {
              var headings = body.querySelectorAll('h1, h2, h3, h4, h5, h6');
              if (headings.length > 0) {
                for (var hi = 0; hi < headings.length; hi++) {
                  headings[hi].id = 'toc-' + hi;
                }
              } else {
                article.id = 'toc-0';
              }
            }
            appendTo.appendChild(body);
            if (isSideBySide) {
              rowEl.appendChild(contentEl);
              article.appendChild(rowEl);
            }
            main.appendChild(article);
          }

          if (displayItems.length === 0) {
            var empty = document.createElement('div');
            empty.textContent = 'No posts found.';
            main.appendChild(empty);
          }

          var leftSidebarWidth = leftSidebarCfg && leftSidebarCfg.width ? Math.min(400, Math.max(160, leftSidebarCfg.width)) : 240;
          var rightSidebarWidth = rightSidebarCfg && rightSidebarCfg.width ? Math.min(400, Math.max(160, rightSidebarCfg.width)) : 240;
          var leftSidebarEl = document.createElement('div');
          leftSidebarEl.style.display = 'flex';
          leftSidebarEl.style.flexDirection = 'column';
          leftSidebarEl.style.gap = '16px';
          leftSidebarEl.style.flexShrink = '0';
          leftSidebarEl.style.width = leftSidebarWidth + 'px';
          for (var lm = 0; lm < leftModules.length; lm++) leftSidebarEl.appendChild(leftModules[lm]);

          var rightSidebarEl = document.createElement('div');
          rightSidebarEl.style.display = 'flex';
          rightSidebarEl.style.flexDirection = 'column';
          rightSidebarEl.style.gap = '16px';
          rightSidebarEl.style.flexShrink = '0';
          rightSidebarEl.style.width = rightSidebarWidth + 'px';
          for (var rm = 0; rm < rightModules.length; rm++) rightSidebarEl.appendChild(rightModules[rm]);

          if (headerContentCfg && headerContentCfg.show) {
            var hcModules = Array.isArray(headerContentCfg.modules) ? headerContentCfg.modules : [];
            if (hcModules.length === 0 && (headerContentCfg.tableOfContents || headerContentCfg.breadcrumbs)) {
              if (headerContentCfg.tableOfContents) hcModules.push('tableOfContents');
              if (headerContentCfg.breadcrumbs) hcModules.push('breadcrumbs');
            }
            var headerHeight = Math.min(120, Math.max(32, parseInt(headerContentCfg.height, 10) || 48));
            if (hcModules.length > 0) {
              var headerEl = document.createElement('div');
              headerEl.className = 'blog-overlay-header-content';
              headerEl.style.marginBottom = '16px';
              headerEl.style.paddingBottom = '12px';
              headerEl.style.borderBottom = '1px solid #eee';
              headerEl.style.display = 'flex';
              headerEl.style.flexDirection = 'column';
              headerEl.style.gap = '16px';
              headerEl.style.alignItems = 'stretch';
              headerEl.style.minHeight = headerHeight + 'px';
              for (var hm = 0; hm < hcModules.length; hm++) {
                var mod = hcModules[hm];
                if (mod === 'breadcrumbs') {
                  var breadcrumbEl = document.createElement('nav');
                  breadcrumbEl.setAttribute('aria-label', 'Breadcrumb');
                  breadcrumbEl.style.fontSize = '0.85rem';
                  breadcrumbEl.style.color = '#666';
                  breadcrumbEl.style.display = 'flex';
                  breadcrumbEl.style.flexWrap = 'wrap';
                  breadcrumbEl.style.alignItems = 'center';
                  breadcrumbEl.style.gap = '2px';
                  var meta = self._blogMeta || {};
                  var siteTitle = meta.siteTitle || '';
                  var blogName = meta.blogName || 'Blog';
                  var blogIndexUrl = self._getBlogIndexUrl();
                  var sep = function() {
                    var s = document.createElement('span');
                    s.textContent = ' › ';
                    s.style.margin = '0 4px';
                    return s;
                  };
                  var makeLink = function(text, href, onClick) {
                    var a = document.createElement('a');
                    a.textContent = text;
                    a.href = href || '#';
                    a.style.textDecoration = 'none';
                    a.onclick = function(e) {
                      if (onClick) {
                        e.preventDefault();
                        onClick();
                      }
                    };
                    return a;
                  };
                  var goToBlogIndex = function() {
                    self._categoryFilter = '';
                    self._searchQuery = '';
                    if (typeof window !== 'undefined') {
                      try { window.history.replaceState(null, '', window.location.pathname + (window.location.search || '')); } catch (err) {}
                    }
                    window.location.hash = '';
                    self._renderContent(self.items);
                  };
                  if (siteTitle) {
                    breadcrumbEl.appendChild(makeLink(siteTitle, blogIndexUrl, goToBlogIndex));
                    breadcrumbEl.appendChild(sep());
                  }
                  breadcrumbEl.appendChild(makeLink(blogName, blogIndexUrl, goToBlogIndex));
                  if (isSinglePost && selectedIndex >= 0) {
                    var post = items[selectedIndex];
                    var postCats = self._getPostCategories(post);
                    if (postCats.length > 0) {
                      breadcrumbEl.appendChild(sep());
                      var catParts = postCats;
                      for (var ci = 0; ci < catParts.length; ci++) {
                        if (ci > 0) {
                          var comma = document.createElement('span');
                          comma.textContent = ', ';
                          breadcrumbEl.appendChild(comma);
                        }
                        var catName = catParts[ci];
                        breadcrumbEl.appendChild(makeLink(catName, '#', (function(cat) {
                          return function() {
                            self._categoryFilter = cat;
                            window.location.hash = '';
                            self._renderContent(self.items);
                          };
                        })(catName)));
                      }
                    }
                    breadcrumbEl.appendChild(sep());
                    var postTitle = post.title || 'Untitled';
                    var postUrl = self._getPostUrl(post);
                    if (postUrl) {
                      breadcrumbEl.appendChild(makeLink(postTitle, postUrl, null));
                    } else {
                      var span = document.createElement('span');
                      span.textContent = postTitle;
                      breadcrumbEl.appendChild(span);
                    }
                  } else if (hasCategoryFilter) {
                    breadcrumbEl.appendChild(sep());
                    var span = document.createElement('span');
                    span.textContent = categoryFilter;
                    span.setAttribute('aria-current', 'page');
                    breadcrumbEl.appendChild(span);
                  }
                  headerEl.appendChild(breadcrumbEl);
                } else if (mod === 'tableOfContents' && items.length > 0) {
                  var headerToc = createTocModule(200);
                  if (headerToc) {
                    headerToc.style.position = 'static';
                    headerToc.style.width = 'auto';
                    headerToc.style.display = 'inline-block';
                    headerEl.appendChild(headerToc);
                  }
                } else if (mod === 'postSearch' || mod === 'searchPosts') {
                  var searchWrap = document.createElement('div');
                  searchWrap.style.width = '100%';
                  searchWrap.style.maxWidth = '320px';
                  var searchInput = document.createElement('input');
                  searchInput.type = 'text';
                  searchInput.placeholder = 'Search posts…';
                  searchInput.setAttribute('aria-label', 'Search posts');
                  searchInput.value = this._searchQuery || '';
                  searchInput.style.width = '100%';
                  searchInput.style.padding = '8px 12px';
                  searchInput.style.fontSize = '0.9rem';
                  searchInput.style.border = '1px solid #ddd';
                  searchInput.style.borderRadius = '6px';
                  searchInput.style.outline = 'none';
                  searchInput.style.boxSizing = 'border-box';
                  searchInput.onfocus = function() { searchInput.style.borderColor = '#5B4FE8'; searchInput.style.boxShadow = '0 0 0 2px rgba(91,79,232,0.2)'; };
                  searchInput.onblur = function() { searchInput.style.borderColor = '#ddd'; searchInput.style.boxShadow = ''; };
                  searchInput.oninput = function() {
                    self._searchQuery = searchInput.value;
                    self._focusSearchInput = true;
                    self._renderContent(self.items);
                  };
                  searchInput.onkeydown = function(e) {
                    if (e.key === 'Escape') {
                      searchInput.value = '';
                      self._searchQuery = '';
                      self._renderContent(self.items);
                      searchInput.blur();
                    }
                  };
                  searchInput.className = 'blog-overlay-search-input';
                  searchWrap.appendChild(searchInput);
                  headerEl.appendChild(searchWrap);
                } else if (mod === 'filterByTagsAndCategories' || mod === 'filterByCategory' || mod === 'filterByTag') {
                  var placeholder = document.createElement('span');
                  placeholder.style.fontSize = '0.8rem';
                  placeholder.style.color = '#999';
                  placeholder.textContent = 'Filter by Tags & Categories (coming soon)';
                  headerEl.appendChild(placeholder);
                }
              }
              if (headerEl.childNodes.length > 0) main.insertBefore(headerEl, main.firstChild);
            }
          }

          if (leftSidebarEl.childNodes.length) wrapper.appendChild(leftSidebarEl);
          wrapper.appendChild(main);
          if (rightSidebarEl.childNodes.length) wrapper.appendChild(rightSidebarEl);

          root.prepend(wrapper);

      if (self._focusSearchInput) {
        self._focusSearchInput = false;
        var searchEl = root.querySelector('.blog-overlay-search-input');
        if (searchEl) {
          setTimeout(function() { searchEl.focus(); }, 0);
        }
      }

      if (progressTrackForPreview) {
        root.insertBefore(progressTrackForPreview, root.firstChild);
      }

      if (isSinglePost && showProgressBar) {
        requestAnimationFrame(function() {
          self._updateProgressBar();
        });
      }

      // Deferred navbar re-measure: header may load asynchronously (race condition)
      var applyNavbarOffset = function(offset) {
        if (offset <= 0 || !wrapper.parentNode) return;
        wrapper.style.paddingTop = (offset + 16) + 'px';
        var progressTrack = document.getElementById('blog-overlay-progress');
        if (progressTrack && progressTrack.style.position === 'fixed') {
          progressTrack.style.top = offset + 'px';
        }
        var articles = wrapper.querySelectorAll('article');
        for (var a = 0; a < articles.length; a++) {
          articles[a].style.scrollMarginTop = (offset + 8) + 'px';
        }
      };
      [150, 450].forEach(function(delay) {
        setTimeout(function() {
          if (!wrapper.parentNode) return;
          var newOffset = self._getNavbarOffset();
          if (newOffset > navbarOffset) applyNavbarOffset(newOffset);
        }, delay);
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
