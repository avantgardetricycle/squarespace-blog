/**
 * Squarespace Blog Overlay - Renderer Script
 *
 * This script renders the custom blog layout overlay.
 * It uses Squarespace's blog JSON data combined with user config.
 */

(function() {
  'use strict';

  function getVisitorId() {
    try {
      var key = 'bb_visitor';
      var stored = localStorage.getItem(key);
      if (stored) return stored;
      var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = (Math.random() * 16) | 0;
        var v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
      localStorage.setItem(key, uuid);
      return uuid;
    } catch (e) {
      return null;
    }
  }

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
    _categoryFilter: [],
    _tagFilter: [],
    _currentPage: 1,
    _infiniteScrollLoaded: 0,
    _lastInfiniteScrollSignature: null,
    _lastInfiniteScrollSignature: '',
    _analyticsQueue: [],
    _analyticsFlushScheduled: null,
    _analyticsSearchDebounce: null,
    _pageLoadTime: null,
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

      var self = this;
      var sendTimeOnPage = function() {
        if (self._pageLoadTime != null) {
          var elapsed = (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now()) - self._pageLoadTime;
          self._analyticsTrack('time_on_page', { seconds: Math.round(elapsed / 1000) });
          self._analyticsFlush();
          self._pageLoadTime = null;
        }
      };
      document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'hidden') sendTimeOnPage();
      });
      window.addEventListener('beforeunload', sendTimeOnPage);
      window.addEventListener('pagehide', sendTimeOnPage);

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

    _analyticsTrack: function(type, payload, postId, postIndex) {
      if (this._bbPreview || (this.config && this.config.previewMode)) return;
      var siteKey = this.config && this.config.siteKey;
      var siteId = this.config && this.config.siteId;
      if (!siteKey && !siteId) return;
      this._analyticsQueue.push({
        type: type,
        postId: postId || null,
        postIndex: postIndex != null ? postIndex : null,
        payload: payload || {}
      });
      this._analyticsScheduleFlush();
    },

    _analyticsScheduleFlush: function() {
      var self = this;
      if (this._analyticsFlushScheduled) return;
      this._analyticsFlushScheduled = setTimeout(function() {
        self._analyticsFlushScheduled = null;
        self._analyticsFlush();
      }, 5000);
    },

    _analyticsTrackSearchDebounced: function(term, resultsCount) {
      var self = this;
      if (this._analyticsSearchDebounce) clearTimeout(this._analyticsSearchDebounce);
      if (!term || typeof term !== 'string') return;
      this._analyticsSearchDebounce = setTimeout(function() {
        self._analyticsSearchDebounce = null;
        self._analyticsTrack('search', { term: term.trim(), resultsCount: resultsCount || 0 });
      }, 500);
    },

    _analyticsFlush: function() {
      if (this._analyticsQueue.length === 0) return;
      var siteKey = this.config && this.config.siteKey;
      var siteId = this.config && this.config.siteId;
      var baseUrl = this.config && this.config.baseUrl;
      if (!siteKey && !siteId) return;
      if (!baseUrl) return;
      var events = this._analyticsQueue.splice(0, this._analyticsQueue.length);
      var body = JSON.stringify({
        siteKey: siteKey || undefined,
        siteId: siteId || undefined,
        visitorId: getVisitorId(),
        events: events.map(function(e) {
          return {
            type: e.type,
            postId: e.postId,
            postIndex: e.postIndex,
            payload: e.payload
          };
        })
      });
      var url = baseUrl.replace(/\/+$/, '') + '/api/analytics/events';
      if (navigator.sendBeacon) {
        navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
      } else {
        fetch(url, { method: 'POST', body: body, headers: { 'Content-Type': 'application/json' }, keepalive: true }).catch(function() {});
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
     * Get author IDs for a post (for author profiles module)
     */
    _getAuthorIdsForPost: function(post, cfg) {
      var postId = (post && (post.id || post.fullUrl || post.title)) ? String(post.id || post.fullUrl || post.title) : null;
      var overrides = (cfg && cfg.postAuthorOverrides && typeof cfg.postAuthorOverrides === 'object') ? cfg.postAuthorOverrides : {};
      var defaultIds = Array.isArray(cfg && cfg.defaultAuthorIds) ? cfg.defaultAuthorIds : [];
      var ids = (postId && postId in overrides) ? overrides[postId] : (defaultIds.length > 0 ? defaultIds : null);
      return Array.isArray(ids) ? ids : [];
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
     * Get tag names for a post (supports tags array, tag singular, objects with title/name/slug)
     */
    _getPostTags: function(post) {
      if (!post) return [];
      var tags = [];
      if (post.tag && typeof post.tag === 'string') tags.push(post.tag);
      if (post.tags && Array.isArray(post.tags)) {
        for (var i = 0; i < post.tags.length; i++) {
          var t = post.tags[i];
          var name = typeof t === 'string' ? t : (t && (t.title || t.name || t.slug)) ? String(t.title || t.name || t.slug) : null;
          if (name && tags.indexOf(name) === -1) tags.push(name);
        }
      }
      return tags;
    },

    /**
     * Filter posts by tag names (case-insensitive, OR: match any)
     */
    _filterPostsByTag: function(items, tagNames) {
      var arr = Array.isArray(tagNames) ? tagNames : (tagNames ? [tagNames] : []);
      if (arr.length === 0) return items;
      var qSet = {};
      for (var qi = 0; qi < arr.length; qi++) {
        if (typeof arr[qi] === 'string') qSet[arr[qi].toLowerCase()] = true;
      }
      if (Object.keys(qSet).length === 0) return items;
      var results = [];
      for (var i = 0; i < items.length; i++) {
        var post = items[i];
        var tags = this._getPostTags(post);
        for (var j = 0; j < tags.length; j++) {
          if (qSet[tags[j].toLowerCase()]) {
            results.push(post);
            break;
          }
        }
      }
      return results;
    },

    /**
     * Filter posts by category names (case-insensitive, OR: match any)
     */
    _filterPostsByCategory: function(items, categoryNames) {
      var arr = Array.isArray(categoryNames) ? categoryNames : (categoryNames ? [categoryNames] : []);
      if (arr.length === 0) return items;
      var qSet = {};
      for (var qi = 0; qi < arr.length; qi++) {
        if (typeof arr[qi] === 'string') qSet[arr[qi].toLowerCase()] = true;
      }
      if (Object.keys(qSet).length === 0) return items;
      var results = [];
      for (var i = 0; i < items.length; i++) {
        var post = items[i];
        var cats = this._getPostCategories(post);
        for (var j = 0; j < cats.length; j++) {
          if (qSet[cats[j].toLowerCase()]) {
            results.push(post);
            break;
          }
        }
      }
      return results;
    },

    /**
     * Get all unique category names from items
     */
    _getAllCategories: function(items) {
      var seen = {};
      var out = [];
      for (var i = 0; i < items.length; i++) {
        var cats = this._getPostCategories(items[i]);
        for (var j = 0; j < cats.length; j++) {
          var c = cats[j];
          if (c && !seen[c]) {
            seen[c] = true;
            out.push(c);
          }
        }
      }
      return out.sort();
    },

    /**
     * Get all unique tag names from items and/or collection
     */
    _getAllTags: function(items) {
      var seen = {};
      var out = [];
      for (var i = 0; i < items.length; i++) {
        var tags = this._getPostTags(items[i]);
        for (var j = 0; j < tags.length; j++) {
          var t = tags[j];
          if (t && !seen[t]) {
            seen[t] = true;
            out.push(t);
          }
        }
      }
      var coll = this._collection;
      if (coll && coll.tags && Array.isArray(coll.tags) && out.length === 0) {
        for (var k = 0; k < coll.tags.length; k++) {
          var ct = coll.tags[k];
          var name = typeof ct === 'string' ? ct : (ct && (ct.title || ct.name)) ? String(ct.title || ct.name) : null;
          if (name && !seen[name]) {
            seen[name] = true;
            out.push(name);
          }
        }
      }
      return out.sort();
    },

    /**
     * Create Filter by Category module. placement: 'header' = pills, 'sidebar' = input + dropdown (chips).
     */
    _createFilterByCategoryModule: function(items, width, noLabel, placement) {
      var self = this;
      var categories = this._getAllCategories(items);
      var usePills = placement === 'header';

      if (usePills && categories.length >= 0) {
        var pillsWrap = document.createElement('div');
        pillsWrap.style.display = 'flex';
        pillsWrap.style.flexWrap = 'nowrap';
        pillsWrap.style.gap = '0';
        pillsWrap.style.alignItems = 'center';
        pillsWrap.style.width = '100%';
        pillsWrap.style.overflowX = 'auto';
        pillsWrap.style.minWidth = '0';
        var selected = Array.isArray(self._categoryFilter) ? self._categoryFilter.slice() : [];
        var activeVal = selected.length === 1 ? selected[0] : (selected.length > 1 ? selected[0] : null);
        var totalCount = items.length;
        var countByCat = {};
        for (var ci = 0; ci < categories.length; ci++) {
          var cname = categories[ci];
          var filtered = self._filterPostsByCategory(items, [cname]);
          countByCat[cname] = filtered.length;
        }
        function renderPills() {
          pillsWrap.innerHTML = '';
          var allBtn = document.createElement('button');
          allBtn.type = 'button';
          allBtn.textContent = 'All' + (totalCount > 0 ? ' ' + totalCount : '');
          allBtn.style.cssText = 'padding:6px 14px;font-size:0.85rem;font-weight:600;background:none;border:none;border-bottom:2px solid transparent;margin-bottom:-1px;cursor:pointer;color:#888;transition:color 0.12s,border-color 0.12s;flex-shrink:0;';
          if (!activeVal) {
            allBtn.style.color = '#111';
            allBtn.style.borderBottomColor = '#111';
          }
          allBtn.onclick = function() {
            self._categoryFilter = [];
            self._currentPage = 1;
            self._renderContent(self.items);
          };
          pillsWrap.appendChild(allBtn);
          for (var pi = 0; pi < categories.length; pi++) {
            var cat = categories[pi];
            var cnt = countByCat[cat] || 0;
            var pill = document.createElement('button');
            pill.type = 'button';
            pill.textContent = cat + (cnt > 0 ? ' ' + cnt : '');
            pill.style.cssText = 'padding:6px 14px;font-size:0.85rem;font-weight:600;background:none;border:none;border-bottom:2px solid transparent;margin-bottom:-1px;cursor:pointer;color:#888;transition:color 0.12s,border-color 0.12s;white-space:nowrap;flex-shrink:0;';
            if (activeVal === cat) {
              pill.style.color = '#111';
              pill.style.borderBottomColor = '#111';
            }
            (function(c) {
              pill.onclick = function() {
                self._categoryFilter = [c];
                self._currentPage = 1;
                self._renderContent(self.items);
              };
            })(cat);
            pillsWrap.appendChild(pill);
          }
        }
        renderPills();
        return pillsWrap;
      }

      var wrap = document.createElement('div');
      wrap.style.width = (width || 200) + 'px';
      if (!noLabel) {
        var label = document.createElement('label');
        label.textContent = 'Filter by Category';
        label.style.fontWeight = '600';
        label.style.fontSize = '0.9rem';
        label.style.marginBottom = '8px';
        label.style.display = 'block';
        wrap.appendChild(label);
      }
      var chipsWrap = document.createElement('div');
      chipsWrap.style.display = 'flex';
      chipsWrap.style.flexWrap = 'wrap';
      chipsWrap.style.gap = '6px';
      chipsWrap.style.marginBottom = '8px';
      var selected = Array.isArray(self._categoryFilter) ? self._categoryFilter.slice() : [];
      var dropContainer = document.createElement('div');
      dropContainer.style.position = 'relative';
      dropContainer.style.width = '100%';
      var triggerBtn = document.createElement('button');
      triggerBtn.type = 'button';
      triggerBtn.textContent = categories.length === 0 ? 'No filters in this blog' : 'Add filter';
      triggerBtn.style.width = '100%';
      triggerBtn.style.padding = '8px 12px';
      triggerBtn.style.fontSize = '0.9rem';
      triggerBtn.style.border = '1px solid #ddd';
      triggerBtn.style.borderRadius = '6px';
      triggerBtn.style.background = 'white';
      triggerBtn.style.cursor = 'pointer';
      triggerBtn.style.textAlign = 'left';
      triggerBtn.style.color = '#666';
      triggerBtn.style.display = 'flex';
      triggerBtn.style.alignItems = 'center';
      triggerBtn.style.justifyContent = 'space-between';
      var chevron = document.createElement('span');
      chevron.textContent = '▾';
      chevron.style.fontSize = '0.95rem';
      chevron.style.opacity = '0.6';
      triggerBtn.appendChild(chevron);
      var dropPanel = document.createElement('div');
      dropPanel.style.display = 'none';
      dropPanel.style.position = 'absolute';
      dropPanel.style.top = '100%';
      dropPanel.style.left = '0';
      dropPanel.style.right = '0';
      dropPanel.style.marginTop = '4px';
      dropPanel.style.border = '1px solid #ddd';
      dropPanel.style.borderRadius = '6px';
      dropPanel.style.background = 'white';
      dropPanel.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
      dropPanel.style.maxHeight = '200px';
      dropPanel.style.overflowY = 'auto';
      dropPanel.style.zIndex = '100';
      function updateDropdown() {
        dropPanel.innerHTML = '';
        var available = categories.filter(function(c) { return selected.indexOf(c) < 0; });
        for (var i = 0; i < available.length; i++) {
          (function(cat) {
            var opt = document.createElement('button');
            opt.type = 'button';
            opt.textContent = cat;
            opt.style.display = 'block';
            opt.style.width = '100%';
            opt.style.padding = '8px 12px';
            opt.style.fontSize = '0.9rem';
            opt.style.border = 'none';
            opt.style.background = 'none';
            opt.style.cursor = 'pointer';
            opt.style.textAlign = 'left';
            opt.onmouseover = function() { opt.style.background = 'rgba(91,79,232,0.08)'; };
            opt.onmouseout = function() { opt.style.background = 'none'; };
            opt.onclick = function() {
              selected.push(cat);
              self._categoryFilter = selected.slice();
              self._currentPage = 1;
              renderChips();
              updateDropdown();
              closeDropdown();
              self._renderContent(self.items);
            };
            dropPanel.appendChild(opt);
          })(available[i]);
        }
        if (available.length === 0) {
          var empty = document.createElement('div');
          empty.textContent = 'All selected';
          empty.style.padding = '8px 12px';
          empty.style.fontSize = '0.85rem';
          empty.style.color = '#999';
          dropPanel.appendChild(empty);
        }
      }
      function closeDropdown() {
        dropPanel.style.display = 'none';
        document.removeEventListener('click', closeDropdown);
      }
      triggerBtn.onclick = function(e) {
        e.stopPropagation();
        if (categories.length === 0) return;
        if (dropPanel.style.display === 'block') {
          closeDropdown();
        } else {
          dropPanel.style.display = 'block';
          updateDropdown();
          setTimeout(function() { document.addEventListener('click', closeDropdown); }, 0);
        }
      };
      var renderChips = function() {
        chipsWrap.innerHTML = '';
        for (var c = 0; c < selected.length; c++) {
          var chip = document.createElement('span');
          chip.style.display = 'inline-flex';
          chip.style.alignItems = 'center';
          chip.style.gap = '4px';
          chip.style.padding = '4px 8px';
          chip.style.fontSize = '0.85rem';
          chip.style.borderRadius = '6px';
          chip.style.background = 'rgba(91,79,232,0.1)';
          chip.style.color = '#5B4FE8';
          chip.textContent = selected[c];
          var btn = document.createElement('button');
          btn.type = 'button';
          btn.innerHTML = '&times;';
          btn.style.background = 'none';
          btn.style.border = 'none';
          btn.style.cursor = 'pointer';
          btn.style.fontSize = '1rem';
          btn.style.lineHeight = 1;
          btn.style.padding = '0 2px';
          btn.style.color = 'inherit';
          (function(val) {
            btn.onclick = function() {
              selected = selected.filter(function(x) { return x !== val; });
              self._categoryFilter = selected.slice();
              self._currentPage = 1;
              renderChips();
              updateDropdown();
              self._renderContent(self.items);
            };
          })(selected[c]);
          chip.appendChild(btn);
          chipsWrap.appendChild(chip);
        }
      };
      renderChips();
      updateDropdown();
      if (categories.length === 0) triggerBtn.disabled = true;
      dropContainer.appendChild(triggerBtn);
      dropContainer.appendChild(dropPanel);
      wrap.appendChild(chipsWrap);
      wrap.appendChild(dropContainer);
      return wrap;
    },

    /**
     * Create Filter by Tag module. placement: 'header' = pills, 'sidebar' = input + dropdown (chips).
     */
    _createFilterByTagModule: function(items, width, noLabel, placement) {
      var self = this;
      var tags = this._getAllTags(items);
      var usePills = placement === 'header';

      if (usePills && tags.length >= 0) {
        var pillsWrap = document.createElement('div');
        pillsWrap.style.display = 'flex';
        pillsWrap.style.flexWrap = 'nowrap';
        pillsWrap.style.gap = '0';
        pillsWrap.style.alignItems = 'center';
        pillsWrap.style.width = '100%';
        pillsWrap.style.overflowX = 'auto';
        pillsWrap.style.minWidth = '0';
        var selected = Array.isArray(self._tagFilter) ? self._tagFilter.slice() : [];
        var activeVal = selected.length === 1 ? selected[0] : (selected.length > 1 ? selected[0] : null);
        var totalCount = items.length;
        var countByTag = {};
        for (var ti = 0; ti < tags.length; ti++) {
          var tname = tags[ti];
          var filtered = self._filterPostsByTag(items, [tname]);
          countByTag[tname] = filtered.length;
        }
        function renderPills() {
          pillsWrap.innerHTML = '';
          var allBtn = document.createElement('button');
          allBtn.type = 'button';
          allBtn.textContent = 'All' + (totalCount > 0 ? ' ' + totalCount : '');
          allBtn.style.cssText = 'padding:6px 14px;font-size:0.85rem;font-weight:600;background:none;border:none;border-bottom:2px solid transparent;margin-bottom:-1px;cursor:pointer;color:#888;transition:color 0.12s,border-color 0.12s;';
          if (!activeVal) {
            allBtn.style.color = '#111';
            allBtn.style.borderBottomColor = '#111';
          }
          allBtn.onclick = function() {
            self._tagFilter = [];
            self._currentPage = 1;
            self._renderContent(self.items);
          };
          pillsWrap.appendChild(allBtn);
          for (var pi = 0; pi < tags.length; pi++) {
            var tag = tags[pi];
            var cnt = countByTag[tag] || 0;
            var pill = document.createElement('button');
            pill.type = 'button';
            pill.textContent = tag + (cnt > 0 ? ' ' + cnt : '');
            pill.style.cssText = 'padding:6px 14px;font-size:0.85rem;font-weight:600;background:none;border:none;border-bottom:2px solid transparent;margin-bottom:-1px;cursor:pointer;color:#888;transition:color 0.12s,border-color 0.12s;white-space:nowrap;';
            if (activeVal === tag) {
              pill.style.color = '#111';
              pill.style.borderBottomColor = '#111';
            }
            (function(t) {
              pill.onclick = function() {
                self._tagFilter = [t];
                self._currentPage = 1;
                self._renderContent(self.items);
              };
            })(tag);
            pillsWrap.appendChild(pill);
          }
        }
        renderPills();
        return pillsWrap;
      }

      var wrap = document.createElement('div');
      wrap.style.width = (width || 200) + 'px';
      if (!noLabel) {
        var label = document.createElement('label');
        label.textContent = 'Filter by Tag';
        label.style.fontWeight = '600';
        label.style.fontSize = '0.9rem';
        label.style.marginBottom = '8px';
        label.style.display = 'block';
        wrap.appendChild(label);
      }
      var chipsWrap = document.createElement('div');
      chipsWrap.style.display = 'flex';
      chipsWrap.style.flexWrap = 'wrap';
      chipsWrap.style.gap = '6px';
      chipsWrap.style.marginBottom = '8px';
      var selected = Array.isArray(self._tagFilter) ? self._tagFilter.slice() : [];
      var dropContainer = document.createElement('div');
      dropContainer.style.position = 'relative';
      dropContainer.style.width = '100%';
      var triggerBtn = document.createElement('button');
      triggerBtn.type = 'button';
      triggerBtn.textContent = tags.length === 0 ? 'No filters in this blog' : 'Add filter';
      triggerBtn.style.width = '100%';
      triggerBtn.style.padding = '8px 12px';
      triggerBtn.style.fontSize = '0.9rem';
      triggerBtn.style.border = '1px solid #ddd';
      triggerBtn.style.borderRadius = '6px';
      triggerBtn.style.background = 'white';
      triggerBtn.style.cursor = 'pointer';
      triggerBtn.style.textAlign = 'left';
      triggerBtn.style.color = '#666';
      triggerBtn.style.display = 'flex';
      triggerBtn.style.alignItems = 'center';
      triggerBtn.style.justifyContent = 'space-between';
      var chevron = document.createElement('span');
      chevron.textContent = '▾';
      chevron.style.fontSize = '0.95rem';
      chevron.style.opacity = '0.6';
      triggerBtn.appendChild(chevron);
      var dropPanel = document.createElement('div');
      dropPanel.style.display = 'none';
      dropPanel.style.position = 'absolute';
      dropPanel.style.top = '100%';
      dropPanel.style.left = '0';
      dropPanel.style.right = '0';
      dropPanel.style.marginTop = '4px';
      dropPanel.style.border = '1px solid #ddd';
      dropPanel.style.borderRadius = '6px';
      dropPanel.style.background = 'white';
      dropPanel.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
      dropPanel.style.maxHeight = '200px';
      dropPanel.style.overflowY = 'auto';
      dropPanel.style.zIndex = '100';
      function updateDropdown() {
        dropPanel.innerHTML = '';
        var available = tags.filter(function(t) { return selected.indexOf(t) < 0; });
        for (var i = 0; i < available.length; i++) {
          (function(tag) {
            var opt = document.createElement('button');
            opt.type = 'button';
            opt.textContent = tag;
            opt.style.display = 'block';
            opt.style.width = '100%';
            opt.style.padding = '8px 12px';
            opt.style.fontSize = '0.9rem';
            opt.style.border = 'none';
            opt.style.background = 'none';
            opt.style.cursor = 'pointer';
            opt.style.textAlign = 'left';
            opt.onmouseover = function() { opt.style.background = 'rgba(91,79,232,0.08)'; };
            opt.onmouseout = function() { opt.style.background = 'none'; };
            opt.onclick = function() {
              selected.push(tag);
              self._tagFilter = selected.slice();
              self._currentPage = 1;
              renderChips();
              updateDropdown();
              closeDropdown();
              self._renderContent(self.items);
            };
            dropPanel.appendChild(opt);
          })(available[i]);
        }
        if (available.length === 0) {
          var empty = document.createElement('div');
          empty.textContent = 'All selected';
          empty.style.padding = '8px 12px';
          empty.style.fontSize = '0.85rem';
          empty.style.color = '#999';
          dropPanel.appendChild(empty);
        }
      }
      function closeDropdown() {
        dropPanel.style.display = 'none';
        document.removeEventListener('click', closeDropdown);
      }
      triggerBtn.onclick = function(e) {
        e.stopPropagation();
        if (tags.length === 0) return;
        if (dropPanel.style.display === 'block') {
          closeDropdown();
        } else {
          dropPanel.style.display = 'block';
          updateDropdown();
          setTimeout(function() { document.addEventListener('click', closeDropdown); }, 0);
        }
      };
      var renderChips = function() {
        chipsWrap.innerHTML = '';
        for (var c = 0; c < selected.length; c++) {
          var chip = document.createElement('span');
          chip.style.display = 'inline-flex';
          chip.style.alignItems = 'center';
          chip.style.gap = '4px';
          chip.style.padding = '4px 8px';
          chip.style.fontSize = '0.85rem';
          chip.style.borderRadius = '6px';
          chip.style.background = 'rgba(91,79,232,0.1)';
          chip.style.color = '#5B4FE8';
          chip.textContent = selected[c];
          var btn = document.createElement('button');
          btn.type = 'button';
          btn.innerHTML = '&times;';
          btn.style.background = 'none';
          btn.style.border = 'none';
          btn.style.cursor = 'pointer';
          btn.style.fontSize = '1rem';
          btn.style.lineHeight = 1;
          btn.style.padding = '0 2px';
          btn.style.color = 'inherit';
          (function(val) {
            btn.onclick = function() {
              selected = selected.filter(function(x) { return x !== val; });
              self._tagFilter = selected.slice();
              self._currentPage = 1;
              renderChips();
              updateDropdown();
              self._renderContent(self.items);
            };
          })(selected[c]);
          chip.appendChild(btn);
          chipsWrap.appendChild(chip);
        }
      };
      renderChips();
      updateDropdown();
      if (tags.length === 0) triggerBtn.disabled = true;
      dropContainer.appendChild(triggerBtn);
      dropContainer.appendChild(dropPanel);
      wrap.appendChild(chipsWrap);
      wrap.appendChild(dropContainer);
      return wrap;
    },

    /**
     * Create combined Filter by Tags & Categories module (single component when both selected).
     * placement: 'header' = pills, 'sidebar' = input + dropdown (chips).
     */
    _createFilterByTagsAndCategoriesModule: function(items, width, noLabel, placement) {
      var self = this;
      var categories = this._getAllCategories(items);
      var tags = this._getAllTags(items);
      var usePills = placement === 'header';

      if (usePills && (categories.length > 0 || tags.length > 0)) {
        var pillsWrap = document.createElement('div');
        pillsWrap.style.display = 'flex';
        pillsWrap.style.flexWrap = 'nowrap';
        pillsWrap.style.gap = '0';
        pillsWrap.style.alignItems = 'center';
        pillsWrap.style.width = '100%';
        pillsWrap.style.overflowX = 'auto';
        pillsWrap.style.minWidth = '0';
        var catSelected = Array.isArray(self._categoryFilter) ? self._categoryFilter.slice() : [];
        var tagSelected = Array.isArray(self._tagFilter) ? self._tagFilter.slice() : [];
        var activeVal = (catSelected.length === 1 ? 'cat:' + catSelected[0] : null) || (tagSelected.length === 1 ? 'tag:' + tagSelected[0] : null);
        var totalCount = items.length;
        var countByCat = {};
        var countByTag = {};
        for (var ci = 0; ci < categories.length; ci++) {
          var cname = categories[ci];
          countByCat[cname] = self._filterPostsByCategory(items, [cname]).length;
        }
        for (var ti = 0; ti < tags.length; ti++) {
          var tname = tags[ti];
          countByTag[tname] = self._filterPostsByTag(items, [tname]).length;
        }
        function renderPills() {
          pillsWrap.innerHTML = '';
          var allBtn = document.createElement('button');
          allBtn.type = 'button';
          allBtn.textContent = 'All' + (totalCount > 0 ? ' ' + totalCount : '');
          allBtn.style.cssText = 'padding:6px 14px;font-size:0.85rem;font-weight:600;background:none;border:none;border-bottom:2px solid transparent;margin-bottom:-1px;cursor:pointer;color:#888;transition:color 0.12s,border-color 0.12s;flex-shrink:0;';
          if (!activeVal) {
            allBtn.style.color = '#111';
            allBtn.style.borderBottomColor = '#111';
          }
          allBtn.onclick = function() {
            self._categoryFilter = [];
            self._tagFilter = [];
            self._currentPage = 1;
            self._renderContent(self.items);
          };
          pillsWrap.appendChild(allBtn);
          for (var pi = 0; pi < categories.length; pi++) {
            var cat = categories[pi];
            var cnt = countByCat[cat] || 0;
            var pill = document.createElement('button');
            pill.type = 'button';
            pill.textContent = cat + (cnt > 0 ? ' ' + cnt : '');
            pill.style.cssText = 'padding:6px 14px;font-size:0.85rem;font-weight:600;background:none;border:none;border-bottom:2px solid transparent;margin-bottom:-1px;cursor:pointer;color:#888;transition:color 0.12s,border-color 0.12s;white-space:nowrap;flex-shrink:0;';
            if (activeVal === 'cat:' + cat) {
              pill.style.color = '#111';
              pill.style.borderBottomColor = '#111';
            }
            (function(c) {
              pill.onclick = function() {
                self._categoryFilter = [c];
                self._tagFilter = [];
                self._currentPage = 1;
                self._renderContent(self.items);
              };
            })(cat);
            pillsWrap.appendChild(pill);
          }
          for (var pj = 0; pj < tags.length; pj++) {
            var tag = tags[pj];
            var cnt = countByTag[tag] || 0;
            var pill = document.createElement('button');
            pill.type = 'button';
            pill.textContent = tag + (cnt > 0 ? ' ' + cnt : '');
            pill.style.cssText = 'padding:6px 14px;font-size:0.85rem;font-weight:600;background:none;border:none;border-bottom:2px solid transparent;margin-bottom:-1px;cursor:pointer;color:#888;transition:color 0.12s,border-color 0.12s;white-space:nowrap;flex-shrink:0;';
            if (activeVal === 'tag:' + tag) {
              pill.style.color = '#111';
              pill.style.borderBottomColor = '#111';
            }
            (function(t) {
              pill.onclick = function() {
                self._categoryFilter = [];
                self._tagFilter = [t];
                self._currentPage = 1;
                self._renderContent(self.items);
              };
            })(tag);
            pillsWrap.appendChild(pill);
          }
        }
        renderPills();
        return pillsWrap;
      }

      var wrap = document.createElement('div');
      wrap.style.width = (width || 200) + 'px';
      if (!noLabel) {
        var label = document.createElement('label');
        label.textContent = 'Filter by Tags & Categories';
        label.style.fontWeight = '600';
        label.style.fontSize = '0.9rem';
        label.style.marginBottom = '8px';
        label.style.display = 'block';
        wrap.appendChild(label);
      }
      var chipsWrap = document.createElement('div');
      chipsWrap.style.display = 'flex';
      chipsWrap.style.flexWrap = 'wrap';
      chipsWrap.style.gap = '6px';
      chipsWrap.style.marginBottom = '8px';
      var catSelected = Array.isArray(self._categoryFilter) ? self._categoryFilter.slice() : [];
      var tagSelected = Array.isArray(self._tagFilter) ? self._tagFilter.slice() : [];
      var dropContainer = document.createElement('div');
      dropContainer.style.position = 'relative';
      dropContainer.style.width = '100%';
      var triggerBtn = document.createElement('button');
      triggerBtn.type = 'button';
      triggerBtn.textContent = (categories.length === 0 && tags.length === 0) ? 'No filters in this blog' : 'Add filter';
      triggerBtn.style.width = '100%';
      triggerBtn.style.padding = '8px 12px';
      triggerBtn.style.fontSize = '0.9rem';
      triggerBtn.style.border = '1px solid #ddd';
      triggerBtn.style.borderRadius = '6px';
      triggerBtn.style.background = 'white';
      triggerBtn.style.cursor = 'pointer';
      triggerBtn.style.textAlign = 'left';
      triggerBtn.style.color = '#666';
      triggerBtn.style.display = 'flex';
      triggerBtn.style.alignItems = 'center';
      triggerBtn.style.justifyContent = 'space-between';
      var chevron = document.createElement('span');
      chevron.textContent = '▾';
      chevron.style.fontSize = '0.95rem';
      chevron.style.opacity = '0.6';
      triggerBtn.appendChild(chevron);
      var dropPanel = document.createElement('div');
      dropPanel.style.display = 'none';
      dropPanel.style.position = 'absolute';
      dropPanel.style.top = '100%';
      dropPanel.style.left = '0';
      dropPanel.style.right = '0';
      dropPanel.style.marginTop = '4px';
      dropPanel.style.border = '1px solid #ddd';
      dropPanel.style.borderRadius = '6px';
      dropPanel.style.background = 'white';
      dropPanel.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
      dropPanel.style.maxHeight = '240px';
      dropPanel.style.overflowY = 'auto';
      dropPanel.style.zIndex = '100';
      function updateDropdown() {
        dropPanel.innerHTML = '';
        var allOptions = categories.map(function(c) { return { type: 'category', name: c }; }).concat(tags.map(function(t) { return { type: 'tag', name: t }; }));
        allOptions.sort(function(a, b) { return a.name.localeCompare(b.name); });
        var hasOptions = false;
        for (var i = 0; i < allOptions.length; i++) {
          (function(item) {
            var isSel = item.type === 'category' ? catSelected.indexOf(item.name) >= 0 : tagSelected.indexOf(item.name) >= 0;
            if (isSel) return;
            var opt = document.createElement('button');
            opt.type = 'button';
            opt.textContent = item.name;
            opt.style.display = 'block';
            opt.style.width = '100%';
            opt.style.padding = '8px 12px';
            opt.style.fontSize = '0.9rem';
            opt.style.border = 'none';
            opt.style.background = 'none';
            opt.style.cursor = 'pointer';
            opt.style.textAlign = 'left';
            opt.onmouseover = function() { opt.style.background = 'rgba(91,79,232,0.08)'; };
            opt.onmouseout = function() { opt.style.background = 'none'; };
            opt.onclick = function() {
              if (item.type === 'category') {
                catSelected.push(item.name);
                self._categoryFilter = catSelected.slice();
              } else {
                tagSelected.push(item.name);
                self._tagFilter = tagSelected.slice();
              }
              self._currentPage = 1;
              renderChips();
              updateDropdown();
              closeDropdown();
              self._renderContent(self.items);
            };
            dropPanel.appendChild(opt);
            hasOptions = true;
          })(allOptions[i]);
        }
        if (!hasOptions && allOptions.length > 0) {
          var empty = document.createElement('div');
          empty.textContent = 'All selected';
          empty.style.padding = '8px 12px';
          empty.style.fontSize = '0.85rem';
          empty.style.color = '#999';
          dropPanel.appendChild(empty);
        }
      }
      function closeDropdown() {
        dropPanel.style.display = 'none';
        document.removeEventListener('click', closeDropdown);
      }
      triggerBtn.onclick = function(e) {
        e.stopPropagation();
        if (categories.length === 0 && tags.length === 0) return;
        if (dropPanel.style.display === 'block') {
          closeDropdown();
        } else {
          dropPanel.style.display = 'block';
          updateDropdown();
          setTimeout(function() { document.addEventListener('click', closeDropdown); }, 0);
        }
      };
      function renderChips() {
        catSelected = Array.isArray(self._categoryFilter) ? self._categoryFilter.slice() : [];
        tagSelected = Array.isArray(self._tagFilter) ? self._tagFilter.slice() : [];
        chipsWrap.innerHTML = '';
        function addChip(name, type, onRemove) {
          var chip = document.createElement('span');
          chip.style.display = 'inline-flex';
          chip.style.alignItems = 'center';
          chip.style.gap = '4px';
          chip.style.padding = '4px 8px';
          chip.style.fontSize = '0.85rem';
          chip.style.borderRadius = '6px';
          chip.style.background = 'rgba(91,79,232,0.1)';
          chip.style.color = '#5B4FE8';
          chip.textContent = name;
          var btn = document.createElement('button');
          btn.type = 'button';
          btn.innerHTML = '&times;';
          btn.style.background = 'none';
          btn.style.border = 'none';
          btn.style.cursor = 'pointer';
          btn.style.fontSize = '1rem';
          btn.style.lineHeight = 1;
          btn.style.padding = '0 2px';
          btn.style.color = 'inherit';
          btn.onclick = onRemove;
          chip.appendChild(btn);
          chipsWrap.appendChild(chip);
        }
        for (var c = 0; c < catSelected.length; c++) {
          (function(cat) {
            addChip(cat, 'cat', function() {
              catSelected = catSelected.filter(function(x) { return x !== cat; });
              self._categoryFilter = catSelected.slice();
              self._currentPage = 1;
              renderChips();
              updateDropdown();
              self._renderContent(self.items);
            });
          })(catSelected[c]);
        }
        for (var t = 0; t < tagSelected.length; t++) {
          (function(tag) {
            addChip(tag, 'tag', function() {
              tagSelected = tagSelected.filter(function(x) { return x !== tag; });
              self._tagFilter = tagSelected.slice();
              self._currentPage = 1;
              renderChips();
              updateDropdown();
              self._renderContent(self.items);
            });
          })(tagSelected[t]);
        }
      }
      renderChips();
      updateDropdown();
      if (categories.length === 0 && tags.length === 0) triggerBtn.disabled = true;
      dropContainer.appendChild(triggerBtn);
      dropContainer.appendChild(dropPanel);
      wrap.appendChild(chipsWrap);
      wrap.appendChild(dropContainer);
      return wrap;
    },

    /**
     * Create combined Filter by Tags & Categories module (single component).
     * placement: 'header' = pills, 'sidebar' = chips + dropdown.
     */
    _createFilterByTagsAndCategoriesModule: function(items, width, noLabel, placement) {
      var self = this;
      var categories = this._getAllCategories(items);
      var tags = this._getAllTags(items);
      var usePills = placement === 'header';

      if (usePills && (categories.length > 0 || tags.length > 0)) {
        var pillsWrap = document.createElement('div');
        pillsWrap.style.display = 'flex';
        pillsWrap.style.flexWrap = 'nowrap';
        pillsWrap.style.gap = '0';
        pillsWrap.style.alignItems = 'center';
        pillsWrap.style.width = '100%';
        pillsWrap.style.overflowX = 'auto';
        pillsWrap.style.minWidth = '0';
        var catSelected = Array.isArray(self._categoryFilter) ? self._categoryFilter.slice() : [];
        var tagSelected = Array.isArray(self._tagFilter) ? self._tagFilter.slice() : [];
        var activeCat = catSelected.length === 1 ? catSelected[0] : null;
        var activeTag = tagSelected.length === 1 ? tagSelected[0] : null;
        var activeVal = activeCat ? { type: 'category', name: activeCat } : (activeTag ? { type: 'tag', name: activeTag } : null);
        var totalCount = items.length;
        var countByCat = {};
        for (var ci = 0; ci < categories.length; ci++) {
          var cname = categories[ci];
          countByCat[cname] = self._filterPostsByCategory(items, [cname]).length;
        }
        var countByTag = {};
        for (var ti = 0; ti < tags.length; ti++) {
          var tname = tags[ti];
          countByTag[tname] = self._filterPostsByTag(items, [tname]).length;
        }
        function renderPills() {
          pillsWrap.innerHTML = '';
          var allBtn = document.createElement('button');
          allBtn.type = 'button';
          allBtn.textContent = 'All' + (totalCount > 0 ? ' ' + totalCount : '');
          allBtn.style.cssText = 'padding:6px 14px;font-size:0.85rem;font-weight:600;background:none;border:none;border-bottom:2px solid transparent;margin-bottom:-1px;cursor:pointer;color:#888;transition:color 0.12s,border-color 0.12s;';
          if (!activeVal) {
            allBtn.style.color = '#111';
            allBtn.style.borderBottomColor = '#111';
          }
          allBtn.onclick = function() {
            self._categoryFilter = [];
            self._tagFilter = [];
            self._currentPage = 1;
            self._renderContent(self.items);
          };
          pillsWrap.appendChild(allBtn);
          for (var pi = 0; pi < categories.length; pi++) {
            var cat = categories[pi];
            var cnt = countByCat[cat] || 0;
            var pill = document.createElement('button');
            pill.type = 'button';
            pill.textContent = cat + (cnt > 0 ? ' ' + cnt : '');
            pill.style.cssText = 'padding:6px 14px;font-size:0.85rem;font-weight:600;background:none;border:none;border-bottom:2px solid transparent;margin-bottom:-1px;cursor:pointer;color:#888;transition:color 0.12s,border-color 0.12s;white-space:nowrap;';
            if (activeVal && activeVal.type === 'category' && activeVal.name === cat) {
              pill.style.color = '#111';
              pill.style.borderBottomColor = '#111';
            }
            (function(c) {
              pill.onclick = function() {
                self._categoryFilter = [c];
                self._tagFilter = [];
                self._currentPage = 1;
                self._renderContent(self.items);
              };
            })(cat);
            pillsWrap.appendChild(pill);
          }
          for (var pj = 0; pj < tags.length; pj++) {
            var tag = tags[pj];
            var cnt = countByTag[tag] || 0;
            var pill = document.createElement('button');
            pill.type = 'button';
            pill.textContent = tag + (cnt > 0 ? ' ' + cnt : '');
            pill.style.cssText = 'padding:6px 14px;font-size:0.85rem;font-weight:600;background:none;border:none;border-bottom:2px solid transparent;margin-bottom:-1px;cursor:pointer;color:#888;transition:color 0.12s,border-color 0.12s;white-space:nowrap;';
            if (activeVal && activeVal.type === 'tag' && activeVal.name === tag) {
              pill.style.color = '#111';
              pill.style.borderBottomColor = '#111';
            }
            (function(t) {
              pill.onclick = function() {
                self._categoryFilter = [];
                self._tagFilter = [t];
                self._currentPage = 1;
                self._renderContent(self.items);
              };
            })(tag);
            pillsWrap.appendChild(pill);
          }
        }
        renderPills();
        return pillsWrap;
      }

      var wrap = document.createElement('div');
      wrap.style.width = (width || 200) + 'px';
      if (!noLabel) {
        var label = document.createElement('label');
        label.textContent = 'Filter by Tags & Categories';
        label.style.fontWeight = '600';
        label.style.fontSize = '0.9rem';
        label.style.marginBottom = '8px';
        label.style.display = 'block';
        wrap.appendChild(label);
      }
      var chipsWrap = document.createElement('div');
      chipsWrap.style.display = 'flex';
      chipsWrap.style.flexWrap = 'wrap';
      chipsWrap.style.gap = '6px';
      chipsWrap.style.marginBottom = '8px';
      var catSelected = Array.isArray(self._categoryFilter) ? self._categoryFilter.slice() : [];
      var tagSelected = Array.isArray(self._tagFilter) ? self._tagFilter.slice() : [];
      var allSelected = catSelected.map(function(c) { return { type: 'category', name: c }; }).concat(tagSelected.map(function(t) { return { type: 'tag', name: t }; }));
      var dropContainer = document.createElement('div');
      dropContainer.style.position = 'relative';
      dropContainer.style.width = '100%';
      var triggerBtn = document.createElement('button');
      triggerBtn.type = 'button';
      triggerBtn.textContent = (categories.length === 0 && tags.length === 0) ? 'No filters available' : 'Add filter…';
      triggerBtn.style.width = '100%';
      triggerBtn.style.padding = '8px 12px';
      triggerBtn.style.fontSize = '0.9rem';
      triggerBtn.style.border = '1px solid #ddd';
      triggerBtn.style.borderRadius = '6px';
      triggerBtn.style.background = 'white';
      triggerBtn.style.cursor = 'pointer';
      triggerBtn.style.textAlign = 'left';
      triggerBtn.style.color = '#666';
      triggerBtn.style.display = 'flex';
      triggerBtn.style.alignItems = 'center';
      triggerBtn.style.justifyContent = 'space-between';
      var chevron = document.createElement('span');
      chevron.textContent = '▾';
      chevron.style.fontSize = '0.95rem';
      chevron.style.opacity = '0.6';
      triggerBtn.appendChild(chevron);
      var dropPanel = document.createElement('div');
      dropPanel.style.display = 'none';
      dropPanel.style.position = 'absolute';
      dropPanel.style.top = '100%';
      dropPanel.style.left = '0';
      dropPanel.style.right = '0';
      dropPanel.style.marginTop = '4px';
      dropPanel.style.border = '1px solid #ddd';
      dropPanel.style.borderRadius = '6px';
      dropPanel.style.background = 'white';
      dropPanel.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
      dropPanel.style.maxHeight = '240px';
      dropPanel.style.overflowY = 'auto';
      dropPanel.style.zIndex = '100';
      function isSelected(type, name) {
        if (type === 'category') return catSelected.indexOf(name) >= 0;
        return tagSelected.indexOf(name) >= 0;
      }
      function updateDropdown() {
        dropPanel.innerHTML = '';
        if (categories.length > 0) {
          var catLabel = document.createElement('div');
          catLabel.textContent = 'Categories';
          catLabel.style.padding = '6px 12px';
          catLabel.style.fontSize = '0.75rem';
          catLabel.style.fontWeight = '600';
          catLabel.style.color = '#666';
          catLabel.style.borderBottom = '1px solid #eee';
          dropPanel.appendChild(catLabel);
          for (var i = 0; i < categories.length; i++) {
            var cat = categories[i];
            if (isSelected('category', cat)) continue;
            (function(c) {
              var opt = document.createElement('button');
              opt.type = 'button';
              opt.textContent = c;
              opt.style.display = 'block';
              opt.style.width = '100%';
              opt.style.padding = '8px 12px';
              opt.style.fontSize = '0.9rem';
              opt.style.border = 'none';
              opt.style.background = 'none';
              opt.style.cursor = 'pointer';
              opt.style.textAlign = 'left';
              opt.onmouseover = function() { opt.style.background = 'rgba(91,79,232,0.08)'; };
              opt.onmouseout = function() { opt.style.background = 'none'; };
              opt.onclick = function() {
                catSelected.push(c);
                self._categoryFilter = catSelected.slice();
                self._currentPage = 1;
                renderChips();
                updateDropdown();
                closeDropdown();
                self._renderContent(self.items);
              };
              dropPanel.appendChild(opt);
            })(cat);
          }
        }
        if (tags.length > 0) {
          var tagLabel = document.createElement('div');
          tagLabel.textContent = 'Tags';
          tagLabel.style.padding = '6px 12px';
          tagLabel.style.fontSize = '0.75rem';
          tagLabel.style.fontWeight = '600';
          tagLabel.style.color = '#666';
          tagLabel.style.borderBottom = '1px solid #eee';
          dropPanel.appendChild(tagLabel);
          for (var j = 0; j < tags.length; j++) {
            var tag = tags[j];
            if (isSelected('tag', tag)) continue;
            (function(t) {
              var opt = document.createElement('button');
              opt.type = 'button';
              opt.textContent = t;
              opt.style.display = 'block';
              opt.style.width = '100%';
              opt.style.padding = '8px 12px';
              opt.style.fontSize = '0.9rem';
              opt.style.border = 'none';
              opt.style.background = 'none';
              opt.style.cursor = 'pointer';
              opt.style.textAlign = 'left';
              opt.onmouseover = function() { opt.style.background = 'rgba(91,79,232,0.08)'; };
              opt.onmouseout = function() { opt.style.background = 'none'; };
              opt.onclick = function() {
                tagSelected.push(t);
                self._tagFilter = tagSelected.slice();
                self._currentPage = 1;
                renderChips();
                updateDropdown();
                closeDropdown();
                self._renderContent(self.items);
              };
              dropPanel.appendChild(opt);
            })(tag);
          }
        }
        if (dropPanel.childNodes.length === 0 || (categories.filter(function(c) { return !isSelected('category', c); }).length === 0 && tags.filter(function(t) { return !isSelected('tag', t); }).length === 0)) {
          var empty = document.createElement('div');
          empty.textContent = 'All selected';
          empty.style.padding = '8px 12px';
          empty.style.fontSize = '0.85rem';
          empty.style.color = '#999';
          dropPanel.appendChild(empty);
        }
      }
      function closeDropdown() {
        dropPanel.style.display = 'none';
        document.removeEventListener('click', closeDropdown);
      }
      triggerBtn.onclick = function(e) {
        e.stopPropagation();
        if (categories.length === 0 && tags.length === 0) return;
        if (dropPanel.style.display === 'block') {
          closeDropdown();
        } else {
          dropPanel.style.display = 'block';
          updateDropdown();
          setTimeout(function() { document.addEventListener('click', closeDropdown); }, 0);
        }
      };
      function renderChips() {
        chipsWrap.innerHTML = '';
        allSelected = catSelected.map(function(c) { return { type: 'category', name: c }; }).concat(tagSelected.map(function(t) { return { type: 'tag', name: t }; }));
        for (var s = 0; s < allSelected.length; s++) {
          var item = allSelected[s];
          var chip = document.createElement('span');
          chip.style.display = 'inline-flex';
          chip.style.alignItems = 'center';
          chip.style.gap = '4px';
          chip.style.padding = '4px 8px';
          chip.style.fontSize = '0.85rem';
          chip.style.borderRadius = '6px';
          chip.style.background = 'rgba(91,79,232,0.1)';
          chip.style.color = '#5B4FE8';
          chip.textContent = item.name;
          var btn = document.createElement('button');
          btn.type = 'button';
          btn.innerHTML = '&times;';
          btn.style.background = 'none';
          btn.style.border = 'none';
          btn.style.cursor = 'pointer';
          btn.style.fontSize = '1rem';
          btn.style.lineHeight = 1;
          btn.style.padding = '0 2px';
          btn.style.color = 'inherit';
          (function(typ, val) {
            btn.onclick = function() {
              if (typ === 'category') {
                catSelected = catSelected.filter(function(x) { return x !== val; });
                self._categoryFilter = catSelected.slice();
              } else {
                tagSelected = tagSelected.filter(function(x) { return x !== val; });
                self._tagFilter = tagSelected.slice();
              }
              self._currentPage = 1;
              renderChips();
              updateDropdown();
              self._renderContent(self.items);
            };
          })(item.type, item.name);
          chip.appendChild(btn);
          chipsWrap.appendChild(chip);
        }
      }
      renderChips();
      updateDropdown();
      if (categories.length === 0 && tags.length === 0) triggerBtn.disabled = true;
      dropContainer.appendChild(triggerBtn);
      dropContainer.appendChild(dropPanel);
      wrap.appendChild(chipsWrap);
      wrap.appendChild(dropContainer);
      return wrap;
    },

    /**
     * Create Sort Posts module (dropdown for collection level)
     */
    _createPostSortModule: function(cfg, width, noLabel) {
      var self = this;
      var wrap = document.createElement('div');
      wrap.style.width = (width || 200) + 'px';
      if (!noLabel) {
        var label = document.createElement('label');
        label.textContent = 'Sort Posts';
        label.style.fontWeight = '600';
        label.style.fontSize = '0.9rem';
        label.style.marginBottom = '8px';
        label.style.display = 'block';
        wrap.appendChild(label);
      }
      var select = document.createElement('select');
      select.style.width = '100%';
      select.style.padding = '8px 12px';
      select.style.fontSize = '0.9rem';
      select.style.border = '1px solid #ddd';
      select.style.borderRadius = '6px';
      select.style.background = 'white';
      select.style.cursor = 'pointer';
      var opts = [
        { value: 'date', text: 'By Date' },
        { value: 'az', text: 'A–Z' },
        { value: 'popularity', text: 'By Popularity' }
      ];
      for (var i = 0; i < opts.length; i++) {
        var opt = document.createElement('option');
        opt.value = opts[i].value;
        opt.textContent = opts[i].text;
        select.appendChild(opt);
      }
      var currentSort = (cfg && (cfg.postSort === 'az' || cfg.postSort === 'popularity')) ? cfg.postSort : 'date';
      select.value = currentSort;
      select.onchange = function() {
        var v = select.value || 'date';
        var newSort = (v === 'az' || v === 'popularity') ? v : 'date';
        var cc = self.config && self.config.collectionConfig && typeof self.config.collectionConfig === 'object' ? self.config.collectionConfig : {};
        var updated = Object.assign({}, cc, { postSort: newSort });
        self.updateConfig({ collectionConfig: updated });
        if (typeof self.config.configUpdateCallback === 'function') {
          self.config.configUpdateCallback('collectionConfig.postSort', newSort);
        } else if (typeof window !== 'undefined' && window.parent !== window) {
          try { window.parent.postMessage({ type: 'BETTERBLOG_CONFIG_UPDATE', path: 'collectionConfig.postSort', value: newSort }, '*'); } catch (e) {}
        }
        self._currentPage = 1;
        self._renderContent(self.items);
      };
      wrap.appendChild(select);
      return wrap;
    },

    /**
     * Create Author Profiles module (post level - shows profile for post authors)
     */
    _createAuthorProfilesModule: function(post, cfg, width) {
      var self = this;
      var authorIds = this._getAuthorIdsForPost(post, cfg);
      var profiles = (cfg && cfg.authorProfiles && typeof cfg.authorProfiles === 'object') ? cfg.authorProfiles : {};
      if (authorIds.length === 0) return null;
      var headerText = authorIds.length > 1 ? 'About the Authors' : 'About the Author';
      var content = document.createElement('div');
      content.className = 'blog-overlay-author-profiles';
      content.style.width = (width || 200) + 'px';
      function getInitials(name) {
        if (!name || !name.trim()) return '?';
        var parts = name.trim().split(/\s+/);
        if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        return name.slice(0, 2).toUpperCase();
      }
      function socialIconSvg(platform) {
        var w = 18; var h = 18;
        var svgs = {
          instagram: '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>',
          x: '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>',
          linkedin: '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>',
          facebook: '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>',
          email: '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>',
          website: '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>'
        };
        return svgs[platform] || '';
      }
      var platforms = ['instagram', 'facebook', 'linkedin', 'x', 'email', 'website'];
      for (var i = 0; i < authorIds.length; i++) {
        var id = authorIds[i];
        var p = profiles[id];
        var name = (p && p.name) || (cfg.authorMap && cfg.authorMap[id]) || 'Author';
        var imageUrl = (p && p.imageUrl) || null;
        var bio = (p && p.bio) || null;
        var email = (p && p.email) || null;
        var socialLinks = (p && p.socialLinks && typeof p.socialLinks === 'object') ? p.socialLinks : {};
        var card = document.createElement('div');
        card.style.marginBottom = i < authorIds.length - 1 ? '20px' : '0';
        var topRow = document.createElement('div');
        topRow.style.display = 'flex';
        topRow.style.gap = '12px';
        topRow.style.alignItems = 'flex-start';
        topRow.style.marginBottom = '8px';
        var avatarWrap = document.createElement('div');
        avatarWrap.style.width = '48px';
        avatarWrap.style.height = '48px';
        avatarWrap.style.borderRadius = '50%';
        avatarWrap.style.overflow = 'hidden';
        avatarWrap.style.flexShrink = '0';
        avatarWrap.style.background = 'rgba(91,79,232,0.15)';
        avatarWrap.style.display = 'flex';
        avatarWrap.style.alignItems = 'center';
        avatarWrap.style.justifyContent = 'center';
        avatarWrap.style.fontSize = '1rem';
        avatarWrap.style.fontWeight = '600';
        avatarWrap.style.color = '#5B4FE8';
        if (imageUrl) {
          var img = document.createElement('img');
          img.src = imageUrl;
          img.alt = name;
          img.style.width = '100%';
          img.style.height = '100%';
          img.style.objectFit = 'cover';
          avatarWrap.appendChild(img);
        } else {
          avatarWrap.textContent = getInitials(name);
        }
        topRow.appendChild(avatarWrap);
        var rightCol = document.createElement('div');
        rightCol.style.flex = '1';
        rightCol.style.minWidth = '0';
        rightCol.style.display = 'flex';
        rightCol.style.flexDirection = 'column';
        rightCol.style.gap = '6px';
        var nameEl = document.createElement('div');
        nameEl.textContent = name;
        nameEl.style.fontWeight = '600';
        nameEl.style.fontSize = '0.95rem';
        nameEl.style.color = '#1a1a1a';
        nameEl.style.lineHeight = 1.3;
        rightCol.appendChild(nameEl);
        var linksWrap = document.createElement('div');
        linksWrap.style.display = 'flex';
        linksWrap.style.flexWrap = 'wrap';
        linksWrap.style.gap = '8px';
        linksWrap.style.alignItems = 'center';
        for (var j = 0; j < platforms.length; j++) {
          var platform = platforms[j];
          var url = platform === 'email' ? (email ? 'mailto:' + email : null) : (socialLinks[platform] || null);
          if (url && typeof url === 'string') {
            var a = document.createElement('a');
            a.href = url;
            a.target = platform === 'email' ? '_self' : '_blank';
            a.rel = platform === 'email' ? '' : 'noopener noreferrer';
            a.innerHTML = socialIconSvg(platform);
            a.style.display = 'inline-flex';
            a.style.color = '#5B4FE8';
            a.style.textDecoration = 'none';
            a.setAttribute('aria-label', platform === 'x' ? 'X' : platform.charAt(0).toUpperCase() + platform.slice(1));
            linksWrap.appendChild(a);
          }
        }
        if (linksWrap.childNodes.length > 0) {
          rightCol.appendChild(linksWrap);
        } else {
          rightCol.style.minHeight = '48px';
          rightCol.style.justifyContent = 'center';
        }
        topRow.appendChild(rightCol);
        card.appendChild(topRow);
        if (bio) {
          var bioEl = document.createElement('div');
          bioEl.textContent = bio;
          bioEl.style.fontSize = '0.8rem';
          bioEl.style.color = '#6b6b6b';
          bioEl.style.lineHeight = 1.4;
          card.appendChild(bioEl);
        }
        content.appendChild(card);
      }
      return { header: headerText, content: content };
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
        a.setAttribute('data-analytics-element', 'share' + (platform === 'x' ? 'X' : platform.charAt(0).toUpperCase() + platform.slice(1)));
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
      var appendPassword = function(url, pwd) {
        if (!pwd || !String(pwd).trim()) return url;
        try {
          var u = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'https://example.com');
          u.searchParams.set('password', String(pwd).trim());
          return u.toString();
        } catch (e) { return url; }
      };
      var urlWithPassword = appendPassword(fetchUrl, this.config && this.config.blogPassword);
      var allItems = [];
      var firstJson = null;
      var fetchNext = function(url) {
        return fetch(url).then(function(res) { return res.json(); }).then(function(json) {
          var pageItems = Array.isArray(json && json.items) ? json.items : [];
          if (!pageItems.length && json && json.collection && Array.isArray(json.collection.items)) {
            pageItems = json.collection.items;
          }
          for (var pi = 0; pi < pageItems.length; pi++) allItems.push(pageItems[pi]);
          if (!firstJson) firstJson = json;
          var coll = json && json.collection && typeof json.collection === 'object' ? json.collection : null;
          var nextUrl = (coll && (coll.nextPageUrl || coll.nextPage)) || (json.nextPageUrl || json.nextPage);
          if (nextUrl && typeof nextUrl === 'string') {
            var absUrl = nextUrl.indexOf('http') === 0 ? nextUrl : (typeof window !== 'undefined' && window.location ? new URL(nextUrl, window.location.origin).href : nextUrl);
            return fetchNext(appendPassword(absUrl, self.config && self.config.blogPassword));
          }
          return Promise.resolve();
        });
      };
      fetchNext(urlWithPassword)
        .then(function() {
          self.items = allItems;
          var json = firstJson;
          var website = json && json.website ? json.website : (json && json.websiteSettings ? { title: json.websiteSettings.title } : null);
          var collection = json && json.collection ? json.collection : null;
          self._blogMeta = {
            siteTitle: (website && website.title) ? String(website.title) : '',
            blogName: (collection && (collection.title || collection.navigationTitle)) ? String(collection.title || collection.navigationTitle) : 'Blog'
          };
          self._collection = collection;
          self._renderContent(self.items);
          console.log('[BlogOverlay] Rendered', allItems.length, 'posts from blog JSON');
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
      var categoryFilter = Array.isArray(this._categoryFilter) ? this._categoryFilter : [];
      var hasCategoryFilter = categoryFilter.length > 0;
      var tagFilter = Array.isArray(this._tagFilter) ? this._tagFilter : [];
      var hasTagFilter = tagFilter.length > 0;
      var hasAnyFilter = hasSearchQuery || hasCategoryFilter || hasTagFilter;
      var baseItems = hasSearchQuery ? this._searchPosts(items, searchQuery) : items;
      var filteredItems;
      if (hasCategoryFilter && hasTagFilter) {
        var byCat = this._filterPostsByCategory(baseItems, categoryFilter);
        var byTag = this._filterPostsByTag(baseItems, tagFilter);
        var seen = {};
        filteredItems = [];
        for (var i = 0; i < byCat.length; i++) {
          var id = (byCat[i].id || byCat[i].fullUrl || byCat[i].title) || i;
          if (!seen[id]) { seen[id] = true; filteredItems.push(byCat[i]); }
        }
        for (var j = 0; j < byTag.length; j++) {
          var id2 = (byTag[j].id || byTag[j].fullUrl || byTag[j].title) || 't' + j;
          if (!seen[id2]) { seen[id2] = true; filteredItems.push(byTag[j]); }
        }
      } else if (hasCategoryFilter) {
        filteredItems = this._filterPostsByCategory(baseItems, categoryFilter);
      } else if (hasTagFilter) {
        filteredItems = this._filterPostsByTag(baseItems, tagFilter);
      } else {
        filteredItems = baseItems;
      }
      var isSinglePostForCfg = selectedIndex >= 0 && selectedIndex < items.length && !hasAnyFilter;
      var levelCfgForSort = isSinglePostForCfg ? (baseCfg.postConfig && typeof baseCfg.postConfig === 'object' ? baseCfg.postConfig : baseCfg) : (baseCfg.collectionConfig && typeof baseCfg.collectionConfig === 'object' ? baseCfg.collectionConfig : baseCfg);
      var cfgForSort = levelCfgForSort && typeof levelCfgForSort === 'object' ? levelCfgForSort : {};
      var hasPostSortModule = !isSinglePostForCfg && (
        (cfgForSort.leftSidebar && Array.isArray(cfgForSort.leftSidebar.modules) && cfgForSort.leftSidebar.modules.indexOf('postSort') >= 0) ||
        (cfgForSort.rightSidebar && Array.isArray(cfgForSort.rightSidebar.modules) && cfgForSort.rightSidebar.modules.indexOf('postSort') >= 0) ||
        (cfgForSort.headerContent && Array.isArray(cfgForSort.headerContent.modules) && cfgForSort.headerContent.modules.indexOf('postSort') >= 0)
      );
      var postSort = hasPostSortModule && (cfgForSort.postSort === 'az' || cfgForSort.postSort === 'popularity') ? cfgForSort.postSort : 'date';
      var postViewCounts = (this.config && this.config.postViewCounts && typeof this.config.postViewCounts === 'object') ? this.config.postViewCounts : {};
      var sortedItems = filteredItems.slice();
      if (postSort === 'az') {
        sortedItems.sort(function(a, b) { return (a.title || '').localeCompare(b.title || ''); });
      } else if (postSort === 'popularity' && Object.keys(postViewCounts).length > 0) {
        sortedItems.sort(function(a, b) {
          var idA = a.id || a.fullUrl || a.title;
          var idB = b.id || b.fullUrl || b.title;
          var viewsA = idA ? (postViewCounts[String(idA)] || 0) : 0;
          var viewsB = idB ? (postViewCounts[String(idB)] || 0) : 0;
          return viewsB - viewsA;
        });
      } else {
        sortedItems.sort(function(a, b) {
          var tsA = a.publishedOn || a.publishOn || a.addedOn || 0;
          var tsB = b.publishedOn || b.publishOn || b.addedOn || 0;
          return (tsB || 0) - (tsA || 0);
        });
      }
      var paginationCfg = cfgForSort && cfgForSort.pagination && typeof cfgForSort.pagination === 'object' ? cfgForSort.pagination : null;
      var usePagination = !isSinglePostForCfg && paginationCfg && paginationCfg.show === true;
      var paginationMode = usePagination && (paginationCfg.mode === 'infiniteScroll') ? 'infiniteScroll' : 'pages';
      var postsPerPage = usePagination ? Math.max(1, parseInt(paginationCfg.postsPerPage, 10) || 10) : 0;
      var totalFiltered = sortedItems.length;
      var totalPages = usePagination && postsPerPage > 0 && paginationMode === 'pages' ? Math.max(1, Math.ceil(totalFiltered / postsPerPage)) : 1;
      var currentPage = Math.min(Math.max(1, this._currentPage || 1), totalPages);
      if (usePagination && paginationMode === 'pages') this._currentPage = currentPage;
      if (usePagination && paginationMode === 'infiniteScroll') {
        var infiniteScrollSig = (searchQuery || '') + '|' + (categoryFilter || []).join(',') + '|' + (tagFilter || []).join(',') + '|' + postSort;
        if (this._lastInfiniteScrollSignature !== infiniteScrollSig) {
          this._lastInfiniteScrollSignature = infiniteScrollSig;
          this._infiniteScrollLoaded = Math.min(postsPerPage, totalFiltered);
        }
        if (this._infiniteScrollLoaded <= 0 || this._infiniteScrollLoaded > totalFiltered) this._infiniteScrollLoaded = Math.min(postsPerPage, totalFiltered);
      }
      var displayItems = (selectedIndex >= 0 && selectedIndex < items.length && !hasAnyFilter)
        ? [items[selectedIndex]]
        : (usePagination && postsPerPage > 0
          ? (paginationMode === 'infiniteScroll'
            ? sortedItems.slice(0, Math.min(this._infiniteScrollLoaded, totalFiltered))
            : sortedItems.slice((currentPage - 1) * postsPerPage, currentPage * postsPerPage))
          : sortedItems);
      var isSinglePost = displayItems.length === 1 && selectedIndex >= 0 && !hasAnyFilter;
      var levelCfg = isSinglePost ? (baseCfg.postConfig && typeof baseCfg.postConfig === 'object' ? baseCfg.postConfig : baseCfg) : (baseCfg.collectionConfig && typeof baseCfg.collectionConfig === 'object' ? baseCfg.collectionConfig : baseCfg);
      var cfg = Object.assign({}, baseCfg, levelCfg);
      var recentPostsCount = Math.max(1, Math.min(50, parseInt(cfg.recentPostsCount, 10) || 5));
      var leftSidebarCfg = cfg.leftSidebar && typeof cfg.leftSidebar === 'object' ? cfg.leftSidebar : null;
      var rightSidebarCfg = cfg.rightSidebar && typeof cfg.rightSidebar === 'object' ? cfg.rightSidebar : null;
      var headerContentCfg = cfg.headerContent && typeof cfg.headerContent === 'object' ? cfg.headerContent : null;
      var footerContentCfg = cfg.footerContent && typeof cfg.footerContent === 'object' ? cfg.footerContent : null;
      var useLevelConfig = (baseCfg.collectionConfig && typeof baseCfg.collectionConfig === 'object') || (baseCfg.postConfig && typeof baseCfg.postConfig === 'object');
      var showTableOfContents = Boolean(cfg.showTableOfContents);
      var tableOfContentsPosition = (cfg.tableOfContentsPosition === 'right') ? 'right' : 'left';
      var showRecentPostsSidebar = Boolean(cfg.showRecentPostsSidebar);
      var sidebarPosition = (cfg.sidebarPosition === 'right') ? 'right' : 'left';
      if (!useLevelConfig) {
        if (!leftSidebarCfg && cfg.showTableOfContents) {
          leftSidebarCfg = cfg.tableOfContentsPosition === 'left' ? { show: true, modules: ['tableOfContents'], width: 200, sticky: true } : null;
        }
        if (!rightSidebarCfg && cfg.showTableOfContents) {
          rightSidebarCfg = cfg.tableOfContentsPosition === 'right' ? { show: true, modules: ['tableOfContents'], width: 200, sticky: true } : null;
        }
        if (!leftSidebarCfg && cfg.showRecentPostsSidebar) {
          leftSidebarCfg = cfg.sidebarPosition === 'left' ? { show: true, modules: ['recentPosts'], width: 220, sticky: true } : leftSidebarCfg;
        }
        if (!rightSidebarCfg && cfg.showRecentPostsSidebar) {
          rightSidebarCfg = cfg.sidebarPosition === 'right' ? { show: true, modules: ['recentPosts'], width: 220, sticky: true } : rightSidebarCfg;
        }
      } else {
        if (!leftSidebarCfg) leftSidebarCfg = { show: false, modules: [], width: 240, sticky: true };
        if (!rightSidebarCfg) rightSidebarCfg = { show: false, modules: [], width: 240, sticky: true };
      }
      var showDate = Boolean(cfg.showDate);
      var showAuthor = Boolean(cfg.showAuthor);
      var showReadingTime = Boolean(cfg.showReadingTime);
      var fiCfg = cfg.featuredImage && typeof cfg.featuredImage === 'object' ? cfg.featuredImage : {};
      var faCfg = cfg.featuredArticle && typeof cfg.featuredArticle === 'object' ? cfg.featuredArticle : null;

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

      var collectionLayout = !isSinglePost && (cfg.collectionLayout === 'grid' || cfg.collectionLayout === 'listRows') ? cfg.collectionLayout : 'stack';
      var gridColumns = !isSinglePost && collectionLayout === 'grid' ? Math.min(3, Math.max(2, parseInt(cfg.gridColumns, 10) || 3)) : 3;
      if (collectionLayout === 'grid') {
        main.style.display = 'grid';
        main.style.gridTemplateColumns = 'repeat(' + gridColumns + ', 1fr)';
        main.style.gap = '24px';
      }

      var progressTrackForPreview = null;
      var pb = cfg.progressBar && typeof cfg.progressBar === 'object' ? cfg.progressBar : {};
      var showProgressBar = Boolean(pb.show != null ? pb.show : cfg.showProgressBar);
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
        backLink.setAttribute('data-analytics-element', 'breadcrumb');
        backLink.textContent = '← Back to list';
        backLink.style.display = 'inline-block';
        backLink.style.marginBottom = '16px';
        backLink.style.textDecoration = 'none';
        backLink.style.fontSize = '0.9rem';
        main.appendChild(backLink);
      }

      var featuredPost = null;
      var displayItemsForLoop = displayItems;
      if (!isSinglePost && faCfg && faCfg.show === true && displayItems.length > 0) {
        var featuredIdx = -1;
        for (var fi = 0; fi < displayItems.length; fi++) {
          var it = displayItems[fi];
          if (it && (it.featured === true || it.isFeatured === true)) {
            featuredIdx = fi;
            break;
          }
        }
        featuredPost = featuredIdx >= 0 ? displayItems[featuredIdx] : displayItems[0];
        if (faCfg.position === 'header') {
          displayItemsForLoop = displayItems.filter(function(p) { return p !== featuredPost; });
          var heroLink = document.createElement('a');
          heroLink.href = self._getPostUrl(featuredPost) || '#';
          heroLink.style.display = 'block';
          heroLink.style.textDecoration = 'none';
          heroLink.style.color = 'inherit';
          heroLink.style.marginBottom = '24px';
          heroLink.setAttribute('data-analytics-element', 'featuredHero');
          heroLink.className = 'blog-overlay-featured-hero';
          var heroInner = document.createElement('div');
          heroInner.style.position = 'relative';
          heroInner.style.width = '100%';
          heroInner.style.aspectRatio = '21 / 8';
          heroInner.style.overflow = 'hidden';
          heroInner.style.borderRadius = '4px';
          heroInner.style.background = 'linear-gradient(160deg, #1a1a2e 0%, #2d1a3a 45%, #0f2027 100%)';
          var heroImgUrl = featuredPost.assetUrl || featuredPost.thumbnailUrl || (featuredPost.assets && featuredPost.assets[0] && featuredPost.assets[0].assetUrl) || null;
          if (heroImgUrl) {
            var heroImg = document.createElement('img');
            heroImg.src = heroImgUrl;
            heroImg.alt = featuredPost.title || '';
            heroImg.style.width = '100%';
            heroImg.style.height = '100%';
            heroImg.style.objectFit = 'cover';
            heroImg.style.display = 'block';
            heroInner.appendChild(heroImg);
          }
          var heroOverlay = document.createElement('div');
          heroOverlay.style.position = 'absolute';
          heroOverlay.style.inset = '0';
          heroOverlay.style.background = 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.25) 55%, transparent 100%)';
          heroOverlay.style.display = 'flex';
          heroOverlay.style.alignItems = 'flex-end';
          heroInner.appendChild(heroOverlay);
          var heroContent = document.createElement('div');
          heroContent.style.position = 'relative';
          heroContent.style.zIndex = '2';
          heroContent.style.padding = '24px 20px';
          heroContent.style.width = '100%';
          heroContent.style.maxWidth = '780px';
          var heroBadge = document.createElement('span');
          heroBadge.textContent = 'Featured';
          heroBadge.style.position = 'absolute';
          heroBadge.style.top = '20px';
          heroBadge.style.left = '20px';
          heroBadge.style.zIndex = '3';
          heroBadge.style.background = '#5B4FE8';
          heroBadge.style.color = '#fff';
          heroBadge.style.fontSize = '10px';
          heroBadge.style.fontWeight = '700';
          heroBadge.style.letterSpacing = '1.5px';
          heroBadge.style.textTransform = 'uppercase';
          heroBadge.style.padding = '2px 8px';
          heroBadge.style.borderRadius = '2px';
          heroInner.appendChild(heroBadge);
          var heroCats = self._getPostCategories(featuredPost);
          if (heroCats.length > 0) {
            var heroCat = document.createElement('div');
            heroCat.textContent = heroCats[0];
            heroCat.style.fontSize = '11px';
            heroCat.style.fontWeight = '700';
            heroCat.style.letterSpacing = '1.5px';
            heroCat.style.textTransform = 'uppercase';
            heroCat.style.color = 'rgba(255,255,255,0.5)';
            heroCat.style.marginBottom = '8px';
            heroContent.appendChild(heroCat);
          }
          var heroTitle = document.createElement('h2');
          heroTitle.textContent = featuredPost.title || 'Untitled';
          heroTitle.style.fontSize = 'clamp(1.5rem, 4vw, 2.25rem)';
          heroTitle.style.fontWeight = '900';
          heroTitle.style.lineHeight = '1.08';
          heroTitle.style.letterSpacing = '-0.02em';
          heroTitle.style.color = '#fff';
          heroTitle.style.margin = '0 0 10px 0';
          heroContent.appendChild(heroTitle);
          var heroText = self._stripHtml(featuredPost.excerpt || featuredPost.body || '');
          var heroSentences = heroText ? heroText.match(/[^.!?]*[.!?]/g) : null;
          var heroDeck = '';
          if (heroSentences && heroSentences.length >= 2) {
            heroDeck = (heroSentences[0] + ' ' + heroSentences[1]).trim();
          } else if (heroSentences && heroSentences[0]) {
            heroDeck = heroSentences[0].trim();
          } else if (heroText) {
            heroDeck = self._truncateText(featuredPost.excerpt || featuredPost.body || '', 200);
          }
          if (heroDeck) {
            var heroDeckEl = document.createElement('div');
            heroDeckEl.textContent = heroDeck;
            heroDeckEl.style.fontSize = '15px';
            heroDeckEl.style.color = 'rgba(255,255,255,0.6)';
            heroDeckEl.style.lineHeight = '1.6';
            heroDeckEl.style.marginBottom = '14px';
            heroDeckEl.style.maxWidth = '560px';
            heroContent.appendChild(heroDeckEl);
          }
          var heroMetaParts = [];
          if (showDate) {
            var heroDateStr = self._getDate(featuredPost);
            if (heroDateStr) heroMetaParts.push(heroDateStr);
          }
          if (showAuthor) {
            var heroAuthorStr = self._getAuthorsForPost(featuredPost, cfg);
            if (heroAuthorStr) heroMetaParts.push('By ' + heroAuthorStr);
          }
          if (showReadingTime) {
            var heroMins = self._getReadingTimeMinutes(featuredPost.body);
            heroMetaParts.push(heroMins === 1 ? '1 min read' : heroMins + ' min read');
          }
          if (heroMetaParts.length > 0) {
            var heroMeta = document.createElement('div');
            heroMeta.textContent = heroMetaParts.join(' · ');
            heroMeta.style.fontSize = '12px';
            heroMeta.style.color = 'rgba(255,255,255,0.6)';
            heroContent.appendChild(heroMeta);
          }
          heroOverlay.appendChild(heroContent);
          heroLink.appendChild(heroInner);
          main.insertBefore(heroLink, main.firstChild);
        }
      }

      function createSidebarSection(headerText, content) {
        var section = document.createElement('div');
        section.className = 'blog-overlay-sidebar-section';
        section.style.marginBottom = '20px';
        var header = document.createElement('div');
        header.textContent = headerText;
        header.style.fontSize = '0.7rem';
        header.style.fontWeight = '600';
        header.style.letterSpacing = '0.08em';
        header.style.textTransform = 'uppercase';
        header.style.color = '#6b6b6b';
        header.style.marginBottom = '8px';
        section.appendChild(header);
        var bar = document.createElement('div');
        bar.style.height = '1px';
        bar.style.background = '#e5e4e0';
        bar.style.marginBottom = '12px';
        section.appendChild(bar);
        section.appendChild(content);
        return section;
      }
      function createTocModule(sidebarWidth) {
        if (items.length === 0) return null;
        var el = document.createElement('nav');
        el.className = 'blog-overlay-toc';
        el.style.flexShrink = '0';
        el.style.width = (sidebarWidth || 200) + 'px';

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
              tocLink.setAttribute('data-analytics-element', 'toc');
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
            titleLink.setAttribute('data-analytics-element', 'toc');
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
          tocLink.setAttribute('data-analytics-element', 'toc');
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
        return createSidebarSection('Table of Contents', el);
      }
      function createRecentPostsModule(sidebarWidth) {
        if (items.length === 0) return null;
        var el = document.createElement('aside');
        el.className = 'blog-overlay-recent-posts';
        el.style.flexShrink = '0';
        el.style.width = (sidebarWidth || 220) + 'px';
        var recentItems = items.slice(0, recentPostsCount);
        for (var r = 0; r < recentItems.length; r++) {
          var rpPost = recentItems[r];
          var rpUrl = self._getPostUrl(rpPost);
          var rpEntry = document.createElement('div');
          rpEntry.style.marginBottom = '12px';
          var rpLink = document.createElement('a');
          rpLink.href = rpUrl || '#post-' + r;
          rpLink.setAttribute('data-analytics-element', 'recentPosts');
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
        return createSidebarSection('Recent Posts', el);
      }
      function createRelevantPostsModule(sidebarWidth) {
        if (items.length === 0) return null;
        var el = document.createElement('aside');
        el.className = 'blog-overlay-relevant-posts';
        el.style.flexShrink = '0';
        el.style.width = (sidebarWidth || 220) + 'px';
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
          rpLink.setAttribute('data-analytics-element', 'relevantPosts');
          rpLink.textContent = rpPost.title || 'Untitled';
          rpLink.style.display = 'block';
          rpLink.style.fontSize = '0.9rem';
          rpLink.style.fontWeight = '500';
          rpLink.style.textDecoration = 'none';
          rpEntry.appendChild(rpLink);
          el.appendChild(rpEntry);
        }
        return createSidebarSection('Relevant Posts', el);
      }
      function createEmailCaptureForm(ecCfg, width) {
        if (!ecCfg || !ecCfg.header) return null;
        var wrap = document.createElement('div');
        wrap.className = 'blog-overlay-email-capture';
        wrap.style.width = '100%';
        wrap.style.maxWidth = (width || 280) + 'px';
        var headerEl = document.createElement('div');
        headerEl.textContent = ecCfg.header || 'Subscribe to our newsletter';
        headerEl.style.fontSize = '0.95rem';
        headerEl.style.fontWeight = '600';
        headerEl.style.marginBottom = '8px';
        wrap.appendChild(headerEl);
        if (ecCfg.byline && ecCfg.byline.trim()) {
          var bylineEl = document.createElement('div');
          bylineEl.textContent = ecCfg.byline;
          bylineEl.style.fontSize = '0.85rem';
          bylineEl.style.color = '#666';
          bylineEl.style.marginBottom = '12px';
          wrap.appendChild(bylineEl);
        }
        var form = document.createElement('div');
        form.style.display = 'flex';
        form.style.flexDirection = 'column';
        form.style.gap = '8px';
        var emailInput = document.createElement('input');
        emailInput.type = 'email';
        emailInput.name = 'bb-newsletter-email';
        emailInput.id = 'bb-newsletter-email';
        emailInput.setAttribute('autocomplete', 'section-newsletter email');
        emailInput.placeholder = 'you@example.com';
        emailInput.setAttribute('aria-label', 'Email address');
        emailInput.style.padding = '8px 12px';
        emailInput.style.fontSize = '0.9rem';
        emailInput.style.border = '1px solid #ddd';
        emailInput.style.borderRadius = '6px';
        emailInput.style.outline = 'none';
        emailInput.style.boxSizing = 'border-box';
        form.appendChild(emailInput);
        var btn = document.createElement('button');
        btn.textContent = ecCfg.buttonText || 'Subscribe';
        btn.type = 'button';
        btn.style.padding = '8px 16px';
        btn.style.fontSize = '0.9rem';
        btn.style.fontWeight = '500';
        btn.style.background = '#5B4FE8';
        btn.style.color = 'white';
        btn.style.border = 'none';
        btn.style.borderRadius = '6px';
        btn.style.cursor = 'pointer';
        btn.onmouseover = function() { btn.style.background = '#4a3fd4'; };
        btn.onmouseout = function() { btn.style.background = '#5B4FE8'; };
        var msgEl = document.createElement('div');
        msgEl.style.fontSize = '0.85rem';
        msgEl.style.marginTop = '4px';
        form.appendChild(btn);
        form.appendChild(msgEl);
        wrap.appendChild(form);
        btn.onclick = function() {
          var email = (emailInput.value || '').trim().toLowerCase();
          if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            msgEl.textContent = 'Please enter a valid email address.';
            msgEl.style.color = '#dc2626';
            return;
          }
          btn.disabled = true;
          btn.textContent = 'Submitting…';
          msgEl.textContent = '';
          var baseUrl = (self.config && self.config.baseUrl) || '';
          var siteKey = (self.config && self.config.siteKey) || '';
          if (!baseUrl || !siteKey) {
            msgEl.textContent = 'Configuration error. Please try again later.';
            msgEl.style.color = '#dc2626';
            btn.disabled = false;
            btn.textContent = ecCfg.buttonText || 'Subscribe';
            return;
          }
          var url = baseUrl.replace(/\/+$/, '') + '/api/capture';
          fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ siteKey: siteKey, type: 'newsletter', email: email }),
            credentials: 'omit'
          }).then(function(res) {
            return res.json().then(function(data) { return { ok: res.ok, data: data }; });
          }).catch(function() { return { ok: false, data: { error: 'Network error' } }; }).then(function(result) {
            btn.disabled = false;
            btn.textContent = ecCfg.buttonText || 'Subscribe';
            if (result.ok) {
              msgEl.textContent = 'Thanks for subscribing!';
              msgEl.style.color = '#10B981';
              emailInput.value = '';
            } else {
              msgEl.textContent = (result.data && result.data.error) || 'Something went wrong. Please try again.';
              msgEl.style.color = '#dc2626';
            }
          });
        };
        return wrap;
      }
      function createLeadMagnetForm(lmCfg, width) {
        if (!lmCfg || !lmCfg.resourceTitle || !lmCfg.resourceTitle.trim()) return null;
        var wrap = document.createElement('div');
        wrap.className = 'blog-overlay-lead-magnet';
        wrap.style.width = '100%';
        wrap.style.maxWidth = (width || 280) + 'px';
        var titleEl = document.createElement('div');
        titleEl.textContent = lmCfg.resourceTitle;
        titleEl.style.fontSize = '0.95rem';
        titleEl.style.fontWeight = '600';
        titleEl.style.marginBottom = '8px';
        wrap.appendChild(titleEl);
        if (lmCfg.description && lmCfg.description.trim()) {
          var descEl = document.createElement('div');
          descEl.textContent = lmCfg.description;
          descEl.style.fontSize = '0.85rem';
          descEl.style.color = '#666';
          descEl.style.marginBottom = '12px';
          wrap.appendChild(descEl);
        }
        var form = document.createElement('div');
        form.style.display = 'flex';
        form.style.flexDirection = 'column';
        form.style.gap = '8px';
        var emailInput = document.createElement('input');
        emailInput.type = 'email';
        emailInput.name = 'bb-lead-magnet-email';
        emailInput.id = 'bb-lead-magnet-email';
        emailInput.setAttribute('autocomplete', 'section-lead-magnet email');
        emailInput.placeholder = 'you@example.com';
        emailInput.setAttribute('aria-label', 'Email address');
        emailInput.style.padding = '8px 12px';
        emailInput.style.fontSize = '0.9rem';
        emailInput.style.border = '1px solid #ddd';
        emailInput.style.borderRadius = '6px';
        emailInput.style.outline = 'none';
        emailInput.style.boxSizing = 'border-box';
        form.appendChild(emailInput);
        var btn = document.createElement('button');
        btn.textContent = lmCfg.buttonText || 'Get it free';
        btn.type = 'button';
        btn.style.padding = '8px 16px';
        btn.style.fontSize = '0.9rem';
        btn.style.fontWeight = '500';
        btn.style.background = '#5B4FE8';
        btn.style.color = 'white';
        btn.style.border = 'none';
        btn.style.borderRadius = '6px';
        btn.style.cursor = 'pointer';
        btn.onmouseover = function() { btn.style.background = '#4a3fd4'; };
        btn.onmouseout = function() { btn.style.background = '#5B4FE8'; };
        var msgEl = document.createElement('div');
        msgEl.style.fontSize = '0.85rem';
        msgEl.style.marginTop = '4px';
        form.appendChild(btn);
        form.appendChild(msgEl);
        wrap.appendChild(form);
        btn.onclick = function() {
          var email = (emailInput.value || '').trim().toLowerCase();
          if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            msgEl.textContent = 'Please enter a valid email address.';
            msgEl.style.color = '#dc2626';
            return;
          }
          btn.disabled = true;
          btn.textContent = 'Submitting…';
          msgEl.textContent = '';
          var baseUrl = (self.config && self.config.baseUrl) || '';
          var siteKey = (self.config && self.config.siteKey) || '';
          if (!baseUrl || !siteKey) {
            msgEl.textContent = 'Configuration error. Please try again later.';
            msgEl.style.color = '#dc2626';
            btn.disabled = false;
            btn.textContent = lmCfg.buttonText || 'Get it free';
            return;
          }
          var url = baseUrl.replace(/\/+$/, '') + '/api/capture';
          fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ siteKey: siteKey, type: 'lead_magnet', email: email, resourceTitle: lmCfg.resourceTitle }),
            credentials: 'omit'
          }).then(function(res) {
            return res.json().then(function(data) { return { ok: res.ok, data: data }; });
          }).catch(function() { return { ok: false, data: { error: 'Network error' } }; }).then(function(result) {
            btn.disabled = false;
            btn.textContent = lmCfg.buttonText || 'Get it free';
            if (result.ok) {
              msgEl.textContent = 'Thanks! Check your email.';
              msgEl.style.color = '#10B981';
              emailInput.value = '';
            } else {
              msgEl.textContent = (result.data && result.data.error) || 'Something went wrong. Please try again.';
              msgEl.style.color = '#dc2626';
            }
          });
        };
        return wrap;
      }
      var ecCfg = (cfg.collectionModules && cfg.collectionModules.emailCapture) || (cfg.postModules && cfg.postModules.emailCapture);
      var lmCfg = (cfg.collectionModules && cfg.collectionModules.leadMagnet) || (cfg.postModules && cfg.postModules.leadMagnet);
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
            searchInput.oninput = function() {
              self._searchQuery = searchInput.value;
              self._focusSearchInput = true;
              self._currentPage = 1;
              self._renderContent(self.items);
              var q = searchInput.value.trim();
              if (q) {
                var resultsCount = self._searchPosts(self.items, q).length;
                self._analyticsTrackSearchDebounced(q, resultsCount);
              }
            };
            searchInput.onkeydown = function(e) { if (e.key === 'Escape') { searchInput.value = ''; self._searchQuery = ''; self._currentPage = 1; self._renderContent(self.items); searchInput.blur(); } };
            searchInput.className = 'blog-overlay-search-input';
            searchWrap.appendChild(searchInput);
            el = createSidebarSection('Search Posts', searchWrap);
          } else if (mod === 'filterByCategory') {
            el = createSidebarSection('Filter', self._createFilterByCategoryModule(items, width || 200, true, 'sidebar'));
          } else if (mod === 'filterByTag') {
            el = createSidebarSection('Filter', self._createFilterByTagModule(items, width || 200, true, 'sidebar'));
          } else if (mod === 'filterByTagsAndCategories') {
            var combinedEl = self._createFilterByTagsAndCategoriesModule(items, width || 200, true, 'sidebar');
            el = combinedEl ? createSidebarSection('Filter', combinedEl) : null;
          } else if (mod === 'postSort') {
            el = createSidebarSection('Sort Posts', self._createPostSortModule(cfg, width || 200, true));
          } else if (mod === 'authorProfiles' && isSinglePost && displayItems.length > 0) {
            var authorResult = self._createAuthorProfilesModule(displayItems[0], cfg, width || 200);
            el = authorResult ? createSidebarSection(authorResult.header, authorResult.content) : null;
          } else if (mod === 'emailCapture' && ecCfg) {
            var ecForm = createEmailCaptureForm(ecCfg, width);
            el = ecForm ? createSidebarSection(ecCfg.header || 'Email Capture', ecForm) : null;
          } else if (mod === 'leadMagnet' && lmCfg && lmCfg.resourceTitle) {
            var lmForm = createLeadMagnetForm(lmCfg, width);
            el = lmForm ? createSidebarSection(lmCfg.resourceTitle, lmForm) : null;
          }
          if (el) mods.push(el);
        }
        return mods;
      }
      var leftModules = buildSidebarModules(leftSidebarCfg);
      var rightModules = buildSidebarModules(rightSidebarCfg);

          for (var j = 0; j < displayItemsForLoop.length; j++) {
            var post = displayItemsForLoop[j];
            var postIndex = isSinglePost ? selectedIndex : items.indexOf(post);
            var isFeaturedInLayout = !isSinglePost && faCfg && faCfg.show && faCfg.position === 'inLayout' && j === 0;
            var fiShow = Boolean(fiCfg.show !== false);
            var fiLayout = fiCfg.layoutMode === 'fullBleed' ? 'fullBleed' : fiCfg.layoutMode === 'rightJustified' ? 'rightJustified' : 'leftJustified';
            var fiImageWidth = Math.min(60, Math.max(25, parseInt(fiCfg.imageWidthPercent, 10) || 40));
            if (collectionLayout === 'listRows' && fiShow && (post.assetUrl || post.thumbnailUrl || (post.assets && post.assets[0] && post.assets[0].assetUrl))) {
              fiLayout = 'leftJustified';
              fiImageWidth = 28;
            }
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
            if (isFeaturedInLayout) article.classList.add('blog-overlay-featured-article');

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
              titleLink.setAttribute('data-analytics-element', 'postTitle');
              titleLink.setAttribute('data-post-index', String(postIndex));
              if (hasSearchQuery && searchQuery) {
                titleLink.setAttribute('data-search-term', searchQuery);
              }
              titleLink.textContent = post.title || 'Untitled';
              titleLink.style.color = 'inherit';
              titleLink.style.textDecoration = 'none';
              titleLink.style.cursor = 'pointer';
              h2.appendChild(titleLink);
            } else {
              h2.textContent = post.title || 'Untitled';
            }
            var appendTo = isSideBySide ? contentEl : article;
            if (isFeaturedInLayout) {
              var titleRow = document.createElement('div');
              titleRow.style.display = 'flex';
              titleRow.style.alignItems = 'center';
              titleRow.style.gap = '10px';
              titleRow.style.flexWrap = 'wrap';
              titleRow.appendChild(h2);
              var featuredBadge = document.createElement('span');
              featuredBadge.className = 'blog-overlay-featured-badge';
              featuredBadge.textContent = 'Featured';
              featuredBadge.style.display = 'inline-flex';
              featuredBadge.style.alignItems = 'center';
              featuredBadge.style.background = '#5B4FE8';
              featuredBadge.style.color = '#fff';
              featuredBadge.style.fontSize = '9px';
              featuredBadge.style.fontWeight = '700';
              featuredBadge.style.letterSpacing = '1.5px';
              featuredBadge.style.textTransform = 'uppercase';
              featuredBadge.style.padding = '2px 6px';
              featuredBadge.style.lineHeight = '1';
              featuredBadge.style.borderRadius = '2px';
              featuredBadge.style.flexShrink = '0';
              titleRow.appendChild(featuredBadge);
              appendTo.appendChild(titleRow);
            } else {
              appendTo.appendChild(h2);
            }

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
            if (isSinglePost) {
              body.innerHTML = post.body || '';
            } else if (collectionLayout === 'listRows') {
              var excerptText = self._truncateText(post.excerpt || post.body || '', 160);
              if (excerptText) {
                body.textContent = excerptText;
                body.style.fontSize = '0.9rem';
                body.style.color = '#666';
                body.style.lineHeight = '1.5';
              }
            } else {
              body.innerHTML = post.body || '';
            }
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

          if (usePagination && (paginationMode === 'infiniteScroll' ? (self._infiniteScrollLoaded < totalFiltered && totalFiltered > 0) : totalPages > 1)) {
            var paginationEl = document.createElement('nav');
            paginationEl.className = 'blog-overlay-pagination';
            paginationEl.setAttribute('aria-label', 'Pagination');
            paginationEl.style.display = 'flex';
            paginationEl.style.alignItems = 'center';
            paginationEl.style.justifyContent = paginationMode === 'infiniteScroll' ? 'center' : 'space-between';
            paginationEl.style.flexWrap = 'wrap';
            paginationEl.style.gap = '12px';
            paginationEl.style.marginTop = '24px';
            paginationEl.style.paddingTop = '20px';
            paginationEl.style.borderTop = '1px solid #eee';
            if (paginationMode === 'infiniteScroll') {
              var loadMoreBtn = document.createElement('button');
              loadMoreBtn.type = 'button';
              loadMoreBtn.textContent = 'Load more';
              loadMoreBtn.style.padding = '8px 24px';
              loadMoreBtn.style.fontSize = '0.9rem';
              loadMoreBtn.style.fontWeight = '500';
              loadMoreBtn.style.border = '1px solid #ddd';
              loadMoreBtn.style.borderRadius = '6px';
              loadMoreBtn.style.background = '#5B4FE8';
              loadMoreBtn.style.color = 'white';
              loadMoreBtn.style.cursor = 'pointer';
              loadMoreBtn.onmouseover = function() { loadMoreBtn.style.background = '#4a3fd4'; };
              loadMoreBtn.onmouseout = function() { loadMoreBtn.style.background = '#5B4FE8'; };
              loadMoreBtn.onclick = function() {
                self._infiniteScrollLoaded = Math.min(self._infiniteScrollLoaded + postsPerPage, totalFiltered);
                self._renderContent(self.items);
              };
              paginationEl.appendChild(loadMoreBtn);
            } else {
              var pagInfo = document.createElement('span');
              pagInfo.style.fontSize = '0.9rem';
              pagInfo.style.color = '#666';
              var start = (currentPage - 1) * postsPerPage + 1;
              var end = Math.min(currentPage * postsPerPage, totalFiltered);
              pagInfo.textContent = 'Showing ' + start + '–' + end + ' of ' + totalFiltered;
              paginationEl.appendChild(pagInfo);
              var pagBtns = document.createElement('div');
              pagBtns.style.display = 'flex';
              pagBtns.style.gap = '8px';
              var makePageBtn = function(label, page, disabled) {
                var btn = document.createElement('button');
                btn.type = 'button';
                btn.textContent = label;
                btn.style.padding = '6px 12px';
                btn.style.fontSize = '0.9rem';
                btn.style.border = '1px solid #ddd';
                btn.style.borderRadius = '6px';
                btn.style.background = disabled ? '#f5f5f5' : 'white';
                btn.style.cursor = disabled ? 'not-allowed' : 'pointer';
                btn.style.color = disabled ? '#999' : '#333';
                if (!disabled) {
                  btn.onclick = function() {
                    self._currentPage = page;
                    self._renderContent(self.items);
                  };
                }
                return btn;
              };
              pagBtns.appendChild(makePageBtn('Previous', currentPage - 1, currentPage <= 1));
              pagBtns.appendChild(makePageBtn('Next', currentPage + 1, currentPage >= totalPages));
              paginationEl.appendChild(pagBtns);
            }
            main.appendChild(paginationEl);
          }

          var leftSidebarWidth = leftSidebarCfg && leftSidebarCfg.width ? Math.min(400, Math.max(160, leftSidebarCfg.width)) : 240;
          var rightSidebarWidth = rightSidebarCfg && rightSidebarCfg.width ? Math.min(400, Math.max(160, rightSidebarCfg.width)) : 240;
          var leftSpaceAbove = leftSidebarCfg && typeof leftSidebarCfg.spaceAbove === 'number' ? Math.min(64, Math.max(0, leftSidebarCfg.spaceAbove)) : 0;
          var rightSpaceAbove = rightSidebarCfg && typeof rightSidebarCfg.spaceAbove === 'number' ? Math.min(64, Math.max(0, rightSidebarCfg.spaceAbove)) : 0;
          var leftSticky = leftSidebarCfg && leftSidebarCfg.sticky !== false;
          var rightSticky = rightSidebarCfg && rightSidebarCfg.sticky !== false;
          var leftSidebarEl = document.createElement('div');
          leftSidebarEl.style.display = 'flex';
          leftSidebarEl.style.flexDirection = 'column';
          leftSidebarEl.style.gap = '16px';
          leftSidebarEl.style.flexShrink = '0';
          leftSidebarEl.style.width = leftSidebarWidth + 'px';
          if (leftSpaceAbove > 0) leftSidebarEl.style.paddingTop = leftSpaceAbove + 'px';
          if (leftSticky) {
            leftSidebarEl.style.position = 'sticky';
            leftSidebarEl.style.top = (navbarOffset + 16) + 'px';
            leftSidebarEl.style.alignSelf = 'flex-start';
          } else {
            leftSidebarEl.style.position = 'static';
          }
          for (var lm = 0; lm < leftModules.length; lm++) leftSidebarEl.appendChild(leftModules[lm]);

          var rightSidebarEl = document.createElement('div');
          rightSidebarEl.style.display = 'flex';
          rightSidebarEl.style.flexDirection = 'column';
          rightSidebarEl.style.gap = '16px';
          rightSidebarEl.style.flexShrink = '0';
          rightSidebarEl.style.width = rightSidebarWidth + 'px';
          if (rightSpaceAbove > 0) rightSidebarEl.style.paddingTop = rightSpaceAbove + 'px';
          if (rightSticky) {
            rightSidebarEl.style.position = 'sticky';
            rightSidebarEl.style.top = (navbarOffset + 16) + 'px';
            rightSidebarEl.style.alignSelf = 'flex-start';
          } else {
            rightSidebarEl.style.position = 'static';
          }
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
                  var makeLink = function(text, href, onClick, analyticsEl) {
                    var a = document.createElement('a');
                    a.textContent = text;
                    a.href = href || '#';
                    a.style.textDecoration = 'none';
                    if (analyticsEl) a.setAttribute('data-analytics-element', analyticsEl);
                    a.onclick = function(e) {
                      if (onClick) {
                        e.preventDefault();
                        onClick();
                      }
                    };
                    return a;
                  };
                  var goToBlogIndex = function() {
                    self._categoryFilter = [];
                    self._tagFilter = [];
                    self._currentPage = 1;
                    self._searchQuery = '';
                    if (typeof window !== 'undefined') {
                      try { window.history.replaceState(null, '', window.location.pathname + (window.location.search || '')); } catch (err) {}
                    }
                    window.location.hash = '';
                    self._renderContent(self.items);
                  };
                  if (siteTitle) {
                    breadcrumbEl.appendChild(makeLink(siteTitle, blogIndexUrl, goToBlogIndex, 'breadcrumb'));
                    breadcrumbEl.appendChild(sep());
                  }
                  breadcrumbEl.appendChild(makeLink(blogName, blogIndexUrl, goToBlogIndex, 'breadcrumb'));
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
                            self._categoryFilter = [cat];
                            self._currentPage = 1;
                            window.location.hash = '';
                            self._renderContent(self.items);
                          };
                        })(catName), 'categoryTag'));
                      }
                    }
                    breadcrumbEl.appendChild(sep());
                    var postTitle = post.title || 'Untitled';
                    var postUrl = self._getPostUrl(post);
                    if (postUrl) {
                      breadcrumbEl.appendChild(makeLink(postTitle, postUrl, null, 'breadcrumb'));
                    } else {
                      var span = document.createElement('span');
                      span.textContent = postTitle;
                      breadcrumbEl.appendChild(span);
                    }
                  } else if (hasCategoryFilter || hasTagFilter) {
                    breadcrumbEl.appendChild(sep());
                    var filterParts = [];
                    if (hasCategoryFilter) filterParts = filterParts.concat(categoryFilter);
                    if (hasTagFilter) filterParts = filterParts.concat(tagFilter);
                    var span = document.createElement('span');
                    span.textContent = filterParts.join(', ');
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
                    self._currentPage = 1;
                    self._renderContent(self.items);
                    var q = searchInput.value.trim();
                    if (q) {
                      var resultsCount = self._searchPosts(self.items, q).length;
                      self._analyticsTrackSearchDebounced(q, resultsCount);
                    }
                  };
                  searchInput.onkeydown = function(e) {
                    if (e.key === 'Escape') {
                      searchInput.value = '';
                      self._searchQuery = '';
                      self._currentPage = 1;
                      self._renderContent(self.items);
                      searchInput.blur();
                    }
                  };
                  searchInput.className = 'blog-overlay-search-input';
                  searchWrap.appendChild(searchInput);
                  headerEl.appendChild(searchWrap);
                } else if (mod === 'filterByCategory') {
                  var catMod = self._createFilterByCategoryModule(items, null, false, 'header');
                  if (catMod) {
                    catMod.style.width = '100%';
                    catMod.style.minWidth = '0';
                    headerEl.appendChild(catMod);
                  }
                } else if (mod === 'filterByTag') {
                  var tagMod = self._createFilterByTagModule(items, null, false, 'header');
                  if (tagMod) {
                    tagMod.style.width = '100%';
                    tagMod.style.minWidth = '0';
                    headerEl.appendChild(tagMod);
                  }
                } else if (mod === 'filterByTagsAndCategories') {
                  var combinedMod = self._createFilterByTagsAndCategoriesModule(items, null, false, 'header');
                  if (combinedMod) {
                    combinedMod.style.width = '100%';
                    combinedMod.style.minWidth = '0';
                    headerEl.appendChild(combinedMod);
                  }
                } else if (mod === 'postSort') {
                  var sortMod = self._createPostSortModule(cfg, 200);
                  if (sortMod) {
                    sortMod.style.display = 'inline-block';
                    sortMod.style.marginRight = '16px';
                    headerEl.appendChild(sortMod);
                  }
                } else if (mod === 'emailCapture' && ecCfg) {
                  var ecHeaderForm = createEmailCaptureForm(ecCfg, 280);
                  if (ecHeaderForm) {
                    ecHeaderForm.style.display = 'inline-block';
                    ecHeaderForm.style.minWidth = '200px';
                    headerEl.appendChild(ecHeaderForm);
                  }
                } else if (mod === 'leadMagnet' && lmCfg && lmCfg.resourceTitle) {
                  var lmHeaderForm = createLeadMagnetForm(lmCfg, 280);
                  if (lmHeaderForm) {
                    lmHeaderForm.style.display = 'inline-block';
                    lmHeaderForm.style.minWidth = '200px';
                    headerEl.appendChild(lmHeaderForm);
                  }
                }
              }
              if (headerEl.childNodes.length > 0) main.insertBefore(headerEl, main.firstChild);
            }
          }

          if (footerContentCfg && footerContentCfg.show) {
            var fcModules = Array.isArray(footerContentCfg.modules) ? footerContentCfg.modules : [];
            if (fcModules.length > 0) {
              var footerHeight = Math.min(120, Math.max(32, parseInt(footerContentCfg.height, 10) || 48));
              var footerSideMargin = Math.min(80, Math.max(0, parseInt(footerContentCfg.sideMargin, 10) || 0));
              var footerEl = document.createElement('div');
              footerEl.className = 'blog-overlay-footer-content';
              footerEl.style.marginTop = '24px';
              footerEl.style.marginLeft = footerSideMargin + 'px';
              footerEl.style.marginRight = footerSideMargin + 'px';
              footerEl.style.paddingTop = '16px';
              footerEl.style.borderTop = '1px solid #eee';
              footerEl.style.display = 'flex';
              footerEl.style.flexDirection = 'row';
              footerEl.style.flexWrap = 'wrap';
              footerEl.style.gap = '24px';
              footerEl.style.alignItems = 'flex-start';
              footerEl.style.minHeight = footerHeight + 'px';
              for (var fm = 0; fm < fcModules.length; fm++) {
                var fmod = fcModules[fm];
                var fmodEl = null;
                if (fmod === 'relevantPosts') {
                  fmodEl = createRelevantPostsModule(220);
                  if (fmodEl) {
                    fmodEl.style.width = 'auto';
                    fmodEl.style.minWidth = '200px';
                    fmodEl.style.flex = '1 1 200px';
                  }
                } else if (fmod === 'authorProfiles' && isSinglePost && displayItems.length > 0) {
                  var authorResult = self._createAuthorProfilesModule(displayItems[0], cfg, 220);
                  fmodEl = authorResult ? createSidebarSection(authorResult.header, authorResult.content) : null;
                  if (fmodEl) {
                    fmodEl.style.width = 'auto';
                    fmodEl.style.minWidth = '200px';
                    fmodEl.style.flex = '1 1 200px';
                  }
                } else if (fmod === 'emailCapture' && ecCfg) {
                  var ecFooterForm = createEmailCaptureForm(ecCfg, 220);
                  fmodEl = ecFooterForm ? createSidebarSection(ecCfg.header || 'Email Capture', ecFooterForm) : null;
                  if (fmodEl) {
                    fmodEl.style.width = 'auto';
                    fmodEl.style.minWidth = '200px';
                    fmodEl.style.flex = '1 1 200px';
                  }
                } else if (fmod === 'leadMagnet' && lmCfg && lmCfg.resourceTitle) {
                  var lmFooterForm = createLeadMagnetForm(lmCfg, 220);
                  fmodEl = lmFooterForm ? createSidebarSection(lmCfg.resourceTitle, lmFooterForm) : null;
                  if (fmodEl) {
                    fmodEl.style.width = 'auto';
                    fmodEl.style.minWidth = '200px';
                    fmodEl.style.flex = '1 1 200px';
                  }
                }
                if (fmodEl) footerEl.appendChild(fmodEl);
              }
              if (footerEl.childNodes.length > 0) main.appendChild(footerEl);
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
      var lastAppliedOffset = navbarOffset;
      var applyNavbarOffset = function(offset) {
        if (offset <= 0 || !wrapper.parentNode) return;
        lastAppliedOffset = offset;
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
      var scheduleRecheck = function() {
        if (!wrapper.parentNode) return;
        var newOffset = self._getNavbarOffset();
        if (newOffset > lastAppliedOffset) applyNavbarOffset(newOffset);
      };
      requestAnimationFrame(function() {
        requestAnimationFrame(scheduleRecheck);
      });
      [150, 450, 800, 1500, 2500].forEach(function(delay) {
        setTimeout(scheduleRecheck, delay);
      });
      if (typeof ResizeObserver !== 'undefined') {
        var ro = new ResizeObserver(function() {
          scheduleRecheck();
        });
        var roTargets = document.querySelectorAll('header, .Header, #header, .header-announcement-bar, .Header-announcementBar, [data-section-type="header"]');
        for (var t = 0; t < roTargets.length && t < 5; t++) {
          try { ro.observe(roTargets[t]); } catch (e) { /* ignore */ }
        }
      }

      self._pageLoadTime = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();

      self._analyticsTrack('page_view', {
        view: isSinglePost ? 'post' : 'list',
        postId: isSinglePost && selectedIndex >= 0 && items[selectedIndex] ? (items[selectedIndex].id || null) : null,
        postIndex: isSinglePost && selectedIndex >= 0 ? selectedIndex : null,
        postCount: items.length,
        postTitle: isSinglePost && selectedIndex >= 0 && items[selectedIndex] ? (items[selectedIndex].title || null) : null,
        authorName: isSinglePost && selectedIndex >= 0 && items[selectedIndex] ? (function(p) {
          var a = p.author || (p.authors && p.authors[0]) || (p.contributors && p.contributors[0]);
          return a && (a.displayName || a.name) ? String(a.displayName || a.name) : null;
        })(items[selectedIndex]) : null
      }, isSinglePost && selectedIndex >= 0 && items[selectedIndex] ? (items[selectedIndex].id || null) : null, isSinglePost && selectedIndex >= 0 ? selectedIndex : null);

      wrapper.addEventListener('click', function(ev) {
        var t = ev.target;
        while (t && t !== wrapper) {
          var el = t.getAttribute && t.getAttribute('data-analytics-element');
          if (el) {
            self._analyticsTrack('click', { element: el });
            var searchTerm = t.getAttribute && t.getAttribute('data-search-term');
            var postIdx = t.getAttribute && t.getAttribute('data-post-index');
            if (searchTerm && postIdx != null) {
              self._analyticsTrack('search_click', { term: searchTerm, postIndex: parseInt(postIdx, 10) });
            }
            break;
          }
          t = t.parentElement;
        }
      });

      if (isSinglePost && selectedIndex >= 0) {
        var postBody = main.querySelector('article .blog-overlay-body, article [class*="body"], article .post-body, article');
        if (postBody) {
          var depthsSent = {};
          var checkDepth = function() {
            var scrollTarget = self._getScrollContainer() || window;
            var scrollTop = scrollTarget === window ? (window.scrollY || document.documentElement.scrollTop) : scrollTarget.scrollTop;
            var viewportHeight = scrollTarget === window ? window.innerHeight : scrollTarget.clientHeight;
            var elTop = postBody.getBoundingClientRect().top + (scrollTarget === window ? scrollTop : scrollTarget.scrollTop);
            var elHeight = postBody.offsetHeight;
            if (elHeight <= 0) return;
            var scrollBottom = scrollTop + viewportHeight;
            var readRatio = (scrollBottom - elTop) / elHeight;
            var depth = readRatio >= 1 ? 100 : readRatio >= 0.75 ? 75 : readRatio >= 0.5 ? 50 : readRatio >= 0.25 ? 25 : 0;
            if (depth > 0 && !depthsSent[depth]) {
              depthsSent[depth] = true;
              var post = items[selectedIndex];
              self._analyticsTrack('scroll_depth', { depth: depth }, post ? post.id : null, selectedIndex);
            }
          };
          var scrollTarget = self._getScrollContainer() || window;
          var onScroll = function() { checkDepth(); };
          scrollTarget.addEventListener('scroll', onScroll, { passive: true });
          setTimeout(checkDepth, 500);
        }
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
