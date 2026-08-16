/**
 * Squarespace Blog Overlay - Renderer Script
 *
 * This script renders the custom blog layout overlay.
 * It uses Squarespace's blog JSON data combined with user config.
 */

(function() {
  'use strict';

  var BB_POST_CONTENT_TOP_PADDING = 25;

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

  /**
   * Squarespace blog ?format=json includes comment counts on items but not comment bodies.
   * Native comments are loaded via the same-origin endpoint their templates use (see universal comments bundle).
   */
  function bbUnwrapSquarespaceCommentRow(raw) {
    if (!raw || typeof raw !== 'object') return null;
    return raw.comment && typeof raw.comment === 'object' ? raw.comment : raw;
  }

  /** Squarespace APIs may use ms, seconds since epoch, or ISO strings; field names vary. */
  function bbParseSquarespaceCommentCreatedMs(r) {
    if (!r || typeof r !== 'object') return null;
    var candidates = [r.createdOn, r.addedOn, r.updatedOn, r.createdTimestamp, r.publishedOn];
    for (var i = 0; i < candidates.length; i++) {
      var v = candidates[i];
      if (v === undefined || v === null || v === '') continue;
      if (typeof v === 'string') {
        var trimmed = v.trim();
        var parsed = Date.parse(trimmed);
        if (!isNaN(parsed)) return parsed;
        var num = parseFloat(trimmed);
        if (!isNaN(num) && num > 0) {
          if (num < 1e11) return Math.round(num * 1000);
          return Math.round(num);
        }
        continue;
      }
      if (typeof v === 'number' && !isNaN(v) && v > 0) {
        if (v < 1e11) return Math.round(v * 1000);
        return Math.round(v);
      }
    }
    return null;
  }

  /** Lucide `thumbs-up` icon (same paths as lucide-react; matches dashboard Comments.tsx). */
  function bbLucideThumbsUpSvg() {
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('width', '16');
    svg.setAttribute('height', '16');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.style.display = 'block';
    svg.style.flexShrink = '0';
    var p1 = document.createElementNS(ns, 'path');
    p1.setAttribute('d', 'M7 10v12');
    var p2 = document.createElementNS(ns, 'path');
    p2.setAttribute(
      'd',
      'M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z'
    );
    svg.appendChild(p1);
    svg.appendChild(p2);
    return svg;
  }

  function bbLooksLikeHtml(s) {
    return typeof s === 'string' && /<\/?[a-z][\s\S]*>/i.test(s);
  }

  function bbStripDangerousFromCommentRoot(root) {
    if (!root || !root.querySelectorAll) return;
    var bad = root.querySelectorAll('script, style, iframe, object, embed, form, input, textarea, select, button, meta, link, base');
    for (var bi = bad.length - 1; bi >= 0; bi--) bad[bi].remove();
    var all = root.querySelectorAll('*');
    for (var j = 0; j < all.length; j++) {
      var el = all[j];
      var attrs = el.attributes;
      for (var k = attrs.length - 1; k >= 0; k--) {
        var an = attrs[k].name.toLowerCase();
        var av = attrs[k].value || '';
        if (an.indexOf('on') === 0) el.removeAttribute(attrs[k].name);
        if ((an === 'href' || an === 'src' || an === 'xlink:href') && /^\s*javascript:/i.test(av)) el.removeAttribute(attrs[k].name);
      }
    }
  }

  function bbCollectImportedExternalIds(comments) {
    var set = {};
    function walk(arr) {
      if (!arr || !arr.length) return;
      for (var i = 0; i < arr.length; i++) {
        var c = arr[i];
        if (c && c.external_comment_id != null && String(c.external_comment_id).trim() !== '') {
          set[String(c.external_comment_id)] = true;
        }
        walk(c.replies);
      }
    }
    walk(comments);
    return set;
  }

  function bbFilterSqByImported(sqRoots, importedSet) {
    function filt(nodes) {
      var out = [];
      if (!nodes || !nodes.length) return out;
      for (var i = 0; i < nodes.length; i++) {
        var node = nodes[i];
        var sid = String(node && node.id ? node.id : '').replace(/^sq:/, '');
        if (sid && importedSet[sid]) continue;
        var copy = Object.assign({}, node);
        copy.replies = filt(node.replies || []);
        out.push(copy);
      }
      return out;
    }
    return filt(sqRoots || []);
  }

  function bbFillCommentBodyElement(el, c) {
    if (c.comment_deleted === true || c.comment_deleted === 1) {
      el.textContent = '[deleted]';
      return;
    }
    var text = (c.body && String(c.body)) || '';
    if ((c.bb_legacy_squarespace || c.imported_from_squarespace) && bbLooksLikeHtml(text)) {
      try {
        var doc = new DOMParser().parseFromString(text, 'text/html');
        bbStripDangerousFromCommentRoot(doc.body);
        while (doc.body.firstChild) el.appendChild(doc.body.firstChild);
        bbStripDangerousFromCommentRoot(el);
        if (!el.childNodes.length) el.textContent = text;
        return;
      } catch (e) {}
    }
    el.textContent = text;
  }

  /** diffHours = (now - commentDate) in hours; returns null to use an absolute date instead. */
  function bbFormatRelativeCommentTime(diffHours) {
    if (diffHours < 0) diffHours = 0;
    if (diffHours < 1 / 60) return 'Just now';
    if (diffHours < 1) {
      var mins = Math.max(1, Math.round(diffHours * 60));
      return mins === 1 ? '1 minute ago' : mins + ' minutes ago';
    }
    if (diffHours < 24) {
      var hrs = Math.floor(diffHours);
      if (hrs < 1) hrs = 1;
      return hrs === 1 ? '1 hour ago' : hrs + ' hours ago';
    }
    if (diffHours < 168) {
      var days = Math.floor(diffHours / 24);
      if (days < 1) days = 1;
      return days === 1 ? '1 day ago' : days + ' days ago';
    }
    if (diffHours < 1344) {
      var wks = Math.floor(diffHours / 168);
      if (wks < 1) wks = 1;
      return wks === 1 ? '1 week ago' : wks + ' weeks ago';
    }
    return null;
  }

  function bbSquarespaceCommentApproved(c) {
    if (!c || c.status === undefined || c.status === null) return true;
    return c.status === 1 || c.status === 'APPROVED';
  }

  function bbBuildSquarespaceCommentTree(flat) {
    if (!flat || !flat.length) return [];
    var rows = [];
    for (var i = 0; i < flat.length; i++) {
      var u = bbUnwrapSquarespaceCommentRow(flat[i]);
      if (u && bbSquarespaceCommentApproved(u)) rows.push(u);
    }
    var map = {};
    for (var j = 0; j < rows.length; j++) {
      var r = rows[j];
      var sid = r.id !== undefined && r.id !== null ? String(r.id) : '';
      if (!sid) continue;
      var createdMs = bbParseSquarespaceCommentCreatedMs(r);
      var created_at = createdMs != null && !isNaN(createdMs) ? new Date(createdMs).toISOString() : null;
      map[sid] = {
        id: 'sq:' + sid,
        display_name: (r.authorName && String(r.authorName).trim()) || 'Anonymous',
        verified_subscriber: false,
        body: (r.body && String(r.body)) || '',
        like_count: typeof r.likeCount === 'number' ? r.likeCount : 0,
        created_at: created_at,
        replies: [],
        bb_legacy_squarespace: true
      };
    }
    var roots = [];
    for (var k = 0; k < rows.length; k++) {
      var raw = rows[k];
      var idStr = raw.id !== undefined && raw.id !== null ? String(raw.id) : '';
      if (!idStr || !map[idStr]) continue;
      var node = map[idStr];
      var pid = raw.parentId !== undefined && raw.parentId !== null ? String(raw.parentId) : '';
      if (pid && map[pid]) {
        map[pid].replies.push(node);
      } else {
        roots.push(node);
      }
    }
    function sortByCreated(a, b) {
      var ta = a.created_at ? new Date(a.created_at).getTime() : 0;
      var tb = b.created_at ? new Date(b.created_at).getTime() : 0;
      return ta - tb;
    }
    roots.sort(sortByCreated);
    for (var ri = 0; ri < roots.length; ri++) {
      (function sortDeep(n) {
        if (n.replies && n.replies.length) {
          n.replies.sort(sortByCreated);
          for (var x = 0; x < n.replies.length; x++) sortDeep(n.replies[x]);
        }
      })(roots[ri]);
    }
    return roots;
  }

  function bbFetchSquarespaceCommentsForPost(post) {
    return new Promise(function(resolve) {
      var id = post && post.id !== undefined && post.id !== null ? String(post.id).trim() : '';
      if (!id) {
        resolve([]);
        return;
      }
      var rt = post.recordType !== undefined && post.recordType !== null ? post.recordType : 1;
      var origin = '';
      try {
        origin = window.location.origin || '';
      } catch (e) {}
      if (!origin) {
        resolve([]);
        return;
      }
      var allFlat = [];
      var page = 1;
      var maxPages = 60;
      function next() {
        if (page > maxPages) {
          resolve(bbBuildSquarespaceCommentTree(allFlat));
          return;
        }
        var params = new URLSearchParams();
        params.set('targetId', id);
        params.set('targetType', String(rt));
        params.set('page', String(page));
        params.set('since', '');
        params.set('sortBy', '');
        var url = origin + '/api/comment/GetComments?' + params.toString();
        fetch(url, { credentials: 'same-origin', headers: { Accept: 'application/json' } })
          .then(function(res) {
            if (!res.ok) throw new Error('GetComments ' + res.status);
            return res.json();
          })
          .then(function(data) {
            var chunk = (data && data.comments) || [];
            for (var ci = 0; ci < chunk.length; ci++) allFlat.push(chunk[ci]);
            if (chunk.length === 0) {
              resolve(bbBuildSquarespaceCommentTree(allFlat));
              return;
            }
            page++;
            next();
          })
          .catch(function() {
            resolve(bbBuildSquarespaceCommentTree(allFlat));
          });
      }
      next();
    });
  }

  window.BlogOverlayRenderer = {
    config: null,
    items: [],
    _searchQuery: '',
    _categoryFilter: [],
    _tagFilter: [],
    _currentPage: 1,
    _infiniteScrollLoaded: 0,
    _lastInfiniteScrollSignature: '',
    _analyticsQueue: [],
    _analyticsFlushScheduled: null,
    _analyticsSearchDebounce: null,
    _pageLoadTime: null,
    _analyticsPageContextPostId: null,
    _analyticsPageContextPostIndex: null,
    _progressScrollHandler: null,
    _progressScrollTarget: null,
    _tocScrollHandler: null,
    _tocScrollTarget: null,
    _renderSeq: 0,
    _renderContentInProgress: false,
    _placeholderImageMap: null,
    _placeholderMapFetchKey: null,
    _placeholderMapFetchInFlight: null,
    _editorModeObserver: null,
    _paywallAuthObserver: null,
    _paywallAuthDebounce: null,
    _lastPaywallAuthSnapshot: null,
    _paywallFullySuppressed: false,
    _suppressedByEditorMode: false,
    _originalRootChildren: null,
    _rootInjectionGuard: null,
    _rootInjectionGuardTarget: null,
    _searchRenderTimer: null,
    _SEARCH_RENDER_DEBOUNCE_MS: 260,
    _lastCollectionShellKey: '',
    _fatalBailed: false,
    _fatalReason: null,
    _squarespaceJsonIdentity: null,
    _currentPageJsonIdentity: null,
    _currentPageAuthProbeUrl: null,
    _memberAccountsEnabledHint: false,
    _lastBlogRoutePathname: null,
    _lastBlogRouteSearch: '',
    _lastBlogRouteHash: '',
    _lastAuthDebugSig: null,
    _lastPaywallDebugSig: null,
    _lastTocDebugViewSig: null,
    _htmlTextCache: null,
    _readingTimeCache: null,
    _searchableTextCache: null,
    _blogJsonPageCount: 0,
    _paginationGen: 0,
    _perfReported: false,

    _bailToNative: function(reason, err) {
      if (this._fatalBailed) return;
      this._fatalBailed = true;
      this._fatalReason = reason || 'unknown';
      console.error('[BlogOverlay] Fatal render error; disabling overlay and falling back to native Squarespace.', {
        reason: this._fatalReason,
        error: err && err.message ? err.message : err
      });
      try { this._stopRootInjectionGuard(); } catch (e0) {}
      try { this._removeOverlayNodes(); } catch (e1) {}
      try { this._restoreOriginalRootChildren(); } catch (e2) {}
      try {
        var bb = document.getElementById('bb-comments');
        if (bb && bb.parentNode) bb.parentNode.removeChild(bb);
      } catch (e3) {}
      try { this._clearBootstrapLoading(); } catch (e4) {}
    },

    _guard: function(label, fn) {
      if (this._fatalBailed) return null;
      try {
        return fn();
      } catch (err) {
        this._bailToNative(label, err);
        return null;
      }
    },

    _isDebugEnabled: function() {
      try {
        var params = new URLSearchParams(window.location.search || '');
        return params.get('bbPreviewDebug') === '1';
      } catch (e) {
        return false;
      }
    },

    _isAuthDebugEnabled: function() {
      try {
        var params = new URLSearchParams(window.location.search || '');
        return params.get('bbAuthDebug') === '1' || params.get('bbPreviewDebug') === '1';
      } catch (e) {
        return false;
      }
    },

    /** Live / embed: add ?bbPaywallDebug=1 (or bbAuthDebug=1 / bbPreviewDebug=1) to log paywall + reader state. */
    _isPaywallDebugEnabled: function() {
      try {
        var params = new URLSearchParams(window.location.search || '');
        return params.get('bbPaywallDebug') === '1'
          || params.get('bbAuthDebug') === '1'
          || params.get('bbPreviewDebug') === '1';
      } catch (e) {
        return false;
      }
    },

    _debugLog: function(label, payload) {
      if (!this._isDebugEnabled()) return;
      if (payload !== undefined) console.log('[BlogOverlay][debug] ' + label, payload);
      else console.log('[BlogOverlay][debug] ' + label);
    },

    _authDebug: function(label, payload) {
      if (!this._isAuthDebugEnabled()) return;
      if (payload !== undefined) console.log('[BlogOverlay][auth-debug] ' + label, payload);
      else console.log('[BlogOverlay][auth-debug] ' + label);
    },

    _paywallDebug: function(label, payload) {
      if (!this._isPaywallDebugEnabled()) return;
      if (payload !== undefined) console.log('[BlogOverlay][paywall-debug] ' + label, payload);
      else console.log('[BlogOverlay][paywall-debug] ' + label);
    },

    /** Add ?bbTocDebug=1 to the page URL (or bbPreviewDebug=1) to log Table of Contents wiring. */
    _isTocDebugEnabled: function() {
      try {
        var params = new URLSearchParams(window.location.search || '');
        return params.get('bbTocDebug') === '1' || params.get('bbPreviewDebug') === '1';
      } catch (e) {
        return false;
      }
    },

    _tocDebug: function(label, payload) {
      if (!this._isTocDebugEnabled()) return;
      if (payload !== undefined) console.log('[BlogOverlay][toc-debug] ' + label, payload);
      else console.log('[BlogOverlay][toc-debug] ' + label);
    },

    _emitPaywallRenderDebug: function(vs, extra) {
      if (!this._isPaywallDebugEnabled() || !vs) return;
      var cfg = this.config || {};
      var path = '';
      try {
        path = (typeof window !== 'undefined' && window.location && window.location.pathname) ? window.location.pathname : '';
      } catch (e) {}
      var isSinglePost = Boolean(vs.isSinglePost);
      var viewerMode = vs.viewerMode || null;
      var paywallShowFooter = Boolean(vs.paywallShowFooter);
      var paywallFullActive = Boolean(vs.paywallFullActive);
      var pds = cfg.paywallDetectionState || null;
      var sig = path + '|' + (isSinglePost ? 'post' : 'collection') + '|' + String(viewerMode) + '|' + (paywallShowFooter ? '1' : '0') + '|' + String(pds) + '|' + (paywallFullActive ? '1' : '0');
      if (sig === this._lastPaywallDebugSig) return;
      this._lastPaywallDebugSig = sig;
      var domMode = null;
      var ctxMode = null;
      try {
        domMode = this._detectViewerModeFromDom();
      } catch (e1) {}
      try {
        ctxMode = this._detectViewerModeFromSquarespaceContext();
      } catch (e2) {}
      var isPaywalled = this._isPaywalledSite();
      var reasonIfNoFooter = null;
      if (!paywallShowFooter) {
        if (!isPaywalled) reasonIfNoFooter = 'config_missing_detected_paywalled';
        else if (viewerMode !== 'loggedOut') reasonIfNoFooter = 'viewer_not_logged_out';
        else if (paywallFullActive) reasonIfNoFooter = 'squarespace_full_page_paywall';
      }
      this._paywallDebug('state', Object.assign({
        pathname: path,
        isSinglePost: isSinglePost,
        paywallDetectionState: pds,
        paywallMode: cfg.paywallMode || null,
        viewerModeConfig: cfg.viewerMode != null ? cfg.viewerMode : null,
        viewerModeQuery: this._getViewerModeFromQueryParam(),
        viewerModeResolved: viewerMode,
        viewerModeDom: domMode,
        viewerModeContext: ctxMode,
        memberAccountsEnabledHint: Boolean(this._memberAccountsEnabledHint),
        memberGatePresent: this._isMemberGatePresent(),
        isPaywalledSite: isPaywalled,
        paywallFullActive: paywallFullActive,
        paywallShowFooter: paywallShowFooter,
        paywallReplaceCollectionTeaser: Boolean(vs.paywallReplaceCollectionTeaser),
        likelyCollectionIndex: this._isLikelyBlogCollectionIndexView(),
        hasSquarespacePostListing: this._hasSquarespacePostListing(),
        previewMode: Boolean(this._previewMode || (cfg.previewMode === true)),
        bbPreview: Boolean(this._bbPreview),
        paywallFooterSuppressedBecause: reasonIfNoFooter
      }, extra || {}));
    },

    _emitAuthDebugSnapshot: function(source) {
      if (!this._isAuthDebugEnabled()) return;
      var cfg = this.config || {};
      var contextIdentity = null;
      var hasContext = false;
      try {
        hasContext = Boolean(window.Static && window.Static.SQUARESPACE_CONTEXT);
        contextIdentity = this._extractSquarespaceIdentityFromObject(window.Static && window.Static.SQUARESPACE_CONTEXT);
      } catch (e) {}
      var domMode = this._detectViewerModeFromDom();
      var resolvedMode = this._resolveViewerMode();
      var jsonIdentity = this._squarespaceJsonIdentity || null;
      var sig = JSON.stringify({
        mode: resolvedMode,
        ctx: contextIdentity ? contextIdentity.loggedIn : null,
        json: jsonIdentity ? jsonIdentity.loggedIn : null,
        dom: domMode,
        paywallMode: cfg.paywallMode || null,
        paywallDetectionState: cfg.paywallDetectionState || null,
        memberAccountsEnabledHint: Boolean(this._memberAccountsEnabledHint),
        memberGatePresent: this._isMemberGatePresent()
      });
      if (sig === this._lastAuthDebugSig) return;
      this._lastAuthDebugSig = sig;
      this._authDebug(source || 'snapshot', {
        resolvedMode: resolvedMode,
        contextAvailable: hasContext,
        contextIdentity: contextIdentity,
        jsonIdentity: jsonIdentity,
        domMode: domMode,
        paywallMode: cfg.paywallMode || null,
        paywallDetectionState: cfg.paywallDetectionState || null,
        memberAccountsEnabledHint: Boolean(this._memberAccountsEnabledHint),
        memberGatePresent: this._isMemberGatePresent()
      });
    },

    _featuredDebugEnabled: function() {
      return Boolean(this.config && this.config.previewFeaturedDebug) || this._isDebugEnabled();
    },

    _hasEditClass: function(el) {
      if (!el || !el.classList) return false;
      return el.classList.contains('sqs-edit-mode-active')
        || el.classList.contains('sqs-edit-mode')
        || el.classList.contains('sqs-site-styles-editing');
    },

    _isSquarespaceEditingUi: function() {
      if (this._previewMode || (this.config && this.config.previewMode) || this._bbPreview || this._hasBbPreviewParam()) return false;
      if (this._hasEditClass(document.documentElement) || this._hasEditClass(document.body)) return true;
      var markers = [
        'iframe#sqs-site-frame',
        '.sqs-edit-mode',
        '.sqs-editor-window',
        '[data-sqs-editor]',
        '[data-sqs-edit-mode]'
      ];
      for (var i = 0; i < markers.length; i++) {
        try {
          if (document.querySelector(markers[i])) return true;
        } catch (e) {}
      }
      return false;
    },

    _removeOverlayNodes: function() {
      this._clearPendingSearchRender();
      var root = this._root || (this.config && this.config.rootEl) || findBlogContainer() || document.getElementById('blogga-blogga-root');
      var removeIn = function(node) {
        if (!node || !node.querySelectorAll) return;
        var overlays = node.querySelectorAll('#blog-overlay-list, #blog-overlay-progress');
        for (var i = 0; i < overlays.length; i++) {
          if (overlays[i] && overlays[i].parentNode) overlays[i].parentNode.removeChild(overlays[i]);
        }
      };
      removeIn(root);
      if (!root || root !== document) removeIn(document);
    },

    _restoreOriginalRootChildren: function() {
      var root = this._root;
      if (!root || !this._originalRootChildren || this._originalRootChildren.length === 0) return;
      var hasNonOverlayChildren = false;
      for (var i = 0; i < root.childNodes.length; i++) {
        var c = root.childNodes[i];
        if (c && c.id !== 'blog-overlay-list' && c.id !== 'blog-overlay-progress') {
          hasNonOverlayChildren = true;
          break;
        }
      }
      if (hasNonOverlayChildren) return;
      for (var j = 0; j < this._originalRootChildren.length; j++) {
        var n = this._originalRootChildren[j];
        if (n && !n.parentNode) root.appendChild(n);
      }
    },

    /**
     * Squarespace's blog Y bundles can occasionally re-inject native blog
     * markup into the same container BetterBlog took over — most often when
     * Squarespace's SPA router hydrates post-DOMContentLoaded. Once the
     * loading overlay has been cleared, any such injection is a visible
     * "flash of Squarespace blog" inside BetterBlog's container.
     *
     * This guard watches `root` for direct-child additions that aren't ours
     * and removes them synchronously. Set up at the end of _renderContent,
     * torn down at the start of the next render and on every bail/edit/paywall
     * path that intentionally hands the container back to Squarespace.
     */
    _startRootInjectionGuard: function(root) {
      if (this._previewMode || this._bbPreview) return;
      if (typeof MutationObserver !== 'function' || !root) return;
      if (this._rootInjectionGuard && this._rootInjectionGuardTarget === root) return;
      this._stopRootInjectionGuard();
      // #region agent log
      console.warn('[BB-DEBUG-7918cd] rootInjectionGuard STARTED on', root.tagName, root.id || '(no id)', root.className || '(no class)');
      // #endregion
      var self = this;
      this._rootInjectionGuard = new MutationObserver(function(mutations) {
        for (var m = 0; m < mutations.length; m++) {
          var added = mutations[m].addedNodes;
          if (!added) continue;
          for (var n = 0; n < added.length; n++) {
            var node = added[n];
            if (!node || node.nodeType !== 1) continue;
            if (node.id === 'blog-overlay-list' || node.id === 'blog-overlay-progress') continue;
            // #region agent log
            console.warn('[BB-DEBUG-7918cd] rootInjectionGuard REMOVING node:', node.tagName, node.id || '', node.className || '', 'hypothesisId=H3');
            // #endregion
            try {
              if (node.parentNode === root) root.removeChild(node);
            } catch (e) { /* ignore */ }
          }
        }
      });
      try {
        this._rootInjectionGuard.observe(root, { childList: true });
        this._rootInjectionGuardTarget = root;
      } catch (e) {
        this._rootInjectionGuard = null;
        this._rootInjectionGuardTarget = null;
      }
    },

    _stopRootInjectionGuard: function() {
      if (!this._rootInjectionGuard) {
        this._rootInjectionGuardTarget = null;
        return;
      }
      try { this._rootInjectionGuard.disconnect(); } catch (e) { /* ignore */ }
      this._rootInjectionGuard = null;
      this._rootInjectionGuardTarget = null;
    },

    _onEditorModeChange: function() {
      // #region agent log
      var _editorNow = this._isSquarespaceEditingUi();
      var _inIframe = window.parent !== window;
      console.warn('[BB-DEBUG-7918cd] _onEditorModeChange fired: isEditUi=' + _editorNow + ' wasSuppressed=' + this._suppressedByEditorMode + ' inIframe=' + _inIframe + ' htmlClasses=' + (document.documentElement ? document.documentElement.className : ''));
      // #endregion
      if (this._isSquarespaceEditingUi()) {
        this._suppressedByEditorMode = true;
        this._stopRootInjectionGuard();
        this._removeOverlayNodes();
        this._restoreOriginalRootChildren();
        return;
      }
      if (this._suppressedByEditorMode) {
        this._suppressedByEditorMode = false;
        if (this.items.length > 0) this._renderContent(this.items);
        else this.render();
      }
    },

    _startEditorModeObserver: function() {
      if (this._editorModeObserver || this._previewMode || this._bbPreview) return;
      var self = this;
      this._editorModeObserver = new MutationObserver(function() {
        self._onEditorModeChange();
      });
      if (document.documentElement) {
        this._editorModeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
      }
      if (document.body) {
        this._editorModeObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
      }
    },

    _truthyFeaturedFlag: function(v) {
      if (v === true || v === 1) return true;
      if (typeof v === 'string') {
        var s = v.trim().toLowerCase();
        return s === 'true' || s === '1' || s === 'yes';
      }
      return false;
    },

    /** Squarespace JSON-T / ?format=json uses several keys for “featured” blog posts */
    _itemIsSquarespaceFeatured: function(it) {
      if (!it || typeof it !== 'object') return false;
      var keys = ['featured', 'isFeatured', 'Featured', 'starred', 'isStarred', 'pinned', 'isPinned', 'promoted', 'isPromoted'];
      for (var i = 0; i < keys.length; i++) {
        if (this._truthyFeaturedFlag(it[keys[i]])) return true;
      }
      return false;
    },

    _getCollectionFeaturedRefIds: function() {
      var coll = this._collection;
      if (!coll || typeof coll !== 'object') return [];
      var out = [];
      var keyNames = ['featuredItemId', 'featuredId', 'featuredPostId', 'starredItemId', 'pinnedItemId', 'highlightedItemId', 'featuredItemRecordId'];
      for (var ki = 0; ki < keyNames.length; ki++) {
        var v = coll[keyNames[ki]];
        if (typeof v === 'string' && v.trim()) out.push(v.trim());
        else if (v && typeof v === 'object' && typeof v.id === 'string' && v.id.trim()) out.push(v.id.trim());
      }
      return out;
    },

    _itemMatchesFeaturedRef: function(it, refs) {
      if (!refs || !refs.length || !it) return false;
      var id = it.id != null ? String(it.id) : '';
      var fullUrl = it.fullUrl != null ? String(it.fullUrl) : '';
      var urlId = it.urlId != null ? String(it.urlId) : '';
      for (var ri = 0; ri < refs.length; ri++) {
        var ref = refs[ri];
        if (!ref) continue;
        if (id === ref || fullUrl === ref || urlId === ref) return true;
        if (fullUrl && (fullUrl === ref || fullUrl.indexOf(ref) >= 0)) return true;
      }
      return false;
    },

    _warnDuplicateValues: function(label, arr) {
      if (!this._isDebugEnabled() || !Array.isArray(arr) || arr.length < 2) return;
      var seen = {};
      var dups = [];
      for (var i = 0; i < arr.length; i++) {
        var key = String(arr[i]);
        if (seen[key]) dups.push(key);
        seen[key] = true;
      }
      if (dups.length > 0) {
        console.warn('[BlogOverlay][debug] Duplicate modules in ' + label, {
          duplicates: dups,
          modules: arr
        });
      }
    },

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
     * When Show Comments is off, remove BetterBlog comment UI and hide native Squarespace comment blocks.
     * When on, remove the global hide so _initComments can manage the threaded UI.
     */
    _setAllCommentUiHidden: function(hidden) {
      var STYLE_ID = 'bb-comments-fully-hidden';
      try {
        if (hidden) {
          var bb = document.getElementById('bb-comments');
          if (bb && bb.parentNode) bb.parentNode.removeChild(bb);
          if (!document.getElementById(STYLE_ID)) {
            var st = document.createElement('style');
            st.id = STYLE_ID;
            st.textContent =
              '.squarespace-comments,[data-block-type="comments"]{display:none!important;visibility:hidden!important;}';
            document.head.appendChild(st);
          }
        } else {
          var existing = document.getElementById(STYLE_ID);
          if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
        }
      } catch (e) {
        console.error('[BlogOverlay] _setAllCommentUiHidden error', e);
      }
    },

    _initComments: function(container, post, cfg) {
      var self = this;
      var cs = (cfg && cfg.commentSettings) || {};
      if (!cs.commentsEnabled) return;
      var vm = this._resolveViewerMode();
      if (
        vm !== 'loggedIn' &&
        this._isPaywalledSite() &&
        !this._isPaywallPublicPreviewPost(post)
      ) {
        return;
      }
      var baseUrl = (cfg && cfg.baseUrl) || '';
      var siteKey = (cfg && cfg.siteKey) || '';
      if (!baseUrl || !siteKey) return;
      var postId = (post && (post.id || post.fullUrl || post.title)) ? String(post.id || post.fullUrl || post.title) : null;
      if (!postId) return;

      var NAME_MAX = 100;
      var BODY_MAX = 5000;
      var EMAIL_MAX = 254;
      var bbCmtSurfaceCss =
        '#bb-comments input,#bb-comments textarea{background:transparent!important}';
      var bbCmtFocusCss =
        '#bb-comments input:focus,#bb-comments textarea:focus{outline:none!important;border:1px solid #bbb!important;box-shadow:none!important}';
      var style = document.getElementById('bb-comments-styles');
      if (!style) {
        style = document.createElement('style');
        style.id = 'bb-comments-styles';
        style.textContent =
          '.squarespace-comments .comment-form,.squarespace-comments .comment-form-wrapper,[data-block-type="comments"] form,.comment-count-link{display:none!important}' +
          bbCmtSurfaceCss +
          bbCmtFocusCss;
        document.head.appendChild(style);
      } else {
        if (style.textContent.indexOf('#bb-comments input,#bb-comments textarea{background') === -1) {
          style.textContent += bbCmtSurfaceCss;
        }
        if (style.textContent.indexOf('#bb-comments input:focus') === -1) {
          style.textContent += bbCmtFocusCss;
        }
      }

      var nativeBlock = document.querySelector('.squarespace-comments, [data-block-type="comments"]');
      function mountBbCommentsEl(el) {
        var inOverlay = container && (
          container.id === 'blog-overlay-main-posts' ||
          (container.closest && container.closest('#blog-overlay-list, .blog-overlay-wrapper'))
        );
        if (inOverlay || !nativeBlock) container.appendChild(el);
        else nativeBlock.insertAdjacentElement('afterend', el);
      }

      var existing = document.getElementById('bb-comments');
      if (existing) existing.remove();

      var bbDiv = document.createElement('section');
      bbDiv.id = 'bb-comments';
      bbDiv.className = 'bb-comments-section';
      self._applyStoryPostHorizontalInset(bbDiv, cfg);

      var apiUrl = baseUrl.replace(/\/+$/, '') + '/api/comments';
      function bbResolvePostPublishedAt(p) {
        if (!p || typeof p !== 'object') return null;
        var candidates = [p.publishDate, p.publishedOn, p.publishOn, p.addedOn, p.createdOn];
        for (var i = 0; i < candidates.length; i++) {
          var v = candidates[i];
          if (v === undefined || v === null || v === '') continue;
          return v;
        }
        return null;
      }
      function bbCommentsClosedForPost(p, closeAfterDays) {
        if (closeAfterDays == null || closeAfterDays <= 0) return false;
        var raw = bbResolvePostPublishedAt(p);
        if (raw == null || raw === '') return false;
        var dt = new Date(raw);
        if (isNaN(dt.getTime())) return false;
        var daysSince = (Date.now() - dt.getTime()) / (24 * 60 * 60 * 1000);
        return daysSince > closeAfterDays;
      }
      var commentsClosed = bbCommentsClosedForPost(post, cs.autoCloseAfterDays);
      var allowAnonymousComments = cs.allowAnonymousComments !== false;
      var subscriberCommentsEnabled = cs.subscriberCommentsEnabled === true;
      var loggedInOptionalEmail =
        allowAnonymousComments && !subscriberCommentsEnabled;
      var mergedSqRootsForComments = [];
      var commentSortOrder =
        cs.sortOrder === 'oldest' || cs.sortOrder === 'most_liked' ? cs.sortOrder : 'newest';
      function mergeSqAndBbForRender(sqRoots, data) {
        var bbList = (data && data.comments) || [];
        var imported = bbCollectImportedExternalIds(bbList);
        var merged = bbFilterSqByImported(sqRoots || [], imported).concat(bbList);
        function rootCreatedMs(c) {
          if (!c || !c.created_at) return 0;
          var t = new Date(c.created_at).getTime();
          return isNaN(t) ? 0 : t;
        }
        function rootLikeCount(c) {
          var n = c && c.like_count;
          return typeof n === 'number' && !isNaN(n) ? n : 0;
        }
        merged.sort(function(a, b) {
          if (commentSortOrder === 'oldest') return rootCreatedMs(a) - rootCreatedMs(b);
          if (commentSortOrder === 'most_liked') {
            var ld = rootLikeCount(b) - rootLikeCount(a);
            if (ld !== 0) return ld;
            return rootCreatedMs(b) - rootCreatedMs(a);
          }
          return rootCreatedMs(b) - rootCreatedMs(a);
        });
        return merged;
      }
      var refreshBetterBlogCommentsList = function() {};
      var verifiedCookieName = 'bb_verified_commenter_' + String(siteKey || 'site');
      function bbReadCookie(name) {
        try {
          var all = document.cookie ? document.cookie.split(';') : [];
          for (var i = 0; i < all.length; i++) {
            var part = all[i].trim();
            if (part.indexOf(name + '=') === 0) return decodeURIComponent(part.slice(name.length + 1));
          }
        } catch (e) {}
        return null;
      }
      function bbWriteCookie(name, value, days) {
        try {
          var maxAge = Math.max(1, Math.floor((days || 30) * 24 * 60 * 60));
          document.cookie = name + '=' + encodeURIComponent(value) + '; Path=/; Max-Age=' + maxAge + '; SameSite=Lax';
        } catch (e) {}
      }
      function bbGetVerifiedIdentity() {
        try {
          var raw = bbReadCookie(verifiedCookieName);
          if (!raw) return null;
          var parsed = JSON.parse(raw);
          if (!parsed || typeof parsed !== 'object') return null;
          var n = parsed.name ? String(parsed.name).trim() : '';
          var e = parsed.email ? String(parsed.email).trim() : '';
          if (!n || !e) return null;
          return { name: n, email: e };
        } catch (e) {
          return null;
        }
      }
      function bbSetVerifiedIdentity(name, email) {
        if (!name || !email) return;
        bbWriteCookie(verifiedCookieName, JSON.stringify({ name: String(name), email: String(email) }), 30);
      }
      function bbPromptForEmail(initialValue, done) {
        var overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box';
        var modal = document.createElement('div');
        modal.style.cssText = 'width:100%;max-width:420px;background:#fff;border-radius:10px;padding:18px 18px 14px;box-shadow:0 18px 40px rgba(0,0,0,.22);box-sizing:border-box';
        var title = document.createElement('div');
        title.textContent = 'Confirm your email';
        title.style.cssText = 'font-size:1rem;font-weight:600;color:#111;margin-bottom:10px';
        var input = document.createElement('input');
        input.type = 'email';
        input.name = 'email';
        input.placeholder = 'you@example.com';
        input.autocomplete = 'email';
        input.setAttribute('inputmode', 'email');
        input.setAttribute('autocapitalize', 'none');
        input.setAttribute('autocorrect', 'off');
        input.setAttribute('spellcheck', 'false');
        input.value = initialValue || '';
        input.style.cssText = 'display:block;width:100%;padding:10px 12px;border:1px solid #ddd;border-radius:6px;box-sizing:border-box;font-size:0.95rem;margin-bottom:10px';
        var msg = document.createElement('div');
        msg.style.cssText = 'min-height:16px;font-size:0.8rem;color:#b91c1c;margin-bottom:8px';
        var row = document.createElement('div');
        row.style.cssText = 'display:flex;gap:10px;justify-content:flex-end';
        var cancel = document.createElement('button');
        cancel.type = 'button';
        cancel.textContent = 'Cancel';
        cancel.style.cssText = 'padding:8px 14px;border:1px solid #ccc;border-radius:6px;background:#fff;color:#444;cursor:pointer';
        var ok = document.createElement('button');
        ok.type = 'button';
        ok.textContent = 'Continue';
        ok.style.cssText = 'padding:8px 16px;border:none;border-radius:6px;color:#fff;cursor:pointer';
        ok.style.background = 'var(--bb-accent, #5B4FE8)';
        function close(ret) {
          if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
          if (typeof done === 'function') done(ret);
        }
        cancel.onclick = function() { close(null); };
        ok.onclick = function() {
          var em = (input.value || '').trim();
          if (!em || em.indexOf('@') < 1) {
            msg.textContent = 'Please enter a valid email.';
            try { input.focus(); } catch (e) {}
            return;
          }
          close(em);
        };
        overlay.onclick = function(ev) { if (ev.target === overlay) close(null); };
        row.appendChild(cancel);
        row.appendChild(ok);
        modal.appendChild(title);
        modal.appendChild(input);
        modal.appendChild(msg);
        modal.appendChild(row);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        try { input.focus(); } catch (e) {}
      }

      var renderComments = function(comments, total) {
        var listEl = bbDiv.querySelector('.bb-comments-list');
        if (!listEl) return;
        listEl.innerHTML = '';
        var list = (comments || []).slice();
        var addComment = function(c, depth) {
          var depthLevel = typeof depth === 'number' && !isNaN(depth) ? depth : 0;
          var isDeletedStub = c.comment_deleted === true || c.comment_deleted === 1;
          var wrap = document.createElement('div');
          wrap.className = 'bb-comment' + (depthLevel > 0 ? ' bb-comment-reply' : '') + (isDeletedStub ? ' bb-comment-deleted' : '');
          wrap.style.marginBottom = depthLevel > 0 ? '12px' : '20px';
          wrap.style.paddingLeft = depthLevel > 0 ? depthLevel * 22 + 'px' : '0';
          var initials = isDeletedStub ? '—' : (c.display_name || '?').slice(0, 2).toUpperCase();
          var avatar = document.createElement('span');
          avatar.className = 'bb-comment-avatar';
          avatar.textContent = initials;
          avatar.style.cssText =
            'display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:50%;background:' +
            (isDeletedStub ? '#9ca3af' : 'var(--bb-accent, #5B4FE8)') +
            ';color:#fff;font-size:12px;font-weight:600;margin-right:10px;vertical-align:middle';
          var meta = document.createElement('span');
          meta.style.fontSize = '0.9rem';
          meta.style.color = isDeletedStub ? '#6b7280' : '#333';
          if (isDeletedStub) {
            meta.textContent = '[deleted]';
          } else {
            meta.textContent = '';
            var nameSpanEl = document.createElement('span');
            nameSpanEl.textContent = c.display_name || 'Anonymous';
            meta.appendChild(nameSpanEl);
            if (c.verified_subscriber) {
              var verSpan = document.createElement('span');
              verSpan.style.color = 'var(--bb-accent, #5B4FE8)';
              verSpan.style.fontSize = '11px';
              verSpan.textContent = ' \u2713';
              meta.appendChild(verSpan);
            }
            var commentEmailRaw = c.email != null ? String(c.email).trim() : '';
            if (commentEmailRaw) {
              var emailSpanEl = document.createElement('span');
              emailSpanEl.style.color = '#666';
              emailSpanEl.style.fontSize = '0.85em';
              emailSpanEl.textContent = ' (' + commentEmailRaw + ')';
              meta.appendChild(emailSpanEl);
            }
          }
          var time = document.createElement('span');
          time.style.fontSize = '0.8rem';
          time.style.color = '#999';
          time.style.marginLeft = '8px';
          var created = c.created_at ? new Date(c.created_at) : null;
          if (created && !isNaN(created.getTime())) {
            var now = new Date();
            var diffH = (now - created) / 1000 / 60 / 60;
            var rel = bbFormatRelativeCommentTime(diffH);
            time.textContent = rel != null
              ? rel
              : created.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
          }
          var row1 = document.createElement('div');
          row1.style.marginBottom = '4px';
          row1.appendChild(avatar);
          row1.appendChild(meta);
          if (time.textContent) row1.appendChild(time);
          wrap.appendChild(row1);
          var body = document.createElement('div');
          bbFillCommentBodyElement(body, c);
          body.style.marginBottom = '6px';
          body.style.fontSize = '0.95rem';
          body.style.lineHeight = '1.5';
          if (isDeletedStub) {
            body.style.fontStyle = 'italic';
            body.style.color = '#6b7280';
          }
          wrap.appendChild(body);
          var actions = document.createElement('div');
          actions.style.fontSize = '0.8rem';
          actions.style.color = '#999';
          var threadingOn = cs.allowThreadedReplies !== false;
          var replyMode = currentCommentViewerMode().mode;
          var showReply =
            !commentsClosed &&
            !isDeletedStub &&
            threadingOn &&
            c.id &&
            (allowAnonymousComments || replyMode === 'loggedIn');
          if (!isDeletedStub) {
            var likeBtn = document.createElement('button');
            likeBtn.type = 'button';
            likeBtn.style.cssText =
              'display:inline-flex;align-items:center;gap:6px;background:none;border:none;cursor:pointer;color:inherit;font-size:inherit;font-family:inherit;padding:0;vertical-align:middle';
            likeBtn.appendChild(bbLucideThumbsUpSvg());
            var likeCountEl = document.createElement('span');
            likeCountEl.textContent = String(c.like_count || 0);
            likeBtn.appendChild(likeCountEl);
            if (!c.bb_legacy_squarespace && cs.allowLikes !== false) {
              likeBtn.onclick = function() {
                fetch(apiUrl + '/' + c.id + '/like', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'X-BetterBlog-Site-Token': siteKey },
                  body: JSON.stringify({ siteKey: siteKey }),
                  credentials: 'omit'
                }).then(function(r) { return r.json(); }).then(function(data) {
                  if (data && typeof data.like_count === 'number') {
                    likeCountEl.textContent = String(data.like_count);
                  }
                });
              };
            }
            actions.appendChild(likeBtn);
          }
          if (showReply) {
            var replyBtn = document.createElement('button');
            replyBtn.type = 'button';
            replyBtn.textContent = 'Reply';
            replyBtn.style.cssText = 'background:none;border:none;cursor:pointer;color:var(--bb-accent, #5B4FE8);margin-left:12px;font-size:inherit;font-family:inherit;padding:0';
            var replyFormShell = document.createElement('div');
            replyFormShell.className = 'bb-comment-inline-reply';
            replyFormShell.style.cssText = 'display:none;margin-top:14px;margin-left:28px;padding:14px 16px 16px 18px;border-left:3px solid var(--bb-accent-15, #d4cef7);border-radius:0 8px 8px 0;background:transparent;box-sizing:border-box;width:calc(100% - 28px)';
            var replyFormTitle = document.createElement('div');
            replyFormTitle.textContent = 'Write a reply';
            replyFormTitle.style.cssText = 'font-size:0.9rem;font-weight:600;color:#1a1a1a;margin-bottom:10px';
            replyFormShell.appendChild(replyFormTitle);
            var rName = document.createElement('input');
            rName.type = 'text';
            rName.placeholder = allowAnonymousComments ? 'Name (optional)' : 'Name (required)';
            rName.setAttribute('maxlength', String(NAME_MAX));
            rName.className = 'bb-form-input';
            rName.style.marginBottom = '8px';
            replyFormShell.appendChild(rName);
            var rEmail = document.createElement('input');
            rEmail.type = 'email';
            rEmail.placeholder = 'Email (optional)';
            rEmail.setAttribute('maxlength', String(EMAIL_MAX));
            rEmail.autocomplete = 'email';
            rEmail.className = 'bb-form-input';
            rEmail.style.marginBottom = '10px';
            replyFormShell.appendChild(rEmail);
            var rBody = document.createElement('textarea');
            rBody.placeholder = 'Reply (required)';
            rBody.setAttribute('maxlength', String(BODY_MAX));
            rBody.rows = 3;
            rBody.className = 'bb-form-input';
            rBody.style.marginBottom = '4px';
            rBody.style.resize = 'vertical';
            replyFormShell.appendChild(rBody);
            var rBodyCount = document.createElement('div');
            rBodyCount.className = 'bb-comment-char-counter';
            rBodyCount.style.marginBottom = '10px';
            replyFormShell.appendChild(rBodyCount);
            var rRow = document.createElement('div');
            rRow.style.cssText = 'display:flex;flex-wrap:wrap;gap:10px;align-items:center';
            var rSubmit = document.createElement('button');
            rSubmit.type = 'button';
            rSubmit.textContent = 'Post reply';
            rSubmit.className = 'sqs-button-element--primary';
            rSubmit.style.cssText = 'margin-top:4px;cursor:not-allowed;opacity:0.55';
            rSubmit.disabled = true;
            function rReplySync() {
              var modeNow = currentCommentViewerMode().mode;
              var nm = (rName.value || '').trim();
              var bd = (rBody.value || '').trim();
              rBodyCount.textContent = BODY_MAX - rBody.value.length + ' characters left';
              var ok = modeNow === 'loggedIn' ? !!bd : (allowAnonymousComments ? !!bd : !!nm && !!bd);
              rSubmit.disabled = !ok;
              rSubmit.style.opacity = ok ? '1' : '0.55';
              rSubmit.style.cursor = ok ? 'pointer' : 'not-allowed';
            }
            rName.oninput = rEmail.oninput = rBody.oninput = rReplySync;
            rReplySync();
            var rCancel = document.createElement('button');
            rCancel.type = 'button';
            rCancel.textContent = 'Cancel';
            rCancel.style.cssText = 'padding:8px 16px;font-size:0.95rem;background:transparent;color:#555;border:1px solid #ccc;border-radius:6px;cursor:pointer';
            rRow.appendChild(rSubmit);
            rRow.appendChild(rCancel);
            replyFormShell.appendChild(rRow);
            var parentCommentId = String(c.id);
            var replyEmailOverride = null;
            replyBtn.onclick = function() {
              var wasOpen = replyFormShell.style.display === 'block';
              var allInline = listEl.querySelectorAll('.bb-comment-inline-reply');
              for (var ri = 0; ri < allInline.length; ri++) allInline[ri].style.display = 'none';
              if (wasOpen) return;
              replyFormShell.style.display = 'block';
              try {
                if (nameInput && nameInput.value && !rName.value) rName.value = nameInput.value;
                if (emailInput && emailInput.value && !rEmail.value) rEmail.value = emailInput.value;
              } catch (e) {}
              if (currentCommentViewerMode().mode === 'loggedIn') {
                rName.style.display = 'none';
                rEmail.style.display = loggedInOptionalEmail ? 'block' : 'none';
              } else {
                rName.style.display = 'block';
                rEmail.style.display = 'block';
              }
              rReplySync();
              try { rBody.focus(); } catch (e2) {}
            };
            rCancel.onclick = function() {
              replyFormShell.style.display = 'none';
            };
            rSubmit.onclick = function() {
              var modeNow = currentCommentViewerMode().mode;
              var nm = (rName.value || '').trim();
              var bd = (rBody.value || '').trim();
              if (modeNow !== 'loggedIn' && !allowAnonymousComments && !nm) { rName.focus(); return; }
              if (!bd) { rBody.focus(); return; }
              var verifiedIdentity = bbGetVerifiedIdentity();
              var loggedInEmail = verifiedIdentity && verifiedIdentity.email ? verifiedIdentity.email : (replyEmailOverride || (rEmail.value || '').trim() || null);
              if (modeNow === 'loggedIn' && !loggedInOptionalEmail && !loggedInEmail) {
                bbPromptForEmail(rEmail.value || (emailInput && emailInput.value) || '', function(confirmedEmail) {
                  if (!confirmedEmail) return;
                  replyEmailOverride = confirmedEmail;
                  rSubmit.onclick();
                });
                return;
              }
              rSubmit.disabled = true;
              rSubmit.style.opacity = '0.55';
              rSubmit.style.cursor = 'not-allowed';
              rSubmit.textContent = 'Posting…';
              var payload = {
                post_id: postId,
                display_name: modeNow === 'loggedIn' ? '' : nm,
                body: bd,
                siteKey: siteKey,
                parent_id: parentCommentId,
                post_title: (post && post.title) || null,
                post_published_at: bbResolvePostPublishedAt(post),
                post_url: (post && (post.fullUrl || post.url)) || null
              };
              var rEm = modeNow === 'loggedIn' ? loggedInEmail : (rEmail.value || '').trim();
              if (rEm) payload.email = rEm;
              if (post && post.recordType != null && String(parentCommentId).indexOf('sq:') === 0) {
                payload.squarespace_record_type = post.recordType;
              }
              if (cs.hcaptchaSiteKey && typeof window.hcaptcha !== 'undefined') {
                try {
                  var tok = window.hcaptcha.getResponse && window.hcaptcha.getResponse();
                  if (tok) payload.hcaptcha_token = tok;
                } catch (e3) {}
              }
              fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-BetterBlog-Site-Token': siteKey },
                body: JSON.stringify(payload),
                credentials: 'omit'
              })
                .then(function(r) { return r.json(); })
                .then(function(data) {
                  rSubmit.textContent = 'Post reply';
                  if (data && data.id) {
                    if (modeNow === 'loggedIn' && data.verified_subscriber && rEm) {
                      bbSetVerifiedIdentity(data.display_name || 'Member', rEm);
                    }
                    replyFormShell.style.display = 'none';
                    rBody.value = '';
                    rEmail.value = '';
                    rReplySync();
                    if (data.status === 'pending') {
                      var pend = document.createElement('p');
                      pend.className = 'bb-comment-reply-pending-note';
                      pend.style.cssText = 'margin:10px 0 0;font-size:0.85rem;color:#666;padding-left:4px';
                      pend.textContent = 'Your reply was submitted and is awaiting moderation.';
                      wrap.appendChild(pend);
                    } else {
                      refreshBetterBlogCommentsList();
                    }
                  } else {
                    var err = (data && data.error) || 'Failed to post';
                    rSubmit.textContent = err;
                    setTimeout(function() {
                      rSubmit.textContent = 'Post reply';
                      rReplySync();
                    }, 3500);
                    rReplySync();
                  }
                })
                .catch(function() {
                  rSubmit.textContent = 'Post reply';
                  rReplySync();
                });
            };
            actions.appendChild(replyBtn);
            wrap.appendChild(actions);
            wrap.appendChild(replyFormShell);
          } else if (actions.firstChild) {
            wrap.appendChild(actions);
          }
          listEl.appendChild(wrap);
          (c.replies || []).forEach(function(r) { addComment(r, depthLevel + 1); });
        };
        list.forEach(function(c) { addComment(c, 0); });
      };

      var listEl = document.createElement('div');
      listEl.className = 'bb-comments-list';
      listEl.style.marginBottom = '24px';
      bbDiv.appendChild(listEl);

      var bbCommentsPromise = fetch(apiUrl + '?post_id=' + encodeURIComponent(postId) + '&siteKey=' + encodeURIComponent(siteKey))
        .then(function(r) { return r.json(); })
        .catch(function() { return { comments: [], total: 0 }; });
      Promise.all([bbFetchSquarespaceCommentsForPost(post), bbCommentsPromise])
        .then(function(pair) {
          mergedSqRootsForComments = pair[0] || [];
          var data = pair[1] || {};
          var merged = mergeSqAndBbForRender(mergedSqRootsForComments, data);
          renderComments(merged, (data && data.total) || 0);
        })
        .catch(function() {});

      var formWrap = document.createElement('div');
      formWrap.className = 'bb-comment-form-wrap';
      formWrap.style.marginTop = '16px';

      var heading = document.createElement('h2');
      heading.className = 'bb-below-main-heading';
      heading.textContent = commentsClosed ? 'Comments are closed' : 'Leave a comment';
      formWrap.appendChild(heading);
      var guestOnlyNote = document.createElement('p');
      guestOnlyNote.style.cssText =
        'display:none;margin:0 0 12px 0;color:#666;font-size:0.92rem;max-width:520px;line-height:1.45';
      guestOnlyNote.textContent =
        'Anonymous comments are turned off. Sign in with your site member account to leave a comment.';
      formWrap.appendChild(guestOnlyNote);
      if (commentsClosed) {
        var closedMsg = document.createElement('p');
        closedMsg.style.cssText = 'margin:0;color:#666;font-size:0.92rem;max-width:560px;line-height:1.45';
        closedMsg.textContent = 'Comments on this post are closed.';
        formWrap.appendChild(closedMsg);
        bbDiv.appendChild(formWrap);
        mountBbCommentsEl(bbDiv);
        return;
      }
      var loggedInIdentityLine = document.createElement('div');
      loggedInIdentityLine.style.cssText = 'display:none;width:100%;box-sizing:border-box;margin:0 0 10px 0;font-size:0.9rem;color:#444';
      formWrap.appendChild(loggedInIdentityLine);

      var nameInput = document.createElement('input');
      nameInput.type = 'text';
      nameInput.placeholder = allowAnonymousComments ? 'Name (optional)' : 'Name (required)';
      nameInput.setAttribute('maxlength', String(NAME_MAX));
      nameInput.className = 'bb-form-input';
      nameInput.style.marginBottom = '10px';
      formWrap.appendChild(nameInput);

      var emailInput = document.createElement('input');
      emailInput.type = 'email';
      emailInput.placeholder = 'Email (optional)';
      emailInput.setAttribute('maxlength', String(EMAIL_MAX));
      emailInput.autocomplete = 'email';
      emailInput.className = 'bb-form-input';
      emailInput.style.marginBottom = '10px';
      formWrap.appendChild(emailInput);

      var identityNote = document.createElement('div');
      identityNote.style.cssText = 'display:none;width:100%;box-sizing:border-box;margin:0 0 10px 0;padding:8px 10px;border:1px solid #dbeafe;background:transparent;color:#1f4c8c;border-radius:6px;font-size:0.85rem;line-height:1.35';
      formWrap.appendChild(identityNote);

      var bodyArea = document.createElement('textarea');
      bodyArea.placeholder = 'Comment (required)';
      bodyArea.setAttribute('maxlength', String(BODY_MAX));
      bodyArea.rows = 4;
      bodyArea.className = 'bb-form-input';
      bodyArea.style.marginBottom = '4px';
      bodyArea.style.resize = 'vertical';
      formWrap.appendChild(bodyArea);
      var mainBodyCount = document.createElement('div');
      mainBodyCount.className = 'bb-comment-char-counter';
      mainBodyCount.style.marginBottom = '10px';
      formWrap.appendChild(mainBodyCount);

      var submitBtn = document.createElement('button');
      submitBtn.type = 'button';
      submitBtn.textContent = 'Post Comment';
      submitBtn.className = 'sqs-button-element--primary';
      submitBtn.style.cssText = 'margin-top:4px;cursor:not-allowed;opacity:0.55';
      submitBtn.disabled = true;
      function mainFormSync() {
        var modeNow = currentCommentViewerMode().mode;
        var nm = (nameInput.value || '').trim();
        var bd = (bodyArea.value || '').trim();
        mainBodyCount.textContent = BODY_MAX - bodyArea.value.length + ' characters left';
        var guestsMayPost = allowAnonymousComments || modeNow === 'loggedIn';
        var ok = guestsMayPost && (modeNow === 'loggedIn' ? !!bd : (allowAnonymousComments ? !!bd : !!nm && !!bd));
        submitBtn.disabled = !ok;
        submitBtn.style.opacity = ok ? '1' : '0.55';
        submitBtn.style.cursor = ok ? 'pointer' : 'not-allowed';
      }

      function currentCommentViewerMode() {
        var mode = self._resolveViewerMode();
        var id = self._extractSquarespaceIdentity ? self._extractSquarespaceIdentity() : null;
        if (id && id.loggedIn === true) mode = 'loggedIn';
        return { mode: mode, identity: id };
      }

      function applyCommentIdentityMode() {
        var resolved = currentCommentViewerMode();
        var mode = resolved.mode;
        var id = resolved.identity || null;
        var verifiedIdentity = bbGetVerifiedIdentity();
        var guestsMayPost = allowAnonymousComments || mode === 'loggedIn';
        if (!guestsMayPost) {
          heading.textContent = 'Sign in to comment';
          guestOnlyNote.style.display = 'block';
          nameInput.style.display = 'none';
          emailInput.style.display = 'none';
          bodyArea.style.display = 'none';
          mainBodyCount.style.display = 'none';
          submitBtn.style.display = 'none';
          identityNote.style.display = 'none';
          identityNote.textContent = '';
          loggedInIdentityLine.style.display = 'none';
          loggedInIdentityLine.textContent = '';
        } else if (mode === 'loggedIn') {
          heading.textContent = 'Leave a comment';
          guestOnlyNote.style.display = 'none';
          nameInput.style.display = 'none';
          emailInput.style.display = loggedInOptionalEmail ? 'block' : 'none';
          emailInput.placeholder = 'Email (optional)';
          bodyArea.style.display = 'block';
          mainBodyCount.style.display = 'block';
          submitBtn.style.display = 'inline-block';
          identityNote.style.display = 'none';
          identityNote.textContent = '';
          if (verifiedIdentity) {
            loggedInIdentityLine.style.display = 'block';
            loggedInIdentityLine.textContent =
              'Logged in as ' + verifiedIdentity.name + ' (' + verifiedIdentity.email + ')';
          } else {
            loggedInIdentityLine.style.display = 'none';
            loggedInIdentityLine.textContent = '';
          }
        } else {
          heading.textContent = 'Leave a comment';
          guestOnlyNote.style.display = 'none';
          nameInput.style.display = 'block';
          emailInput.style.display = 'block';
          emailInput.placeholder = 'Email (optional)';
          bodyArea.style.display = 'block';
          mainBodyCount.style.display = 'block';
          submitBtn.style.display = 'inline-block';
          identityNote.style.display = 'none';
          loggedInIdentityLine.style.display = 'none';
          loggedInIdentityLine.textContent = '';
        }
        mainFormSync();
        self._emitAuthDebugSnapshot('comments.formMode');
        self._authDebug('comments.formMode.details', {
          mode: mode,
          identityName: id && id.name ? id.name : null,
          identityEmailPresent: Boolean(id && id.email),
          nameInputVisible: nameInput.style.display !== 'none',
          emailInputVisible: emailInput.style.display !== 'none'
        });
      }

      nameInput.oninput = emailInput.oninput = bodyArea.oninput = mainFormSync;
      applyCommentIdentityMode();
      // Auth UI can mount asynchronously; probe a few times, then stop.
      setTimeout(function() { applyCommentIdentityMode(); }, 250);
      setTimeout(function() { applyCommentIdentityMode(); }, 1200);
      setTimeout(function() { applyCommentIdentityMode(); }, 2500);
      var authProbeCount = 0;
      var authProbeTimer = setInterval(function() {
        authProbeCount++;
        applyCommentIdentityMode();
        if (authProbeCount >= 12) clearInterval(authProbeTimer);
      }, 500);

      refreshBetterBlogCommentsList = function() {
        return fetch(apiUrl + '?post_id=' + encodeURIComponent(postId) + '&siteKey=' + encodeURIComponent(siteKey))
          .then(function(r) { return r.json(); })
          .then(function(d) {
            var merged = mergeSqAndBbForRender(mergedSqRootsForComments, d);
            renderComments(merged, (d && d.total) || 0);
          })
          .catch(function() {});
      };

      var mainEmailOverride = null;
      function submitMainCommentWithEmail(modeNow, name, body, emailToUse) {
        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.55';
        submitBtn.style.cursor = 'not-allowed';
        submitBtn.textContent = 'Posting…';
        var payload = {
          post_id: postId,
          display_name: modeNow === 'loggedIn' ? '' : name,
          body: body,
          siteKey: siteKey,
          post_title: (post && post.title) || null,
          post_published_at: bbResolvePostPublishedAt(post),
          post_url: (post && (post.fullUrl || post.url)) || null
        };
        if (emailToUse) payload.email = emailToUse;
        if (cs.hcaptchaSiteKey && typeof window.hcaptcha !== 'undefined') {
          try {
            var token = window.hcaptcha.getResponse && window.hcaptcha.getResponse();
            if (token) payload.hcaptcha_token = token;
          } catch (e) {}
        }
        fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-BetterBlog-Site-Token': siteKey },
          body: JSON.stringify(payload),
          credentials: 'omit'
        })
          .then(function(r) { return r.json(); })
          .then(function(data) {
            submitBtn.textContent = 'Post Comment';
            if (data && data.id) {
              if (modeNow === 'loggedIn' && data.verified_subscriber && emailToUse) {
                bbSetVerifiedIdentity(data.display_name || 'Member', emailToUse);
              }
              bodyArea.value = '';
              if (data.status === 'pending') {
                var msg = document.createElement('p');
                msg.style.color = '#666';
                msg.style.fontSize = '0.9rem';
                msg.textContent = 'Your comment is awaiting moderation.';
                formWrap.appendChild(msg);
              } else {
                var afterPostMode = currentCommentViewerMode().mode;
                if (afterPostMode !== 'loggedIn') {
                  nameInput.value = '';
                  emailInput.value = '';
                }
                applyCommentIdentityMode();
                refreshBetterBlogCommentsList();
              }
              mainFormSync();
            } else {
              var err = (data && data.error) || 'Failed to post';
              submitBtn.textContent = err;
              setTimeout(function() {
                submitBtn.textContent = 'Post Comment';
                mainFormSync();
              }, 3000);
              mainFormSync();
            }
          })
          .catch(function() {
            submitBtn.textContent = 'Post Comment';
            mainFormSync();
          });
      }

      submitBtn.onclick = function() {
        var modeNow = currentCommentViewerMode().mode;
        var name = (nameInput.value || '').trim();
        var body = (bodyArea.value || '').trim();
        if (modeNow !== 'loggedIn' && !allowAnonymousComments && !name) { nameInput.focus(); return; }
        if (!body) { bodyArea.focus(); return; }
        if (modeNow === 'loggedIn') {
          var verifiedIdentity = bbGetVerifiedIdentity();
          var typedEmail = (emailInput && emailInput.value) ? (emailInput.value || '').trim() : '';
          var useEmail = verifiedIdentity && verifiedIdentity.email ? verifiedIdentity.email : mainEmailOverride;
          if (loggedInOptionalEmail) {
            submitMainCommentWithEmail(modeNow, name, body, typedEmail || useEmail || null);
            return;
          }
          if (!useEmail) {
            bbPromptForEmail(typedEmail || '', function(confirmedEmail) {
              if (!confirmedEmail) return;
              mainEmailOverride = confirmedEmail;
              submitMainCommentWithEmail(modeNow, name, body, confirmedEmail);
            });
            return;
          }
          submitMainCommentWithEmail(modeNow, name, body, useEmail);
          return;
        }
        submitMainCommentWithEmail(modeNow, name, body, (emailInput.value || '').trim() || null);
      };
      formWrap.appendChild(submitBtn);

      bbDiv.appendChild(formWrap);

      mountBbCommentsEl(bbDiv);
    },

    /** Remove loader.js full-screen spinner / scroll lock (native blog visible again). */
    _clearBootstrapLoading: function() {
      try {
        if (typeof window !== 'undefined' && typeof window.__bbClearBootstrapLoading === 'function') {
          window.__bbClearBootstrapLoading();
        }
      } catch (e) { /* ignore */ }
    },

    /** Re-show the Header preload overlay (SPA route changes, hash post picks). */
    _armBootstrapLoading: function() {
      if (this._previewMode || this._bbPreview) return;
      try {
        if (typeof window !== 'undefined' && typeof window.__bbInstallBootstrapLoading === 'function') {
          window.__bbInstallBootstrapLoading();
          return;
        }
      } catch (e) { /* ignore */ }
      try {
        if (document.documentElement && document.documentElement.classList) {
          document.documentElement.classList.add('bb-loading-blog');
        }
      } catch (e2) { /* ignore */ }
    },

    _isBootstrapLoadingActive: function() {
      try {
        return Boolean(
          document.documentElement &&
          document.documentElement.classList &&
          document.documentElement.classList.contains('bb-loading-blog')
        );
      } catch (e) {
        return false;
      }
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
      this._perfMark('rendererInit');
      this._perfReported = false;
      var previewMode = Boolean(this.config.previewMode);
      var bbPreview = this._hasBbPreviewParam();
      this._previewMode = previewMode;
      this._bbPreview = bbPreview;

      // #region agent log
      var _rendererDbg = {
        previewMode: previewMode,
        bbPreview: bbPreview,
        inIframe: window.parent !== window,
        pathname: window.location.pathname,
        href: window.location.href,
        htmlClasses: document.documentElement ? document.documentElement.className : '(none)',
        bodyClasses: document.body ? document.body.className : '(none)',
        hasBbLoadingClass: document.documentElement ? document.documentElement.classList.contains('bb-loading-blog') : false,
        isEditUi: (!previewMode && !bbPreview) ? this._isSquarespaceEditingUi() : 'skipped'
      };
      console.warn('[BB-DEBUG-7918cd] renderer.init', JSON.stringify(_rendererDbg));
      fetch('http://127.0.0.1:7779/ingest/21c07440-19af-4cd8-979a-7d2c134d7467',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'7918cd'},body:JSON.stringify({sessionId:'7918cd',location:'renderer.js:init',message:'renderer init state',data:_rendererDbg,timestamp:Date.now(),hypothesisId:'H1,H2'})}).catch(function(){});
      // #endregion

      if (!previewMode && !bbPreview && this._isSquarespaceEditingUi()) {
        console.log('[BlogOverlay] Skipping render: Squarespace edit mode active');
        // #region agent log
        console.warn('[BB-DEBUG-7918cd] renderer BAILED: edit mode detected');
        // #endregion
        this._suppressedByEditorMode = true;
        this._startEditorModeObserver();
        this._clearBootstrapLoading();
        return;
      }

      if (!previewMode) {
        var blogPath = this._currentBlogPathForRouteMatch();
        var pathname = window.location.pathname || '/';
        if (this._isOnBlogRoute(pathname, blogPath)) this._rememberCurrentBlogRoute();
        // #region agent log
        try {
          this._ensureBlogRouteHydrated();
          console.warn('[BB-DEBUG-d12b8c] init routeGate', JSON.stringify({
            pathname: pathname,
            blogPath: blogPath,
            isOnBlogRoute: this._isOnBlogRoute(pathname, blogPath),
            isTransientAccountDrawerRoute: this._isTransientAccountDrawerRoute(pathname),
            lastBlogRoutePathname: this._lastBlogRoutePathname || null,
            isOnEffectiveBlogRoute: this._isOnEffectiveBlogRoute(),
            viewerMode: this._resolveViewerMode()
          }));
          fetch('http://127.0.0.1:7779/ingest/21c07440-19af-4cd8-979a-7d2c134d7467',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'d12b8c'},body:JSON.stringify({sessionId:'d12b8c',location:'renderer.js:init.routeGate',message:'init route gate decision',data:{pathname:pathname,blogPath:blogPath,isTransientAccountDrawerRoute:this._isTransientAccountDrawerRoute(pathname),lastBlogRoutePathname:this._lastBlogRoutePathname||null,isOnEffectiveBlogRoute:this._isOnEffectiveBlogRoute()},timestamp:Date.now(),hypothesisId:'H3'})}).catch(function(){});
        } catch (e) {}
        // #endregion
        if (!this._isOnEffectiveBlogRoute()) {
          console.log('[BlogOverlay] Skipping render: not on blog route (path:', pathname, ', blogPath:', blogPath, ')');
          this._clearBootstrapLoading();
          return;
        }
        // #region agent log
        try {
          fetch('http://127.0.0.1:7779/ingest/21c07440-19af-4cd8-979a-7d2c134d7467',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'d12b8c'},body:JSON.stringify({sessionId:'d12b8c',location:'renderer.js:init.paywallBranch',message:'init paywall branch decision',data:{
            isPaywalledSite: this._isPaywalledSite(),
            viewerMode: this._resolveViewerMode(),
            fullPaywallActive: this._isSquarespaceFullPaywallActive(),
            isLikelyCollectionIndex: this._isLikelyBlogCollectionIndexView(),
            hasSquarespacePostListing: this._hasSquarespacePostListing(),
            selectedIndexFromHash: this._getSelectedIndexFromHash(),
            pathname: pathname
          },timestamp:Date.now(),hypothesisId:'H1,H2'})}).catch(function(){});
        } catch (e) {}
        // #endregion
        if (this._isSquarespaceFullPaywallActive()) {
          console.log('[BlogOverlay] Full collection paywall (Squarespace owns page); skipping overlay');
          this._paywallFullySuppressed = true;
          this._startPaywallAuthObserver();
          this._clearBootstrapLoading();
          return;
        }
      }
      this._paywallFullySuppressed = false;

      var root = this.config.rootEl || findBlogContainer() || document.getElementById('blogga-blogga-root');
      if (!root) {
        console.log('[BlogOverlay] Skipping render: no blog container found');
        this._clearBootstrapLoading();
        return;
      }
      this._root = root;
      this._startEditorModeObserver();
      this._suppressedByEditorMode = false;
      console.log('[BlogOverlay] Renderer initialized with config:', this.config, 'showRecentPostsSidebar:', !!this.config.showRecentPostsSidebar);
      this._debugLog('init', {
        previewMode: previewMode,
        bbPreview: bbPreview,
        path: typeof window !== 'undefined' ? window.location.pathname + window.location.hash : '',
        rootTag: root && root.tagName ? root.tagName : null,
        rootId: root && root.id ? root.id : null,
        hasCollectionConfig: Boolean(this.config && this.config.collectionConfig),
        hasPostConfig: Boolean(this.config && this.config.postConfig),
        previewSelectedPostIndex: this.config && typeof this.config.previewSelectedPostIndex === 'number'
          ? this.config.previewSelectedPostIndex
          : null
      });
      this._emitAuthDebugSnapshot('init.beforeRender');

      var self = this;
      window.addEventListener('hashchange', function() {
        if (self.items.length) {
          if (!previewMode && !bbPreview) self._armBootstrapLoading();
          self._renderContent(self.items);
          if (!previewMode && !bbPreview) self._clearBootstrapLoading();
        }
        if (bbPreview && window.parent !== window) {
          var idx = self._getSelectedIndex(self.items);
          window.parent.postMessage({ type: 'BETTERBLOG_PREVIEW_POST_SELECTED', postIndex: idx }, '*');
        }
      });
      if (!previewMode && !bbPreview) {
        this._startRouteChangeObserver();
      }

      if (bbPreview) {
        this._setupPreviewMessageListener();
        this._setupPreviewNavGuard();
      }

      var self = this;
      var sendTimeOnPage = function() {
        if (self._pageLoadTime != null) {
          var elapsed = (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now()) - self._pageLoadTime;
          self._analyticsTrack(
            'time_on_page',
            { seconds: Math.round(elapsed / 1000) },
            self._analyticsPageContextPostId,
            self._analyticsPageContextPostIndex
          );
          self._analyticsFlush();
          self._pageLoadTime = null;
        }
      };
      document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'hidden') sendTimeOnPage();
      });
      window.addEventListener('beforeunload', sendTimeOnPage);
      window.addEventListener('pagehide', sendTimeOnPage);

      this._startPaywallAuthObserver();
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

    _routeSignature: function() {
      if (typeof window === 'undefined' || !window.location) return '';
      return (window.location.pathname || '/') + '|' + (window.location.search || '') + '|' + (window.location.hash || '');
    },

    _currentBlogPathForRouteMatch: function() {
      return (this.config && this.config.blogPath) || this._getBlogCollectionPath();
    },

    _isTransientAccountDrawerRoute: function(pathname) {
      if (!pathname || typeof pathname !== 'string') return false;
      var p = pathname.replace(/\/+$/, '') || '/';
      return p === '/digital-products' || p.indexOf('/digital-products/') === 0
        || p === '/account/digital-products' || p.indexOf('/account/digital-products/') === 0;
    },

    _blogRouteStorageKey: function() {
      var siteKey = this.config && this.config.siteKey ? String(this.config.siteKey) : '';
      var blogPath = this.config && this.config.blogPath ? String(this.config.blogPath) : '';
      return 'betterBlog.lastBlogRoute:' + siteKey + ':' + blogPath;
    },

    /**
     * Squarespace's member-area login does an Ajax navigation to the account
     * drawer (/account/digital-products), which re-executes the injected loader
     * and creates a brand-new renderer with empty in-memory route state. Persist
     * the last blog route in sessionStorage so that fresh renderer can still
     * recognize the transient drawer route as "effectively on the blog" and
     * render behind/after the drawer without requiring a manual reload.
     */
    _persistBlogRoute: function() {
      if (typeof window === 'undefined' || !window.sessionStorage) return;
      try {
        window.sessionStorage.setItem(this._blogRouteStorageKey(), JSON.stringify({
          pathname: this._lastBlogRoutePathname,
          search: this._lastBlogRouteSearch || '',
          hash: this._lastBlogRouteHash || '',
          ts: Date.now()
        }));
      } catch (e) {}
    },

    /** Hydrate in-memory last-blog-route from sessionStorage when this (possibly fresh) renderer has none. */
    _ensureBlogRouteHydrated: function() {
      if (this._lastBlogRoutePathname) return;
      if (typeof window === 'undefined' || !window.sessionStorage) return;
      try {
        var raw = window.sessionStorage.getItem(this._blogRouteStorageKey());
        if (!raw) return;
        var parsed = JSON.parse(raw);
        var ts = parsed && typeof parsed.ts === 'number' ? parsed.ts : 0;
        if (!parsed || !parsed.pathname || !ts || Date.now() - ts > 30 * 60 * 1000) {
          window.sessionStorage.removeItem(this._blogRouteStorageKey());
          return;
        }
        this._lastBlogRoutePathname = parsed.pathname;
        this._lastBlogRouteSearch = parsed.search || '';
        this._lastBlogRouteHash = parsed.hash || '';
      } catch (e) {}
    },

    _rememberCurrentBlogRoute: function() {
      if (typeof window === 'undefined' || !window.location) return;
      var pathname = window.location.pathname || '/';
      var blogPath = this._currentBlogPathForRouteMatch();
      if (!this._isOnBlogRoute(pathname, blogPath)) return;
      this._lastBlogRoutePathname = pathname;
      this._lastBlogRouteSearch = window.location.search || '';
      this._lastBlogRouteHash = window.location.hash || '';
      this._persistBlogRoute();
    },

    _getEffectiveBlogPathname: function() {
      if (typeof window === 'undefined' || !window.location) return '/';
      var pathname = window.location.pathname || '/';
      var blogPath = this._currentBlogPathForRouteMatch();
      if (this._isOnBlogRoute(pathname, blogPath)) {
        this._rememberCurrentBlogRoute();
        return pathname;
      }
      if (this._isTransientAccountDrawerRoute(pathname)) {
        this._ensureBlogRouteHydrated();
        if (this._lastBlogRoutePathname) return this._lastBlogRoutePathname;
      }
      return pathname;
    },

    _isOnEffectiveBlogRoute: function() {
      if (typeof window === 'undefined' || !window.location) return false;
      var pathname = window.location.pathname || '/';
      var blogPath = this._currentBlogPathForRouteMatch();
      if (this._isOnBlogRoute(pathname, blogPath)) return true;
      if (!this._isTransientAccountDrawerRoute(pathname)) return false;
      this._ensureBlogRouteHydrated();
      return Boolean(this._lastBlogRoutePathname);
    },

    _startRouteChangeObserver: function() {
      if (this._routeChangeObserverInstalled || typeof window === 'undefined') return;
      this._routeChangeObserverInstalled = true;
      this._lastRouteSignature = this._routeSignature();
      var self = this;
      var onRouteChange = function() {
        setTimeout(function() {
          var sig = self._routeSignature();
          // #region agent log
          try {
            fetch('http://127.0.0.1:7779/ingest/21c07440-19af-4cd8-979a-7d2c134d7467',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'d12b8c'},body:JSON.stringify({sessionId:'d12b8c',location:'renderer.js:onRouteChange',message:'route change observed',data:{sig:sig,lastSig:self._lastRouteSignature,changed:sig!==self._lastRouteSignature,viewerMode:self._resolveViewerMode()},timestamp:Date.now(),hypothesisId:'H3'})}).catch(function(){});
          } catch (e) {}
          // #endregion
          if (sig === self._lastRouteSignature) return;
          self._lastRouteSignature = sig;
          var pathname = window.location && window.location.pathname ? window.location.pathname : '/';
          var blogPath = self._currentBlogPathForRouteMatch();
          if (self._isOnBlogRoute(pathname, blogPath)) self._rememberCurrentBlogRoute();
          if (!self._isOnEffectiveBlogRoute()) {
            self._debugLog('route change outside blog route', { path: pathname, blogPath: blogPath || null });
            self._stopRootInjectionGuard();
            return;
          }
          if (!self.items || self.items.length === 0) {
            self.render();
            return;
          }
          self._armBootstrapLoading();
          self._probeCurrentPageJsonAuth()
            .then(function() {
              return self._waitForPostAuthHydration();
            })
            .then(function() {
              return self._renderContent(self.items);
            })
            .catch(function(err) {
              console.error('[BlogOverlay] Route-change render error:', err);
            })
            .finally(function() {
              self._clearBootstrapLoading();
            });
        }, 0);
      };

      var wrapHistoryMethod = function(name) {
        try {
          var original = window.history && window.history[name];
          if (typeof original !== 'function') return;
          if (original.__bbRouteWrapped) return;
          var wrapped = function() {
            var result = original.apply(this, arguments);
            onRouteChange();
            return result;
          };
          wrapped.__bbRouteWrapped = true;
          wrapped.__bbOriginal = original;
          window.history[name] = wrapped;
        } catch (e) {}
      };
      wrapHistoryMethod('pushState');
      wrapHistoryMethod('replaceState');
      window.addEventListener('popstate', onRouteChange);
    },

    _setupPreviewMessageListener: function() {
      var self = this;
      var debug = /[?&]bbPreviewDebug=1/.test(window.location.search || '');
      window.addEventListener('message', function(event) {
        if (event.data && event.data.type === 'BETTERBLOG_PREVIEW_REQUEST_READY') {
          window.parent.postMessage({ type: 'BETTERBLOG_PREVIEW_READY' }, '*');
        }
        if (event.data && event.data.type === 'BETTERBLOG_PREVIEW_CONFIG' && event.data.config) {
          if (debug) console.log('[BlogOverlayRenderer] received config', event.origin, event.data.config);
          self.updateConfig(event.data.config);
        }
        if (event.data && event.data.type === 'BETTERBLOG_PREVIEW_SELECT_POST' && typeof event.data.postIndex === 'number') {
          var idx = event.data.postIndex;
          if (idx < 0) {
            window.location.hash = '';
            if (self.items.length) self._renderContent(self.items);
          } else if (self.items.length > 0 && idx < self.items.length) {
            window.location.hash = '#post-' + idx;
          }
        }
      });
      if (window.parent !== window) {
        var sendReady = function() {
          window.parent.postMessage({ type: 'BETTERBLOG_PREVIEW_READY' }, '*');
        };
        sendReady();
        setTimeout(sendReady, 100);
        setTimeout(sendReady, 400);
        var idx = self._getSelectedIndex(self.items);
        window.parent.postMessage({ type: 'BETTERBLOG_PREVIEW_POST_SELECTED', postIndex: idx }, '*');
      }
    },

    _setupPreviewNavGuard: function() {
      if (this._previewNavGuardInstalled) return;
      this._previewNavGuardInstalled = true;
      var current = null;
      try {
        current = new URL(window.location.href);
      } catch (e) {
        return;
      }
      var currentPassword = current.searchParams.get('password');
      var debug = current.searchParams.get('bbPreviewDebug') === '1';
      document.addEventListener('click', function(e) {
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        var el = e.target;
        while (el && el.tagName !== 'A') el = el.parentElement;
        if (!el) return;
        if (el.target && el.target !== '_self') return;
        var rawHref = el.getAttribute('href');
        if (!rawHref || rawHref.indexOf('#') === 0) return;
        if (/^(mailto:|tel:|javascript:)/i.test(rawHref)) return;
        var url = null;
        try {
          url = new URL(rawHref, window.location.href);
        } catch (err) {
          return;
        }
        if (url.origin !== window.location.origin) return;
        if (url.searchParams.get('bbPreview') === '1') return;
        url.searchParams.set('bbPreview', '1');
        if (currentPassword && !url.searchParams.get('password')) url.searchParams.set('password', currentPassword);
        if (debug && !url.searchParams.get('bbPreviewDebug')) url.searchParams.set('bbPreviewDebug', '1');
        e.preventDefault();
        window.location.assign(url.toString());
      }, true);
    },

    /** Shallow-merge top-level keys of next onto prev, then merge listed nested objects (so partial updates do not wipe headerContent, etc.). */
    _mergeNestedLevelConfig: function(prev, next, nestedKeys) {
      var out = Object.assign({}, prev || {}, next || {});
      for (var i = 0; i < nestedKeys.length; i++) {
        var key = nestedKeys[i];
        var p = prev && prev[key];
        var n = next && next[key];
        if (p && n && typeof p === 'object' && typeof n === 'object' && !Array.isArray(p) && !Array.isArray(n)) {
          out[key] = Object.assign({}, p, n);
        }
      }
      return out;
    },

    /** Match Configure zone ordering: prefer moduleOrder when non-empty, then merge with modules list. */
    _orderedZoneModules: function(modules, moduleOrder) {
      var avail = Array.isArray(modules) ? modules.slice() : [];
      var order = (Array.isArray(moduleOrder) && moduleOrder.length > 0) ? moduleOrder : avail.slice();
      var inAvail = {};
      for (var i = 0; i < avail.length; i++) inAvail[avail[i]] = true;
      var fromOrder = [];
      for (var j = 0; j < order.length; j++) {
        if (inAvail[order[j]]) fromOrder.push(order[j]);
      }
      var remaining = [];
      for (var k = 0; k < avail.length; k++) {
        if (order.indexOf(avail[k]) < 0) remaining.push(avail[k]);
      }
      return fromOrder.concat(remaining);
    },

    _isCollectionHeaderFilterModule: function(mod) {
      return mod === 'filterByCategory' || mod === 'filterByTag' || mod === 'filterByTagsAndCategories';
    },

    _isCollectionFilterModuleId: function(mod) {
      return mod === 'filterByCategory' || mod === 'filterByTag' || mod === 'filterByTagsAndCategories';
    },

    _isDualFilterMode: function(collectionModules) {
      var filter = collectionModules && collectionModules.filter;
      return Boolean(filter && filter.filterByTags && filter.filterByCategories);
    },

    _expandCombinedFilterInOrder: function(order) {
      var out = [];
      var list = Array.isArray(order) ? order : [];
      for (var i = 0; i < list.length; i++) {
        var m = list[i];
        if (m === 'filterByTagsAndCategories') {
          if (out.indexOf('filterByCategory') < 0) out.push('filterByCategory');
          if (out.indexOf('filterByTag') < 0) out.push('filterByTag');
        } else {
          out.push(m);
        }
      }
      return out;
    },

    _normalizeCollectionFilterModuleOrder: function(order, collectionModules) {
      var self = this;
      var cm = collectionModules || {};
      var filter = cm.filter || {};
      var expanded = self._expandCombinedFilterInOrder(order);
      return expanded.filter(function(m) {
        if (m === 'filterByTag') return Boolean(filter.filterByTags);
        if (m === 'filterByCategory') return Boolean(filter.filterByCategories);
        if (m === 'filterByTagsAndCategories') return Boolean(filter.filterByTags || filter.filterByCategories);
        return true;
      });
    },

    _resolveCollectionZoneModuleIds: function(availModules, moduleOrder, zone, collectionModules) {
      var self = this;
      var cm = collectionModules || {};
      var filter = cm.filter || {};
      var normalized = self._normalizeCollectionFilterModuleOrder(
        (Array.isArray(moduleOrder) && moduleOrder.length > 0) ? moduleOrder : (Array.isArray(availModules) ? availModules : []),
        cm
      );
      var nonFilters = [];
      var filterOrder = [];
      var hasTag = false;
      var hasCategory = false;
      var fi;
      for (fi = 0; fi < normalized.length; fi++) {
        var mod = normalized[fi];
        if (mod === 'filterByTag') {
          hasTag = true;
          if (filterOrder.indexOf('filterByTag') < 0) filterOrder.push('filterByTag');
        } else if (mod === 'filterByCategory') {
          hasCategory = true;
          if (filterOrder.indexOf('filterByCategory') < 0) filterOrder.push('filterByCategory');
        } else if (!self._isCollectionFilterModuleId(mod)) {
          nonFilters.push(mod);
        }
      }
      var firstFilterIdx = -1;
      for (fi = 0; fi < normalized.length; fi++) {
        if (self._isCollectionFilterModuleId(normalized[fi])) {
          firstFilterIdx = fi;
          break;
        }
      }
      var insertAt = firstFilterIdx < 0
        ? nonFilters.length
        : normalized.slice(0, firstFilterIdx).filter(function(m) { return !self._isCollectionFilterModuleId(m); }).length;
      var resolvedFilters = [];
      if (self._isDualFilterMode(cm)) {
        if (zone === 'header' && hasTag && hasCategory) {
          resolvedFilters.push('filterByTagsAndCategories');
        } else {
          for (var fj = 0; fj < filterOrder.length; fj++) {
            var fmod = filterOrder[fj];
            if (fmod === 'filterByCategory' && filter.filterByCategories) resolvedFilters.push('filterByCategory');
            if (fmod === 'filterByTag' && filter.filterByTags) resolvedFilters.push('filterByTag');
          }
        }
      } else if (filter.filterByTags && hasTag) {
        resolvedFilters.push('filterByTag');
      } else if (filter.filterByCategories && hasCategory) {
        resolvedFilters.push('filterByCategory');
      }
      return nonFilters.slice(0, insertAt).concat(resolvedFilters, nonFilters.slice(insertAt));
    },

    /** Collection header: filter left, search then sort right (email/lead magnet not shown in header). */
    _canonicalCollectionHeaderModuleOrder: function(modules) {
      var self = this;
      var list = Array.isArray(modules) ? modules : [];
      var filterMods = [];
      var searchMod = null;
      var hasSort = false;
      for (var i = 0; i < list.length; i++) {
        var m = list[i];
        if (m === 'emailCapture' || m === 'leadMagnet') continue;
        if (self._isCollectionHeaderFilterModule(m) && filterMods.indexOf(m) < 0) filterMods.push(m);
        if (!searchMod && (m === 'searchPosts' || m === 'postSearch')) searchMod = m;
        if (m === 'postSort') hasSort = true;
      }
      var out = [];
      if (filterMods.indexOf('filterByTagsAndCategories') >= 0) {
        out.push('filterByTagsAndCategories');
      } else if (filterMods.indexOf('filterByTag') >= 0 && filterMods.indexOf('filterByCategory') >= 0) {
        out.push('filterByTagsAndCategories');
      } else if (filterMods.length > 0) {
        out.push(filterMods[0]);
      }
      if (searchMod) out.push(searchMod);
      if (hasSort) out.push('postSort');
      return out;
    },

    _isContextBucket: function(value) {
      if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
      var hasLoggedOut = value.loggedOut && typeof value.loggedOut === 'object' && !Array.isArray(value.loggedOut);
      var hasLoggedIn = value.loggedIn && typeof value.loggedIn === 'object' && !Array.isArray(value.loggedIn);
      return Boolean(hasLoggedOut || hasLoggedIn);
    },

    _normalizeViewerMode: function(value) {
      return value === 'loggedIn' ? 'loggedIn' : (value === 'loggedOut' ? 'loggedOut' : null);
    },

    _viewerModeStorageKey: function() {
      var siteKey = this.config && this.config.siteKey ? String(this.config.siteKey) : '';
      var blogPath = this.config && this.config.blogPath ? String(this.config.blogPath) : '';
      return 'betterBlog.viewerModeHint:' + siteKey + ':' + blogPath;
    },

    _viewerModePageStorageKey: function() {
      var base = this._viewerModeStorageKey();
      var path = '';
      try {
        path = typeof window !== 'undefined' && window.location
          ? (window.location.pathname || '/')
          : '';
      } catch (e) {}
      return base + ':page:' + path;
    },

    _rememberViewerModeHint: function(mode) {
      mode = this._normalizeViewerMode(mode);
      if (!mode || typeof window === 'undefined' || !window.sessionStorage) return;
      try {
        var payload = JSON.stringify({
          mode: mode,
          ts: Date.now()
        });
        window.sessionStorage.setItem(this._viewerModeStorageKey(), payload);
        window.sessionStorage.setItem(this._viewerModePageStorageKey(), payload);
      } catch (e) {}
    },

    _readViewerModeHintFromStorage: function(key) {
      if (typeof window === 'undefined' || !window.sessionStorage) return null;
      try {
        var raw = window.sessionStorage.getItem(key);
        if (!raw) return null;
        var parsed = JSON.parse(raw);
        var mode = parsed && this._normalizeViewerMode(parsed.mode);
        var ts = parsed && typeof parsed.ts === 'number' ? parsed.ts : 0;
        if (!mode || !ts || Date.now() - ts > 30 * 60 * 1000) {
          window.sessionStorage.removeItem(key);
          return null;
        }
        return mode;
      } catch (e) {
        return null;
      }
    },

    _getRememberedViewerModeHint: function() {
      return this._readViewerModeHintFromStorage(this._viewerModePageStorageKey())
        || this._readViewerModeHintFromStorage(this._viewerModeStorageKey());
    },

    _getViewerModeFromQueryParam: function() {
      try {
        var params = new URLSearchParams(window.location.search || '');
        return this._normalizeViewerMode(params.get('viewerMode'));
      } catch (e) {
        return null;
      }
    },

    _extractSquarespaceIdentityFromObject: function(obj) {
      if (!obj || typeof obj !== 'object') return null;
      var self = this;
      function fromAccount(account) {
        if (!account || typeof account !== 'object') return null;
        var loggedInFlagKeys = ['authenticated', 'isAuthenticated', 'loggedIn', 'isLoggedIn', 'signedIn', 'isSignedIn', 'hasAccount'];
        var hasExplicitLoggedOut = false;
        for (var lk = 0; lk < loggedInFlagKeys.length; lk++) {
          var flagVal = account[loggedInFlagKeys[lk]];
          if (flagVal === true || flagVal === 1 || flagVal === 'true' || flagVal === '1') break;
          if (flagVal === false || flagVal === 0 || flagVal === 'false' || flagVal === '0') hasExplicitLoggedOut = true;
        }
        var first = account.firstName || account.givenName || '';
        var last = account.lastName || account.familyName || '';
        var full = ((first ? String(first).trim() : '') + ' ' + (last ? String(last).trim() : '')).trim();
        var name = account.displayName || account.name || account.fullName || account.username || full || null;
        var email = account.email || account.loginEmail || account.username || null;
        var id = account.id || account.accountId || account.profileId || account.memberId || null;
        if (!name && !email && !id && hasExplicitLoggedOut) {
          return { loggedIn: false, name: null, email: null };
        }
        if (!name && !email && !id && !hasExplicitLoggedOut) return null;
        return {
          loggedIn: true,
          name: name ? String(name).trim() : null,
          email: email ? String(email).trim() : null
        };
      }

      // Direct account-like containers commonly seen in Squarespace context/payloads.
      var accountKeys = [
        'authenticatedAccount',
        'loggedInAccount',
        'member',
        'currentMember',
        'userAccount',
        'customerAccount',
        'activeAccount',
        'account',
        'currentUser',
        'user',
        'viewer',
        'visitor',
        'profile'
      ];
      for (var i = 0; i < accountKeys.length; i++) {
        var acc = fromAccount(obj[accountKeys[i]]);
        if (acc) return acc;
      }

      // Boolean auth flags that may exist without account details.
      var boolKeys = ['authenticated', 'isAuthenticated', 'loggedIn', 'isLoggedIn', 'signedIn', 'isSignedIn'];
      for (var b = 0; b < boolKeys.length; b++) {
        var boolVal = obj[boolKeys[b]];
        if (typeof boolVal === 'boolean') {
          return { loggedIn: boolVal, name: null, email: null };
        }
        if (boolVal === 1 || boolVal === 'true' || boolVal === '1') {
          return { loggedIn: true, name: null, email: null };
        }
        if (boolVal === 0 || boolVal === 'false' || boolVal === '0') {
          return { loggedIn: false, name: null, email: null };
        }
      }

      // Nested containers often used by Squarespace JSON payloads.
      var nestedKeys = [
        'userAccountsContext',
        'userAccountContext',
        'auth',
        'authentication',
        'account',
        'memberAccount',
        'currentUser',
        'viewer',
        'visitor',
        'customer',
        'context',
        'websiteContext',
        'pagePreviewContext'
      ];
      for (var n = 0; n < nestedKeys.length; n++) {
        var child = obj[nestedKeys[n]];
        if (child && typeof child === 'object') {
          var nested = self._extractSquarespaceIdentityFromObject(child);
          if (nested) return nested;
        }
      }
      return null;
    },

    _extractSquarespaceIdentity: function() {
      try {
        var context = window.Static && window.Static.SQUARESPACE_CONTEXT;
        var ctxIdentity = this._extractSquarespaceIdentityFromObject(context);
        if (ctxIdentity) return ctxIdentity;
      } catch (e) {}
      if (this._currentPageJsonIdentity) return this._currentPageJsonIdentity;
      if (this._squarespaceJsonIdentity) return this._squarespaceJsonIdentity;
      return null;
    },

    _isMemberGatePresent: function() {
      try {
        return Boolean(document.querySelector('.sqs-member-area-gate, [data-controller="MemberAreaGate"], .members-only-gate'));
      } catch (e) {
        return false;
      }
    },

    _isPaywalledSite: function() {
      return Boolean(this.config && this.config.paywallDetectionState === 'detected_paywalled');
    },

    _isCollectionIndexPath: function() {
      var blogPath = this._currentBlogPathForRouteMatch();
      var pathname = this._getEffectiveBlogPathname();
      pathname = pathname.replace(/\/+$/, '') || '/';
      var bp = String(blogPath).replace(/\/+$/, '') || '/';
      if (bp === '/' || bp === '') return pathname === '/' || pathname === '';
      return pathname === bp;
    },

    _isLikelyBlogCollectionIndexView: function() {
      if (this._getSelectedIndexFromHash() >= 0) return false;
      return this._isCollectionIndexPath();
    },

    _hasSquarespacePostListing: function() {
      try {
        if (document.getElementById('blog-overlay-list')) return true;
        if (document.querySelector('.blog-list')) return true;
        if (document.querySelector('.blog-grid')) return true;
        if (document.querySelector('[data-collection-type="blog"] .list-items')) return true;
        if (document.querySelector('.BlogList-item, article.BlogList-item, .blog-list-item')) return true;
        if (document.querySelector('.blog-item, .Blog-item, .BlogList')) return true;
      } catch (e) {}
      return false;
    },

    _isSquarespaceFullPaywallActive: function() {
      if (this._previewMode || this._bbPreview) return false;
      if (!this._isPaywalledSite()) return false;
      if (this._resolveViewerMode() !== 'loggedOut') return false;
      if (!this._isLikelyBlogCollectionIndexView()) return false;
      return !this._hasSquarespacePostListing();
    },

    _resolvePaywallSubscribeHref: function() {
      var ps = this.config && this.config.paywallSettings;
      var custom = ps && typeof ps.subscribeUrl === 'string' ? ps.subscribeUrl.trim() : '';
      if (custom) return custom;
      try {
        var bp = (this.config && this.config.blogPath) || '/';
        if (bp === '/' || bp === '') return window.location.origin + '/';
        var path = bp.charAt(0) === '/' ? bp : '/' + bp;
        return window.location.origin + path;
      } catch (e2) {
        return typeof window !== 'undefined' ? window.location.pathname || '/' : '/';
      }
    },

    _bbReadCssVar: function(name, fallback) {
      try {
        var v = window.getComputedStyle(document.documentElement).getPropertyValue(name);
        v = v && String(v).trim();
        if (v) return v;
      } catch (e) {}
      return fallback;
    },

    _bbPaywallFooterColors: function() {
      var accent = this._bbReadCssVar('--tweak-accent-color', null)
        || this._bbReadCssVar('--siteAccentColor', null)
        || this._bbReadCssVar('--primaryButtonBackgroundColor', null)
        || '#e91e8c';
      var bg = this._bbReadCssVar('--tweak-blog-site-background', null)
        || this._bbReadCssVar('--siteBackgroundColor', null)
        || '#ffffff';
      var text = this._bbReadCssVar('--paragraphMediumColor', null)
        || this._bbReadCssVar('--tweak-text-color', null)
        || '#111111';
      var secondary = this._bbReadCssVar('--paragraphSmallColor', null)
        || this._bbReadCssVar('--tweak-secondary-text-color', null)
        || '#666666';
      return { accent: accent, bg: bg, text: text, secondary: secondary };
    },

    _extractPaywallPriceLabel: function() {
      try {
        var priceEl = document.querySelector('.pricing-plan-price, [data-pricing-amount]');
        if (!priceEl) return null;
        var raw = (priceEl.textContent || '').trim().replace(/\s+/g, ' ');
        var compact = raw.replace(/\s/g, '');
        if (/^\$[\d.]+\/(month|mo)$/i.test(compact)) return raw;
      } catch (e) {}
      return null;
    },

    /**
     * True when the post is explicitly marked as a public preview (always show full body to logged-out readers).
     */
    _isExplicitPaywallPublicPreviewPost: function(post) {
      if (!post || typeof post !== 'object') return false;
      if (post.bbPaywallPublicPreview === true || post.bbIsPublicPreview === true) return true;
      return post.publicPreview === true;
    },

    /**
     * True when the post is a public preview on a paywalled blog (full teaser/body visible to logged-out JSON).
     * Collection cards also treat posts with substantial body copy in JSON as previews.
     */
    _isPaywallPublicPreviewPost: function(post) {
      if (this._isExplicitPaywallPublicPreviewPost(post)) return true;
      var body = post && post.body != null ? String(post.body) : '';
      var plainBody = this._stripHtml(body).replace(/\s+/g, ' ').trim();
      return plainBody.length >= 40;
    },

    /** Logged-out single-post body gate: explicit public-preview flags only (not body-length heuristic). */
    _shouldGateSinglePostBody: function(post) {
      return (
        this._isPaywalledSite() &&
        this._resolveViewerMode() === 'loggedOut' &&
        post &&
        !this._isExplicitPaywallPublicPreviewPost(post)
      );
    },

    /** Body HTML for paywalled single-post teaser — post.body only (excerpt lives in post header). */
    _resolvePaywallSinglePostBodyHtml: function(post) {
      if (!post || typeof post !== 'object') return '';
      var body = post.body != null ? String(post.body) : '';
      return body.trim() ? body : '';
    },

    /** Placeholder copy for blurred body simulation when JSON body is unavailable logged-out. */
    _paywallSimulatedBlurText: function() {
      return 'The work of building something meaningful rarely follows a straight line. Each step asks for attention and patience, and the details that seem small in the moment often shape the outcome more than we expect. Over time, patterns emerge—habits form, priorities shift, and what once felt uncertain becomes familiar enough to trust.';
    },

    _createPaywallBlurBlock: function(text, opts) {
      opts = opts && typeof opts === 'object' ? opts : {};
      var faded = document.createElement('div');
      faded.className = 'bb-paywall-body-teaser-fade';
      faded.setAttribute('aria-hidden', 'true');
      faded.style.position = 'relative';
      faded.style.maxHeight = opts.maxHeight || '5.5em';
      faded.style.overflow = 'hidden';
      faded.style.filter = 'blur(7px)';
      faded.style.opacity = '0.65';
      faded.style.marginTop = opts.marginTop || '0';
      faded.style.userSelect = 'none';
      faded.style.pointerEvents = 'none';
      faded.style.webkitMaskImage = 'linear-gradient(to bottom, #000 15%, transparent 100%)';
      faded.style.maskImage = 'linear-gradient(to bottom, #000 15%, transparent 100%)';
      faded.style.lineHeight = '1.65';
      faded.style.color = '#333';
      var p = document.createElement('p');
      p.style.margin = '0';
      p.textContent = text;
      faded.appendChild(p);
      return faded;
    },

    _createPaywallInlineCardWrap: function() {
      var wrap = document.createElement('div');
      wrap.className = 'bb-paywall-inline-card-wrap';
      wrap.style.position = 'relative';
      wrap.style.width = '50%';
      wrap.style.minWidth = 'min(100%, 280px)';
      wrap.style.maxWidth = '560px';
      wrap.style.marginLeft = 'auto';
      wrap.style.marginRight = 'auto';
      wrap.style.zIndex = '2';
      wrap.style.boxSizing = 'border-box';
      wrap.style.pointerEvents = 'auto';
      wrap.appendChild(this._createPaywallInlineArticleCard());
      return wrap;
    },

    /** Story desktop: wide horizontal inset shared by post body and footer. */
    _applyStoryPostHorizontalInset: function(el, cfg) {
      if (!el || !el.style || !cfg) return false;
      if (!this._isStoryPostLayout(cfg) || this._isNarrowCollectionViewport()) return false;
      el.style.boxSizing = 'border-box';
      el.style.paddingLeft = '16vw';
      el.style.paddingRight = '16vw';
      return true;
    },

    /** Feature / Reporter / Publisher: zero first-block top margin so body text aligns with sidebar headers. */
    _normalizePostBodyTopForSidebarRow: function(bodyEl) {
      if (!bodyEl) return;
      bodyEl.classList.add('blog-overlay-post-body--sidebar-row');
      bodyEl.style.marginTop = '0';
      var blockTags = { P: 1, H1: 1, H2: 1, H3: 1, H4: 1, H5: 1, H6: 1, BLOCKQUOTE: 1, UL: 1, OL: 1, FIGURE: 1, IMG: 1, TABLE: 1 };
      var el = bodyEl.firstElementChild;
      var depth = 0;
      while (el && depth < 6) {
        el.style.marginTop = '0';
        el.style.paddingTop = '0';
        if (blockTags[el.tagName]) break;
        if (!el.firstElementChild) break;
        el = el.firstElementChild;
        depth++;
      }
    },

    /** Feature / Reporter / Publisher: remove default heading top margin so sidebar labels align with post body. */
    _normalizeSidebarTopForSidebarRow: function(sidebarRailEl) {
      if (!sidebarRailEl || !sidebarRailEl.querySelector) return;
      sidebarRailEl.classList.add('blog-overlay-sidebar-rail--sidebar-row');
      sidebarRailEl.style.marginTop = '0';
      var section = sidebarRailEl.querySelector('.blog-overlay-sidebar-section');
      if (!section) return;
      section.style.marginTop = '0';
      var header = section.querySelector('.bb-sidebar-header');
      if (header && header.style) {
        header.style.marginTop = '0';
        header.style.paddingTop = '0';
      }
    },

    /** Match single-post body horizontal inset to the post header column. */
    _applySinglePostBodyMargins: function(bodyEl, cfg) {
      if (!bodyEl || !bodyEl.style) return;
      bodyEl.style.boxSizing = 'border-box';
      bodyEl.style.width = '100%';
      if (this._applyStoryPostHorizontalInset(bodyEl, cfg)) return;
      var postHeaderCfg = cfg && cfg.postHeader && typeof cfg.postHeader === 'object' ? cfg.postHeader : {};
      var imagePos = postHeaderCfg.imagePosition;
      var hasSideImage = imagePos === 'leftOfInfo' || imagePos === 'rightOfInfo';
      if (hasSideImage) return;
      var sideGap = typeof postHeaderCfg.sideGap === 'number'
        ? Math.min(150, Math.max(0, Math.round(postHeaderCfg.sideGap)))
        : 24;
      bodyEl.style.paddingLeft = sideGap + 'px';
      bodyEl.style.paddingRight = sideGap + 'px';
    },

    _getPostFooterSideMarginsMode: function(footerContentCfg) {
      return footerContentCfg && footerContentCfg.sideMargins === 'fullScreen' ? 'fullScreen' : 'postBody';
    },

    /** Post footer horizontal inset: postBody matches post text; fullScreen uses site margins only. */
    _applyPostFooterSideMargins: function(el, cfg, footerContentCfg) {
      if (!el || !el.style || !cfg) return;
      el.style.boxSizing = 'border-box';
      if (this._getPostFooterSideMarginsMode(footerContentCfg) === 'fullScreen') {
        el.style.paddingLeft = '0';
        el.style.paddingRight = '0';
        return;
      }
      if (this._applyStoryPostHorizontalInset(el, cfg)) return;
      if (
        this._isReporterPostLayout(cfg) ||
        this._isPublisherPostLayout(cfg) ||
        this._isFeaturePostLayout(cfg)
      ) {
        el.style.paddingLeft = '0';
        el.style.paddingRight = '0';
        return;
      }
      this._applySinglePostBodyMargins(el, cfg);
    },

    _clearPostFooterZoneBleed: function(footerZoneEl) {
      if (!footerZoneEl || !footerZoneEl.style) return;
      footerZoneEl.style.width = '';
      footerZoneEl.style.maxWidth = '';
      footerZoneEl.style.marginLeft = '';
      footerZoneEl.style.marginRight = '';
    },

    /**
     * @param {boolean|{ subscribeButton?: boolean, imageOverlay?: boolean }} opts - pass false to omit subscribe pill; or { imageOverlay: true } for editorial cards on dark imagery
     */
    _createMembersOnlyTeaserLabel: function(opts) {
      var self = this;
      var o =
        opts === true || opts === false
          ? { subscribeButton: opts }
          : opts && typeof opts === 'object'
            ? opts
            : {};
      var includeSubscribe = o.subscribeButton !== false;
      var imageOverlay = Boolean(o.imageOverlay);
      var colors = this._bbPaywallFooterColors();
      var lockLabelColor = imageOverlay ? 'rgba(255,255,255,0.88)' : colors.secondary;
      var wrap = document.createElement('div');
      wrap.className = 'bb-members-only-label';
      wrap.style.display = 'flex';
      wrap.style.flexWrap = 'wrap';
      wrap.style.alignItems = 'center';
      wrap.style.gap = '10px 6px';
      wrap.style.marginTop = '4px';
      var lockNs = 'http://www.w3.org/2000/svg';
      var lockSvg = document.createElementNS(lockNs, 'svg');
      lockSvg.setAttribute('class', 'bb-lock-icon');
      lockSvg.setAttribute('width', '14');
      lockSvg.setAttribute('height', '14');
      lockSvg.setAttribute('viewBox', '0 0 24 24');
      lockSvg.setAttribute('fill', 'none');
      lockSvg.setAttribute('stroke', 'currentColor');
      lockSvg.setAttribute('stroke-width', '2');
      lockSvg.setAttribute('aria-hidden', 'true');
      lockSvg.style.color = lockLabelColor;
      lockSvg.style.flexShrink = '0';
      var lockPath = document.createElementNS(lockNs, 'rect');
      lockPath.setAttribute('x', '5');
      lockPath.setAttribute('y', '11');
      lockPath.setAttribute('width', '14');
      lockPath.setAttribute('height', '10');
      lockPath.setAttribute('rx', '2');
      var lockPath2 = document.createElementNS(lockNs, 'path');
      lockPath2.setAttribute('d', 'M7 11V7a5 5 0 0 1 10 0v4');
      lockSvg.appendChild(lockPath);
      lockSvg.appendChild(lockPath2);
      var label = document.createElement('span');
      label.className = 'bb-members-only-text';
      label.textContent = 'MEMBERS ONLY';
      label.style.fontSize = '0.72rem';
      label.style.fontWeight = '600';
      label.style.letterSpacing = '0.08em';
      label.style.textTransform = 'uppercase';
      label.style.fontVariant = 'small-caps';
      label.style.color = lockLabelColor;
      wrap.appendChild(lockSvg);
      wrap.appendChild(label);
      if (includeSubscribe) {
        var pill = document.createElement('a');
        pill.className = 'bb-subscribe-pill';
        pill.href = self._resolvePaywallSubscribeHref();
        pill.textContent = 'Subscribe to read';
        pill.style.display = 'inline-flex';
        pill.style.alignItems = 'center';
        pill.style.padding = '6px 14px';
        pill.style.borderRadius = '4px';
        pill.style.background = colors.accent;
        pill.style.color = '#fff';
        pill.style.fontSize = '0.8rem';
        pill.style.fontWeight = '600';
        pill.style.textDecoration = 'none';
        wrap.appendChild(pill);
      }
      return wrap;
    },

    /** Paywalled collection card: centered lock badge over the card image area. opts.compact: smaller ring (editorial). opts.thumbnail: tiny ring (Newsroom mobile list thumb). */
    _appendPaywallCardImageLock: function(hostEl, opts) {
      if (!hostEl) return;
      var o = opts && typeof opts === 'object' ? opts : {};
      var thumbnail = Boolean(o.thumbnail);
      var compact = Boolean(o.compact);
      if (!hostEl.style.position || hostEl.style.position === 'static') hostEl.style.position = 'relative';
      var shade = document.createElement('div');
      shade.className = 'bb-paywall-card-image-shade';
      shade.setAttribute('aria-hidden', 'true');
      shade.style.position = 'absolute';
      shade.style.top = '0';
      shade.style.left = '0';
      shade.style.right = '0';
      shade.style.bottom = '0';
      shade.style.background = 'rgba(0, 0, 0, 0.38)';
      shade.style.pointerEvents = 'none';
      shade.style.zIndex = '2';
      var badge = document.createElement('div');
      badge.className = 'bb-paywall-card-image-lock';
      badge.setAttribute('aria-hidden', 'true');
      badge.style.position = 'absolute';
      badge.style.top = '0';
      badge.style.left = '0';
      badge.style.right = '0';
      badge.style.bottom = '0';
      badge.style.display = 'flex';
      badge.style.alignItems = 'center';
      badge.style.justifyContent = 'center';
      badge.style.pointerEvents = 'none';
      badge.style.zIndex = '3';
      var ring = document.createElement('div');
      ring.style.width = thumbnail ? '24px' : (compact ? '40px' : '52px');
      ring.style.height = thumbnail ? '24px' : (compact ? '40px' : '52px');
      ring.style.borderRadius = '50%';
      ring.style.border = thumbnail ? '1px solid rgba(255, 255, 255, 0.9)' : (compact ? '1.5px solid rgba(255, 255, 255, 0.9)' : '2px solid rgba(255, 255, 255, 0.9)');
      ring.style.display = 'flex';
      ring.style.alignItems = 'center';
      ring.style.justifyContent = 'center';
      ring.style.boxSizing = 'border-box';
      ring.style.background = 'rgba(0, 0, 0, 0.2)';
      var lockNs = 'http://www.w3.org/2000/svg';
      var lockSvg = document.createElementNS(lockNs, 'svg');
      lockSvg.setAttribute('width', thumbnail ? '11' : (compact ? '18' : '22'));
      lockSvg.setAttribute('height', thumbnail ? '11' : (compact ? '18' : '22'));
      lockSvg.setAttribute('viewBox', '0 0 24 24');
      lockSvg.setAttribute('fill', 'none');
      lockSvg.setAttribute('stroke', 'currentColor');
      lockSvg.setAttribute('stroke-width', '2');
      lockSvg.style.color = '#fff';
      lockSvg.style.display = 'block';
      var lockBody = document.createElementNS(lockNs, 'rect');
      lockBody.setAttribute('x', '5');
      lockBody.setAttribute('y', '11');
      lockBody.setAttribute('width', '14');
      lockBody.setAttribute('height', '10');
      lockBody.setAttribute('rx', '2');
      var lockShackle = document.createElementNS(lockNs, 'path');
      lockShackle.setAttribute('d', 'M7 11V7a5 5 0 0 1 10 0v4');
      lockSvg.appendChild(lockBody);
      lockSvg.appendChild(lockShackle);
      ring.appendChild(lockSvg);
      badge.appendChild(ring);
      hostEl.appendChild(shade);
      hostEl.appendChild(badge);
    },

    _createSubscribeToReadPillLink: function(opts) {
      var o = opts && typeof opts === 'object' ? opts : {};
      var compact = Boolean(o.compact);
      var colors = this._bbPaywallFooterColors();
      var pill = document.createElement('a');
      pill.className = 'bb-subscribe-pill';
      pill.href = this._resolvePaywallSubscribeHref();
      pill.textContent = 'Subscribe to read';
      pill.style.display = 'inline-flex';
      pill.style.alignItems = 'center';
      pill.style.width = 'fit-content';
      pill.style.maxWidth = '100%';
      pill.style.boxSizing = 'border-box';
      pill.style.padding = compact ? '8px 10px' : '6px 14px';
      pill.style.borderRadius = '4px';
      pill.style.background = colors.accent;
      pill.style.color = '#fff';
      pill.style.fontSize = compact ? '0.75rem' : '0.8rem';
      pill.style.fontWeight = '600';
      pill.style.lineHeight = '1.2';
      pill.style.textDecoration = 'none';
      pill.style.whiteSpace = 'nowrap';
      return pill;
    },

    _appendPaywallFooter: function(footerZoneEl) {
      if (!footerZoneEl) return;
      var colors = this._bbPaywallFooterColors();
      var ps = this.config && this.config.paywallSettings;
      var defaultDesc = 'Subscribe for full access to every story, the complete archive, and exclusive reading.';
      var desc = (ps && typeof ps.footerDescription === 'string' && ps.footerDescription.trim())
        ? ps.footerDescription.trim()
        : defaultDesc;
      var features = (ps && Array.isArray(ps.featureItems) && ps.featureItems.length)
        ? ps.featureItems.slice(0, 4)
        : ['Unlimited articles', 'Full archive access', 'Cancel anytime'];
      var blogTitle = (this._blogMeta && this._blogMeta.blogName) ? this._blogMeta.blogName : 'this blog';
      try {
        var ctx = window.Static && window.Static.SQUARESPACE_CONTEXT;
        var st = ctx && ctx.website && ctx.website.siteTitle;
        if (typeof st === 'string' && st.trim()) blogTitle = st.trim();
      } catch (e) {}
      var priceBit = this._extractPaywallPriceLabel();
      var subLabel = priceBit ? ('Subscribe — ' + priceBit) : 'Subscribe';
      var borderAlpha = 'rgba(0,0,0,0.1)';

      var block = document.createElement('div');
      block.className = 'bb-paywall-footer';
      block.style.width = '100%';
      block.style.boxSizing = 'border-box';
      block.style.marginTop = '32px';
      block.style.padding = '40px 24px 48px';
      block.style.background = colors.bg;
      block.style.borderTop = '1px solid ' + borderAlpha;
      block.style.textAlign = 'center';

      var inner = document.createElement('div');
      inner.style.maxWidth = '640px';
      inner.style.margin = '0 auto';

      var eyebrow = document.createElement('div');
      eyebrow.textContent = 'MEMBER EXCLUSIVE';
      eyebrow.style.fontSize = '0.65rem';
      eyebrow.style.fontWeight = '700';
      eyebrow.style.letterSpacing = '0.2em';
      eyebrow.style.textTransform = 'uppercase';
      eyebrow.style.color = colors.accent;
      eyebrow.style.marginBottom = '12px';

      var headline = document.createElement('h2');
      headline.textContent = 'Unlock unlimited access to ' + blogTitle;
      headline.style.margin = '0 0 12px';
      headline.style.fontSize = 'clamp(1.25rem, 2.5vw, 1.75rem)';
      headline.style.fontWeight = '700';
      headline.style.lineHeight = '1.25';
      headline.style.color = colors.text;

      var p = document.createElement('p');
      p.textContent = desc;
      p.style.margin = '0 auto 28px';
      p.style.fontSize = '1rem';
      p.style.lineHeight = '1.55';
      p.style.color = colors.secondary;
      p.style.maxWidth = '520px';

      var btnRow = document.createElement('div');
      btnRow.style.display = 'flex';
      btnRow.style.flexWrap = 'wrap';
      btnRow.style.gap = '12px';
      btnRow.style.justifyContent = 'center';
      btnRow.style.marginBottom = '28px';

      var subBtn = document.createElement('a');
      subBtn.href = this._resolvePaywallSubscribeHref();
      subBtn.textContent = subLabel;
      subBtn.style.display = 'inline-flex';
      subBtn.style.alignItems = 'center';
      subBtn.style.justifyContent = 'center';
      subBtn.style.padding = '12px 22px';
      subBtn.style.borderRadius = '4px';
      subBtn.style.background = colors.accent;
      subBtn.style.color = '#fff';
      subBtn.style.fontWeight = '600';
      subBtn.style.textDecoration = 'none';
      subBtn.style.fontSize = '0.95rem';

      btnRow.appendChild(subBtn);

      var list = document.createElement('div');
      list.style.display = 'flex';
      list.style.flexWrap = 'wrap';
      list.style.gap = '10px 24px';
      list.style.justifyContent = 'center';
      list.style.fontSize = '0.9rem';
      list.style.color = colors.secondary;
      for (var fi = 0; fi < features.length; fi++) {
        var row = document.createElement('div');
        row.style.display = 'inline-flex';
        row.style.alignItems = 'center';
        row.style.gap = '8px';
        var check = document.createElement('span');
        check.textContent = '✓';
        check.style.color = colors.accent;
        check.style.fontWeight = '700';
        var tx = document.createElement('span');
        tx.textContent = features[fi];
        row.appendChild(check);
        row.appendChild(tx);
        list.appendChild(row);
      }

      inner.appendChild(eyebrow);
      inner.appendChild(headline);
      inner.appendChild(p);
      inner.appendChild(btnRow);
      inner.appendChild(list);
      block.appendChild(inner);
      footerZoneEl.appendChild(block);
      this._paywallDebug('appendPaywallFooter', {
        footerZoneChildCount: footerZoneEl.childNodes.length
      });
    },

    _resolvePaywallSignInHref: function() {
      var ps = this.config && this.config.paywallSettings;
      var custom = ps && typeof ps.signInUrl === 'string' ? ps.signInUrl.trim() : '';
      if (custom) return custom;
      try {
        return window.location.origin + '/account/login';
      } catch (e) {
        return '/account/login';
      }
    },

    /** Inline article gate (single post): card overlaid on faded second-paragraph teaser. */
    _createPaywallInlineArticleCard: function() {
      var colors = this._bbPaywallFooterColors();
      var ps = this.config && this.config.paywallSettings;
      var defaultDesc = 'Subscribe for unlimited access to every article, the full archive, and ad-free reading.';
      var desc = (ps && typeof ps.inlineDescription === 'string' && ps.inlineDescription.trim())
        ? ps.inlineDescription.trim()
        : (ps && typeof ps.footerDescription === 'string' && ps.footerDescription.trim())
          ? ps.footerDescription.trim()
          : defaultDesc;
      var features = (ps && Array.isArray(ps.featureItems) && ps.featureItems.length)
        ? ps.featureItems.slice(0, 4)
        : ['Unlimited articles', 'Full archive', 'Ad-free', 'Cancel anytime'];
      var priceBit = this._extractPaywallPriceLabel();
      var subLabel = priceBit ? ('Subscribe — ' + priceBit) : 'Subscribe';

      var card = document.createElement('div');
      card.className = 'bb-paywall-inline-card';
      card.style.width = '100%';
      card.style.maxWidth = 'none';
      card.style.margin = '0';
      card.style.boxSizing = 'border-box';
      card.style.background = '#fff';
      card.style.border = '1px solid rgba(0,0,0,0.1)';
      card.style.borderRadius = '8px';
      card.style.padding = '24px 20px 20px';
      card.style.textAlign = 'center';
      card.style.boxShadow = '0 8px 32px rgba(0,0,0,0.12)';

      var eyebrow = document.createElement('div');
      eyebrow.textContent = 'MEMBER EXCLUSIVE';
      eyebrow.style.fontSize = '0.65rem';
      eyebrow.style.fontWeight = '700';
      eyebrow.style.letterSpacing = '0.2em';
      eyebrow.style.textTransform = 'uppercase';
      eyebrow.style.color = colors.accent;
      eyebrow.style.marginBottom = '10px';

      var headline = document.createElement('h2');
      headline.textContent = 'Continue reading with a membership';
      headline.style.margin = '0 0 10px';
      headline.style.fontSize = 'clamp(1.15rem, 3vw, 1.5rem)';
      headline.style.fontWeight = '700';
      headline.style.lineHeight = '1.25';
      headline.style.color = colors.text;

      var p = document.createElement('p');
      p.textContent = desc;
      p.style.margin = '0 auto 20px';
      p.style.fontSize = '0.92rem';
      p.style.lineHeight = '1.55';
      p.style.color = colors.secondary;
      p.style.maxWidth = '420px';

      var btnRow = document.createElement('div');
      btnRow.style.display = 'flex';
      btnRow.style.flexWrap = 'wrap';
      btnRow.style.gap = '10px';
      btnRow.style.justifyContent = 'center';
      btnRow.style.marginBottom = '18px';

      var subBtn = document.createElement('a');
      subBtn.href = this._resolvePaywallSubscribeHref();
      subBtn.textContent = subLabel;
      subBtn.style.display = 'inline-flex';
      subBtn.style.alignItems = 'center';
      subBtn.style.justifyContent = 'center';
      subBtn.style.padding = '10px 18px';
      subBtn.style.borderRadius = '4px';
      subBtn.style.background = colors.accent;
      subBtn.style.color = '#fff';
      subBtn.style.fontWeight = '600';
      subBtn.style.textDecoration = 'none';
      subBtn.style.fontSize = '0.9rem';

      var signBtn = document.createElement('a');
      signBtn.href = this._resolvePaywallSignInHref();
      signBtn.textContent = 'Sign in';
      signBtn.style.display = 'inline-flex';
      signBtn.style.alignItems = 'center';
      signBtn.style.justifyContent = 'center';
      signBtn.style.padding = '10px 18px';
      signBtn.style.borderRadius = '4px';
      signBtn.style.background = '#fff';
      signBtn.style.color = colors.text;
      signBtn.style.border = '1px solid rgba(0,0,0,0.18)';
      signBtn.style.fontWeight = '600';
      signBtn.style.textDecoration = 'none';
      signBtn.style.fontSize = '0.9rem';

      btnRow.appendChild(subBtn);
      btnRow.appendChild(signBtn);

      var list = document.createElement('div');
      list.style.display = 'flex';
      list.style.flexWrap = 'wrap';
      list.style.gap = '8px 18px';
      list.style.justifyContent = 'center';
      list.style.fontSize = '0.82rem';
      list.style.color = colors.secondary;
      for (var fi = 0; fi < features.length; fi++) {
        var row = document.createElement('div');
        row.style.display = 'inline-flex';
        row.style.alignItems = 'center';
        row.style.gap = '6px';
        var check = document.createElement('span');
        check.textContent = '✓';
        check.style.color = colors.accent;
        check.style.fontWeight = '700';
        var tx = document.createElement('span');
        tx.textContent = features[fi];
        row.appendChild(check);
        row.appendChild(tx);
        list.appendChild(row);
      }

      card.appendChild(eyebrow);
      card.appendChild(headline);
      card.appendChild(p);
      card.appendChild(btnRow);
      card.appendChild(list);
      return card;
    },

    _applySinglePostPaywallBodyTeaser: function(bodyEl, post, cfg) {
      if (!bodyEl) return;
      var self = this;
      var paras = [];
      var allP = bodyEl.querySelectorAll('p');
      for (var pi = 0; pi < allP.length; pi++) {
        var pt = (allP[pi].textContent || '').replace(/\s+/g, ' ').trim();
        if (pt.length > 12) paras.push(allP[pi]);
      }
      if (paras.length < 2) {
        var plain = self._plainTextFromBlogHtml(bodyEl.innerHTML).replace(/\r/g, '').trim();
        var chunks = plain.split(/\n\s*\n+/).map(function(s) { return s.trim(); }).filter(function(s) { return s.length > 12; });
        if (chunks.length < 2) {
          var sentences = plain.match(/[^.!?]+[.!?]+/g) || [plain];
          if (sentences.length >= 2) {
            chunks = [sentences[0].trim(), sentences.slice(1).join(' ').trim()];
          } else if (plain.length > 80) {
            var mid = Math.min(plain.length, Math.max(120, Math.floor(plain.length * 0.42)));
            var splitAt = plain.indexOf(' ', mid);
            if (splitAt < 0) splitAt = mid;
            chunks = [plain.slice(0, splitAt).trim(), plain.slice(splitAt).trim()];
          }
        }
        if (chunks.length >= 2) {
          paras = [
            (function(t) { var el = document.createElement('p'); el.textContent = t; return el; })(chunks[0]),
            (function(t) { var el = document.createElement('p'); el.textContent = t; return el; })(chunks[1])
          ];
        } else if (chunks.length === 1) {
          paras = [(function(t) { var el = document.createElement('p'); el.textContent = t; return el; })(chunks[0])];
        }
      }

      bodyEl.innerHTML = '';
      bodyEl.style.position = 'relative';
      bodyEl.style.marginTop = '1.5rem';
      self._applySinglePostBodyMargins(bodyEl, cfg);

      var clearParaEl = null;
      var blurText = '';

      if (paras.length >= 2) {
        clearParaEl = document.createElement('p');
        clearParaEl.textContent = (paras[0].textContent || '').replace(/\s+/g, ' ').trim();
        blurText = (paras[1].textContent || '').replace(/\s+/g, ' ').trim();
      } else if (paras.length === 1) {
        var fullText = (paras[0].textContent || '').replace(/\s+/g, ' ').trim();
        if (fullText.length > 80) {
          var splitMid = Math.floor(fullText.length * 0.45);
          var splitIdx = fullText.indexOf(' ', splitMid);
          if (splitIdx < 0) splitIdx = splitMid;
          clearParaEl = document.createElement('p');
          clearParaEl.textContent = fullText.slice(0, splitIdx).trim();
          blurText = fullText.slice(splitIdx).trim();
        }
      }

      if (clearParaEl && clearParaEl.textContent) {
        bodyEl.appendChild(clearParaEl);
      }
      if (!blurText) {
        blurText = self._paywallSimulatedBlurText();
      }

      var zone = document.createElement('div');
      zone.className = 'bb-paywall-body-teaser-zone';
      zone.style.position = 'relative';
      zone.style.display = 'flex';
      zone.style.flexDirection = 'column';
      zone.style.alignItems = 'stretch';
      zone.style.width = '100%';
      zone.style.boxSizing = 'border-box';
      zone.style.marginTop = clearParaEl ? '1.25em' : '0';
      zone.style.paddingTop = '0.5rem';
      zone.style.paddingBottom = '1.5rem';

      var blurBlock = self._createPaywallBlurBlock(blurText);
      blurBlock.style.width = '100%';
      blurBlock.style.flex = '0 0 auto';
      zone.appendChild(blurBlock);

      var cardWrap = self._createPaywallInlineCardWrap();
      cardWrap.style.flex = '0 0 auto';
      cardWrap.style.marginTop = '-4.25rem';
      cardWrap.style.marginBottom = '0.5rem';
      zone.appendChild(cardWrap);
      bodyEl.appendChild(zone);
    },

    _isPaywallGatedModulePost: function(post, opts) {
      opts = opts && typeof opts === 'object' ? opts : {};
      if (opts.onSinglePostView) return false;
      return (
        this._isPaywalledSite() &&
        this._resolveViewerMode() === 'loggedOut' &&
        !this._isPaywallPublicPreviewPost(post)
      );
    },

    /**
     * Sidebar/footer post card. Gated: lock on image, title, Members Only; meta still shown when toggled on.
     * @param {object} opts - { variant: 'footer'|'list', items, itemIndexMap, placeholderMap, postIndex, analyticsElement, cfg }
     */
    _createModulePostCard: function(post, opts) {
      var self = this;
      if (!post) return null;
      opts = opts && typeof opts === 'object' ? opts : {};
      var variant = opts.variant === 'footer' ? 'footer' : 'list';
      var items = opts.items || self.items || [];
      var itemIndexMap = opts.itemIndexMap;
      var placeholderMap = opts.placeholderMap || {};
      var cardCfg = (opts.cfg && typeof opts.cfg === 'object') ? opts.cfg : self._getActiveRenderCfg();
      var gated = self._isPaywallGatedModulePost(post, { onSinglePostView: Boolean(opts.onSinglePostView) });
      var postIdx = typeof opts.postIndex === 'number'
        ? opts.postIndex
        : self._postIndexInItems(items, post, itemIndexMap);
      var postUrl = self._getPostUrl(post) || (postIdx >= 0 ? '#post-' + postIdx : '#');
      var analytics = opts.analyticsElement || 'relevantPosts';

      var card = document.createElement('a');
      card.href = postUrl;
      card.setAttribute('data-analytics-element', analytics);
      card.style.textDecoration = 'none';
      card.style.color = 'inherit';
      card.style.display = 'flex';
      if (variant === 'list') {
        card.classList.add('bb-sidebar-post-card');
      } else {
        card.style.flexDirection = 'column';
        card.style.gap = '10px';
      }
      card.style.minWidth = '0';

      var imgUrl = post.assetUrl || post.thumbnailUrl || (post.assets && post.assets[0] && post.assets[0].assetUrl) || null;
      if (imgUrl && self._isPlaceholderWithMap(imgUrl, placeholderMap)) imgUrl = null;
      var imgWrap = document.createElement('div');
      imgWrap.style.position = 'relative';
      imgWrap.style.borderRadius = '4px';
      imgWrap.style.overflow = 'hidden';
      if (variant === 'list') {
        imgWrap.className = 'bb-sidebar-post-thumb';
      } else {
        imgWrap.style.aspectRatio = '16 / 9';
      }
      imgWrap.style.background = self._featuredImageAreaBackground(imgUrl, placeholderMap, post, items);
      if (imgUrl) {
        var im = document.createElement('img');
        im.src = imgUrl;
        im.alt = post.title || '';
        im.style.width = '100%';
        im.style.height = '100%';
        im.style.objectFit = 'cover';
        im.style.display = 'block';
        imgWrap.appendChild(im);
      }
      if (gated) self._appendPaywallCardImageLock(imgWrap);
      card.appendChild(imgWrap);

      var textHost = card;
      if (variant === 'list') {
        textHost = document.createElement('div');
        textHost.className = 'bb-sidebar-post-text';
        card.appendChild(textHost);
      }

      var cats = self._getPostCategories(post);
      if (variant === 'footer' && cats.length > 0) {
        var catEl = document.createElement('div');
        catEl.textContent = cats[0];
        self._applyCategoryLabelStyle(catEl);
        textHost.appendChild(catEl);
      }

      var titleEl = document.createElement('div');
      titleEl.textContent = post.title || 'Untitled';
      if (variant === 'list') {
        titleEl.className = 'bb-sidebar-post-title';
      } else if (variant === 'footer') {
        titleEl.className = 'bb-more-to-read-title';
      }
      textHost.appendChild(titleEl);

      if (variant === 'list') {
        self._appendModulePostCardListMeta(textHost, post, cardCfg);
      }

      if (gated) {
        var mo = self._createMembersOnlyTeaserLabel(false);
        mo.style.marginTop = '0';
        textHost.appendChild(mo);
      } else if (variant === 'footer') {
        var deckEl = document.createElement('div');
        deckEl.textContent = (opts.deckText != null ? opts.deckText : '');
        if (!deckEl.textContent) {
          var deckSrc = self._plainTextFromBlogHtml(post.body || post.excerpt || '').replace(/\r/g, '').trim();
          var deckLines = deckSrc.split('\n');
          for (var dl = 0; dl < deckLines.length; dl++) {
            var dL = deckLines[dl].trim();
            if (dL) { deckEl.textContent = self._truncateText(dL, 160); break; }
          }
          if (!deckEl.textContent) deckEl.textContent = self._truncateText(deckSrc, 160);
        }
        deckEl.style.fontSize = '0.85rem';
        deckEl.style.color = '#555';
        deckEl.style.lineHeight = '1.45';
        deckEl.style.whiteSpace = 'nowrap';
        deckEl.style.textOverflow = 'ellipsis';
        deckEl.style.overflow = 'hidden';
        if (deckEl.textContent) textHost.appendChild(deckEl);
      }
      return card;
    },

    _startPaywallAuthObserver: function() {
      // #region agent log
      try {
        var _l1 = {
          alreadyInstalled: !!this._paywallAuthObserver,
          previewMode: !!this._previewMode,
          bbPreview: !!this._bbPreview,
          isPaywalledSite: this._isPaywalledSite(),
          paywallDetectionState: this.config && this.config.paywallDetectionState,
          paywallMode: this.config && this.config.paywallMode,
          willEarlyReturn: (!!this._paywallAuthObserver || !!this._previewMode || !!this._bbPreview || !this._isPaywalledSite())
        };
        fetch('http://127.0.0.1:7779/ingest/21c07440-19af-4cd8-979a-7d2c134d7467',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'d12b8c'},body:JSON.stringify({sessionId:'d12b8c',location:'renderer.js:_startPaywallAuthObserver',message:'auth observer install decision',data:_l1,timestamp:Date.now(),hypothesisId:'H1'})}).catch(function(){});
      } catch (e) {}
      // #endregion
      if (this._paywallAuthObserver || this._previewMode || this._bbPreview) return;
      if (!this._isPaywalledSite()) return;
      var self = this;
      this._lastPaywallAuthSnapshot =
        this._resolveViewerMode() + '|' + (this._isSquarespaceFullPaywallActive() ? '1' : '0');
      this._paywallAuthObserver = new MutationObserver(function() {
        // #region agent log
        try {
          if (!self._dbgObserverFiredOnce) {
            self._dbgObserverFiredOnce = true;
            fetch('http://127.0.0.1:7779/ingest/21c07440-19af-4cd8-979a-7d2c134d7467',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'d12b8c'},body:JSON.stringify({sessionId:'d12b8c',location:'renderer.js:paywallAuthObserver.fire',message:'auth observer fired (first mutation)',data:{baselineSnapshot:self._lastPaywallAuthSnapshot},timestamp:Date.now(),hypothesisId:'H5'})}).catch(function(){});
          }
        } catch (e) {}
        // #endregion
        if (self._paywallAuthDebounce) return;
        self._paywallAuthDebounce = setTimeout(function() {
          self._paywallAuthDebounce = null;
          if (self._renderContentInProgress) {
            // #region agent log
            fetch('http://127.0.0.1:7779/ingest/21c07440-19af-4cd8-979a-7d2c134d7467',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'d12b8c'},body:JSON.stringify({sessionId:'d12b8c',location:'renderer.js:paywallAuthObserver.settle',message:'skipped: renderContentInProgress',data:{},timestamp:Date.now(),hypothesisId:'H5'})}).catch(function(){});
            // #endregion
            return;
          }
          var snap = self._resolveViewerMode() + '|' + (self._isSquarespaceFullPaywallActive() ? '1' : '0');
          // #region agent log
          try {
            var _ctx = (window.Static && window.Static.SQUARESPACE_CONTEXT) || {};
            var _uac = _ctx.userAccountsContext || {};
            fetch('http://127.0.0.1:7779/ingest/21c07440-19af-4cd8-979a-7d2c134d7467',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'d12b8c'},body:JSON.stringify({sessionId:'d12b8c',location:'renderer.js:paywallAuthObserver.settle',message:'settled snapshot compare',data:{
              snap: snap,
              lastSnapshot: self._lastPaywallAuthSnapshot,
              snapshotChanged: snap !== self._lastPaywallAuthSnapshot,
              viewerMode: self._resolveViewerMode(),
              fullPaywallActive: self._isSquarespaceFullPaywallActive(),
              fromSquarespaceContext: self._detectViewerModeFromSquarespaceContext(),
              fromDom: self._detectViewerModeFromDom(),
              rememberedMode: self._getRememberedViewerModeHint(),
              memberGatePresent: self._isMemberGatePresent(),
              hasSquarespacePostListing: self._hasSquarespacePostListing(),
              ctxAuthenticated: _ctx.authenticated,
              uacAuthenticated: _uac.authenticated,
              uacIsAuthenticated: _uac.isAuthenticated
            },timestamp:Date.now(),hypothesisId:'H2'})}).catch(function(){});
          } catch (e) {}
          // #endregion
          if (snap === self._lastPaywallAuthSnapshot) return;
          self._lastPaywallAuthSnapshot = snap;
          var fullNow = self._isSquarespaceFullPaywallActive();
          if (fullNow) {
            self._paywallFullySuppressed = true;
            self._stopRootInjectionGuard();
            self._removeOverlayNodes();
            self._restoreOriginalRootChildren();
            self._clearBootstrapLoading();
            return;
          }
          self._paywallFullySuppressed = false;
          var pathname = typeof window !== 'undefined' && window.location ? (window.location.pathname || '/') : '/';
          var blogPath = self._currentBlogPathForRouteMatch();
          // #region agent log
          try {
            var _rootConnected = false;
            try { _rootConnected = Boolean(self._root && document.documentElement && document.documentElement.contains(self._root)); } catch (eR) {}
            var _fbc = null;
            try { var _f = findBlogContainer(); _fbc = _f ? ((_f.tagName||'') + '#' + (_f.id||'') + '.' + (typeof _f.className==='string'?_f.className.slice(0,40):'')) : null; } catch (eF) {}
            fetch('http://127.0.0.1:7779/ingest/21c07440-19af-4cd8-979a-7d2c134d7467',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'d12b8c'},body:JSON.stringify({sessionId:'d12b8c',location:'renderer.js:paywallAuthObserver.settle',message:'snapshot changed - about to gate/render',data:{
              pathname: pathname,
              blogPath: blogPath || null,
              isOnEffectiveBlogRoute: self._isOnEffectiveBlogRoute(),
              isTransientAccountDrawerRoute: self._isTransientAccountDrawerRoute(pathname),
              itemsLength: self.items ? self.items.length : -1,
              rootConnected: _rootConnected,
              rootId: self._root ? (self._root.id || '(no id)') : '(no root)',
              findBlogContainerNow: _fbc
            },timestamp:Date.now(),hypothesisId:'H3,H4'})}).catch(function(){});
          } catch (e) {}
          // #endregion
          if (!self._isOnEffectiveBlogRoute()) {
            self._debugLog('paywall auth observer skipped outside blog route', { path: pathname, blogPath: blogPath || null });
            return;
          }
          if (self.items.length > 0) self._renderContent(self.items);
          else self.render();
        }, 280);
      });
      if (document.body) {
        this._paywallAuthObserver.observe(document.body, {
          attributes: true,
          attributeFilter: ['class'],
          childList: true,
          subtree: true
        });
      }
    },

    _detectViewerModeFromSquarespaceContext: function() {
      try {
        var identity = this._extractSquarespaceIdentity();
        if (identity && identity.loggedIn === true) return 'loggedIn';
        if (identity && identity.loggedIn === false) return 'loggedOut';
        var context = window.Static && window.Static.SQUARESPACE_CONTEXT;
        if (!context || typeof context !== 'object') return null;
        if (typeof context.authenticated === 'boolean') return context.authenticated ? 'loggedIn' : 'loggedOut';
      } catch (e) {}
      return null;
    },

    _detectViewerModeFromDom: function() {
      function shown(el) {
        if (!el) return false;
        if (el.getAttribute && el.getAttribute('aria-hidden') === 'true') return false;
        if (typeof window !== 'undefined' && window.getComputedStyle) {
          var s = window.getComputedStyle(el);
          if (s && (s.display === 'none' || s.visibility === 'hidden')) return false;
        }
        return true;
      }
      function ownedByBetterBlog(el) {
        try {
          return Boolean(el && el.closest && el.closest('#blog-overlay-list, .blog-overlay-wrapper, #bb-comments, .bb-comments-root'));
        } catch (e) {
          return false;
        }
      }
      function firstShown(selector) {
        try {
          var els = document.querySelectorAll(selector);
          for (var i = 0; i < els.length; i++) {
            if (!ownedByBetterBlog(els[i]) && shown(els[i])) return els[i];
          }
        } catch (e) {}
        return null;
      }
      try {
        var body = document.body;
        var html = document.documentElement;
        var authAttrEls = [body, html].filter(Boolean);
        for (var ai = 0; ai < authAttrEls.length; ai++) {
          var authAttrEl = authAttrEls[ai];
          var attrNames = ['data-authenticated', 'data-logged-in', 'data-member-logged-in', 'data-user-logged-in'];
          for (var an = 0; an < attrNames.length; an++) {
            var attrVal = authAttrEl.getAttribute && authAttrEl.getAttribute(attrNames[an]);
            if (attrVal === 'true' || attrVal === '1') return 'loggedIn';
            if (attrVal === 'false' || attrVal === '0') return 'loggedOut';
          }
          var cls = authAttrEl.className ? String(authAttrEl.className) : '';
          if (/\b(user|member|account)[-_]?(authenticated|logged[-_]?in|signed[-_]?in)\b/i.test(cls)) return 'loggedIn';
          if (/\b(user|member|account)[-_]?(anonymous|logged[-_]?out|signed[-_]?out)\b/i.test(cls)) return 'loggedOut';
        }
        var auth = firstShown('.user-accounts-panel .auth, .user-account .auth, [data-controller="UserAccount"] .auth, .auth');
        var unauth = firstShown('.user-accounts-panel .unauth, .user-account .unauth, [data-controller="UserAccount"] .unauth, .unauth');
        var authShown = shown(auth);
        var unauthShown = shown(unauth);
        if (authShown && !unauthShown) return 'loggedIn';
        if (unauthShown && !authShown) return 'loggedOut';

        // Additional membership/account UI heuristics for templates without .auth/.unauth wrappers.
        var hasLogout = firstShown(
          'a[href*=\"/account/logout\"],a[href*=\"/logout\"],a[data-action*=\"logout\" i],button[data-action*=\"logout\" i],[data-test*=\"logout\" i],[aria-label*=\"log out\" i],[aria-label*=\"sign out\" i]'
        );
        var hasSignin = firstShown(
          'a[href*=\"/account/login\"],a[href*=\"/login\"],a[data-action*=\"login\" i],a[data-action*=\"signin\" i],button[data-action*=\"signin\" i],[data-test*=\"login\" i],[data-test*=\"signin\" i],[aria-label*=\"log in\" i],[aria-label*=\"sign in\" i]'
        );
        if (hasLogout && !hasSignin) return 'loggedIn';
        if (hasSignin && !hasLogout) return 'loggedOut';

        var accountMenu = document.querySelector(
          '.user-accounts-panel .account, .user-account .account, .user-account-link[href*="/account"], a[href*="/account/dashboard"], a[href*="/account/profile"], [data-controller*="Account" i] [data-state="authenticated"]'
        );
        if (shown(accountMenu)) return 'loggedIn';
      } catch (e) {}
      return null;
    },

    _collectJsonAuthIdentity: function(json) {
      if (!json || typeof json !== 'object') return null;
      return this._extractSquarespaceIdentityFromObject(json)
        || this._extractSquarespaceIdentityFromObject(json.website)
        || this._extractSquarespaceIdentityFromObject(json.userAccountsContext)
        || this._extractSquarespaceIdentityFromObject(json.pagePreviewContext)
        || this._extractSquarespaceIdentityFromObject(json.context)
        || this._extractSquarespaceIdentityFromObject(json.collection)
        || null;
    },

    _updateJsonAuthSignals: function(json, source) {
      var identity = this._collectJsonAuthIdentity(json);
      if (source === 'currentPage') this._currentPageJsonIdentity = identity || null;
      else this._squarespaceJsonIdentity = identity || null;
      if (identity) {
        if (identity.loggedIn === true || identity.loggedIn === false) {
          this._rememberViewerModeHint(identity.loggedIn ? 'loggedIn' : 'loggedOut');
        }
      }
      if (json && typeof json === 'object' && (
        (json.userAccountsContext && typeof json.userAccountsContext === 'object')
        || (json.pagePreviewContext && typeof json.pagePreviewContext === 'object')
      )) {
        this._memberAccountsEnabledHint = true;
      }
      return identity;
    },

    _currentPageJsonFetchUrl: function() {
      if (this._previewMode || this._bbPreview) return null;
      if (typeof window === 'undefined' || !window.location) return null;
      try {
        if (this._isCollectionIndexPath() && this._getSelectedIndexFromHash() < 0) return null;
        var effectivePathname = this._getEffectiveBlogPathname();
        var effectiveSearch = effectivePathname === (window.location.pathname || '/')
          ? (window.location.search || '')
          : (this._lastBlogRouteSearch || '');
        var url = new URL(effectivePathname + effectiveSearch, window.location.origin);
        url.hash = '';
        url.searchParams.set('format', 'json');
        if (this.config && this.config.blogPassword && String(this.config.blogPassword).trim()) {
          url.searchParams.set('password', String(this.config.blogPassword).trim());
        }
        return url.toString();
      } catch (e) {
        return null;
      }
    },

    _probeCurrentPageJsonAuth: function() {
      var url = this._currentPageJsonFetchUrl();
      if (!url || url === this._currentPageAuthProbeUrl) return Promise.resolve(this._currentPageJsonIdentity);
      var self = this;
      this._currentPageAuthProbeUrl = url;
      return fetch(url, { credentials: 'same-origin' })
        .then(function(res) {
          if (!res || !res.ok) return null;
          return res.json();
        })
        .then(function(json) {
          if (!json || typeof json !== 'object') return null;
          return self._updateJsonAuthSignals(json, 'currentPage');
        })
        .catch(function() { return null; });
    },

    _waitForPostAuthHydration: function() {
      if (this._previewMode || this._bbPreview) return Promise.resolve();
      if (!this._isPaywalledSite()) return Promise.resolve();
      if (this._isCollectionIndexPath() && this._getSelectedIndexFromHash() < 0) return Promise.resolve();
      if (this._resolveViewerMode() === 'loggedIn') return Promise.resolve();
      var identity = this._currentPageJsonIdentity || this._squarespaceJsonIdentity;
      if (identity && (identity.loggedIn === true || identity.loggedIn === false)) {
        return Promise.resolve();
      }
      if (!this._memberAccountsEnabledHint) return Promise.resolve();
      var self = this;
      var started = Date.now();
      var maxWaitMs = 650;
      return new Promise(function(resolve) {
        var done = false;
        var finish = function() {
          if (done) return;
          done = true;
          if (observer) {
            try { observer.disconnect(); } catch (e1) {}
          }
          resolve();
        };
        var check = function() {
          if (self._resolveViewerMode() === 'loggedIn' || Date.now() - started > maxWaitMs) finish();
        };
        var observer = null;
        if (document.body && typeof MutationObserver !== 'undefined') {
          observer = new MutationObserver(function() {
            setTimeout(check, 0);
          });
          try {
            observer.observe(document.body, {
              attributes: true,
              childList: true,
              subtree: true
            });
          } catch (e2) {}
        }
        setTimeout(check, 100);
        setTimeout(check, 250);
        setTimeout(check, 450);
        setTimeout(finish, maxWaitMs);
      });
    },

    _logViewerModeResolution: function(reason, resolvedMode, details) {
      try {
        var loc = typeof window !== 'undefined' && window.location
          ? (window.location.pathname || '/') + (window.location.search || '') + (window.location.hash || '')
          : '';
        var payload = Object.assign({
          reason: reason,
          resolvedMode: resolvedMode,
          path: loc
        }, details || {});
        var sig = JSON.stringify(payload);
        if (sig === this._lastViewerModeResolutionLogSig) return;
        this._lastViewerModeResolutionLogSig = sig;
        console.log('[BetterBlog auth] viewer mode resolved', payload);
      } catch (e) {}
    },

    _resolveViewerMode: function() {
      var cfg = this.config || {};
      var explicitConfig = this._normalizeViewerMode(cfg.viewerMode);
      if (explicitConfig) {
        this._logViewerModeResolution('explicit config viewerMode', explicitConfig, {
          configViewerMode: cfg.viewerMode,
          paywallMode: cfg.paywallMode || null,
          paywallDetectionState: cfg.paywallDetectionState || null
        });
        return explicitConfig;
      }
      var explicitQuery = this._getViewerModeFromQueryParam();
      if (explicitQuery) {
        this._logViewerModeResolution('viewerMode query param', explicitQuery, {
          paywallMode: cfg.paywallMode || null,
          paywallDetectionState: cfg.paywallDetectionState || null
        });
        return explicitQuery;
      }

      var paywallMode = cfg.paywallMode;
      if (paywallMode === 'force_logged_in') {
        this._logViewerModeResolution('forced logged in', 'loggedIn', {
          paywallMode: paywallMode,
          paywallDetectionState: cfg.paywallDetectionState || null
        });
        return 'loggedIn';
      }
      if (paywallMode === 'force_logged_out') {
        this._logViewerModeResolution('forced logged out', 'loggedOut', {
          paywallMode: paywallMode,
          paywallDetectionState: cfg.paywallDetectionState || null
        });
        return 'loggedOut';
      }

      var fromSquarespaceContext = this._detectViewerModeFromSquarespaceContext();
      var fromDom = this._detectViewerModeFromDom();
      var memberGatePresent = this._isMemberGatePresent();
      var rememberedMode = this._getRememberedViewerModeHint();
      var baseDetails = {
        fromSquarespaceContext: fromSquarespaceContext,
        fromDom: fromDom,
        rememberedMode: rememberedMode,
        memberGatePresent: memberGatePresent,
        memberAccountsEnabledHint: Boolean(this._memberAccountsEnabledHint),
        paywallMode: paywallMode || null,
        paywallDetectionState: cfg.paywallDetectionState || null,
        isPaywalledSite: this._isPaywalledSite()
      };
      if (fromSquarespaceContext === 'loggedOut') {
        this._rememberViewerModeHint('loggedOut');
        this._logViewerModeResolution('Squarespace context logged out', 'loggedOut', baseDetails);
        return 'loggedOut';
      }
      if (fromDom === 'loggedOut') {
        this._rememberViewerModeHint('loggedOut');
        this._logViewerModeResolution('explicit logged-out DOM signal', 'loggedOut', baseDetails);
        return 'loggedOut';
      }
      if (fromSquarespaceContext === 'loggedIn' || fromDom === 'loggedIn') {
        this._rememberViewerModeHint('loggedIn');
        this._logViewerModeResolution('positive logged-in signal', 'loggedIn', baseDetails);
        return 'loggedIn';
      }
      if (rememberedMode === 'loggedIn') {
        this._logViewerModeResolution('remembered logged-in session hint', 'loggedIn', baseDetails);
        return 'loggedIn';
      }
      if (memberGatePresent) {
        this._rememberViewerModeHint('loggedOut');
        this._logViewerModeResolution('member gate present', 'loggedOut', baseDetails);
        return 'loggedOut';
      }
      if (rememberedMode) {
        this._logViewerModeResolution('remembered session hint', rememberedMode, baseDetails);
        return rememberedMode;
      }

      // Member areas: visible gate ⇒ logged out. If there is no gate, do not assume logged in on
      // paywalled blogs — Squarespace "blog posts only" mode shows the collection to logged-out
      // readers without the full-page gate, and we must still run logged-out paywall UI.
      if (this._memberAccountsEnabledHint) {
        if (!this._isPaywalledSite()) {
          this._logViewerModeResolution('member accounts hint on unpaywalled site', 'loggedIn', baseDetails);
          return 'loggedIn';
        }
      }

      this._logViewerModeResolution('default logged out fallback', 'loggedOut', baseDetails);
      return 'loggedOut';
    },

    _resolveLevelConfigForViewerMode: function(levelConfig, viewerMode) {
      if (!this._isContextBucket(levelConfig)) {
        if (levelConfig && typeof levelConfig === 'object') {
          return { normalized: { loggedOut: levelConfig, loggedIn: levelConfig }, active: levelConfig };
        }
        return { normalized: null, active: null };
      }
      var normalized = {
        loggedOut: (levelConfig.loggedOut && typeof levelConfig.loggedOut === 'object') ? levelConfig.loggedOut : (levelConfig.loggedIn && typeof levelConfig.loggedIn === 'object' ? levelConfig.loggedIn : {}),
        loggedIn: (levelConfig.loggedIn && typeof levelConfig.loggedIn === 'object') ? levelConfig.loggedIn : (levelConfig.loggedOut && typeof levelConfig.loggedOut === 'object' ? levelConfig.loggedOut : {})
      };
      var active = viewerMode === 'loggedIn' ? normalized.loggedIn : normalized.loggedOut;
      return { normalized: normalized, active: active };
    },

    /** Active collection/post level config merged with site-level author fields. */
    _getActiveRenderCfg: function() {
      var rawCfg = this.config || {};
      var items = this.items || [];
      var viewerMode = this._resolveViewerMode();
      var resolvedCollection = this._resolveLevelConfigForViewerMode(rawCfg.collectionConfig, viewerMode);
      var resolvedPost = this._resolveLevelConfigForViewerMode(rawCfg.postConfig, viewerMode);
      var baseCfg = Object.assign({}, rawCfg, {
        collectionConfig: resolvedCollection.active || rawCfg.collectionConfig,
        postConfig: resolvedPost.active || rawCfg.postConfig
      });
      var selectedIndex = this._getSelectedIndex(items);
      var searchQuery = this._searchQuery || '';
      var categoryFilter = Array.isArray(this._categoryFilter) ? this._categoryFilter : [];
      var tagFilter = Array.isArray(this._tagFilter) ? this._tagFilter : [];
      var hasAnyFilter = searchQuery.trim().length > 0 || categoryFilter.length > 0 || tagFilter.length > 0;
      var isSinglePost = selectedIndex >= 0 && selectedIndex < items.length && !hasAnyFilter;
      var levelCfg = isSinglePost
        ? (baseCfg.postConfig && typeof baseCfg.postConfig === 'object' ? baseCfg.postConfig : baseCfg)
        : (baseCfg.collectionConfig && typeof baseCfg.collectionConfig === 'object' ? baseCfg.collectionConfig : baseCfg);
      return Object.assign({}, baseCfg, levelCfg);
    },

    _appendModulePostCardListMeta: function(textHost, post, cardCfg) {
      var cardShowDate = Boolean(cardCfg && cardCfg.showDate);
      var cardShowAuthor = Boolean(cardCfg && cardCfg.showAuthor);
      var cardShowReadingTime = Boolean(cardCfg && cardCfg.showReadingTime);
      var metaLines = [];
      if (cardShowDate) { var cardDateStr = this._getDate(post); if (cardDateStr) metaLines.push(cardDateStr); }
      if (cardShowAuthor) { var cardAuthorStr = this._getAuthorsForPost(post, cardCfg); if (cardAuthorStr) metaLines.push(cardAuthorStr); }
      if (cardShowReadingTime) {
        var cardMins = this._getReadingTimeMinutes(post.body);
        metaLines.push(cardMins === 1 ? '1 min read' : cardMins + ' min read');
      }
      if (metaLines.length === 0) return;
      var metaWrap = document.createElement('div');
      metaWrap.className = 'bb-sidebar-post-meta';
      metaWrap.textContent = metaLines.join(' · ');
      textHost.appendChild(metaWrap);
    },

    _mergeContextBucketLevelConfig: function(prev, next, nestedKeys) {
      var prevFlat = this._isContextBucket(prev)
        ? (this._resolveLevelConfigForViewerMode(prev, this._resolveViewerMode()).active || {})
        : (prev && typeof prev === 'object' && !Array.isArray(prev) ? prev : {});
      var nextFlat = this._isContextBucket(next)
        ? (this._resolveLevelConfigForViewerMode(next, this._resolveViewerMode()).active || {})
        : (next && typeof next === 'object' && !Array.isArray(next) ? next : {});
      return this._mergeNestedLevelConfig(prevFlat, nextFlat, nestedKeys);
    },

    updateConfig: function(newConfig) {
      if (!newConfig || typeof newConfig !== 'object') return;
      var prevSig = this._lastConfigSignature;
      var nextSig = JSON.stringify(newConfig);
      var prev = this.config || {};
      var merged = Object.assign({}, prev, newConfig);
      if (newConfig.collectionConfig && typeof newConfig.collectionConfig === 'object') {
        merged.collectionConfig = this._mergeContextBucketLevelConfig(prev.collectionConfig, newConfig.collectionConfig, [
          'headerContent', 'footerContent', 'leftSidebar', 'rightSidebar', 'featuredArticle', 'pagination', 'collectionModules', 'featuredImage'
        ]);
      }
      if (newConfig.postConfig && typeof newConfig.postConfig === 'object') {
        merged.postConfig = this._mergeContextBucketLevelConfig(prev.postConfig, newConfig.postConfig, [
          'headerContent', 'footerContent', 'leftSidebar', 'rightSidebar', 'postModules', 'postHeader', 'progressBar', 'featuredImage'
        ]);
      }
      this.config = merged;
      this._debugLog('updateConfig', {
        sameSignatureAsPrevious: prevSig === nextSig && Boolean(this._lastConfigSignature),
        previewSelectedPostIndex: this.config && typeof this.config.previewSelectedPostIndex === 'number'
          ? this.config.previewSelectedPostIndex
          : null,
        hasCollectionConfig: Boolean(this.config && this.config.collectionConfig),
        hasPostConfig: Boolean(this.config && this.config.postConfig)
      });
      if (prevSig === nextSig && this._lastConfigSignature) return;
      this._lastConfigSignature = nextSig;
      if (this.items.length) {
        var scrollEl = this._getScrollContainer ? this._getScrollContainer() : null;
        var win = typeof window !== 'undefined' ? window : null;
        var scrollTarget = scrollEl || win;
        var scrollTop = scrollTarget ? scrollTarget.scrollY || scrollTarget.scrollTop || 0 : 0;
        var scrollLeft = scrollTarget ? scrollTarget.scrollX || scrollTarget.scrollLeft || 0 : 0;
        this._renderContent(this.items);
        try {
          if (scrollTarget) {
            if (scrollTarget.scrollTo) scrollTarget.scrollTo(scrollLeft, scrollTop);
            else { scrollTarget.scrollTop = scrollTop; scrollTarget.scrollLeft = scrollLeft; }
          }
        } catch (e) {}
      }
    },

    _perfNow: function() {
      return (typeof performance !== 'undefined' && typeof performance.now === 'function')
        ? performance.now()
        : Date.now();
    },

    _perfMark: function(name) {
      try {
        window.__bbPerf = window.__bbPerf || {};
        window.__bbPerf[name] = this._perfNow();
      } catch (e) { /* ignore */ }
    },

    _perfDelta: function(endMark, startMark) {
      try {
        var p = window.__bbPerf;
        if (!p || p[endMark] == null || p[startMark] == null) return null;
        return Math.round(p[endMark] - p[startMark]);
      } catch (e) {
        return null;
      }
    },

    _perfShouldSample: function() {
      if (this._bbPreview || (this.config && this.config.previewMode)) return false;
      var rate = this.config && typeof this.config.perfSampleRate === 'number'
        ? this.config.perfSampleRate
        : 0.15;
      if (rate <= 0) return false;
      if (rate >= 1) return true;
      return Math.random() < rate;
    },

    _perfOnVisible: function() {
      if (this._perfReported) return;
      this._perfReported = true;
      if (!this._perfShouldSample()) return;
      var p = window.__bbPerf || {};
      var conn = null;
      try {
        var c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        if (c) {
          conn = {
            effectiveType: c.effectiveType || null,
            downlink: typeof c.downlink === 'number' ? c.downlink : null,
            rtt: typeof c.rtt === 'number' ? c.rtt : null,
            saveData: Boolean(c.saveData)
          };
        }
      } catch (eConn) { /* ignore */ }
      var isSinglePost = false;
      try {
        if (this.items && this.items.length) {
          var vs = this._computeCollectionViewState(this.items);
          isSinglePost = Boolean(vs && vs.isSinglePost);
        }
      } catch (eVs) { /* ignore */ }
      var layout = '';
      try {
        var cfg = this.config && this.config.collectionConfig;
        layout = (cfg && cfg.collectionLayout) ? String(cfg.collectionLayout) : '';
      } catch (eLay) { /* ignore */ }
      this._analyticsTrack('render_perf', {
        loaderToConfig: this._perfDelta('configResponse', 'loaderEval'),
        configToRenderer: this._perfDelta('rendererInit', 'rendererRequest'),
        rendererToJsonFirst: this._perfDelta('blogJsonFirstPage', 'rendererInit'),
        jsonFirstToDom: this._perfDelta('renderDomCommitted', 'blogJsonFirstPage'),
        domToVisible: this._perfDelta('visible', 'renderDomCommitted'),
        totalToVisible: this._perfDelta('visible', 'loaderEval'),
        blogJsonPages: this._blogJsonPageCount || 1,
        postCount: this.items ? this.items.length : 0,
        viewType: isSinglePost ? 'post' : 'collection',
        collectionLayout: layout,
        isPaywalled: this._isPaywalledSite ? this._isPaywalledSite() : false,
        connection: conn,
        deviceMemory: typeof navigator.deviceMemory === 'number' ? navigator.deviceMemory : null,
        hwConcurrency: typeof navigator.hardwareConcurrency === 'number' ? navigator.hardwareConcurrency : null
      });
      this._analyticsFlush();
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
      if (this._analyticsFlushScheduled) {
        clearTimeout(this._analyticsFlushScheduled);
        this._analyticsFlushScheduled = null;
      }
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
      var cache = this._readingTimeCache || (this._readingTimeCache = Object.create(null));
      if (cache[html] != null) return cache[html];
      var text = this._stripHtml(html);
      var words = text ? text.split(/\s+/).filter(Boolean).length : 0;
      var mins = Math.max(1, Math.ceil(words / 200));
      cache[html] = mins;
      return mins;
    },

    /**
     * Returns true if url is Squarespace's no-image placeholder (should not be displayed).
     * Checks both the given url and, via fetch, the final URL after redirects.
     */
    _isPlaceholderImageUrl: function(url) {
      if (!url || typeof url !== 'string') return false;
      var u = url.toLowerCase();
      return u.indexOf('no-image.png') >= 0 || u.indexOf('configuration/no-image') >= 0;
    },
    _isPlaceholderWithMap: function(url, placeholderMap) {
      if (!url || typeof url !== 'string') return true;
      if (placeholderMap === null) return false;
      if (placeholderMap && placeholderMap.hasOwnProperty(url)) return placeholderMap[url] === true;
      return this._isPlaceholderImageUrl(url);
    },

    /** Same gradient set as editorial cards when no usable featured image. */
    _editorialImagePlaceholderGradients: [
      'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
      'linear-gradient(135deg, #2d1b69 0%, #11998e 100%)',
      'linear-gradient(135deg, #373b44 0%, #4286f4 100%)',
      'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)',
      'linear-gradient(135deg, #4b1248 0%, #f10711 100%)',
      'linear-gradient(135deg, #0d0d0d 0%, #4a4a4a 100%)'
    ],
    /**
     * CSS `background` value for a featured/collection image area: cover photo or editorial-style gradient.
     */
    _featuredImageAreaBackground: function(imgUrl, placeholderMap, post, items) {
      if (imgUrl && typeof imgUrl === 'string' && !this._isPlaceholderWithMap(imgUrl, placeholderMap)) {
        return 'url(' + imgUrl + ') center/cover';
      }
      var idx = 0;
      if (post && items && Array.isArray(items)) {
        var ix = this._postIndexInItems(items, post, this._itemIndexMap);
        if (ix >= 0) idx = ix;
      }
      var g = this._editorialImagePlaceholderGradients;
      var tokens = this._getCollectionStyleTokens();
      return (tokens && tokens.placeholder) ? tokens.placeholder : g[idx % g.length];
    },

    /**
     * Strip HTML to plain text. Prefer innerText so block boundaries (e.g. </h2><p>)
     * become whitespace; textContent concatenates adjacent blocks ("Section 1" + "Advice" → "Section 1Advice").
     */
    _stripHtml: function(html) {
      if (!html || typeof html !== 'string') return '';
      var cache = this._htmlTextCache || (this._htmlTextCache = Object.create(null));
      if (cache[html]) return cache[html];
      var div = document.createElement('div');
      div.innerHTML = html;
      var raw = typeof div.innerText === 'string' ? div.innerText : (div.textContent || '');
      var plain = raw.replace(/\s+/g, ' ').trim();
      cache[html] = plain;
      return plain;
    },

    /**
     * Remove leading Squarespace-style placeholder headings ("Section 1", "Section 2", …)
     * from plain text used for excerpts/decks. Handles glued text ("Section 1Advice") and
     * punctuation after the number ("Section 1.Advice").
     */
    _stripLeadingSquarespaceSectionMarkers: function(plain) {
      if (!plain || typeof plain !== 'string') return '';
      var s = plain.trim();
      while (/^Section\s+\d+/i.test(s)) {
        s = s.replace(/^Section\s+\d+/i, '').trim();
        s = s.replace(/^[.,:;\s]+/, '').trim();
      }
      return s;
    },

    /** Plain text from blog HTML for excerpts, truncated blurbs, and decks (strip + Section cleanup). */
    _plainTextFromBlogHtml: function(html) {
      return this._stripLeadingSquarespaceSectionMarkers(this._stripHtml(html));
    },

    /**
     * Strip HTML and truncate text to maxLen chars
     */
    _truncateText: function(html, maxLen) {
      if (!html) return '';
      var text = this._plainTextFromBlogHtml(html);
      if (text.length <= maxLen) return text;
      return text.slice(0, maxLen) + '…';
    },

    /** Plain text from excerpt/body: first n sentences (best-effort split on . ! ?). */
    _extractFirstNSentences: function(htmlOrText, n) {
      if (!htmlOrText || n < 1) return '';
      var plain = this._plainTextFromBlogHtml(htmlOrText);
      if (!plain) return '';
      var m = plain.match(/[^.!?]*[.!?]+|[^.!?]+$/g);
      if (!m || m.length === 0) return plain;
      var take = Math.min(n, m.length);
      var out = [];
      for (var i = 0; i < take; i++) {
        var t = (m[i] || '').trim();
        if (t) out.push(t);
      }
      return out.length ? out.join(' ').trim() : plain;
    },

    /**
     * Exact substring search over posts: titles, excerpts, and body text (case-insensitive)
     */
    _searchPosts: function(items, query) {
      if (!query || typeof query !== 'string') return items;
      var q = query.toLowerCase();
      var results = [];
      var searchCache = this._searchableTextCache || (this._searchableTextCache = Object.create(null));
      for (var i = 0; i < items.length; i++) {
        var post = items[i];
        var cacheKey = post && (post.id || post.urlId || post.fullUrl) ? String(post.id || post.urlId || post.fullUrl) : String(i);
        var searchable = searchCache[cacheKey];
        if (!searchable) {
          var title = (post.title || '').toLowerCase();
          var excerpt = (post.excerpt || '').toLowerCase();
          var bodyText = this._stripHtml(post.body || '').toLowerCase();
          searchable = title + ' ' + excerpt + ' ' + bodyText;
          searchCache[cacheKey] = searchable;
        }
        if (searchable.indexOf(q) !== -1) results.push(post);
      }
      return results;
    },

    /**
     * Get category names for a post (supports category, categories array, objects with title/name).
     * Comma-separated strings (common from Squarespace / feeds) are split so display gets "A, B" spacing.
     */
    _getPostCategories: function(post) {
      if (!post) return [];
      var cats = [];
      function pushSplitNames(raw) {
        if (raw == null || raw === '') return;
        var parts = String(raw).split(',');
        for (var pi = 0; pi < parts.length; pi++) {
          var name = parts[pi].replace(/^\s+|\s+$/g, '');
          if (name && cats.indexOf(name) === -1) cats.push(name);
        }
      }
      if (post.category) {
        pushSplitNames(post.category);
      }
      if (post.categories && Array.isArray(post.categories)) {
        for (var i = 0; i < post.categories.length; i++) {
          var c = post.categories[i];
          var name = typeof c === 'string' ? c : (c && (c.title || c.name)) ? String(c.title || c.name) : null;
          if (name) pushSplitNames(name);
        }
      }
      return cats;
    },

    _zoneHasCategoryFilterModule: function(cfg) {
      if (!cfg || typeof cfg !== 'object') return false;
      var has = function(zone) {
        if (!zone || !Array.isArray(zone.modules)) return false;
        var m = zone.modules;
        return m.indexOf('filterByCategory') >= 0 || m.indexOf('filterByTagsAndCategories') >= 0;
      };
      return has(cfg.headerContent) || has(cfg.leftSidebar) || has(cfg.rightSidebar);
    },

    _collectionCategoryFilterUiEnabled: function(baseCfg) {
      if (!baseCfg || typeof baseCfg !== 'object') return false;
      if (this._zoneHasCategoryFilterModule(baseCfg.collectionConfig)) return true;
      return this._zoneHasCategoryFilterModule(baseCfg);
    },

    /**
     * Categories line above post title (Newsroom, Showcase, Masthead, Digest, Editorial). Small caps + accent; optional filter buttons.
     * opts.onDark: accent pill badges on editorial imagery (like FEATURED); opts.compact: smaller badges on small editorial tiles.
     */
    _createCollectionPostCategoriesLine: function(post, siteAccent, categoryFilterUiEnabled, opts) {
      var self = this;
      opts = opts && typeof opts === 'object' ? opts : {};
      var onDark = opts.onDark === true;
      var onDarkSolid = opts.onDarkSolid === true;
      var compact = opts.compact === true;
      var cats = self._getPostCategories(post);
      if (cats.length === 0) return null;
      var wrap = document.createElement('div');
      wrap.className = 'blog-overlay-post-categories-line';
      wrap.style.marginBottom = compact ? '0' : '6px';
      wrap.style.lineHeight = compact ? '1.25' : '1.35';
      wrap.style.display = 'flex';
      wrap.style.flexWrap = 'wrap';
      wrap.style.alignItems = 'center';
      wrap.style.gap = compact ? '5px' : '6px';

      function appendCategoryEl(catName) {
        var el = categoryFilterUiEnabled ? document.createElement('button') : document.createElement('span');
        if (categoryFilterUiEnabled) {
          el.type = 'button';
          el.style.cursor = 'pointer';
          el.setAttribute('aria-label', 'Show posts in category: ' + catName);
          (function(cn) {
            el.onclick = function(e) {
              e.preventDefault();
              self._categoryFilter = [cn];
              self._currentPage = 1;
              if (typeof window !== 'undefined') {
                try { window.history.replaceState(null, '', window.location.pathname + (window.location.search || '')); } catch (err) {}
                window.location.hash = '';
              }
              self._renderContent(self.items);
            };
          })(catName);
        }
        el.textContent = catName;
        self._applyCategoryLabelStyle(el, { onImage: onDark && !onDarkSolid, onDarkSolid: onDarkSolid });
        if (categoryFilterUiEnabled) {
          el.style.background = 'none';
          el.style.border = 'none';
          el.style.padding = '0';
        }
        wrap.appendChild(el);
      }

      if (onDark || onDarkSolid) {
        for (var di = 0; di < cats.length; di++) appendCategoryEl(cats[di]);
        return wrap;
      }

      if (!categoryFilterUiEnabled) {
        var labelOnly = document.createElement('span');
        self._applyCategoryLabelStyle(labelOnly, { onImage: false });
        labelOnly.textContent = cats.join(', ');
        wrap.appendChild(labelOnly);
        return wrap;
      }

      wrap.style.alignItems = 'baseline';
      for (var i = 0; i < cats.length; i++) {
        if (i > 0) {
          var commaSp = document.createElement('span');
          commaSp.textContent = ', ';
          commaSp.setAttribute('aria-hidden', 'true');
          commaSp.style.color = 'var(--bb-accent,#5B4FE8)';
          wrap.appendChild(commaSp);
        }
        appendCategoryEl(cats[i]);
      }
      return wrap;
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
     * Sidebar topic/tag badges (toggle select with site accent).
     * filterKey: 'category' | 'tag'
     */
    _createSidebarTopicBadgeList: function(values, filterKey, width, opts) {
      var self = this;
      opts = opts || {};
      var clearOtherOnSelect = opts.clearOtherOnSelect === true;
      var accent = self._getSiteAccentColor();
      var filterProp = filterKey === 'category' ? '_categoryFilter' : '_tagFilter';
      var otherProp = filterKey === 'category' ? '_tagFilter' : '_categoryFilter';
      var wrap = document.createElement('div');
      wrap.className = 'blog-overlay-topic-badges-wrap';
      wrap.style.width = '100%';
      wrap.style.boxSizing = 'border-box';
      if (width) wrap.style.maxWidth = width + 'px';
      if (!values || values.length === 0) {
        var empty = document.createElement('p');
        empty.textContent = filterKey === 'category' ? 'No topics yet' : 'No tags yet';
        empty.style.fontSize = '0.8rem';
        empty.style.color = '#888';
        empty.style.margin = '0';
        wrap.appendChild(empty);
        return wrap;
      }
      var badgesWrap = document.createElement('div');
      badgesWrap.className = 'blog-overlay-topic-badges';
      badgesWrap.style.display = 'flex';
      badgesWrap.style.flexWrap = 'wrap';
      badgesWrap.style.gap = '8px';
      for (var i = 0; i < values.length; i++) {
        (function(val) {
          var sel = Array.isArray(self[filterProp]) ? self[filterProp] : [];
          var isActive = sel.length === 1 && sel[0] === val;
          var btn = document.createElement('button');
          btn.type = 'button';
          btn.textContent = val;
          btn.className = 'bb-topic-badge' + (isActive ? ' bb-topic-badge--active' : '');
          btn.onclick = function() {
            var current = Array.isArray(self[filterProp]) ? self[filterProp].slice() : [];
            var activeNow = current.length === 1 && current[0] === val;
            self[filterProp] = activeNow ? [] : [val];
            if (!activeNow && clearOtherOnSelect) self[otherProp] = [];
            self._currentPage = 1;
            self._renderContent(self.items);
          };
          badgesWrap.appendChild(btn);
        })(values[i]);
      }
      wrap.appendChild(badgesWrap);
      return wrap;
    },

    /**
     * Header filter pills: hide native horizontal scrollbar; show edge carets when more content is off-screen.
     */
    _wrapHeaderFilterPillsScroller: function(pillsWrap) {
      pillsWrap.className = (pillsWrap.className ? pillsWrap.className + ' ' : '') + 'blog-overlay-header-filter-pills';

      var shell = document.createElement('div');
      shell.className = 'blog-overlay-header-filter-scroller';
      shell.style.position = 'relative';
      shell.style.width = '100%';
      shell.style.minWidth = '0';
      shell.style.boxSizing = 'border-box';

      function makeCaret(side) {
        var el = document.createElement('button');
        el.type = 'button';
        el.className = 'blog-overlay-header-filter-scroll-caret blog-overlay-header-filter-scroll-caret--' + side;
        el.setAttribute('aria-label', side === 'left' ? 'Scroll categories left' : 'Scroll categories right');
        var glyph = document.createElement('span');
        glyph.className = 'blog-overlay-header-filter-scroll-caret-glyph';
        glyph.setAttribute('aria-hidden', 'true');
        glyph.textContent = side === 'left' ? '‹' : '›';
        el.appendChild(glyph);
        return el;
      }

      var caretLeft = makeCaret('left');
      var caretRight = makeCaret('right');

      function scrollFilters(direction) {
        var step = Math.max(120, Math.round(pillsWrap.clientWidth * 0.55));
        pillsWrap.scrollBy({ left: direction * step, behavior: 'smooth' });
      }
      caretLeft.addEventListener('click', function(e) {
        e.preventDefault();
        scrollFilters(-1);
      });
      caretRight.addEventListener('click', function(e) {
        e.preventDefault();
        scrollFilters(1);
      });

      function syncCarets() {
        var maxScroll = Math.max(0, pillsWrap.scrollWidth - pillsWrap.clientWidth);
        var sl = pillsWrap.scrollLeft;
        var hasOverflow = maxScroll > 1;
        var showLeft = hasOverflow && sl > 1;
        var showRight = hasOverflow && sl < maxScroll - 1;
        caretLeft.style.opacity = showLeft ? '1' : '0';
        caretRight.style.opacity = showRight ? '1' : '0';
        caretLeft.style.pointerEvents = showLeft ? 'auto' : 'none';
        caretRight.style.pointerEvents = showRight ? 'auto' : 'none';
        caretLeft.tabIndex = showLeft ? 0 : -1;
        caretRight.tabIndex = showRight ? 0 : -1;
      }

      pillsWrap._bbSyncFilterScrollIndicators = syncCarets;
      pillsWrap.addEventListener('scroll', syncCarets, { passive: true });
      if (typeof ResizeObserver !== 'undefined') {
        var ro = new ResizeObserver(syncCarets);
        ro.observe(pillsWrap);
        pillsWrap._bbFilterScrollResizeObserver = ro;
      } else if (typeof window !== 'undefined') {
        window.addEventListener('resize', syncCarets, { passive: true });
      }

      shell.appendChild(caretLeft);
      shell.appendChild(pillsWrap);
      shell.appendChild(caretRight);
      requestAnimationFrame(syncCarets);
      setTimeout(syncCarets, 0);
      return shell;
    },

    /**
     * Create Filter by Category module. placement: 'header' = pills, 'sidebar' = topic badges.
     */
    _createFilterByCategoryModule: function(items, width, noLabel, placement) {
      var self = this;
      var categories = this._getAllCategories(items);
      var usePills = placement === 'header';

      if (placement === 'sidebar') {
        return this._createSidebarTopicBadgeList(categories, 'category', width);
      }

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
          self._applyFilterButtonStyle(allBtn, !activeVal);
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
            self._applyFilterButtonStyle(pill, activeVal === cat);
            (function(c) {
              pill.onclick = function() {
                self._categoryFilter = [c];
                self._currentPage = 1;
                self._renderContent(self.items);
              };
            })(cat);
            pillsWrap.appendChild(pill);
          }
          if (pillsWrap._bbSyncFilterScrollIndicators) pillsWrap._bbSyncFilterScrollIndicators();
        }
        var categoryPillsScroller = self._wrapHeaderFilterPillsScroller(pillsWrap);
        renderPills();
        return categoryPillsScroller;
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
            opt.onmouseover = function() { opt.style.background = 'var(--bb-accent-10, rgba(91,79,232,0.08))'; };
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
          chip.style.background = 'var(--bb-accent-10, rgba(91,79,232,0.1))';
          chip.style.color = 'var(--bb-accent, #5B4FE8)';
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
     * Create Filter by Tag module. placement: 'header' = pills, 'sidebar' = topic badges.
     */
    _createFilterByTagModule: function(items, width, noLabel, placement) {
      var self = this;
      var tags = this._getAllTags(items);
      var usePills = placement === 'header';

      if (placement === 'sidebar') {
        return this._createSidebarTopicBadgeList(tags, 'tag', width);
      }

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
          self._applyFilterButtonStyle(allBtn, !activeVal);
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
            self._applyFilterButtonStyle(pill, activeVal === tag);
            (function(t) {
              pill.onclick = function() {
                self._tagFilter = [t];
                self._currentPage = 1;
                self._renderContent(self.items);
              };
            })(tag);
            pillsWrap.appendChild(pill);
          }
          if (pillsWrap._bbSyncFilterScrollIndicators) pillsWrap._bbSyncFilterScrollIndicators();
        }
        var tagPillsScroller = self._wrapHeaderFilterPillsScroller(pillsWrap);
        renderPills();
        return tagPillsScroller;
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
            opt.onmouseover = function() { opt.style.background = 'var(--bb-accent-10, rgba(91,79,232,0.08))'; };
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
          chip.style.background = 'var(--bb-accent-10, rgba(91,79,232,0.1))';
          chip.style.color = 'var(--bb-accent, #5B4FE8)';
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
          self._applyFilterButtonStyle(allBtn, !activeVal);
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
            self._applyFilterButtonStyle(pill, activeVal === 'cat:' + cat);
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
            self._applyFilterButtonStyle(pill, activeVal === 'tag:' + tag);
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
          if (pillsWrap._bbSyncFilterScrollIndicators) pillsWrap._bbSyncFilterScrollIndicators();
        }
        var combinedPillsScroller = self._wrapHeaderFilterPillsScroller(pillsWrap);
        renderPills();
        return combinedPillsScroller;
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
            opt.onmouseover = function() { opt.style.background = 'var(--bb-accent-10, rgba(91,79,232,0.08))'; };
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
          chip.style.background = 'var(--bb-accent-10, rgba(91,79,232,0.1))';
          chip.style.color = 'var(--bb-accent, #5B4FE8)';
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
     * placement: 'header' = pills, 'sidebar' = topic badges.
     */
    _createFilterByTagsAndCategoriesModule: function(items, width, noLabel, placement) {
      var self = this;
      var categories = this._getAllCategories(items);
      var tags = this._getAllTags(items);
      var usePills = placement === 'header';

      if (placement === 'sidebar') {
        var combinedWrap = document.createElement('div');
        combinedWrap.style.width = '100%';
        combinedWrap.style.boxSizing = 'border-box';
        if (width) combinedWrap.style.maxWidth = width + 'px';
        var badgeOpts = { clearOtherOnSelect: true };
        if (categories.length > 0) {
          combinedWrap.appendChild(self._createSidebarTopicBadgeList(categories, 'category', null, badgeOpts));
        }
        if (tags.length > 0) {
          if (categories.length > 0) {
            var tagSpacer = document.createElement('div');
            tagSpacer.style.height = '16px';
            combinedWrap.appendChild(tagSpacer);
            var tagMiniHeader = document.createElement('div');
            tagMiniHeader.textContent = 'Tags';
            tagMiniHeader.style.fontSize = '0.7rem';
            tagMiniHeader.style.fontWeight = '700';
            tagMiniHeader.style.letterSpacing = '0.08em';
            tagMiniHeader.style.textTransform = 'uppercase';
            tagMiniHeader.style.color = '#111';
            tagMiniHeader.style.marginBottom = '8px';
            combinedWrap.appendChild(tagMiniHeader);
            var tagBar = document.createElement('div');
            tagBar.style.height = '2px';
            tagBar.style.background = '#111';
            tagBar.style.marginBottom = '12px';
            combinedWrap.appendChild(tagBar);
          }
          combinedWrap.appendChild(self._createSidebarTopicBadgeList(tags, 'tag', null, badgeOpts));
        }
        if (categories.length === 0 && tags.length === 0) {
          var noFilters = document.createElement('p');
          noFilters.textContent = 'No filters available';
          noFilters.style.fontSize = '0.8rem';
          noFilters.style.color = '#888';
          noFilters.style.margin = '0';
          combinedWrap.appendChild(noFilters);
        }
        return combinedWrap;
      }

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
          self._applyFilterButtonStyle(allBtn, !activeVal);
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
            self._applyFilterButtonStyle(pill, activeVal && activeVal.type === 'category' && activeVal.name === cat);
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
            self._applyFilterButtonStyle(pill, activeVal && activeVal.type === 'tag' && activeVal.name === tag);
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
          if (pillsWrap._bbSyncFilterScrollIndicators) pillsWrap._bbSyncFilterScrollIndicators();
        }
        var combinedPillsScroller = self._wrapHeaderFilterPillsScroller(pillsWrap);
        renderPills();
        return combinedPillsScroller;
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
              opt.onmouseover = function() { opt.style.background = 'var(--bb-accent-10, rgba(91,79,232,0.08))'; };
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
              opt.onmouseover = function() { opt.style.background = 'var(--bb-accent-10, rgba(91,79,232,0.08))'; };
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
          chip.style.background = 'var(--bb-accent-10, rgba(91,79,232,0.1))';
          chip.style.color = 'var(--bb-accent, #5B4FE8)';
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
      select.className = 'bb-chrome-input';
      select.style.width = '100%';
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
     * Collection header search: full input on desktop; mobile icon expands to input on tap.
     */
    _createCollectionHeaderSearchControl: function(siteAccentUi, opts) {
      var self = this;
      opts = opts && typeof opts === 'object' ? opts : {};
      var mobile = opts.mobile === true;
      var accent = siteAccentUi || self._getSiteAccentColor();
      var hasQuery = Boolean(self._searchQuery && String(self._searchQuery).trim());
      if (hasQuery) self._headerSearchExpanded = true;
      if (self._headerSearchExpanded == null) self._headerSearchExpanded = false;

      var searchWrap = document.createElement('div');
      searchWrap.className = 'blog-overlay-header-search' + (mobile ? ' blog-overlay-header-search-mobile' : '');

      var inputBorderColor = 'var(--bb-border, #e8e7e4)';

      function wireSearchInput(searchInput, inputOpts) {
        inputOpts = inputOpts && typeof inputOpts === 'object' ? inputOpts : {};
        var embeddedInField = inputOpts.embeddedInField === true;
        searchInput.type = 'text';
        searchInput.placeholder = 'Search posts…';
        searchInput.setAttribute('aria-label', 'Search posts');
        searchInput.value = self._searchQuery || '';
        searchInput.className = 'blog-overlay-search-input' + (embeddedInField ? '' : ' bb-chrome-input');
        searchInput.style.outline = 'none';
        searchInput.style.boxSizing = 'border-box';
        searchInput.style.color = 'inherit';
        if (embeddedInField) {
          searchInput.style.padding = '8px 12px 8px 0';
          searchInput.style.fontSize = '14px';
          searchInput.style.border = 'none';
          searchInput.style.borderRadius = '0';
          searchInput.style.background = 'transparent';
        } else {
          self._applyChromeInputStyle(searchInput);
        }
        searchInput.onfocus = function() {
          if (embeddedInField && inputOpts.fieldEl) {
            inputOpts.fieldEl.style.borderColor = accent;
            inputOpts.fieldEl.style.boxShadow = '0 0 0 2px color-mix(in srgb, ' + accent + ' 22%, transparent)';
            return;
          }
          searchInput.style.borderColor = accent;
          searchInput.style.boxShadow = '0 0 0 2px color-mix(in srgb, ' + accent + ' 22%, transparent)';
        };
        searchInput.onblur = function() {
          if (embeddedInField && inputOpts.fieldEl) {
            inputOpts.fieldEl.style.borderColor = inputBorderColor;
            inputOpts.fieldEl.style.boxShadow = '';
            return;
          }
          searchInput.style.borderColor = inputBorderColor;
          searchInput.style.boxShadow = '';
        };
        searchInput.oninput = function() {
          self._searchQuery = searchInput.value;
          self._scheduleSearchDrivenRender();
        };
        searchInput.onkeydown = function(e) {
          if (e.key === 'Escape') {
            self._clearPendingSearchRender();
            searchInput.value = '';
            self._searchQuery = '';
            self._currentPage = 1;
            if (mobile) self._headerSearchExpanded = false;
            self._renderContent(self.items);
            searchInput.blur();
          }
        };
      }

      if (mobile) {
        var mobileFieldHeight = '38px';
        searchWrap.style.display = 'flex';
        searchWrap.style.alignItems = 'center';
        searchWrap.style.justifyContent = 'flex-start';
        searchWrap.style.flex = self._headerSearchExpanded ? '1 1 auto' : '0 0 auto';
        searchWrap.style.minWidth = '0';

        var searchField = document.createElement('div');
        searchField.className = 'blog-overlay-header-search-field';
        searchField.style.display = 'inline-flex';
        searchField.style.alignItems = 'center';
        searchField.style.boxSizing = 'border-box';
        searchField.style.minHeight = mobileFieldHeight;
        searchField.style.borderRadius = '6px';
        searchField.style.overflow = 'hidden';
        searchField.style.transition = 'border-color 0.15s ease, flex 0.2s ease, max-width 0.2s ease, opacity 0.15s ease';

        var searchBtn = document.createElement('button');
        searchBtn.type = 'button';
        searchBtn.className = 'blog-overlay-header-search-toggle';
        searchBtn.setAttribute('aria-label', 'Search posts');
        searchBtn.style.display = 'inline-flex';
        searchBtn.style.alignItems = 'center';
        searchBtn.style.justifyContent = 'center';
        searchBtn.style.width = mobileFieldHeight;
        searchBtn.style.height = mobileFieldHeight;
        searchBtn.style.padding = '0';
        searchBtn.style.border = 'none';
        searchBtn.style.borderRadius = '0';
        searchBtn.style.background = 'transparent';
        searchBtn.style.color = '#555';
        searchBtn.style.cursor = 'pointer';
        searchBtn.style.flexShrink = '0';
        searchBtn.innerHTML = '<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>';

        var searchInput = document.createElement('input');
        wireSearchInput(searchInput, { embeddedInField: true, fieldEl: searchField });
        searchInput.style.minWidth = '0';
        searchInput.style.transition = 'max-width 0.2s ease, opacity 0.15s ease, padding 0.15s ease';

        function setSearchExpanded(expanded, focusInput) {
          self._headerSearchExpanded = expanded;
          searchBtn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
          if (expanded) {
            searchWrap.style.flex = '1 1 auto';
            searchField.style.flex = '1 1 auto';
            searchField.style.width = 'auto';
            searchField.style.maxWidth = '100%';
            searchField.style.border = '1px solid ' + inputBorderColor;
            searchField.style.background = '#fff';
            searchInput.style.flex = '1 1 auto';
            searchInput.style.width = '100%';
            searchInput.style.maxWidth = '100%';
            searchInput.style.opacity = '1';
            searchInput.style.padding = '8px 12px 8px 0';
            if (focusInput) {
              try { searchInput.focus(); } catch (eFocus) {}
            }
          } else {
            searchWrap.style.flex = '0 0 auto';
            searchField.style.flex = '0 0 auto';
            searchField.style.width = 'auto';
            searchField.style.maxWidth = 'none';
            searchField.style.border = 'none';
            searchField.style.background = 'transparent';
            searchField.style.boxShadow = '';
            searchInput.style.flex = '0 0 0';
            searchInput.style.width = '0';
            searchInput.style.maxWidth = '0';
            searchInput.style.opacity = '0';
            searchInput.style.padding = '0';
          }
        }

        searchField.appendChild(searchBtn);
        searchField.appendChild(searchInput);
        searchWrap.appendChild(searchField);

        setSearchExpanded(Boolean(self._headerSearchExpanded), Boolean(self._headerSearchExpanded));
        searchBtn.onclick = function() {
          setSearchExpanded(!self._headerSearchExpanded, true);
        };
      } else {
        searchWrap.style.flex = '0 1 280px';
        searchWrap.style.width = 'auto';
        searchWrap.style.minWidth = '160px';
        searchWrap.style.maxWidth = '320px';
        var desktopInput = document.createElement('input');
        wireSearchInput(desktopInput);
        desktopInput.style.width = '100%';
        searchWrap.appendChild(desktopInput);
      }

      return searchWrap;
    },

    /**
     * Create Author Profiles module (post level - shows profile for post authors)
     */
    _createAuthorProfilesModule: function(post, cfg, width, opts) {
      var self = this;
      var useLongBio = opts && opts.useLongBio === true;
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
      var avatarPx = useLongBio ? 64 : 48;
      var nameFontPx = useLongBio ? 18 : 15;
      var bioFontPx = useLongBio ? 15 : 14;
      var iconPx = useLongBio ? 18 : 16;
      var platforms = ['instagram', 'facebook', 'linkedin', 'x', 'email', 'website'];
      for (var i = 0; i < authorIds.length; i++) {
        var id = authorIds[i];
        var p = profiles[id];
        var name = (p && p.name) || (cfg.authorMap && cfg.authorMap[id]) || 'Author';
        var imageUrl = (p && p.imageUrl) || null;
        var bio = useLongBio && (p && p.bioLong) ? (p.bioLong) : ((p && p.bio) || null);
        var email = (p && p.email) || null;
        var socialLinks = (p && p.socialLinks && typeof p.socialLinks === 'object') ? p.socialLinks : {};
        var card = document.createElement('div');
        if (useLongBio) card.className = 'blog-overlay-author-card';
        card.style.marginBottom = useLongBio ? 0 : (i < authorIds.length - 1 ? '20px' : '0');
        var topRow = document.createElement('div');
        topRow.style.display = 'flex';
        topRow.style.gap = '12px';
        topRow.style.alignItems = 'flex-start';
        topRow.style.marginBottom = useLongBio ? '0' : '8px';
        if (useLongBio) topRow.style.width = '100%';
        var avatarWrap = document.createElement('div');
        avatarWrap.className = 'blog-overlay-author-card-avatar';
        avatarWrap.style.width = avatarPx + 'px';
        avatarWrap.style.height = avatarPx + 'px';
        avatarWrap.style.fontSize = (useLongBio ? 20 : 16) + 'px';
        if (imageUrl) {
          var img = document.createElement('img');
          img.src = imageUrl;
          img.alt = name;
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
        nameEl.className = 'blog-overlay-author-card-name';
        nameEl.textContent = name;
        nameEl.style.fontSize = nameFontPx + 'px';
        rightCol.appendChild(nameEl);
        var linksWrap = document.createElement('div');
        linksWrap.className = 'blog-overlay-author-card-social';
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
            a.innerHTML = socialIconSvg(platform).replace(/width="18"/, 'width="' + iconPx + '"').replace(/height="18"/, 'height="' + iconPx + '"');
            a.setAttribute('aria-label', platform === 'x' ? 'X' : platform.charAt(0).toUpperCase() + platform.slice(1));
            linksWrap.appendChild(a);
          }
        }
        if (linksWrap.childNodes.length > 0) {
          rightCol.appendChild(linksWrap);
        } else if (!bio) {
          rightCol.style.minHeight = avatarPx + 'px';
          rightCol.style.justifyContent = 'center';
        }
        if (bio) {
          var bioEl = document.createElement('div');
          bioEl.className = 'blog-overlay-author-card-bio';
          bioEl.textContent = bio;
          bioEl.style.fontSize = bioFontPx + 'px';
          bioEl.style.marginTop = '6px';
          rightCol.appendChild(bioEl);
        }
        topRow.appendChild(rightCol);
        card.appendChild(topRow);
        content.appendChild(card);
      }
      return { header: headerText, content: content };
    },

    /**
     * Inline SVG icons for share links (avoids CORS when renderer runs in cross-origin iframe)
     */
    _shareIconSvg: function(platform) {
      var w = 16; var h = 16;
      var svgs = {
        facebook: '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>',
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
     * @param {boolean} [lightVariant] - Use light icon color (e.g. for full-bleed overlay)
     */
    _createShareLinks: function(shareUrl, title, platforms, baseUrl, imageUrl, lightVariant) {
      if (!platforms || platforms.length === 0) return null;
      console.log('[BlogOverlay] _createShareLinks: shareUrl (input)=', JSON.stringify(shareUrl));
      var normalized = this._normalizeShareUrl(shareUrl || '');
      var encodedShareUrl = this._encodeShareUrl(normalized);
      console.log('[BlogOverlay] _createShareLinks: normalized=', JSON.stringify(normalized), 'encodedShareUrl=', JSON.stringify(encodedShareUrl));
      var encTitle = encodeURIComponent(title || '');
      var wrap = document.createElement('div');
      wrap.className = 'blog-overlay-share-links' + (lightVariant ? ' blog-overlay-share-links--on-dark' : '');
      wrap.setAttribute('aria-label', 'Share');
      for (var p = 0; p < platforms.length; p++) {
        var platform = platforms[p];
        var href = '';
        if (platform === 'facebook') href = 'https://www.facebook.com/sharer/sharer.php?u=' + encodedShareUrl;
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
        a.className = 'blog-overlay-share-link';
        a.setAttribute('aria-label', 'Share on ' + (platform === 'x' ? 'X' : platform === 'whatsapp' ? 'WhatsApp' : platform.charAt(0).toUpperCase() + platform.slice(1)));
        a.setAttribute('data-analytics-element', 'share' + (platform === 'x' ? 'X' : platform.charAt(0).toUpperCase() + platform.slice(1)));
        var svg = this._shareIconSvg(platform);
        if (svg) {
          a.innerHTML = svg;
        }
        wrap.appendChild(a);
      }
      return wrap.childNodes.length > 0 ? wrap : null;
    },

    /**
     * Get absolute URL for a post (uses post.fullUrl from Squarespace).
     * Normalizes double-encoding (%2520 -> %20) so links and native share work correctly.
     * When bbPreview=1 (Configure iframe), returns '' so links use #post-N and stay on the same
     * page - avoids navigating away and losing the postMessage listener.
     */
    _getPostUrl: function(post) {
      // In any preview context (iframe bbPreview or embedded previewMode), use hash navigation
      // so clicking a post link doesn't navigate the Configure page or iframe away from the blog.
      if (this._bbPreview || this._previewMode) return '';
      var rawUrl = post.fullUrl || '';
      if (!rawUrl) return '';
      var url = this._normalizeShareUrl(rawUrl);
      if (url.indexOf('http') === 0) {
        return url;
      }
      var origin = typeof window !== 'undefined' ? window.location.origin : '';
      var result = origin + (url.charAt(0) === '/' ? '' : '/') + url;
      return result;
    },

    /**
     * Normalized pathname for the blog collection index (no post slug), e.g. /blog
     */
    _getBlogCollectionPath: function() {
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
      if (typeof blogPath !== 'string') blogPath = '/blog';
      if (blogPath.charAt(0) !== '/') blogPath = '/' + blogPath;
      return blogPath.replace(/\/+$/, '') || '/';
    },

    /**
     * Absolute collection URL. Uses bbCategory / bbTag query params for overlay filters.
     * Does not append the full current location.search (post URLs would keep the wrong address bar).
     */
    _buildBlogCollectionNavUrl: function(opts) {
      opts = opts || {};
      if (typeof window === 'undefined') return '';
      var path = this._getBlogCollectionPath();
      var url;
      try {
        url = new URL(path, window.location.origin);
      } catch (e) {
        return '';
      }
      var cur = null;
      try {
        cur = new URL(window.location.href);
      } catch (e2) {}
      if (cur) {
        var passThrough = ['password', 'viewerMode', 'bbPreview', 'bbPreviewDebug', 'bbTocDebug'];
        for (var pi = 0; pi < passThrough.length; pi++) {
          var k = passThrough[pi];
          var v = cur.searchParams.get(k);
          if (v != null && v !== '') url.searchParams.set(k, v);
        }
      }
      url.searchParams.delete('bbCategory');
      url.searchParams.delete('bbTag');
      if (opts.category && String(opts.category).trim()) {
        url.searchParams.set('bbCategory', String(opts.category).trim());
      } else if (opts.tag && String(opts.tag).trim()) {
        url.searchParams.set('bbTag', String(opts.tag).trim());
      }
      return url.toString();
    },

    /** href for breadcrumb collection links; Configure iframe preview stays on # + in-place navigation */
    _blogCollectionNavHref: function(opts) {
      if (this._bbPreview || this._previewMode) return '#';
      return this._buildBlogCollectionNavUrl(opts || {});
    },

    /** Comma + space between breadcrumb category links (flex can collapse gaps without an explicit separator) */
    _breadcrumbCommaSeparator: function() {
      var comma = document.createElement('span');
      comma.textContent = ', ';
      comma.setAttribute('aria-hidden', 'true');
      comma.className = 'blog-overlay-breadcrumb-comma';
      comma.style.whiteSpace = 'pre';
      comma.style.userSelect = 'none';
      comma.style.marginLeft = '2px';
      comma.style.marginRight = '2px';
      return comma;
    },

    /** Apply bbCategory / bbTag from the current page URL to overlay filter state */
    _syncOverlayFiltersFromUrl: function() {
      try {
        var p = new URLSearchParams(window.location.search || '');
        var bc = p.get('bbCategory');
        var bt = p.get('bbTag');
        if (bc != null && String(bc).trim()) {
          this._categoryFilter = [String(bc).trim()];
        }
        if (bt != null && String(bt).trim()) {
          this._tagFilter = [String(bt).trim()];
        }
      } catch (e) {}
    },

    /**
     * Get blog index URL (for "Back to list" link)
     */
    _getBlogIndexUrl: function() {
      return this._buildBlogCollectionNavUrl({});
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
     * Post slug/id segment after the blog collection path (e.g. /blog/my-post → "my-post").
     * Returns null on collection index or paths that do not extend the configured blog prefix.
     */
    _getPostPathTailAfterBlogPrefix: function(pathnameNorm) {
      var blogPathNorm = this._normalizePathForMatch(this._getBlogCollectionPath());
      var pathParts = pathnameNorm.split('/').filter(function(s) {
        return s.length > 0;
      });
      var blogParts =
        blogPathNorm === '/' || blogPathNorm === ''
          ? []
          : blogPathNorm.split('/').filter(function(s) {
              return s.length > 0;
            });
      if (pathParts.length <= blogParts.length) return null;
      for (var bi = 0; bi < blogParts.length; bi++) {
        if (pathParts[bi] !== blogParts[bi]) return null;
      }
      return pathParts[pathParts.length - 1];
    },

    /**
     * Whether the URL tail identifies this post (Squarespace may use record id in the path after
     * login while fullUrl still uses the slug, so full pathname equality alone misses the post).
     */
    _postMatchesPathTail: function(post, tail) {
      if (!post || !tail) return false;
      var id = post.id != null && post.id !== '' ? String(post.id) : '';
      var urlId = post.urlId != null && post.urlId !== '' ? String(post.urlId) : '';
      if (id && id === tail) return true;
      if (urlId && urlId === tail) return true;
      if (id && id.toLowerCase() === tail.toLowerCase()) return true;
      if (urlId && urlId.toLowerCase() === tail.toLowerCase()) return true;
      return false;
    },

    /**
     * Get selected post index from current path (matches post.fullUrl). Returns -1 for list view.
     */
    _getSelectedIndexFromPath: function(items) {
      if (!items || items.length === 0 || typeof window === 'undefined') return -1;
      var pathname = this._getEffectiveBlogPathname().replace(/\/+$/, '') || '/';
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
      var tail = this._getPostPathTailAfterBlogPrefix(pathnameNorm);
      if (tail) {
        for (var j = 0; j < items.length; j++) {
          if (this._postMatchesPathTail(items[j], tail)) {
            console.log('[BlogOverlay] _getSelectedIndexFromPath: matched path tail', JSON.stringify(tail), 'to post', j);
            return j;
          }
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
      var cfg = this.config || {};
      if (this._previewMode && typeof cfg.previewSelectedPostIndex === 'number') {
        var p = cfg.previewSelectedPostIndex;
        this._debugLog('selected index from previewSelectedPostIndex', {
          previewSelectedPostIndex: p,
          itemCount: items && items.length ? items.length : 0
        });
        if (p < 0) return -1;
        if (!items || items.length === 0) return 0;
        return Math.min(Math.max(0, p), items.length - 1);
      }
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
      if (!previewMode && !this._hasBbPreviewParam() && this._isSquarespaceEditingUi()) {
        this._suppressedByEditorMode = true;
        this._removeOverlayNodes();
        this._restoreOriginalRootChildren();
        console.log('[BlogOverlay] Skipping render: Squarespace edit mode active');
        this._clearBootstrapLoading();
        return;
      }
      this._suppressedByEditorMode = false;

      if (!previewMode) {
        var blogPath = this._currentBlogPathForRouteMatch();
        var pathname = window.location.pathname || '/';
        if (this._isOnBlogRoute(pathname, blogPath)) this._rememberCurrentBlogRoute();
        if (!this._isOnEffectiveBlogRoute()) {
          console.log('[BlogOverlay] Skipping render: not on blog route');
          this._clearBootstrapLoading();
          return;
        }
      }

      var root = this._root || this.config.rootEl || findBlogContainer() || document.getElementById('blogga-blogga-root');
      if (!root) {
        console.log('[BlogOverlay] Skipping render: no blog container found');
        this._clearBootstrapLoading();
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
      self._blogJsonPageCount = 0;
      self._paginationGen = (self._paginationGen || 0) + 1;
      self._placeholderImageMap = null;
      self._placeholderMapFetchKey = null;
      self._placeholderMapFetchInFlight = null;
      var paginationGen = self._paginationGen;

      function getNextPageUrl(json) {
        if (!json || typeof json !== 'object') return null;
        var coll = json.collection && typeof json.collection === 'object' ? json.collection : null;
        var pag = json.pagination && typeof json.pagination === 'object'
          ? json.pagination
          : (coll && coll.pagination && typeof coll.pagination === 'object' ? coll.pagination : null);
        var nextUrl = (pag && pag.nextPageUrl) || (coll && (coll.nextPageUrl || coll.nextPage)) || (json.nextPageUrl || json.nextPage);
        if (!nextUrl || typeof nextUrl !== 'string') return null;
        var absUrl = nextUrl.indexOf('http') === 0
          ? nextUrl
          : (typeof window !== 'undefined' && window.location
            ? new URL(nextUrl, window.location.origin).href
            : nextUrl);
        try {
          var u = new URL(absUrl);
          if (!u.searchParams.has('format')) u.searchParams.set('format', 'json');
          absUrl = u.toString();
        } catch (e) {}
        return appendPassword(absUrl, self.config && self.config.blogPassword);
      }

      function mergePageItems(json) {
        var pageItems = Array.isArray(json && json.items) ? json.items : [];
        if (!pageItems.length && json && json.collection && Array.isArray(json.collection.items)) {
          pageItems = json.collection.items;
        }
        for (var pi = 0; pi < pageItems.length; pi++) {
          if (pageItems[pi] && typeof pageItems[pi] === 'object') allItems.push(pageItems[pi]);
        }
        self._blogJsonPageCount += 1;
        return json;
      }

      function applyCollectionMetadata(json) {
        self._memberAccountsEnabledHint = Boolean(
          json && typeof json === 'object' && (
            (json.userAccountsContext && typeof json.userAccountsContext === 'object')
            || (json.pagePreviewContext && typeof json.pagePreviewContext === 'object')
          )
        );
        self._squarespaceJsonIdentity = self._updateJsonAuthSignals(json, 'collection');
        self._authDebug('render.jsonAuthSignals', {
          rootKeys: json && typeof json === 'object' ? Object.keys(json).slice(0, 60) : [],
          websiteKeys: json && json.website && typeof json.website === 'object' ? Object.keys(json.website).slice(0, 60) : [],
          contextKeys: json && json.context && typeof json.context === 'object' ? Object.keys(json.context).slice(0, 60) : [],
          userAccountsContextKeys:
            json && json.userAccountsContext && typeof json.userAccountsContext === 'object'
              ? Object.keys(json.userAccountsContext).slice(0, 60)
              : [],
          userAccountsContextFlags:
            json && json.userAccountsContext && typeof json.userAccountsContext === 'object'
              ? {
                  authenticated: json.userAccountsContext.authenticated,
                  isAuthenticated: json.userAccountsContext.isAuthenticated,
                  loggedIn: json.userAccountsContext.loggedIn,
                  isLoggedIn: json.userAccountsContext.isLoggedIn,
                  signedIn: json.userAccountsContext.signedIn,
                  isSignedIn: json.userAccountsContext.isSignedIn
                }
              : null,
          extractedJsonIdentity: self._squarespaceJsonIdentity
        });
        self._emitAuthDebugSnapshot('render.afterJsonIdentity');
        var website = json && json.website ? json.website : (json && json.websiteSettings ? { title: json.websiteSettings.title } : null);
        var collection = json && json.collection ? json.collection : null;
        self._blogMeta = {
          siteTitle: (website && website.title) ? String(website.title) : '',
          blogName: (collection && (collection.title || collection.navigationTitle)) ? String(collection.title || collection.navigationTitle) : 'Blog'
        };
        self._collection = collection;
        if (self._featuredDebugEnabled()) {
          var collKeys = collection && typeof collection === 'object' ? Object.keys(collection) : [];
          console.warn('[BlogOverlay][featured-debug] collection keys (sample)', collKeys.slice(0, 100));
          console.warn('[BlogOverlay][featured-debug] collection featured refs', self._getCollectionFeaturedRefIds());
          console.warn('[BlogOverlay][featured-debug] items', allItems.map(function(it, idx) {
            if (!it || typeof it !== 'object') return { idx: idx, type: typeof it };
            var interesting = Object.keys(it).filter(function(k) { return /feat|star|pin|promo|highlight|record/i.test(k); });
            var snap = {};
            for (var ii = 0; ii < interesting.length; ii++) snap[interesting[ii]] = it[interesting[ii]];
            return { idx: idx, title: it.title, id: it.id, urlId: it.urlId, fullUrl: it.fullUrl, interestingKeys: interesting, snapshot: snap, marker: self._itemIsSquarespaceFeatured(it) };
          }));
        }
      }

      function paintFromCurrentItems(includeAuthProbe) {
        if (paginationGen !== self._paginationGen) return Promise.resolve();
        self.items = allItems.slice();
        self._syncOverlayFiltersFromUrl();
        if (!includeAuthProbe) {
          return self._renderContent(self.items);
        }
        return self._probeCurrentPageJsonAuth()
          .then(function() {
            if (paginationGen !== self._paginationGen) return;
            self._perfMark('authProbeDone');
            self._emitAuthDebugSnapshot('render.afterCurrentPageProbe');
            return self._waitForPostAuthHydration();
          })
          .then(function() {
            if (paginationGen !== self._paginationGen) return;
            return self._renderContent(self.items);
          });
      }

      function fetchBlogPage(url) {
        return fetch(url).then(function(res) { return res.json(); }).then(mergePageItems);
      }

      function fetchRemainingPages(nextUrl) {
        if (!nextUrl || paginationGen !== self._paginationGen) {
          self._perfMark('blogJsonDone');
          return Promise.resolve();
        }
        return fetchBlogPage(nextUrl)
          .then(function(pageJson) {
            if (paginationGen !== self._paginationGen) return pageJson;
            self.items = allItems.slice();
            return self._renderContent(self.items).then(function() { return pageJson; });
          })
          .then(function(pageJson) {
            if (paginationGen !== self._paginationGen) return;
            return fetchRemainingPages(getNextPageUrl(pageJson));
          });
      }

      self._perfMark('blogJsonRequest');
      fetchBlogPage(urlWithPassword)
        .then(function(json) {
          if (paginationGen !== self._paginationGen) return;
          firstJson = json;
          applyCollectionMetadata(json);
          self._perfMark('blogJsonFirstPage');
          return paintFromCurrentItems(true);
        })
        .then(
          function() {
            if (paginationGen !== self._paginationGen) return;
            self._clearBootstrapLoading();
            self._debugLog('render first paint', { posts: allItems.length, pages: self._blogJsonPageCount });
            var nextUrl = getNextPageUrl(firstJson);
            if (!nextUrl) {
              self._perfMark('blogJsonDone');
              return;
            }
            return fetchRemainingPages(nextUrl);
          },
          function(renderErr) {
            console.error('[BlogOverlay] Render error:', renderErr);
            self._clearBootstrapLoading();
          }
        )
        .catch(function(err) {
          console.error('[BlogOverlay] Failed to fetch blog JSON:', err);
          self._clearBootstrapLoading();
        });
    },

    _updateTocHighlight: function() {
      var tocEl = document.querySelector('.blog-overlay-toc');
      if (!tocEl) return;
      var tocStyle = tocEl.getAttribute('data-toc-style') || 'numbered';
      var tocLinks = tocEl.querySelectorAll('a');
      if (!tocLinks.length) return;

      var headingLinks = tocEl.querySelectorAll('a[data-heading-index]');
      if (headingLinks.length > 0) {
        var navOffset = this._getNavbarOffset ? this._getNavbarOffset() : 0;
        var viewportTop = Math.max(120, navOffset + 24);
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
          var link = headingLinks[hj];
          var idx = parseInt(link.getAttribute('data-heading-index'), 10);
          var isActive = idx === activeIdx;
          link.classList.toggle('blog-overlay-toc-active', isActive);
          link.classList.toggle('is-active', isActive);
          if (tocStyle === 'connectedDots') {
            var dot = link.parentElement && link.parentElement.querySelector('.blog-overlay-toc-dot');
            if (dot) dot.style.background = (idx <= activeIdx) ? 'var(--bb-accent, #5B4FE8)' : 'var(--bb-border, #e5e4e0)';
          }
        }
        if (tocStyle === 'connectedDots') {
          var lineFill = tocEl.querySelector('.blog-overlay-toc-line-fill');
          var dots = tocEl.querySelectorAll('.blog-overlay-toc-dot');
          if (lineFill && dots.length > 0) {
            var lineEl = tocEl.querySelector('.blog-overlay-toc-line');
            var lastReadIdx = Math.min(activeIdx, dots.length - 1);
            if (lastReadIdx >= 0 && lineEl) {
              var lineRect = lineEl.getBoundingClientRect();
              var lastReadDot = dots[lastReadIdx];
              var dotRect = lastReadDot.getBoundingClientRect();
              var dotCenterY = dotRect.top + dotRect.height / 2;
              var fillHeight = Math.max(0, dotCenterY - lineRect.top);
              lineFill.style.height = fillHeight + 'px';
            } else {
              lineFill.style.height = '0';
            }
          }
        }
        return;
      }

      var articles = document.querySelectorAll('#blog-overlay-list article');
      var postLinks = tocEl.querySelectorAll('a[data-post-index]');
      if (!articles.length || !postLinks.length) return;

      var navOffset = this._getNavbarOffset ? this._getNavbarOffset() : 0;
      var viewportTop = Math.max(100, navOffset + 16);
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
        var link = postLinks[j];
        var idx = parseInt(link.getAttribute('data-post-index'), 10);
        var isActive = idx === activeIndex;
        link.classList.toggle('blog-overlay-toc-active', isActive);
        link.classList.toggle('is-active', isActive);
        if (tocStyle === 'connectedDots') {
          var dot = link.parentElement && link.parentElement.querySelector('.blog-overlay-toc-dot');
          if (dot) dot.style.background = (idx <= activeIndex) ? 'var(--bb-accent, #5B4FE8)' : 'var(--bb-border, #e5e4e0)';
        }
      }
      if (tocStyle === 'connectedDots') {
        var lineFill = tocEl.querySelector('.blog-overlay-toc-line-fill');
        var dots = tocEl.querySelectorAll('.blog-overlay-toc-dot');
        if (lineFill && dots.length > 0) {
          var lineEl = tocEl.querySelector('.blog-overlay-toc-line');
          var lastReadIdx = Math.min(activeIndex, dots.length - 1);
          if (lastReadIdx >= 0 && lineEl) {
            var lineRect = lineEl.getBoundingClientRect();
            var lastReadDot = dots[lastReadIdx];
            var dotRect = lastReadDot.getBoundingClientRect();
            var dotCenterY = dotRect.top + dotRect.height / 2;
            var fillHeight = Math.max(0, dotCenterY - lineRect.top);
            lineFill.style.height = fillHeight + 'px';
          } else {
            lineFill.style.height = '0';
          }
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

    /** Sticky sidebar pin: a few px below the viewport top (fixed rail sync handles nav overlap). */
    _getSidebarStickyTopPx: function() {
      return 8;
    },

    _clearStickySidebarRailFixed: function(rail, anchorWrap) {
      if (!rail) return;
      rail.style.position = '';
      rail.style.top = '';
      rail.style.left = '';
      rail.style.right = '';
      rail.style.width = '';
      rail.style.zIndex = '';
      if (anchorWrap) anchorWrap.style.minHeight = '';
    },

    _syncStickySidebarRail: function(rail, anchorWrap, mainRow, topPx, side) {
      if (!rail || !anchorWrap || !mainRow) return;
      if (rail.getAttribute('data-bb-sticky-rail') !== '1') {
        this._clearStickySidebarRailFixed(rail, anchorWrap);
        return;
      }
      var cs = typeof window !== 'undefined' && window.getComputedStyle ? window.getComputedStyle(rail) : null;
      if (cs && cs.position === 'static') {
        this._clearStickySidebarRailFixed(rail, anchorWrap);
        return;
      }
      var stickTop = typeof topPx === 'number' ? topPx : 8;
      var rowRect = mainRow.getBoundingClientRect();
      var wrapRect = anchorWrap.getBoundingClientRect();
      var railH = rail.offsetHeight;
      var railW = anchorWrap.offsetWidth || rail.offsetWidth;
      if (rowRect.top >= stickTop - 1) {
        rail.setAttribute('data-bb-anchor-left', String(Math.round(wrapRect.left)));
        rail.setAttribute('data-bb-anchor-width', String(Math.round(railW)));
      }
      var leftPx = parseFloat(rail.getAttribute('data-bb-anchor-left'));
      if (!isFinite(leftPx)) leftPx = wrapRect.left;
      var widthPx = parseFloat(rail.getAttribute('data-bb-anchor-width'));
      if (!isFinite(widthPx)) widthPx = railW;
      var shouldStick = rowRect.top < stickTop && rowRect.bottom > stickTop + railH + 2;
      if (shouldStick) {
        var maxTop = rowRect.bottom - railH - 2;
        var fixedTop = Math.min(stickTop, maxTop);
        rail.style.position = 'fixed';
        rail.style.top = fixedTop + 'px';
        rail.style.left = leftPx + 'px';
        rail.style.width = widthPx + 'px';
        rail.style.right = 'auto';
        rail.style.zIndex = '40';
        anchorWrap.style.minHeight = railH + 'px';
      } else {
        this._clearStickySidebarRailFixed(rail, anchorWrap);
        rail.style.position = 'relative';
      }
    },

    _bindStickySidebarRails: function(opts) {
      var self = this;
      if (self._blogOverlayStickySidebarAbort) {
        try { self._blogOverlayStickySidebarAbort(); } catch (eAbort) { /* ignore */ }
        self._blogOverlayStickySidebarAbort = null;
      }
      self._blogOverlayStickySidebarSyncFn = null;
      var mainRow = opts && opts.mainRowEl;
      var topPx = opts && typeof opts.topPx === 'number' ? opts.topPx : 8;
      var rails = opts && opts.rails ? opts.rails : [];
      if (!mainRow || !rails.length) return;
      var syncAll = function() {
        for (var i = 0; i < rails.length; i++) {
          var entry = rails[i];
          self._syncStickySidebarRail(entry.rail, entry.wrap, mainRow, topPx, entry.side);
        }
      };
      var scrollHandler = function() { syncAll(); };
      if (typeof window !== 'undefined') {
        window.addEventListener('scroll', scrollHandler, { passive: true });
        window.addEventListener('resize', scrollHandler, { passive: true });
      }
      var scrollEl = self._getScrollContainer();
      if (scrollEl && scrollEl.addEventListener) {
        scrollEl.addEventListener('scroll', scrollHandler, { passive: true });
      }
      self._blogOverlayStickySidebarAbort = function() {
        if (typeof window !== 'undefined') {
          window.removeEventListener('scroll', scrollHandler);
          window.removeEventListener('resize', scrollHandler);
        }
        if (scrollEl && scrollEl.removeEventListener) {
          scrollEl.removeEventListener('scroll', scrollHandler);
        }
        for (var j = 0; j < rails.length; j++) {
          self._clearStickySidebarRailFixed(rails[j].rail, rails[j].wrap);
        }
      };
      self._blogOverlayStickySidebarSyncFn = syncAll;
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(function() {
          requestAnimationFrame(syncAll);
        });
      } else {
        syncAll();
      }
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

    /**
     * Best-effort accent from the host Squarespace page: global --accent-hsl, section theme vars
     * (--primaryButtonBackgroundColor, link colors), or a primary .sqs-button-element--primary fill.
     */
    _getSiteAccentColor: function() {
      var fb = '#5B4FE8';
      if (typeof window === 'undefined' || !document || !document.documentElement || !window.getComputedStyle) return fb;
      var readVar = function(el, name) {
        try {
          if (!el) return '';
          var v = window.getComputedStyle(el).getPropertyValue(name);
          return v && typeof v === 'string' ? v.replace(/^\s+|\s+$/g, '') : '';
        } catch (e) { return ''; }
      };
      var root = document.documentElement;
      var body = document.body;
      var accentHsl = readVar(root, '--accent-hsl') || readVar(body, '--accent-hsl') || readVar(root, '--safeDarkAccent-hsl');
      if (accentHsl && accentHsl.indexOf('var(') !== 0) {
        if (accentHsl.indexOf(',') >= 0) return 'hsl(' + accentHsl + ')';
        var sp = accentHsl.split(/\s+/).filter(Boolean);
        if (sp.length >= 3) return 'hsl(' + sp.slice(0, 3).join(', ') + ')';
      }
      var cssNames = [
        '--primaryButtonBackgroundColor', '--primary-button-background-color',
        '--paragraphLinkColor', '--paragraph-link-color',
        '--navigationLinkColor', '--navigation-link-color',
        '--headingLinkColor', '--heading-link-color'
      ];
      var start = this._root || document.getElementById('blogga-blogga-root') || body;
      var el = start;
      for (var depth = 0; depth < 24 && el; depth++) {
        for (var ci = 0; ci < cssNames.length; ci++) {
          var val = readVar(el, cssNames[ci]);
          if (val && val.indexOf('var(') !== 0 && val !== 'rgba(0, 0, 0, 0)' && val !== 'transparent') return val;
        }
        el = el.parentElement;
      }
      try {
        var prim = document.querySelector('.sqs-button-element--primary');
        if (prim) {
          var bg = window.getComputedStyle(prim).backgroundColor;
          if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') return bg;
        }
      } catch (e1) { /* ignore */ }
      return fb;
    },

    _readCssVarFromEl: function(el, name) {
      try {
        if (!el || !name) return '';
        var v = window.getComputedStyle(el).getPropertyValue(name);
        return v && typeof v === 'string' ? v.replace(/^\s+|\s+$/g, '') : '';
      } catch (e) { return ''; }
    },

    _isValidCssColorValue: function(val) {
      return !!(val && val.indexOf('var(') !== 0 && val !== 'rgba(0, 0, 0, 0)' && val !== 'transparent');
    },

    _parseColorChannels: function(color) {
      if (!color || typeof color !== 'string') return null;
      try {
        if (typeof document !== 'undefined' && document.documentElement) {
          var probe = document.createElement('span');
          probe.style.color = color;
          probe.style.display = 'none';
          document.documentElement.appendChild(probe);
          var computed = window.getComputedStyle(probe).color || '';
          document.documentElement.removeChild(probe);
          var m = computed.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);
          if (m) return { r: +m[1], g: +m[2], b: +m[3] };
        }
      } catch (e1) { /* ignore */ }
      var hex = color.replace(/^\s+|\s+$/g, '');
      if (/^#[0-9a-fA-F]{3}$/.test(hex)) {
        return {
          r: parseInt(hex.charAt(1) + hex.charAt(1), 16),
          g: parseInt(hex.charAt(2) + hex.charAt(2), 16),
          b: parseInt(hex.charAt(3) + hex.charAt(3), 16)
        };
      }
      if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
        return {
          r: parseInt(hex.slice(1, 3), 16),
          g: parseInt(hex.slice(3, 5), 16),
          b: parseInt(hex.slice(5, 7), 16)
        };
      }
      return null;
    },

    /** Rule D — derive rgba from a concrete color at a given opacity (accent tokens, etc.). */
    _withAlpha: function(color, alpha) {
      var ch = this._parseColorChannels(color);
      if (!ch) return 'rgba(17,17,17,' + alpha + ')';
      return 'rgba(' + ch.r + ',' + ch.g + ',' + ch.b + ',' + alpha + ')';
    },

    /** Rule D — CSS color-mix token derived from --bb-body at a given percentage. */
    _bodyColorMix: function(percent) {
      return 'color-mix(in srgb, var(--bb-body) ' + percent + '%, transparent)';
    },

    _resolveCssColorValue: function(color, contextEl) {
      if (!color || typeof color !== 'string') return '';
      if (this._isValidCssColorValue(color)) return color;
      try {
        if (typeof document !== 'undefined') {
          var parent = (contextEl && contextEl.nodeType === 1) ? contextEl : document.documentElement;
          var probe = document.createElement('span');
          probe.style.color = color;
          probe.style.display = 'none';
          parent.appendChild(probe);
          var computed = window.getComputedStyle(probe).color || '';
          parent.removeChild(probe);
          if (this._isValidCssColorValue(computed)) return computed;
        }
      } catch (e) { /* ignore */ }
      return '';
    },

    /** Rule E — contrast-aware text on accent backgrounds. */
    _contrastTextOnAccent: function(color) {
      var ch = this._parseColorChannels(color);
      if (!ch) return '#fff';
      var r = ch.r / 255;
      var g = ch.g / 255;
      var b = ch.b / 255;
      var lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      return lum > 0.5 ? '#000' : '#fff';
    },

    _walkScopeForCssVar: function(scopeEl, names) {
      if (!scopeEl || !names || !names.length) return '';
      var el = scopeEl;
      for (var depth = 0; depth < 24 && el; depth++) {
        for (var i = 0; i < names.length; i++) {
          var val = this._readCssVarFromEl(el, names[i]);
          if (this._isValidCssColorValue(val)) return val;
        }
        el = el.parentElement;
      }
      return '';
    },

    _walkScopeForCssValue: function(scopeEl, names) {
      if (!scopeEl || !names || !names.length) return '';
      var el = scopeEl;
      for (var depth = 0; depth < 24 && el; depth++) {
        for (var i = 0; i < names.length; i++) {
          var val = this._readCssVarFromEl(el, names[i]);
          if (val && val.indexOf('var(') !== 0) return val;
        }
        el = el.parentElement;
      }
      return '';
    },

    /** Primary button fill from Squarespace theme (progress bar, spec default). */
    _getPrimaryButtonBackgroundColor: function(scopeEl) {
      var cssNames = [
        '--primaryButtonBackgroundColor', '--primary-button-background-color'
      ];
      var scope = scopeEl || this._findBlogPageSection(this._root) || this._root || (typeof document !== 'undefined' ? document.body : null);
      var fromVars = this._walkScopeForCssVar(scope, cssNames);
      if (fromVars) return fromVars;
      try {
        var prim = null;
        if (scope && scope.querySelector) prim = scope.querySelector('.sqs-button-element--primary');
        if (!prim && scope && scope.closest) {
          var sec = scope.closest('section.page-section, section[data-section-id]') || scope;
          if (sec && sec.querySelector) prim = sec.querySelector('.sqs-button-element--primary');
        }
        if (!prim && typeof document !== 'undefined') prim = document.querySelector('.sqs-button-element--primary');
        if (prim) {
          var bg = window.getComputedStyle(prim).backgroundColor;
          if (this._isValidCssColorValue(bg)) return bg;
        }
      } catch (e1) { /* ignore */ }
      return '';
    },

    _readAccentFromScope: function(scopeEl) {
      var cssNames = [
        '--primaryButtonBackgroundColor', '--primary-button-background-color',
        '--paragraphLinkColor', '--paragraph-link-color',
        '--navigationLinkColor', '--navigation-link-color',
        '--headingLinkColor', '--heading-link-color',
        '--tweak-accent-color', '--siteAccentColor'
      ];
      var fromVars = this._walkScopeForCssVar(scopeEl, cssNames);
      if (fromVars) return fromVars;
      try {
        var prim = null;
        if (scopeEl && scopeEl.querySelector) prim = scopeEl.querySelector('.sqs-button-element--primary');
        if (!prim && scopeEl && scopeEl.closest) {
          var sec = scopeEl.closest('section.page-section, section[data-section-id]') || scopeEl;
          if (sec && sec.querySelector) prim = sec.querySelector('.sqs-button-element--primary');
        }
        if (!prim) prim = document.querySelector('.sqs-button-element--primary');
        if (prim) {
          var bg = window.getComputedStyle(prim).backgroundColor;
          if (this._isValidCssColorValue(bg)) return bg;
        }
      } catch (e1) { /* ignore */ }
      return '';
    },

    _readBodyColorFromScope: function(scopeEl) {
      var varNames = [
        '--paragraphMediumColor', '--paragraph-medium-color',
        '--paragraphLargeColor', '--paragraph-large-color',
        '--tweak-text-color', '--text-color'
      ];
      var scope = scopeEl;
      for (var depth = 0; depth < 24 && scope; depth++) {
        for (var i = 0; i < varNames.length; i++) {
          var raw = this._readCssVarFromEl(scope, varNames[i]);
          if (!raw) continue;
          if (raw.indexOf('var(') === 0) return raw;
          if (this._isValidCssColorValue(raw)) return raw;
          var resolved = this._resolveCssColorValue(raw, scope);
          if (resolved) return resolved;
        }
        scope = scope.parentElement;
      }
      try {
        if (scopeEl && scopeEl.querySelector) {
          var p = scopeEl.querySelector('p, .sqsrte-large, .sqsrte-medium, .blog-overlay-body p');
          if (p) {
            var c = window.getComputedStyle(p).color;
            if (this._isValidCssColorValue(c)) return c;
          }
        }
      } catch (e2) { /* ignore */ }
      if (typeof document !== 'undefined' && document.documentElement) {
        for (var j = 0; j < varNames.length; j++) {
          var rootRaw = this._readCssVarFromEl(document.documentElement, varNames[j]);
          if (!rootRaw) continue;
          if (rootRaw.indexOf('var(') === 0) return rootRaw;
          var rootResolved = this._resolveCssColorValue(rootRaw, document.documentElement);
          if (rootResolved) return rootResolved;
        }
      }
      return '';
    },

    _readHeadingColorFromScope: function(scopeEl) {
      var fromVars = this._walkScopeForCssVar(scopeEl, [
        '--headingExtraLargeColor', '--headings-extra-large-color',
        '--headings-color', '--heading-color', '--title-color'
      ]);
      if (fromVars) return fromVars;
      try {
        if (scopeEl && scopeEl.querySelector) {
          var h1 = scopeEl.querySelector('h1, .sqsrte-scaled-text-container h1');
          if (h1) {
            var c = window.getComputedStyle(h1).color;
            if (this._isValidCssColorValue(c)) return c;
          }
        }
      } catch (e3) { /* ignore */ }
      return '';
    },

    /** Rule B — H1 font-family and font-weight for meta rows (BB controls size only). */
    _readHeadingTypographyFromScope: function(scopeEl) {
      var out = {
        fontFamily: this._walkScopeForCssValue(scopeEl, [
          '--heading-font-font-family', '--headings-font-family', '--header-font-family', '--title-font-font-family'
        ]),
        fontWeight: this._walkScopeForCssValue(scopeEl, [
          '--heading-font-font-weight', '--headings-font-weight', '--header-font-weight', '--title-font-font-weight'
        ])
      };
      if (out.fontFamily && out.fontWeight) return out;
      try {
        var h1 = null;
        if (scopeEl && scopeEl.querySelector) {
          h1 = scopeEl.querySelector('h1, .sqsrte-scaled-text-container h1, .sqs-block-content h1');
        }
        if (!h1 && typeof document !== 'undefined') {
          h1 = document.querySelector('section.page-section h1, .blog-item-title h1, h1');
        }
        if (h1) {
          var cs = window.getComputedStyle(h1);
          if (!out.fontFamily && cs.fontFamily) out.fontFamily = cs.fontFamily;
          if (!out.fontWeight && cs.fontWeight) out.fontWeight = cs.fontWeight;
        }
      } catch (e3a) { /* ignore */ }
      return out;
    },

    _readPrimaryButtonRadius: function(scopeEl) {
      try {
        var prim = null;
        if (scopeEl && scopeEl.querySelector) prim = scopeEl.querySelector('.sqs-button-element--primary');
        if (!prim && scopeEl && scopeEl.closest) {
          var sec = scopeEl.closest('section.page-section, section[data-section-id]');
          if (sec && sec.querySelector) prim = sec.querySelector('.sqs-button-element--primary');
        }
        if (!prim) prim = document.querySelector('.sqs-button-element--primary');
        if (prim) {
          var br = window.getComputedStyle(prim).borderRadius;
          if (br) return br;
        }
      } catch (e4) { /* ignore */ }
      return '0px';
    },

    /** Squarespace form-field shape (comment/lead-magnet inputs inherit this). */
    _readFormFieldRadiusFromScope: function(scopeEl) {
      try {
        var input = null;
        var selector = '.sqs-block-form input[type="text"], .sqs-block-form input[type="email"], .sqs-block-form textarea, form.sqs-block-form-field input, form.sqs-block-form-field textarea';
        if (scopeEl && scopeEl.querySelector) input = scopeEl.querySelector(selector);
        if (!input) input = document.querySelector(selector);
        if (input) {
          var br = window.getComputedStyle(input).borderRadius;
          if (br) return br;
        }
      } catch (e4a) { /* ignore */ }
      return '6px';
    },

    /** First numeric px value in a (possibly shorthand) CSS length string. */
    _firstPxValue: function(cssLength, fallbackPx) {
      var m = typeof cssLength === 'string' ? cssLength.match(/-?[\d.]+/) : null;
      return m ? parseFloat(m[0]) : fallbackPx;
    },

    _getConfigAccentOverride: function() {
      var cc = this.config && this.config.collectionConfig;
      if (!cc || typeof cc !== 'object') return '';
      if (typeof cc.accentColor === 'string' && cc.accentColor.trim()) return cc.accentColor.trim();
      if (cc.primary && typeof cc.primary === 'object' && typeof cc.primary.accentColor === 'string' && cc.primary.accentColor.trim()) {
        return cc.primary.accentColor.trim();
      }
      return '';
    },

    /** Progress bar fill: always Squarespace site accent (primary button / collection tokens). */
    _resolveProgressBarColor: function(cfg) {
      var scope = this._findBlogPageSection(this._root) || this._root;
      return this._getPrimaryButtonBackgroundColor(scope)
        || (this._getCollectionStyleTokens() && this._getCollectionStyleTokens().accent)
        || this._getSiteAccentColor();
    },

    /** Resolve collection style tokens (Rules A–E) once per render. */
    _resolveCollectionStyleTokens: function(rootEl) {
      var scope = this._findBlogPageSection(rootEl || this._root) || rootEl || this._root || (typeof document !== 'undefined' ? document.body : null);
      var accentOverride = this._getConfigAccentOverride();
      var accent = accentOverride || this._readAccentFromScope(scope) || this._getSiteAccentColor();
      var body = this._readBodyColorFromScope(scope) || '#111111';
      var heading = this._readHeadingColorFromScope(scope) || body;
      var headingTypography = this._readHeadingTypographyFromScope(scope);
      var buttonRadius = this._readPrimaryButtonRadius(scope);
      var formRadius = this._readFormFieldRadiusFromScope(scope);
      var buttonRadiusPx = this._firstPxValue(buttonRadius, 0);
      var cardRadius = Math.max(0, Math.min(buttonRadiusPx, 20)) + 'px';
      var tokens = {
        accent: accent,
        body: body,
        heading: heading,
        headingFontFamily: headingTypography.fontFamily || '',
        headingFontWeight: headingTypography.fontWeight || '',
        surface: this._bbReadCssVar('--tweak-blog-site-background', null)
          || this._bbReadCssVar('--siteBackgroundColor', null)
          || '#ffffff',
        buttonRadius: buttonRadius,
        formRadius: formRadius,
        cardRadius: cardRadius,
        textOnAccent: this._contrastTextOnAccent(accent),
        muted: this._bodyColorMix(60),
        extraMuted: this._bodyColorMix(40),
        border: this._bodyColorMix(15),
        placeholder: this._bodyColorMix(5),
        excerpt: this._bodyColorMix(80),
        accent15: this._withAlpha(accent, 0.15),
        accent10: this._withAlpha(accent, 0.10),
        metaOnImage: 'rgba(255,255,255,0.78)',
        onDarkTitle: '#fff',
        onDarkDeck: 'rgba(255,255,255,0.85)',
        imageGradient: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 100%)'
      };
      this._collectionStyleTokens = tokens;
      return tokens;
    },

    _getCollectionStyleTokens: function() {
      return this._collectionStyleTokens || this._resolveCollectionStyleTokens(this._root);
    },

    _applyCollectionTokensToElement: function(el, tokens) {
      if (!el || !tokens) return;
      el.style.setProperty('--bb-accent', tokens.accent);
      el.style.setProperty('--bb-body', tokens.body);
      el.style.setProperty('--bb-heading', tokens.heading);
      if (tokens.headingFontFamily) el.style.setProperty('--bb-heading-font-family', tokens.headingFontFamily);
      if (tokens.headingFontWeight) el.style.setProperty('--bb-heading-font-weight', tokens.headingFontWeight);
      el.style.setProperty('--bb-surface', tokens.surface);
      /* Rule D — derived neutrals resolve from --bb-body via color-mix (see #bb-collection-styles). */
      el.style.setProperty('--bb-muted', tokens.muted);
      el.style.setProperty('--bb-extra-muted', tokens.extraMuted);
      el.style.setProperty('--bb-border', tokens.border);
      el.style.setProperty('--bb-placeholder', tokens.placeholder);
      el.style.setProperty('--bb-excerpt', tokens.excerpt);
      el.style.setProperty('--bb-btn-radius', tokens.buttonRadius);
      el.style.setProperty('--bb-form-radius', tokens.formRadius);
      el.style.setProperty('--bb-card-radius', tokens.cardRadius);
      el.style.setProperty('--bb-accent-15', tokens.accent15);
      el.style.setProperty('--bb-accent-10', tokens.accent10);
      el.style.setProperty('--bb-text-on-accent', tokens.textOnAccent);
      el.style.setProperty('--bb-meta-on-image', tokens.metaOnImage);
      el.style.setProperty('--bb-on-dark-title', tokens.onDarkTitle);
      el.style.setProperty('--bb-on-dark-deck', tokens.onDarkDeck);
    },

    _ensureCollectionStylesheet: function() {
      if (typeof document === 'undefined') return;
      var style = document.getElementById('bb-collection-styles');
      var css =
        '#blog-overlay-list{' +
          '--bb-chrome-radius:6px;' +
          '--bb-excerpt:color-mix(in srgb, var(--bb-body) 80%, transparent);' +
          '--bb-muted:color-mix(in srgb, var(--bb-body) 60%, transparent);' +
          '--bb-extra-muted:color-mix(in srgb, var(--bb-body) 40%, transparent);' +
          '--bb-border:color-mix(in srgb, var(--bb-body) 15%, transparent);' +
          '--bb-placeholder:color-mix(in srgb, var(--bb-body) 5%, transparent);' +
        '}' +
        '#blog-overlay-list .bb-chrome-input{box-sizing:border-box;font-size:14px;padding:8px 12px;border:1px solid var(--bb-border,#e8e7e4);border-radius:var(--bb-chrome-radius,6px);background:#fff;color:var(--bb-body,inherit);}' +
        '#blog-overlay-list .bb-chrome-input::placeholder{color:var(--bb-muted,#888);opacity:1;}' +
        '#blog-overlay-list .bb-filter-btn{padding:6px 14px;font-size:14px;font-weight:500;background:none;border:none;cursor:pointer;color:var(--bb-muted,#888);white-space:nowrap;flex-shrink:0;font-family:inherit;line-height:1.3;text-decoration:none;}' +
        '#blog-overlay-list .bb-filter-btn--active{font-weight:700;color:var(--bb-body,#111);}' +
        '#blog-overlay-list .bb-featured-badge{display:inline-flex;align-items:center;align-self:flex-start;width:fit-content;max-width:100%;font-size:14px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;padding:18px 12px;line-height:0;border:none;background:var(--bb-accent,#5B4FE8);color:var(--bb-text-on-accent,#fff);border-radius:var(--bb-btn-radius,0);}' +
        '#blog-overlay-list .bb-title--lg{font-size:36px;}' +
        '#blog-overlay-list .bb-title--std{font-size:24px;}' +
        '#blog-overlay-list .bb-title--masthead{font-size:28px;}' +
        '#blog-overlay-list .bb-title--compact{font-size:20px;}' +
        '#blog-overlay-list .bb-title--on-image{color:#fff;font-family:var(--bb-heading-font-family,inherit);font-weight:var(--bb-heading-font-weight,inherit);}' +
        '#blog-overlay-list .bb-title--on-dark{color:var(--bb-on-dark-title,#fff);font-family:var(--bb-heading-font-family,inherit);font-weight:var(--bb-heading-font-weight,inherit);}' +
        '#blog-overlay-list .bb-title--on-bg{color:var(--bb-heading,var(--bb-body,#111));font-family:var(--bb-heading-font-family,inherit);font-weight:var(--bb-heading-font-weight,inherit);}' +
        '#blog-overlay-list .blog-overlay-title a{color:inherit;font-family:inherit;font-weight:inherit;text-decoration:none;}' +
        '#blog-overlay-list .bb-meta--on-bg{font-size:13px;color:var(--bb-extra-muted,#888);font-family:var(--bb-heading-font-family,inherit);font-weight:var(--bb-heading-font-weight,inherit);}' +
        '#blog-overlay-list .bb-meta--on-image{font-size:13px;color:var(--bb-meta-on-image,rgba(255,255,255,0.78));font-family:var(--bb-heading-font-family,inherit);font-weight:var(--bb-heading-font-weight,inherit);}' +
        '#blog-overlay-list .bb-meta--on-dark{font-size:13px;color:var(--bb-meta-on-image,rgba(255,255,255,0.78));font-family:var(--bb-heading-font-family,inherit);font-weight:var(--bb-heading-font-weight,inherit);}' +
        '#blog-overlay-list .bb-excerpt--lg{font-size:18px;line-height:1.5;color:var(--bb-excerpt,#666);}' +
        '#blog-overlay-list .bb-excerpt--std{font-size:16px;line-height:1.5;color:var(--bb-excerpt,#666);}' +
        '#blog-overlay-list .bb-category-label{font-size:13px;font-weight:normal;font-variant:normal;letter-spacing:0.04em;text-transform:uppercase;color:var(--bb-accent,#5B4FE8);background:none;border:none;padding:0;margin:0;font-family:inherit;line-height:1.35;cursor:inherit;}' +
        '#blog-overlay-list .blog-overlay-post-category--writer{text-align:center;margin-bottom:-8px;}' +
        '#blog-overlay-list .blog-overlay-post-category--story{text-align:left;margin-bottom:0;}' +
        '#blog-overlay-list .blog-overlay-post-category--feature{text-align:center;margin-bottom:-4px;}' +
        '#blog-overlay-list .blog-overlay-post-category--ribbon{display:inline-flex;align-items:center;align-self:flex-start;width:fit-content;max-width:100%;font-size:14px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;padding:18px 12px;line-height:0;border:none;background:var(--bb-accent,#5B4FE8);color:var(--bb-text-on-accent,#fff);border-radius:var(--bb-btn-radius,0);margin:0 0 16px 0;}' +
        '#blog-overlay-list .bb-category-label--on-image{text-shadow:0 1px 2px rgba(0,0,0,0.5);}' +
        '#blog-overlay-list .blog-overlay-feature-header-stack{max-width:800px;margin-left:auto;margin-right:auto;box-sizing:border-box;gap:0;}' +
        '#blog-overlay-list .blog-overlay-feature-header-stack .blog-overlay-post-breadcrumbs{margin-bottom:24px;}' +
        '#blog-overlay-list .blog-overlay-feature-header-stack .blog-overlay-post-title{text-align:center;width:100%;}' +
        '#blog-overlay-list .bb-title--post{font-size:40px;}' +
        '#blog-overlay-list .blog-overlay-post-deck{font-size:20px;line-height:1.4;color:var(--bb-excerpt,#666);margin:0 0 16px 0;}' +
        '#blog-overlay-list .blog-overlay-post-deck--reporter{margin-bottom:0;}' +
        '#blog-overlay-list .blog-overlay-post-deck--writer{font-style:italic;text-align:center;max-width:600px;margin-left:auto;margin-right:auto;}' +
        '#blog-overlay-list .blog-overlay-post-deck--feature{text-align:center;max-width:700px;margin-left:auto;margin-right:auto;}' +
        '#blog-overlay-list .blog-overlay-post-deck--on-dark{font-size:18px;line-height:1.5;color:var(--bb-on-dark-deck,rgba(255,255,255,0.85));text-shadow:0 1px 2px rgba(0,0,0,0.5);}' +
        '#blog-overlay-list .blog-overlay-post-deck--on-dark-solid{font-size:18px;line-height:1.5;color:var(--bb-on-dark-deck,rgba(255,255,255,0.85));}' +
        '#blog-overlay-list .bb-post-meta--on-bg{font-size:16px;color:var(--bb-muted,#888);font-family:var(--bb-heading-font-family,inherit);font-weight:var(--bb-heading-font-weight,inherit);}' +
        '#blog-overlay-list .bb-post-meta--on-image{font-size:16px;color:var(--bb-meta-on-image,rgba(255,255,255,0.78));font-family:var(--bb-heading-font-family,inherit);font-weight:var(--bb-heading-font-weight,inherit);text-shadow:0 1px 2px rgba(0,0,0,0.5);}' +
        '#blog-overlay-list .bb-post-meta--on-dark{font-size:16px;color:var(--bb-meta-on-image,rgba(255,255,255,0.78));font-family:var(--bb-heading-font-family,inherit);font-weight:var(--bb-heading-font-weight,inherit);}' +
        '#blog-overlay-list .blog-overlay-post-breadcrumbs{font-size:14px;line-height:1.4;color:var(--bb-muted,#888);}' +
        '#blog-overlay-list .blog-overlay-post-breadcrumbs a{color:inherit;text-decoration:none;}' +
        '#blog-overlay-list .blog-overlay-post-breadcrumbs--on-dark{color:var(--bb-meta-on-image,rgba(255,255,255,0.78));text-shadow:0 1px 2px rgba(0,0,0,0.5);}' +
        '#blog-overlay-list .blog-overlay-post-breadcrumbs--on-dark-solid{color:var(--bb-meta-on-image,rgba(255,255,255,0.78));}' +
        '#blog-overlay-list .blog-overlay-share-row{display:flex;width:100%;margin-top:-5px;margin-bottom:40px;}' +
        '#blog-overlay-list .blog-overlay-share-row--story{margin-top:10px;}' +
        '#blog-overlay-list .blog-overlay-share-row--feature{margin-top:0;}' +
        '#blog-overlay-list .blog-overlay-share-links{display:flex;gap:8px;align-items:center;}' +
        '#blog-overlay-list .blog-overlay-share-link{display:inline-flex;align-items:center;justify-content:center;line-height:0;color:var(--bb-muted,#888);text-decoration:none;}' +
        '#blog-overlay-list .blog-overlay-share-link svg{width:16px;height:16px;display:block;}' +
        '#blog-overlay-list .blog-overlay-share-links--on-dark .blog-overlay-share-link{color:var(--bb-meta-on-image,rgba(255,255,255,0.78));}' +
        '#blog-overlay-list .blog-overlay-writer-rule{width:40px;height:1px;background:var(--bb-body,#111);border:none;margin:0 auto 20px auto;}' +
        '#blog-overlay-list .blog-overlay-story-rule{width:100%;height:1px;background:rgba(255,255,255,0.2);border:none;margin:10px 0;}' +
        '#blog-overlay-list .blog-overlay-single-post-header-zone--story{padding:48px calc(50vw - 50% + var(--pagePadding, 3vw) + 2vw);margin-bottom:40px;box-sizing:border-box;}' +
        '#blog-overlay-list .blog-overlay-story-header-row{display:flex;align-items:stretch;gap:40px;margin-bottom:0;}' +
        '#blog-overlay-list .blog-overlay-story-info-col{display:flex;flex-direction:column;justify-content:flex-start;min-width:0;align-self:stretch;}' +
        '#blog-overlay-list .blog-overlay-story-info-col > .blog-overlay-post-breadcrumbs{flex-shrink:0;margin-bottom:24px;}' +
        '#blog-overlay-list .blog-overlay-story-info-col > .blog-overlay-story-info-panel{flex:1 1 auto;min-height:0;}' +
        '#blog-overlay-list .blog-overlay-story-featured-image{flex:0 0 58%;min-width:0;display:flex;margin:0;align-self:stretch;}' +
        '#blog-overlay-list .blog-overlay-story-featured-image>div{width:100%;aspect-ratio:4/3;overflow:hidden;border-radius:4px;}' +
        '#blog-overlay-list .blog-overlay-story-featured-image img{width:100%;height:100%;object-fit:cover;display:block;}' +
        '#blog-overlay-list .blog-overlay-story-info-panel{background:transparent;padding:0;border-radius:0;box-sizing:border-box;gap:0;}' +
        '#blog-overlay-list .blog-overlay-story-info-panel .blog-overlay-post-breadcrumbs{margin-bottom:24px;}' +
        '#blog-overlay-list .blog-overlay-story-info-panel .blog-overlay-post-header-categories,' +
        '#blog-overlay-list .blog-overlay-story-info-panel .blog-overlay-post-categories-line{margin-bottom:18px;}' +
        '#blog-overlay-list .blog-overlay-story-info-panel .blog-overlay-post-title{margin-bottom:24px;}' +
        '#blog-overlay-list .blog-overlay-story-info-panel .blog-overlay-post-deck--on-dark{margin-bottom:14px;}' +
        '#blog-overlay-list .blog-overlay-reporter-accent-rule{width:100%;height:1px;background:var(--bb-border,#e8e7e4);border:none;margin:16px 0 12px 0;}' +
        '#blog-overlay-list .blog-overlay-reporter-header-stack{gap:0;}' +
        '#blog-overlay-list .bb-below-main-heading{font-size:28px;font-family:var(--bb-heading-font-family,inherit);font-weight:var(--bb-heading-font-weight,inherit);color:var(--bb-body,#111);margin:0 0 16px 0;}' +
        '#blog-overlay-list .blog-overlay-more-to-read{padding-bottom:20px;}' +
        '#blog-overlay-list .bb-comments-section{border-top:1px solid var(--bb-border,#e8e7e4);padding-top:24px;margin-top:32px;}' +
        '#blog-overlay-list .bb-form-input{display:block;box-sizing:border-box;width:100%;font-size:14px;color:var(--bb-body,#111);background:transparent;padding:8px 12px;border:1px solid var(--bb-border,#ddd);border-radius:var(--bb-form-radius,6px);}' +
        '#blog-overlay-list .bb-form-input::placeholder{color:var(--bb-muted,#888);opacity:1;}' +
        '#blog-overlay-list .bb-comment-char-counter{width:100%;text-align:right;font-size:11px;color:var(--bb-muted,#888);margin:4px 0 0 0;}' +
        '#blog-overlay-list .blog-overlay-author-card{background:transparent;border:1px solid var(--bb-border,#e5e4e0);border-radius:var(--bb-card-radius,20px);padding:30px;margin:32px 0;box-sizing:border-box;}' +
        '#blog-overlay-list .blog-overlay-author-card-avatar{width:64px;height:64px;flex-shrink:0;border-radius:50%;overflow:hidden;display:flex;align-items:center;justify-content:center;background:var(--bb-accent-15,rgba(91,79,232,0.15));color:var(--bb-accent,#5B4FE8);font-family:var(--bb-heading-font-family,inherit);font-weight:var(--bb-heading-font-weight,700);font-size:20px;}' +
        '#blog-overlay-list .blog-overlay-author-card-avatar img{width:100%;height:100%;object-fit:cover;}' +
        '#blog-overlay-list .blog-overlay-author-card-name{font-size:18px;font-family:var(--bb-heading-font-family,inherit);font-weight:var(--bb-heading-font-weight,inherit);color:var(--bb-body,#111);line-height:1.3;}' +
        '#blog-overlay-list .blog-overlay-author-card-social a{display:inline-flex;color:var(--bb-accent,#5B4FE8);text-decoration:none;}' +
        '#blog-overlay-list .blog-overlay-author-card-bio{font-size:15px;line-height:1.5;color:var(--bb-excerpt,#666);}' +
        '#blog-overlay-list .bb-lead-magnet-card{background:transparent;border:1px solid var(--bb-border,#e5e4e0);border-radius:var(--bb-card-radius,20px);padding:30px;box-sizing:border-box;}' +
        '#blog-overlay-list .bb-lead-magnet-header{font-size:24px;font-family:var(--bb-heading-font-family,inherit);font-weight:var(--bb-heading-font-weight,inherit);color:var(--bb-body,#111);margin:0 0 6px 0;}' +
        '#blog-overlay-list .bb-lead-magnet-subtitle{font-size:18px;line-height:1.5;color:var(--bb-excerpt,#666);margin:0 0 16px 0;}' +
        '#blog-overlay-list .blog-overlay-prev-next{display:flex;flex-direction:row;width:100%;box-sizing:border-box;background:transparent;border:1px solid var(--bb-border,#e5e4e0);border-radius:var(--bb-card-radius,20px);margin-top:32px;}' +
        '#blog-overlay-list .blog-overlay-prev-next-col{flex:1 1 50%;min-width:0;padding:20px 24px;box-sizing:border-box;text-decoration:none;color:inherit;display:flex;flex-direction:column;}' +
        '#blog-overlay-list .blog-overlay-prev-next-col--next{border-left:1px solid var(--bb-border,#e5e4e0);align-items:flex-end;text-align:right;}' +
        '#blog-overlay-list .blog-overlay-prev-next-label{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--bb-extra-muted,#888);margin-bottom:8px;}' +
        '#blog-overlay-list .blog-overlay-prev-next-category{margin-bottom:4px;}' +
        '#blog-overlay-list .blog-overlay-prev-next-title{font-size:18px;font-family:var(--bb-heading-font-family,inherit);font-weight:var(--bb-heading-font-weight,inherit);color:var(--bb-body,#111);line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}' +
        '#blog-overlay-list .blog-overlay-toc .bb-toc-item{display:block;font-family:var(--bb-heading-font-family,inherit);font-size:16px;line-height:1.4;font-weight:400;color:var(--bb-muted,#888);text-decoration:none;box-sizing:border-box;}' +
        '#blog-overlay-list .blog-overlay-toc .bb-toc-item.is-active,#blog-overlay-list .blog-overlay-toc .bb-toc-item.blog-overlay-toc-active{color:var(--bb-accent,#5B4FE8);font-weight:600;}' +
        '#blog-overlay-list .blog-overlay-toc[data-toc-style="numbered"] .bb-toc-item{padding:8px 12px;border-left:none;background:transparent;}' +
        '#blog-overlay-list .blog-overlay-toc[data-toc-style="bookmark"] .bb-toc-item{border-left:2px solid transparent;padding:8px 12px;background:transparent;}' +
        '#blog-overlay-list .blog-overlay-toc[data-toc-style="bookmark"] .bb-toc-item.is-active,#blog-overlay-list .blog-overlay-toc[data-toc-style="bookmark"] .bb-toc-item.blog-overlay-toc-active{border-left-color:var(--bb-accent,#5B4FE8);background:var(--bb-accent-10,rgba(91,79,232,0.1));}' +
        '#blog-overlay-list .blog-overlay-toc[data-toc-style="connectedDots"] .bb-toc-item{flex:1;min-width:0;padding:4px 0;border-left:none;background:transparent;}' +
        '#blog-overlay-list .blog-overlay-toc-row{display:flex;align-items:center;gap:10px;margin-left:-18px;}' +
        '#blog-overlay-list .bb-read-link{display:inline-flex;align-items:center;gap:6px;margin-top:12px;font-size:14px;font-weight:600;color:var(--bb-accent,#5B4FE8);text-decoration:none;cursor:pointer;}' +
        '#blog-overlay-list .bb-read-link span{text-decoration:underline;text-underline-offset:2px;}' +
        '#blog-overlay-list .bb-pagination-btn{padding:6px 12px;font-size:14px;min-width:36px;border:1px solid var(--bb-border,#ddd);border-radius:var(--bb-chrome-radius,6px);background:transparent;color:var(--bb-body,#333);cursor:pointer;font-family:inherit;}' +
        '#blog-overlay-list .bb-pagination-btn--active{background:var(--bb-accent,#5B4FE8);color:var(--bb-text-on-accent,#fff);border-color:var(--bb-accent,#5B4FE8);cursor:default;}' +
        '#blog-overlay-list .bb-load-more{padding:10px 24px;font-size:14px;font-weight:inherit;border:none;cursor:pointer;background:var(--bb-accent,#5B4FE8);color:var(--bb-text-on-accent,#fff);border-radius:var(--bb-btn-radius,0);font-family:inherit;}' +
        '#blog-overlay-list .bb-pagination-status{margin:0;font-size:13px;color:var(--bb-muted,#666);text-align:center;}' +
        '#blog-overlay-list .bb-sidebar-header{font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:var(--bb-body,#111);margin-top:0;padding-top:0;margin-bottom:8px;line-height:1.2;}' +
        '#blog-overlay-list .bb-sidebar-divider{height:1px;background:var(--bb-border,#ddd);border:none;margin:0 0 12px 0;width:100%;}' +
        '#blog-overlay-list .blog-overlay-main-row .blog-overlay-post-article--sidebar-row{margin-top:0;padding-top:0;}' +
        '#blog-overlay-list .blog-overlay-main-row .blog-overlay-post-body--sidebar-row{margin-top:0;}' +
        '#blog-overlay-list .blog-overlay-main-row .blog-overlay-post-body--sidebar-row>:first-child{margin-top:0;padding-top:0;}' +
        '#blog-overlay-list .blog-overlay-main-row .blog-overlay-sidebar-rail--sidebar-row{margin-top:0;}' +
        '#blog-overlay-list .blog-overlay-main-row .blog-overlay-sidebar-rail--sidebar-row .blog-overlay-sidebar-section:first-child{margin-top:0;}' +
        '#blog-overlay-list .blog-overlay-main-row .blog-overlay-sidebar-rail--sidebar-row .blog-overlay-sidebar-section:first-child .bb-sidebar-header{margin-top:0;padding-top:0;}' +
        '#blog-overlay-list .bb-sidebar-post-card{display:flex;flex-direction:row;align-items:flex-start;gap:10px;min-width:0;text-decoration:none;color:inherit;}' +
        '#blog-overlay-list .bb-sidebar-post-thumb{width:60px;height:60px;flex-shrink:0;border-radius:4px;overflow:hidden;position:relative;}' +
        '#blog-overlay-list .blog-overlay-featured-image > div{border-radius:4px;}' +
        '#blog-overlay-list .blog-overlay-featured-hero > div{border-radius:4px;}' +
        '#blog-overlay-list .blog-overlay-featured-image-stacked-fullbleed--feature > div{width:100%;max-height:600px;aspect-ratio:16/9;overflow:hidden;border-radius:4px;}' +
        '#blog-overlay-list .blog-overlay-featured-image-stacked-fullbleed--feature > div img,' +
        '#blog-overlay-list .blog-overlay-featured-image-stacked-fullbleed--feature > div [role="img"]{width:100%;height:100%;object-fit:cover;display:block;}' +
        '#blog-overlay-list .blog-overlay-post-header-fullbleed--publisher{height:500px;box-sizing:border-box;min-height:0;max-height:none;aspect-ratio:auto;padding:48px calc(var(--pagePadding, 3vw) + 2vw) 32px;}' +
        '#blog-overlay-list .bb-sidebar-post-text{flex:1 1 0;min-width:0;display:flex;flex-direction:column;align-items:flex-start;text-align:left;height:60px;max-height:60px;gap:1px;overflow:hidden;box-sizing:border-box;}' +
        '#blog-overlay-list .bb-sidebar-post-title{font-size:15px;line-height:1.2;color:var(--bb-body,#111);margin:0;padding:0;font-family:var(--bb-heading-font-family,inherit);font-weight:var(--bb-heading-font-weight,inherit);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;min-height:0;width:100%;}' +
        '#blog-overlay-list .bb-more-to-read-title{font-size:0.95rem;line-height:1.35;color:var(--bb-body,#111);margin:0;padding:0;font-family:var(--bb-heading-font-family,inherit);font-weight:var(--bb-heading-font-weight,inherit);}' +
        '#blog-overlay-list .bb-sidebar-post-meta{font-size:12px;line-height:1.15;color:var(--bb-extra-muted,#888);font-family:var(--bb-heading-font-family,inherit);font-weight:var(--bb-heading-font-weight,inherit);margin:0;padding:0;flex-shrink:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;}' +
        '#blog-overlay-list .bb-topic-badge{padding:6px 12px;font-size:13px;font-weight:400;line-height:1.2;border-radius:var(--bb-chrome-radius,6px);cursor:pointer;font-family:inherit;border:1px solid var(--bb-border,#ddd);background:transparent;color:var(--bb-body,#111);}' +
        '#blog-overlay-list .bb-topic-badge--active{background:var(--bb-accent,#5B4FE8);color:var(--bb-text-on-accent,#fff);border-color:var(--bb-accent,#5B4FE8);}' +
        '#blog-overlay-list .bb-newsletter-heading{font-size:15px;font-weight:600;color:var(--bb-body,#111);}' +
        '#blog-overlay-list .bb-newsletter-btn{padding:8px 16px;font-size:14px;border:none;cursor:pointer;background:var(--bb-accent,#5B4FE8);color:var(--bb-text-on-accent,#fff);border-radius:var(--bb-btn-radius,0);font-family:inherit;}' +
        '#blog-overlay-list .bb-footer-card{border:1px solid var(--bb-border,#e5e4e0);border-radius:var(--bb-card-radius,20px);padding:30px;background:transparent;box-sizing:border-box;}' +
        '#blog-overlay-list .blog-overlay-email-capture-footer .bb-newsletter-heading{font-size:24px;font-family:var(--bb-heading-font-family,inherit);font-weight:var(--bb-heading-font-weight,inherit);color:var(--bb-body,#111);margin:0 0 6px 0;}' +
        '#blog-overlay-list .bb-newsletter-footer-row{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:16px;width:100%;}' +
        '#blog-overlay-list .bb-newsletter-footer-copy{flex:1 1 200px;min-width:0;}' +
        '#blog-overlay-list .bb-newsletter-footer-form{display:flex;flex-direction:row;align-items:center;justify-content:flex-end;flex-wrap:wrap;gap:8px;flex:1 1 260px;min-width:0;}' +
        '#blog-overlay-list .bb-newsletter-footer-form .bb-form-input{flex:1 1 240px;min-width:0;}' +
        '@media (max-width:1449px){#blog-overlay-list .blog-overlay-email-capture-footer--story .bb-newsletter-footer-row{flex-direction:column;flex-wrap:nowrap;align-items:stretch;justify-content:flex-start;}#blog-overlay-list .blog-overlay-email-capture-footer--story .bb-newsletter-footer-copy,#blog-overlay-list .blog-overlay-email-capture-footer--story .bb-newsletter-footer-form{flex:0 0 auto;width:100%;max-width:100%;}#blog-overlay-list .blog-overlay-email-capture-footer--story .bb-newsletter-footer-form{flex-wrap:nowrap;justify-content:flex-start;}#blog-overlay-list .blog-overlay-email-capture-footer--story .bb-newsletter-footer-form .bb-form-input{flex:1 1 auto;}}' +
        '#blog-overlay-list .blog-overlay-list-rows-row{border-bottom:1px solid var(--bb-border,#e8e7e4);}' +
        '#blog-overlay-list .blog-overlay-list-rows-row--last{border-bottom:none;}' +
        '#blog-overlay-list .blog-overlay-header-filter-scroller{position:relative;width:100%;min-width:0;box-sizing:border-box;}' +
        '#blog-overlay-list .blog-overlay-header-filter-pills{scrollbar-width:none;-ms-overflow-style:none;}' +
        '#blog-overlay-list .blog-overlay-header-filter-pills::-webkit-scrollbar{display:none;height:0;width:0;}' +
        '#blog-overlay-list .blog-overlay-header-filter-scroll-caret{position:absolute;top:0;bottom:0;width:40px;display:flex;align-items:center;pointer-events:none;z-index:2;opacity:0;transition:opacity .15s ease;box-sizing:border-box;border:none;padding:0;margin:0;cursor:pointer;font-family:inherit;-webkit-appearance:none;appearance:none;}' +
        '#blog-overlay-list .blog-overlay-header-filter-scroll-caret-glyph{display:block;color:var(--bb-muted,#888);font-size:16px;line-height:1;font-weight:500;font-family:inherit;transform:translateY(-1px);pointer-events:none;}' +
        '#blog-overlay-list .blog-overlay-header-filter-scroll-caret--left{left:0;justify-content:flex-start;padding-left:2px;background:linear-gradient(to right,var(--bb-surface,#fff) 0%,var(--bb-surface,#fff) 38%,color-mix(in srgb,var(--bb-surface,#fff) 72%,transparent) 62%,transparent 100%);}' +
        '#blog-overlay-list .blog-overlay-header-filter-scroll-caret--right{right:0;justify-content:flex-end;padding-right:2px;background:linear-gradient(to left,var(--bb-surface,#fff) 0%,var(--bb-surface,#fff) 38%,color-mix(in srgb,var(--bb-surface,#fff) 72%,transparent) 62%,transparent 100%);}';
      if (!style) {
        style = document.createElement('style');
        style.id = 'bb-collection-styles';
        style.textContent = css;
        document.head.appendChild(style);
      } else if (style.textContent !== css) {
        style.textContent = css;
      }
    },

    _createFeaturedBadge: function(opts) {
      opts = opts && typeof opts === 'object' ? opts : {};
      var badge = document.createElement(opts.tagName || 'span');
      badge.className = 'blog-overlay-featured-badge bb-featured-badge';
      badge.textContent = opts.text || 'FEATURED';
      if (opts.absolute) {
        badge.style.position = 'absolute';
        badge.style.top = opts.top || '14px';
        badge.style.left = opts.left || '14px';
        badge.style.zIndex = opts.zIndex || '4';
      }
      if (opts.marginBottom) badge.style.marginBottom = opts.marginBottom;
      return badge;
    },

    _applyChromeInputStyle: function(el) {
      if (!el) return;
      el.classList.add('bb-chrome-input');
    },

    _applyFilterButtonStyle: function(btn, active) {
      if (!btn) return;
      btn.className = 'bb-filter-btn' + (active ? ' bb-filter-btn--active' : '');
    },

    _applyTitleStyle: function(el, opts) {
      if (!el || !opts) return;
      opts = opts && typeof opts === 'object' ? opts : {};
      var sizeClass = opts.size === 'lg' ? 'bb-title--lg'
        : opts.size === 'masthead' ? 'bb-title--masthead'
        : opts.size === 'compact' ? 'bb-title--compact'
        : opts.size === 'post' ? 'bb-title--post'
        : 'bb-title--std';
      el.classList.add(sizeClass);
      if (opts.onDarkSolid) {
        el.classList.add('bb-title--on-dark');
      } else {
        el.classList.add(opts.onImage ? 'bb-title--on-image' : 'bb-title--on-bg');
      }
      el.style.margin = opts.margin || el.style.margin || '0 0 8px 0';
      var tokens = this._getCollectionStyleTokens();
      if (tokens && tokens.headingFontFamily) el.style.fontFamily = tokens.headingFontFamily;
      if (tokens && tokens.headingFontWeight) el.style.fontWeight = tokens.headingFontWeight;
    },

    _applyMetaStyle: function(el, opts) {
      if (!el || !opts) return;
      var base = opts.variant === 'post' ? 'bb-post-meta' : 'bb-meta';
      if (opts.onDarkSolid) {
        el.classList.add(base + '--on-dark');
      } else {
        el.classList.add(opts.onImage ? (base + '--on-image') : (base + '--on-bg'));
      }
      var tokens = this._getCollectionStyleTokens();
      if (tokens && tokens.headingFontFamily) el.style.fontFamily = tokens.headingFontFamily;
      if (tokens && tokens.headingFontWeight) el.style.fontWeight = tokens.headingFontWeight;
    },

    _applyExcerptStyle: function(el, size) {
      if (!el) return;
      el.classList.add(size === 'lg' ? 'bb-excerpt--lg' : 'bb-excerpt--std');
    },

    _applyCategoryLabelStyle: function(el, opts) {
      if (!el) return;
      opts = opts && typeof opts === 'object' ? opts : {};
      el.classList.add('bb-category-label');
      if (opts.onDarkSolid) el.classList.add('bb-category-label--on-dark');
      else if (opts.onImage) el.classList.add('bb-category-label--on-image');
      if (opts.modifier) el.classList.add(opts.modifier);
    },

    _isSiteMarginDebugEnabled: function() {
      try {
        var params = new URLSearchParams(window.location.search || '');
        return params.get('bbSiteMarginDebug') === '1' || params.get('bbPreviewDebug') === '1';
      } catch (e) {
        return false;
      }
    },

    /** Map a layout box to viewport-relative left/right inset (px). Returns null if full-bleed width. */
    _insetsFromBoundingRect: function(rect) {
      if (!rect || typeof window === 'undefined') return null;
      var vw = window.innerWidth || document.documentElement.clientWidth || 0;
      if (vw <= 0 || rect.width < 80 || rect.width >= vw - 2) return null;
      var left = Math.max(0, Math.round(rect.left));
      var right = Math.max(0, Math.round(vw - rect.right));
      if (left + right < 2) return null;
      if (left > vw * 0.45 || right > vw * 0.45) return null;
      return { left: left, right: right };
    },

    /** Blog collection/post section (7.1 page-section), not the full-width #siteWrapper. */
    _findBlogPageSection: function(startEl) {
      if (startEl && startEl.closest) {
        try {
          var fromRoot = startEl.closest('section.page-section, section[data-section-id]');
          if (fromRoot) return fromRoot;
        } catch (e) { /* ignore */ }
      }
      try {
        var sections = document.querySelectorAll('section.page-section, section[data-section-id]');
        for (var i = 0; i < sections.length; i++) {
          var s = sections[i];
          if (!s.querySelector) continue;
          if (s.querySelector(
            'article, .blog-item, .blog-article, .blog-post, .blog-list, .blog-list-wrapper, ' +
            '.collection-items, [data-controller*="Blog"], [data-controller*="blog"]'
          )) {
            return s;
          }
        }
      } catch (e2) { /* ignore */ }
      return null;
    },

    /**
     * Convert a CSS length (px, vw, vh, rem, em, %) to pixels.
     * getPropertyValue on custom properties returns authored values (e.g. "10vw"), not computed px.
     */
    _parseCssLengthToPx: function(raw, refEl) {
      if (raw == null || typeof window === 'undefined' || !window.getComputedStyle) return null;
      var s = String(raw).trim();
      if (!s || s.indexOf('calc(') >= 0) return null;
      var m = s.match(/^([-+]?[0-9]*\.?[0-9]+)\s*([a-z%]*)$/i);
      if (!m) return null;
      var n = parseFloat(m[1]);
      if (!isFinite(n)) return null;
      var unit = (m[2] || 'px').toLowerCase();
      var vw = window.innerWidth || document.documentElement.clientWidth || 0;
      var vh = window.innerHeight || document.documentElement.clientHeight || 0;
      var rootFs = 16;
      try {
        rootFs = parseFloat(window.getComputedStyle(document.documentElement).fontSize) || 16;
      } catch (eFs) { /* ignore */ }
      if (unit === 'px' || unit === '') return n;
      if (unit === 'vw' && vw > 0) return (n * vw) / 100;
      if (unit === 'vh' && vh > 0) return (n * vh) / 100;
      if (unit === 'vmin' && vw > 0 && vh > 0) return (n * Math.min(vw, vh)) / 100;
      if (unit === 'vmax' && vw > 0 && vh > 0) return (n * Math.max(vw, vh)) / 100;
      if (unit === 'rem') return n * rootFs;
      if (unit === 'em') {
        var baseFs = rootFs;
        if (refEl) {
          try {
            baseFs = parseFloat(window.getComputedStyle(refEl).fontSize) || rootFs;
          } catch (eEm) { /* ignore */ }
        }
        return n * baseFs;
      }
      if (unit === '%' && vw > 0) return (n * vw) / 100;
      return null;
    },

    _horizontalPaddingFromComputedStyle: function(el) {
      if (!el || !window.getComputedStyle) return null;
      try {
        var cs = window.getComputedStyle(el);
        var pl = this._parseCssLengthToPx(cs.paddingLeft, el) || 0;
        var pr = this._parseCssLengthToPx(cs.paddingRight, el) || 0;
        var ml = this._parseCssLengthToPx(cs.marginLeft, el) || 0;
        var mr = this._parseCssLengthToPx(cs.marginRight, el) || 0;
        var left = Math.round(pl + ml);
        var right = Math.round(pr + mr);
        if (left + right < 2) return null;
        return { left: left, right: right };
      } catch (e) {
        return null;
      }
    },

    _insetsFromSquarespaceCssVars: function(anchorEl) {
      if (!window.getComputedStyle) return null;
      var targets = [document.documentElement, document.body];
      if (anchorEl) targets.push(anchorEl);
      var names = [
        '--site-gutter', '--site-gutter-width', '--sqs-site-gutter',
        '--outer-padding', '--page-padding', '--page-padding-horizontal',
        '--inset-padding', '--content-padding', '--content-padding-horizontal',
        '--siteMargin', '--site-margin'
      ];
      for (var t = 0; t < targets.length; t++) {
        var el = targets[t];
        if (!el) continue;
        try {
          var cs = window.getComputedStyle(el);
          for (var i = 0; i < names.length; i++) {
            var raw = cs.getPropertyValue(names[i]);
            if (!raw) continue;
            var px = this._parseCssLengthToPx(raw, el);
            if (px != null && isFinite(px) && px >= 2) {
              this._siteContentInsetsRaw = names[i] + ':' + String(raw).trim();
              return { left: Math.round(px), right: Math.round(px) };
            }
          }
        } catch (e) { /* ignore */ }
      }
      return null;
    },

    /** Spec: all featured images and thumbnails use 4px radius (avatars stay 50% circle). */
    _applyFeaturedImageRadius: function(el) {
      if (el && el.style) el.style.borderRadius = '4px';
    },

    /** Squarespace page-padding token for single-post wrapper calc(var(--pagePadding) + buffer). */
    _resolvePagePaddingCssValue: function() {
      if (typeof window === 'undefined' || !window.getComputedStyle) return '3vw';
      var targets = [document.documentElement, document.body];
      var root = this._root || (this.config && this.config.rootEl);
      var section = this._findBlogPageSection(root);
      if (section) targets.push(section);
      var names = [
        '--page-padding', '--page-padding-horizontal',
        '--site-gutter', '--site-gutter-width', '--sqs-site-gutter',
        '--outer-padding', '--inset-padding', '--content-padding-horizontal',
        '--siteMargin', '--site-margin'
      ];
      for (var t = 0; t < targets.length; t++) {
        var el = targets[t];
        if (!el) continue;
        try {
          var cs = window.getComputedStyle(el);
          for (var i = 0; i < names.length; i++) {
            var raw = cs.getPropertyValue(names[i]);
            if (!raw) continue;
            raw = String(raw).trim();
            if (raw && raw !== '0' && raw !== '0px') return raw;
          }
        } catch (e) { /* ignore */ }
      }
      return '3vw';
    },

    _findHeaderContentWrapper: function() {
      try {
        return document.querySelector(
          '#header .content-wrapper, header .content-wrapper, .header-layout .content-wrapper, ' +
          '.header-display .content-wrapper, [data-section-type="header"] .content-wrapper'
        );
      } catch (e) {
        return null;
      }
    },

    _pushContentColumnInsetProbe: function(probes, source, el) {
      if (!probes || !el || !el.getBoundingClientRect) return;
      try {
        var rect = el.getBoundingClientRect();
        var ins = this._insetsFromBoundingRect(rect);
        if (ins) {
          probes.push({
            source: source,
            insets: ins,
            width: Math.round(rect.width || 0)
          });
        }
      } catch (e) { /* ignore */ }
    },

    _collectContentColumnInsetProbes: function(root, section) {
      var probes = [];
      var self = this;

      self._pushContentColumnInsetProbe(probes, 'header.content-wrapper.rect', self._findHeaderContentWrapper());

      if (section && section.querySelectorAll) {
        try {
          var wrappers = section.querySelectorAll('.content-wrapper');
          for (var w = 0; w < wrappers.length; w++) {
            self._pushContentColumnInsetProbe(probes, 'section.content-wrapper.rect', wrappers[w]);
          }
        } catch (eCw) { /* ignore */ }
        try {
          var sectionContent = section.querySelector(
            '.content.sqs-layout, .sqs-layout, .page-section-content, .section-content'
          );
          self._pushContentColumnInsetProbe(probes, 'section.content.rect', sectionContent);
        } catch (eSc) { /* ignore */ }
      }

      if (root && root.closest) {
        try {
          var closestCw = root.closest('.content-wrapper');
          if (closestCw) {
            self._pushContentColumnInsetProbe(probes, 'root.closest.content-wrapper.rect', closestCw);
          }
        } catch (eClosest) { /* ignore */ }
      }

      try {
        var nativeSel = 'article, .blog-item, .blog-article, .blog-post, .entry.post, .entry';
        var natives = document.querySelectorAll(nativeSel);
        for (var n = 0; n < natives.length; n++) {
          var node = natives[n];
          if (node.closest && node.closest('#blog-overlay-list, .blog-overlay-wrapper')) continue;
          self._pushContentColumnInsetProbe(probes, 'native-blog-item.rect', node);
        }
      } catch (eNat) { /* ignore */ }

      return probes;
    },

    /** Merge geometry probes: use the largest left/right inset so we never under-shoot the live column. */
    _pickMaxContentColumnInsets: function(probes) {
      if (!probes || !probes.length) return null;
      var left = 0;
      var right = 0;
      var width = 0;
      var sources = [];
      for (var i = 0; i < probes.length; i++) {
        var p = probes[i];
        if (!p || !p.insets) continue;
        if (p.insets.left > left) left = p.insets.left;
        if (p.insets.right > right) right = p.insets.right;
        if ((p.width || 0) > width) width = p.width;
        sources.push(p.source);
      }
      if (left + right < 2) return null;
      return {
        insets: { left: left, right: right },
        width: width,
        source: sources.join('+')
      };
    },

    _shouldSkipHorizontalWrapperInset: function(root, insets) {
      if (!root || !root.getBoundingClientRect) return false;
      try {
        var rect = root.getBoundingClientRect();
        var threshold = 14;
        if (insets && insets.left >= 6 && Math.abs(rect.left - insets.left) <= threshold) return true;
        var cw = root.closest && root.closest('.content-wrapper');
        if (cw && cw.getBoundingClientRect) {
          var cwRect = cw.getBoundingClientRect();
          if (Math.abs(rect.left - cwRect.left) <= threshold && rect.width <= cwRect.width + 6) return true;
        }
      } catch (e) { /* ignore */ }
      return false;
    },

    _siteContentInsetVwBufferPx: function() {
      if (typeof window === 'undefined') return 0;
      var vw = window.innerWidth || document.documentElement.clientWidth || 0;
      return vw > 0 ? Math.round(vw * 0.02) : 0;
    },

    _finishSiteContentInsets: function(source, insets, root, meta) {
      var out = {
        left: Math.max(0, insets && insets.left ? insets.left : 0),
        right: Math.max(0, insets && insets.right ? insets.right : 0)
      };
      var bufferPx = this._siteContentInsetVwBufferPx();
      if (bufferPx > 0) {
        out.left += bufferPx;
        out.right += bufferPx;
      }
      this._siteContentInsetsSource = source;
      var colW = meta && meta.width ? meta.width : null;
      if (colW && bufferPx > 0) {
        colW = Math.max(80, colW - bufferPx * 2);
      }
      this._siteContentColumnWidth = colW;
      this._siteContentInsetsSkipHorizontal = this._shouldSkipHorizontalWrapperInset(root, out);
      if (this._isSiteMarginDebugEnabled()) {
        console.log('[BlogOverlay][site-margin] ' + source, out, {
          skipHorizontal: this._siteContentInsetsSkipHorizontal,
          columnWidth: this._siteContentColumnWidth,
          raw: this._siteContentInsetsRaw || null
        });
      }
      return out;
    },

    _applySiteContentInsetsToWrapper: function(wrapper, padTopPx) {
      if (!wrapper || !wrapper.style) return;
      var padT = typeof padTopPx === 'number' && isFinite(padTopPx) ? padTopPx : 16;
      wrapper.style.paddingTop = padT + 'px';
      wrapper.style.paddingBottom = '16px';
      wrapper.style.boxSizing = 'border-box';
      wrapper.style.marginTop = '16px';
      wrapper.style.marginBottom = '16px';

      if (wrapper.getAttribute('data-bb-spec-horizontal-padding') === '1') {
        var pagePad = this._resolvePagePaddingCssValue();
        wrapper.style.setProperty('--pagePadding', pagePad);
        var bbBuffer = wrapper.getAttribute('data-bb-writer-layout') === '1' ? '8vw' : '2vw';
        var horizPad = 'calc(var(--pagePadding, 3vw) + ' + bbBuffer + ')';
        wrapper.style.paddingLeft = horizPad;
        wrapper.style.paddingRight = horizPad;
        wrapper.style.maxWidth = '';
        wrapper.style.width = '';
        wrapper.style.marginLeft = '';
        wrapper.style.marginRight = '';
        return;
      }

      var ins = this._siteContentInsets || { left: 0, right: 0 };
      var skip = this._siteContentInsetsSkipHorizontal === true;
      var padL = skip ? 0 : Math.max(0, ins.left || 0);
      var padR = skip ? 0 : Math.max(0, ins.right || 0);
      wrapper.style.paddingRight = padR + 'px';
      wrapper.style.paddingLeft = padL + 'px';
      var colW = this._siteContentColumnWidth;
      if (!skip && colW && colW > 80) {
        wrapper.style.maxWidth = colW + 'px';
        wrapper.style.width = '100%';
        wrapper.style.marginLeft = padL + 'px';
        wrapper.style.marginRight = padR + 'px';
        wrapper.style.paddingLeft = '0';
        wrapper.style.paddingRight = '0';
      } else {
        wrapper.style.maxWidth = '';
        wrapper.style.width = '';
        wrapper.style.marginLeft = '';
        wrapper.style.marginRight = '';
      }
    },

    _syncSiteContentInsetsToWrapper: function() {
      var wrapper = this._blogOverlayWrapperEl;
      var root = this._blogOverlayInsetRoot || this._root;
      if (!wrapper || !wrapper.parentNode) return;
      var padTop = 16;
      try {
        var parsed = parseInt(wrapper.style.paddingTop, 10);
        if (isFinite(parsed) && parsed >= 0) padTop = parsed;
      } catch (ePad) { /* ignore */ }
      if (wrapper.getAttribute('data-bb-spec-horizontal-padding') === '1') {
        this._applySiteContentInsetsToWrapper(wrapper, padTop);
        return;
      }
      var prevL = (this._siteContentInsets && this._siteContentInsets.left) || 0;
      var prevR = (this._siteContentInsets && this._siteContentInsets.right) || 0;
      var prevSkip = this._siteContentInsetsSkipHorizontal === true;
      var prevW = this._siteContentColumnWidth || 0;
      this._siteContentInsets = this._getSquarespaceSiteContentInsets();
      var nextL = (this._siteContentInsets && this._siteContentInsets.left) || 0;
      var nextR = (this._siteContentInsets && this._siteContentInsets.right) || 0;
      var nextSkip = this._siteContentInsetsSkipHorizontal === true;
      var nextW = this._siteContentColumnWidth || 0;
      if (
        Math.abs(nextL - prevL) < 2 &&
        Math.abs(nextR - prevR) < 2 &&
        nextSkip === prevSkip &&
        Math.abs(nextW - prevW) < 2
      ) {
        return;
      }
      this._applySiteContentInsetsToWrapper(wrapper, padTop);
      var bleedWrapper = this._blogOverlayWrapperEl;
      if (bleedWrapper) this._syncDigestMobileFeaturedImageBleed(bleedWrapper);
    },

    _teardownSiteContentInsetSync: function() {
      if (this._blogOverlaySiteInsetAbort) {
        try { this._blogOverlaySiteInsetAbort(); } catch (e) { /* ignore */ }
        this._blogOverlaySiteInsetAbort = null;
      }
      this._blogOverlayWrapperEl = null;
      this._blogOverlayInsetRoot = null;
    },

    _bindSiteContentInsetSync: function(wrapper, root) {
      var self = this;
      self._teardownSiteContentInsetSync();
      if (!wrapper || !root || typeof window === 'undefined') return;
      self._blogOverlayWrapperEl = wrapper;
      self._blogOverlayInsetRoot = root;
      var debounceTimer = null;
      var sync = function() {
        self._syncSiteContentInsetsToWrapper();
      };
      var debouncedSync = function() {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(sync, 80);
      };
      if (window.addEventListener) {
        window.addEventListener('resize', debouncedSync, { passive: true });
      }
      var section = self._findBlogPageSection(root);
      if (typeof ResizeObserver !== 'undefined') {
        self._blogOverlaySiteInsetRO = new ResizeObserver(debouncedSync);
        try { self._blogOverlaySiteInsetRO.observe(document.documentElement); } catch (eRo1) { /* ignore */ }
        if (section) {
          try { self._blogOverlaySiteInsetRO.observe(section); } catch (eRo2) { /* ignore */ }
        }
        var headerCw = self._findHeaderContentWrapper();
        if (headerCw) {
          try { self._blogOverlaySiteInsetRO.observe(headerCw); } catch (eRo3) { /* ignore */ }
        }
      }
      self._blogOverlaySiteInsetAbort = function() {
        if (window.removeEventListener) window.removeEventListener('resize', debouncedSync);
        if (debounceTimer) clearTimeout(debounceTimer);
        if (self._blogOverlaySiteInsetRO) {
          try { self._blogOverlaySiteInsetRO.disconnect(); } catch (eDisc) { /* ignore */ }
          self._blogOverlaySiteInsetRO = null;
        }
      };
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(function() {
          requestAnimationFrame(sync);
        });
      } else {
        sync();
      }
      [150, 450, 800, 1500, 2500].forEach(function(delay) {
        setTimeout(sync, delay);
      });
    },

    /**
     * Horizontal inset of the Squarespace content column vs the viewport (site margin + section padding).
     * Geometry-first: max of header/blog column rects; CSS vars are last-resort fallbacks.
     */
    _getSquarespaceSiteContentInsets: function() {
      var zero = { left: 0, right: 0 };
      this._siteContentInsetsRaw = null;
      this._siteContentColumnWidth = null;
      this._siteContentInsetsSkipHorizontal = false;
      if (typeof window === 'undefined') {
        this._siteContentInsetsSource = 'default-zero';
        return zero;
      }

      var root = this._root || (this.config && this.config.rootEl) || findBlogContainer() || document.getElementById('blogga-blogga-root');
      var section = this._findBlogPageSection(root);

      var geometryProbes = this._collectContentColumnInsetProbes(root, section);
      var mergedGeometry = this._pickMaxContentColumnInsets(geometryProbes);
      if (mergedGeometry) {
        return this._finishSiteContentInsets(
          'geometry.max(' + mergedGeometry.source + ')',
          mergedGeometry.insets,
          root,
          { width: mergedGeometry.width }
        );
      }

      if (section) {
        var fromSectionPad = this._horizontalPaddingFromComputedStyle(section);
        if (fromSectionPad) {
          return this._finishSiteContentInsets('section.padding', fromSectionPad, root, null);
        }
        try {
          var bg = section.querySelector('.section-background, .section-background-content');
          if (bg) {
            var fromBg = this._horizontalPaddingFromComputedStyle(bg);
            if (fromBg) {
              return this._finishSiteContentInsets('section.background.padding', fromBg, root, null);
            }
          }
        } catch (eBg) { /* ignore */ }
      }

      if (root && root.getBoundingClientRect) {
        var vw = window.innerWidth || document.documentElement.clientWidth || 0;
        var el = root.parentElement;
        var narrowest = null;
        for (var d = 0; el && d < 24; d++) {
          if (el.classList && el.classList.contains('page-section')) {
            var fromPagePad = this._horizontalPaddingFromComputedStyle(el);
            if (fromPagePad) {
              return this._finishSiteContentInsets('ancestor.page-section.padding', fromPagePad, root, null);
            }
          }
          try {
            var r = el.getBoundingClientRect();
            if (r.width > 0 && r.width < vw - 4) {
              var cand = this._insetsFromBoundingRect(r);
              if (cand && (!narrowest || r.width < narrowest.width)) {
                narrowest = { insets: cand, width: Math.round(r.width) };
              }
            }
          } catch (eA) { /* ignore */ }
          if (el.id === 'siteWrapper' || el.id === 'site-wrapper') break;
          el = el.parentElement;
        }
        if (narrowest) {
          return this._finishSiteContentInsets('narrowest-ancestor.rect', narrowest.insets, root, { width: narrowest.width });
        }
      }

      var fromVars = this._insetsFromSquarespaceCssVars(section || root);
      if (fromVars) {
        return this._finishSiteContentInsets('css-variables', fromVars, root, null);
      }

      return this._finishSiteContentInsets('default-zero', zero, root, null);
    },

    /** Break out to the viewport width (full-bleed images only). */
    _applyViewportFullBleed: function(el) {
      if (!el || !el.style) return;
      el.style.width = '100vw';
      el.style.maxWidth = '100vw';
      el.style.marginLeft = 'calc(50% - 50vw)';
      el.style.marginRight = 'calc(50% - 50vw)';
      el.style.boxSizing = 'border-box';
    },

    /**
     * Edge-to-edge within the overlay wrapper (cancels wrapper side padding).
     * Prefer this on narrow collection layouts where the wrapper uses overflow-x: hidden.
     */
    _applyOverlayHorizontalBleed: function(el) {
      if (!el || !el.style) return;
      var ins = this._siteContentInsets || { left: 0, right: 0 };
      var padL = Math.max(0, ins.left || 0);
      var padR = Math.max(0, ins.right || 0);
      if (padL > 0 || padR > 0) {
        el.style.width = 'calc(100% + ' + (padL + padR) + 'px)';
        el.style.maxWidth = 'none';
        el.style.marginLeft = (-padL) + 'px';
        el.style.marginRight = (-padR) + 'px';
        el.style.boxSizing = 'border-box';
      } else {
        this._applyViewportFullBleed(el);
      }
    },

    /**
     * After layout: extend el to the viewport left/right edges using measured gaps.
     * @param {Element} el - element to widen
     * @param {Element} [refEl] - box to measure (defaults to el)
     * @returns {boolean} true when bleed styles were applied
     */
    _applyMeasuredViewportHorizontalBleed: function(el, refEl) {
      if (!el || !el.style || typeof window === 'undefined') return false;
      var vw = window.innerWidth || document.documentElement.clientWidth || 0;
      if (!vw) return false;
      var ref = refEl && refEl.getBoundingClientRect ? refEl : el;
      var rect;
      try { rect = ref.getBoundingClientRect(); } catch (eRect) { return false; }
      if (!rect) return false;
      var leftGap = Math.max(0, Math.round(rect.left));
      var rightGap = Math.max(0, Math.round(vw - rect.right));
      if (leftGap < 1 && rightGap < 1) return false;
      el.style.width = 'calc(100% + ' + (leftGap + rightGap) + 'px)';
      el.style.maxWidth = 'none';
      el.style.marginLeft = (-leftGap) + 'px';
      el.style.marginRight = (-rightGap) + 'px';
      el.style.boxSizing = 'border-box';
      return true;
    },

    /** Digest mobile featured hero: measure and bleed to viewport after the overlay is in the DOM. */
    _syncDigestMobileFeaturedImageBleed: function(wrapper) {
      if (!wrapper || !wrapper.querySelector) return;
      var imgs = wrapper.querySelectorAll('.blog-overlay-digest-featured-article .blog-overlay-featured-image[data-digest-viewport-bleed]');
      for (var i = 0; i < imgs.length; i++) {
        var fiWrap = imgs[i];
        fiWrap.style.width = '';
        fiWrap.style.maxWidth = '';
        fiWrap.style.marginLeft = '';
        fiWrap.style.marginRight = '';
        this._applyMeasuredViewportHorizontalBleed(fiWrap, fiWrap);
      }
    },

    _scheduleDigestMobileFeaturedImageBleed: function(vs) {
      if (!vs || vs.collectionLayout !== 'digest' || !vs.digestMobileNarrow) return;
      if (!vs.featuredPost || !vs.faCfg || !vs.faCfg.show || vs.faCfg.position !== 'inLayout') return;
      var self = this;
      var digestBleedSeq = self._renderSeq;
      requestAnimationFrame(function() {
        requestAnimationFrame(function() {
          if (self._renderSeq !== digestBleedSeq) return;
          var wrapperForBleed = document.getElementById('blog-overlay-list');
          if (wrapperForBleed) self._syncDigestMobileFeaturedImageBleed(wrapperForBleed);
        });
      });
    },

    /** Grid/digest collection post container — explicit row/column gap avoids shorthand/longhand conflicts on desktop. */
    _applyCollectionGridMainLayout: function(mainEl, opts) {
      if (!mainEl || !mainEl.style) return;
      var collectionMobileGridNarrow = Boolean(opts && opts.collectionMobileGridNarrow);
      var gridMobileNarrow = Boolean(opts && opts.gridMobileNarrow);
      var gridColsEffective = opts && opts.gridColsEffective != null ? opts.gridColsEffective : 3;
      mainEl.style.display = 'grid';
      mainEl.style.gridTemplateColumns = 'repeat(' + gridColsEffective + ', minmax(0, 1fr))';
      mainEl.style.width = '100%';
      mainEl.style.maxWidth = '100%';
      mainEl.style.minWidth = '0';
      mainEl.style.boxSizing = 'border-box';
      var digestMobileNarrow = Boolean(opts && opts.digestMobileNarrow);
      if (collectionMobileGridNarrow && digestMobileNarrow) {
        mainEl.style.overflow = 'visible';
        mainEl.style.overflowX = 'visible';
      } else if (collectionMobileGridNarrow) {
        mainEl.style.overflow = 'hidden';
      } else {
        mainEl.style.overflow = '';
      }
      mainEl.style.marginLeft = '';
      mainEl.style.marginRight = '';
      mainEl.style.gap = '';
      if (collectionMobileGridNarrow) {
        mainEl.style.paddingLeft = '12px';
        mainEl.style.paddingRight = '12px';
        if (gridMobileNarrow) {
          mainEl.style.rowGap = '8px';
          mainEl.style.columnGap = '16px';
        } else {
          mainEl.style.rowGap = '16px';
          mainEl.style.columnGap = '16px';
        }
      } else {
        mainEl.style.paddingLeft = '';
        mainEl.style.paddingRight = '';
        mainEl.style.rowGap = '24px';
        mainEl.style.columnGap = '24px';
      }
    },

    /** The Story post template: split header (image left or right), no sidebars. */
    _isStoryPostLayout: function(cfg) {
      if (!cfg || typeof cfg !== 'object') return false;
      var ph = cfg.postHeader && typeof cfg.postHeader === 'object' ? cfg.postHeader : null;
      if (!ph || (ph.imagePosition !== 'leftOfInfo' && ph.imagePosition !== 'rightOfInfo')) return false;
      var leftOn = cfg.leftSidebar && cfg.leftSidebar.show === true;
      var rightOn = cfg.rightSidebar && cfg.rightSidebar.show === true;
      return !leftOn && !rightOn;
    },

    /** The Reporter post template: split header (image left or right), body row with right sidebar. */
    _isReporterPostLayout: function(cfg) {
      if (!cfg || typeof cfg !== 'object') return false;
      var ph = cfg.postHeader && typeof cfg.postHeader === 'object' ? cfg.postHeader : null;
      if (!ph || (ph.imagePosition !== 'leftOfInfo' && ph.imagePosition !== 'rightOfInfo')) return false;
      return !!(cfg.rightSidebar && cfg.rightSidebar.show === true);
    },

    /** The Feature post template: centered stacked full-bleed header with dual sidebars. */
    _isFeaturePostLayout: function(cfg) {
      if (!cfg || typeof cfg !== 'object') return false;
      var ph = cfg.postHeader && typeof cfg.postHeader === 'object' ? cfg.postHeader : null;
      if (!ph || ph.imagePosition !== 'fullBleed' || ph.contentAlignment !== 'center') return false;
      var leftOn = cfg.leftSidebar && cfg.leftSidebar.show === true;
      var rightOn = cfg.rightSidebar && cfg.rightSidebar.show === true;
      return leftOn && rightOn;
    },

    /** The Publisher post template: full-bleed header, single right sidebar. */
    _isPublisherPostLayout: function(cfg) {
      if (!cfg || typeof cfg !== 'object') return false;
      var ph = cfg.postHeader && typeof cfg.postHeader === 'object' ? cfg.postHeader : null;
      if (!ph || ph.imagePosition !== 'fullBleed') return false;
      var leftOn = cfg.leftSidebar && cfg.leftSidebar.show === true;
      var rightOn = cfg.rightSidebar && cfg.rightSidebar.show === true;
      return !leftOn && rightOn;
    },

    /** The Writer post template: centered minimal header, no sidebars, image below info. */
    _isWriterPostLayout: function(cfg) {
      if (!cfg || typeof cfg !== 'object') return false;
      var ph = cfg.postHeader && typeof cfg.postHeader === 'object' ? cfg.postHeader : null;
      if (!ph || ph.imagePosition !== 'belowInfo') return false;
      var leftOn = cfg.leftSidebar && cfg.leftSidebar.show === true;
      var rightOn = cfg.rightSidebar && cfg.rightSidebar.show === true;
      return !leftOn && !rightOn;
    },

    /** Writer post header: short decorative rule between deck and meta. */
    _createWriterPostHeaderDivider: function(align) {
      var hr = document.createElement('hr');
      hr.className = 'blog-overlay-writer-rule';
      hr.setAttribute('aria-hidden', 'true');
      if (align === 'left') {
        hr.style.marginLeft = '0';
      } else if (align === 'right') {
        hr.style.marginRight = '0';
      }
      return hr;
    },

    /** Story template: header zone background from postHeader.backgroundColor (default black). */
    _resolveStoryHeaderBackgroundColor: function(postHeaderCfg) {
      var raw = postHeaderCfg && typeof postHeaderCfg.backgroundColor === 'string' ? postHeaderCfg.backgroundColor.trim() : '';
      if (/^#[0-9a-fA-F]{3}$/.test(raw) || /^#[0-9a-fA-F]{6}$/.test(raw)) return raw;
      return '#000000';
    },

    /** Reporter post header: full-width decorative rule above meta row. */
    _createReporterPostHeaderDivider: function() {
      var hr = document.createElement('hr');
      hr.className = 'blog-overlay-reporter-accent-rule';
      hr.setAttribute('aria-hidden', 'true');
      return hr;
    },

    /** Story post header (on-dark): full-width decorative rule between deck and meta. */
    _createStoryPostHeaderDivider: function() {
      var hr = document.createElement('hr');
      hr.className = 'blog-overlay-story-rule';
      hr.setAttribute('aria-hidden', 'true');
      return hr;
    },

    /** Phones, narrow overlay roots, and Configure mobile preview (matches 768px md breakpoint). */
    _isNarrowCollectionViewport: function() {
      try {
        var narrowByViewport = typeof window !== 'undefined' && (window.matchMedia
          ? window.matchMedia('(max-width: 767px)').matches
          : window.innerWidth <= 767);
        var overlayW = 0;
        if (this._root && this._root.getBoundingClientRect) {
          overlayW = Math.round(this._root.getBoundingClientRect().width) || 0;
        }
        if (!overlayW && this._root && this._root.clientWidth) overlayW = this._root.clientWidth;
        var previewDeviceMobile = Boolean(
          this.config && this.config.previewDevice === 'mobile' &&
          (this._previewMode || this._bbPreview)
        );
        return narrowByViewport || previewDeviceMobile || (overlayW > 0 && overlayW <= 767);
      } catch (eNarrowVp) {
        return typeof window !== 'undefined' && window.innerWidth <= 767;
      }
    },

    _updateProgressBar: function() {
      var track = document.getElementById('blog-overlay-progress');
      var fill = track && track.querySelector('.blog-overlay-progress-fill');
      var article = document.querySelector('#blog-overlay-list article');
      if (!fill || !article) return;

      var scrollY, viewportHeight, postTop, postHeight;
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
        var navbarHeight = this._getNavbarOffset();
        track.style.top = Math.max(0, navbarHeight - scrollY) + 'px';
        track.style.bottom = 'auto';
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

    _clearPendingSearchRender: function() {
      if (this._searchRenderTimer) {
        clearTimeout(this._searchRenderTimer);
        this._searchRenderTimer = null;
      }
    },

    _scheduleSearchDrivenRender: function() {
      var self = this;
      this._clearPendingSearchRender();
      this._searchRenderTimer = setTimeout(function() {
        self._searchRenderTimer = null;
        self._flushSearchDrivenRender();
      }, this._SEARCH_RENDER_DEBOUNCE_MS);
    },

    _flushSearchDrivenRender: async function() {
      var items = this.items;
      if (!items) return;
      var startMs = Date.now();
      var debugQuery = (this._searchQuery || '').trim();
      this._currentPage = 1;
      try {
        var did = await this._refreshCollectionPostsOnly(items);
        if (!did) {
          this._debugLog('search render fallback to full render', {
            query: debugQuery,
            elapsedMs: Date.now() - startMs
          });
          await this._renderContent(items);
        } else {
          this._debugLog('search render used incremental refresh', {
            query: debugQuery,
            elapsedMs: Date.now() - startMs
          });
        }
      } catch (err) {
        console.error('[BlogOverlay] search-driven render error:', err);
        this._debugLog('search render error fallback to full render', {
          query: debugQuery,
          elapsedMs: Date.now() - startMs,
          error: err && err.message ? err.message : String(err)
        });
        await this._renderContent(items);
      }
      var q = (this._searchQuery || '').trim();
      if (q) {
        var resultsCount = this._searchPosts(this.items, q).length;
        this._analyticsTrackSearchDebounced(q, resultsCount);
      }
    },

    /**
     * Featured post resolution when featured article is enabled: BetterBlog featuredPostId (if it matches
     * a post in the pool), else Squarespace featured markers/refs, else first post in sortedItems (e.g. newest by date).
     */
    _resolveFeaturedPostForCollection: function(isSinglePost, faCfg, sortedItems, displayPostKey) {
      if (isSinglePost || !faCfg || faCfg.show !== true || !sortedItems || sortedItems.length === 0) return null;
      var pool = sortedItems;
      var idx = -1;
      var bb = faCfg.featuredPostId;
      if (typeof bb === 'string' && bb.trim()) {
        var bid = String(bb).trim();
        for (var i = 0; i < pool.length; i++) {
          if (displayPostKey(pool[i]) === bid) {
            idx = i;
            break;
          }
        }
      }
      if (idx < 0) {
        var refIds = this._getCollectionFeaturedRefIds();
        for (var f = 0; f < pool.length; f++) {
          var it = pool[f];
          if (it && (this._itemIsSquarespaceFeatured(it) || this._itemMatchesFeaturedRef(it, refIds))) {
            idx = f;
            break;
          }
        }
      }
      if (idx < 0 && pool.length > 0) idx = 0;
      return idx >= 0 ? pool[idx] : null;
    },

    _applyFeaturedPostDisplayLayout: function(featuredPost, faCfg, displayItems, displayPostKey) {
      var displayItemsForLoop = displayItems;
      if (!featuredPost || !faCfg) return displayItemsForLoop;
      if (faCfg.position === 'header') {
        var headerFpK = displayPostKey(featuredPost);
        displayItemsForLoop = displayItems.filter(function(p) {
          if (p === featuredPost) return false;
          if (headerFpK && displayPostKey(p) === headerFpK) return false;
          return true;
        });
      } else if (faCfg.position === 'inLayout') {
        var inLayoutList = displayItems.slice();
        var fpK = displayPostKey(featuredPost);
        var fpPos = -1;
        for (var ili = 0; ili < inLayoutList.length; ili++) {
          var lit = inLayoutList[ili];
          if (lit === featuredPost || (fpK && displayPostKey(lit) === fpK)) {
            fpPos = ili;
            break;
          }
        }
        if (fpPos > 0) {
          var fpItem = inLayoutList.splice(fpPos, 1)[0];
          inLayoutList.unshift(fpItem);
          displayItemsForLoop = inLayoutList;
        } else if (fpPos === 0) {
          displayItemsForLoop = inLayoutList;
        } else {
          displayItemsForLoop = [featuredPost].concat(inLayoutList.filter(function(p) {
            return p !== featuredPost && (!fpK || displayPostKey(p) !== fpK);
          }));
        }
      }
      return displayItemsForLoop;
    },

    _computeCollectionViewState: function(items) {
      var self = this;
      var rawCfg = this.config || {};
      var viewerMode = this._resolveViewerMode();
      var selectedIndex = this._getSelectedIndex(items);
      var resolvedCollection = this._resolveLevelConfigForViewerMode(rawCfg.collectionConfig, viewerMode);
      var resolvedPost = this._resolveLevelConfigForViewerMode(rawCfg.postConfig, viewerMode);
      var baseCfg = Object.assign({}, rawCfg, {
        collectionConfig: resolvedCollection.active || rawCfg.collectionConfig,
        postConfig: resolvedPost.active || rawCfg.postConfig,
        viewerModeResolved: viewerMode
      });
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
      /** Collection pages always paginate so long lists remain navigable. */
      var usePagination = !isSinglePostForCfg;
      var paginationMode = usePagination && paginationCfg && paginationCfg.mode === 'infiniteScroll' ? 'infiniteScroll' : 'pages';
      var postsPerPage = usePagination ? Math.max(1, parseInt(paginationCfg && paginationCfg.postsPerPage, 10) || 10) : 0;
      var totalFiltered = sortedItems.length;
      var totalPages = usePagination && postsPerPage > 0 && paginationMode === 'pages' ? Math.max(1, Math.ceil(totalFiltered / postsPerPage)) : 1;
      var currentPage = Math.min(Math.max(1, this._currentPage || 1), totalPages);
      if (usePagination && paginationMode === 'pages') this._currentPage = currentPage;
      if (usePagination && paginationMode === 'infiniteScroll') {
        var infiniteScrollSig = (searchQuery || '') + '|' + (categoryFilter || []).join(',') + '|' + (tagFilter || []).join(',') + '|' + postSort + '|' + postsPerPage;
        if (this._lastInfiniteScrollSignature !== infiniteScrollSig) {
          this._lastInfiniteScrollSignature = infiniteScrollSig;
          this._infiniteScrollLoaded = Math.min(postsPerPage, totalFiltered);
        }
        if (this._infiniteScrollLoaded <= 0 || this._infiniteScrollLoaded > totalFiltered) {
          this._infiniteScrollLoaded = Math.min(postsPerPage, totalFiltered);
        }
        this._infiniteScrollLoaded = Math.min(this._infiniteScrollLoaded, totalFiltered);
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
      var recentPostsCount = Math.max(1, Math.min(3, parseInt(cfg.recentPostsCount, 10) || 3));
      var leftSidebarCfg = cfg.leftSidebar && typeof cfg.leftSidebar === 'object' ? cfg.leftSidebar : null;
      var rightSidebarCfg = cfg.rightSidebar && typeof cfg.rightSidebar === 'object' ? cfg.rightSidebar : null;
      var headerContentCfg = cfg.headerContent && typeof cfg.headerContent === 'object' ? cfg.headerContent : null;
      var footerContentCfg = cfg.footerContent && typeof cfg.footerContent === 'object' ? cfg.footerContent : null;
      var useLevelConfig = (baseCfg.collectionConfig && typeof baseCfg.collectionConfig === 'object') || (baseCfg.postConfig && typeof baseCfg.postConfig === 'object');
      var showTableOfContents = Boolean(cfg.showTableOfContents);
      var tableOfContentsPosition = (cfg.tableOfContentsPosition === 'right') ? 'right' : 'left';
      var showRecentPostsSidebar = Boolean(cfg.showRecentPostsSidebar);
      var sidebarPosition = (cfg.sidebarPosition === 'right') ? 'right' : 'left';
      var autoSidebarWidth = isSinglePost ? 300 : 220;
      if (!useLevelConfig) {
        if (!leftSidebarCfg && cfg.showTableOfContents) {
          leftSidebarCfg = cfg.tableOfContentsPosition === 'left' ? { show: true, modules: ['tableOfContents'], width: 300, sticky: false } : null;
        }
        if (!rightSidebarCfg && cfg.showTableOfContents) {
          rightSidebarCfg = cfg.tableOfContentsPosition === 'right' ? { show: true, modules: ['tableOfContents'], width: 300, sticky: false } : null;
        }
        if (!leftSidebarCfg && cfg.showRecentPostsSidebar) {
          leftSidebarCfg = cfg.sidebarPosition === 'left' ? { show: true, modules: ['recentPosts'], width: autoSidebarWidth, sticky: false } : leftSidebarCfg;
        }
        if (!rightSidebarCfg && cfg.showRecentPostsSidebar) {
          rightSidebarCfg = cfg.sidebarPosition === 'right' ? { show: true, modules: ['recentPosts'], width: autoSidebarWidth, sticky: false } : rightSidebarCfg;
        }
      } else {
        if (!leftSidebarCfg) leftSidebarCfg = { show: false, modules: [], width: autoSidebarWidth, sticky: false };
        if (!rightSidebarCfg) rightSidebarCfg = { show: false, modules: [], width: autoSidebarWidth, sticky: false };
      }
      var paywalledLoggedOut = self._isPaywalledSite() && viewerMode === 'loggedOut';
      var paywallFullActiveForRender = paywalledLoggedOut && self._isSquarespaceFullPaywallActive();
      if (self._isTocDebugEnabled()) {
        try {
          var pmToc = cfg.postModules && cfg.postModules.tableOfContents ? cfg.postModules.tableOfContents : null;
          var tocSig =
            (isSinglePost ? 'post' : 'coll') +
            '|' + String(viewerMode) +
            '|uLC' + (useLevelConfig ? '1' : '0') +
            '|L' + (leftSidebarCfg && leftSidebarCfg.show ? '1' : '0') + ':' + (leftSidebarCfg && Array.isArray(leftSidebarCfg.modules) ? leftSidebarCfg.modules.join(',') : '') +
            '|Lo' + (leftSidebarCfg && Array.isArray(leftSidebarCfg.moduleOrder) ? leftSidebarCfg.moduleOrder.join(',') : '') +
            '|R' + (rightSidebarCfg && rightSidebarCfg.show ? '1' : '0') + ':' + (rightSidebarCfg && Array.isArray(rightSidebarCfg.modules) ? rightSidebarCfg.modules.join(',') : '') +
            '|Ro' + (rightSidebarCfg && Array.isArray(rightSidebarCfg.moduleOrder) ? rightSidebarCfg.moduleOrder.join(',') : '') +
            '|H' + (headerContentCfg && headerContentCfg.show ? '1' : '0') + ':' + (headerContentCfg && Array.isArray(headerContentCfg.modules) ? headerContentCfg.modules.join(',') : '') +
            '|Ho' + (headerContentCfg && Array.isArray(headerContentCfg.moduleOrder) ? headerContentCfg.moduleOrder.join(',') : '') +
            '|legShowToc' + (showTableOfContents ? '1' : '0') +
            '|pmEn' + (pmToc && pmToc.enabled ? '1' : '0') + '|pmPos' + (pmToc && pmToc.position ? String(pmToc.position) : '—');
          if (tocSig !== self._lastTocDebugViewSig) {
            self._lastTocDebugViewSig = tocSig;
            var hcRaw = cfg.headerContent && typeof cfg.headerContent === 'object' ? cfg.headerContent : null;
            self._tocDebug('viewState', {
              isSinglePost: isSinglePost,
              selectedIndex: selectedIndex,
              viewerMode: viewerMode,
              useLevelConfig: useLevelConfig,
              legacyShowTableOfContents: showTableOfContents,
              postModulesTableOfContents: pmToc,
              leftSidebar: leftSidebarCfg ? {
                show: leftSidebarCfg.show,
                modules: leftSidebarCfg.modules,
                moduleOrder: leftSidebarCfg.moduleOrder
              } : null,
              rightSidebar: rightSidebarCfg ? {
                show: rightSidebarCfg.show,
                modules: rightSidebarCfg.modules,
                moduleOrder: rightSidebarCfg.moduleOrder
              } : null,
              headerContent: hcRaw ? {
                show: hcRaw.show,
                modules: hcRaw.modules,
                moduleOrder: hcRaw.moduleOrder,
                tableOfContents: hcRaw.tableOfContents,
                breadcrumbs: hcRaw.breadcrumbs
              } : null,
              hasMergedPostConfig: Boolean(baseCfg.postConfig && typeof baseCfg.postConfig === 'object'),
              hint: 'Enable with ?bbTocDebug=1 on this page URL'
            });
          }
        } catch (eTocVs) {}
      }
      var showDate = Boolean(cfg.showDate);
      var showAuthor = Boolean(cfg.showAuthor);
      var showReadingTime = Boolean(cfg.showReadingTime);
      /** Collection teasers: default on when unset. Editorial/Digest force off via template lock. */
      var showPostExcerpt = cfg.showPostExcerpt !== false;
      /** Paywalled logged-out collection JSON often lacks full post body, so reading time cannot be calculated. */
      if (viewerMode === 'loggedOut' && !isSinglePost && self._isPaywalledSite()) showReadingTime = false;
      var pbCfg = cfg.progressBar && typeof cfg.progressBar === 'object' ? cfg.progressBar : {};
      var showProgressBar = Boolean(pbCfg.show != null ? pbCfg.show : cfg.showProgressBar);
      /** Logged-out paywalled readers may see a gated post body — scroll progress is misleading. */
      if (viewerMode === 'loggedOut' && isSinglePost && self._isPaywalledSite()) showProgressBar = false;
      var fiCfg = cfg.featuredImage && typeof cfg.featuredImage === 'object' ? cfg.featuredImage : {};
      var faCfg = cfg.featuredArticle && typeof cfg.featuredArticle === 'object' ? cfg.featuredArticle : null;

      var layoutModeKeys = ['grid', 'listRows', 'editorial', 'showcase', 'digest'];
      var collectionLayoutRaw = cfg.collectionLayout;
      if ((collectionLayoutRaw == null || collectionLayoutRaw === '') && baseCfg.collectionConfig && typeof baseCfg.collectionConfig === 'object' && baseCfg.collectionConfig.collectionLayout) {
        collectionLayoutRaw = baseCfg.collectionConfig.collectionLayout;
      }
      if (typeof collectionLayoutRaw === 'string') {
        var cl = collectionLayoutRaw.trim().toLowerCase();
        if (cl === 'listrows' || cl === 'list-rows' || cl === 'list_rows') collectionLayoutRaw = 'listRows';
        else if (cl === 'grid' || cl === 'editorial' || cl === 'showcase' || cl === 'digest') collectionLayoutRaw = cl;
      }
      var collectionLayout = !isSinglePost && layoutModeKeys.indexOf(collectionLayoutRaw) >= 0 ? collectionLayoutRaw : 'grid';
      var parsedGridCols = parseInt(cfg.gridColumns, 10);
      var gridColsFromConfig = (parsedGridCols === 2 || parsedGridCols === 3) ? parsedGridCols : null;
      var gridColsDigestOrGrid = gridColsFromConfig != null
        ? gridColsFromConfig
        : (collectionLayout === 'digest' ? 2 : 3);
      var collectionMobileGridNarrow = !isSinglePost &&
        (collectionLayout === 'grid' || collectionLayout === 'digest') &&
        self._isNarrowCollectionViewport();
      var gridMobileNarrow = collectionLayout === 'grid' && collectionMobileGridNarrow;
      var digestMobileNarrow = collectionLayout === 'digest' && collectionMobileGridNarrow;
      var gridColsEffective = collectionMobileGridNarrow ? 2 : gridColsDigestOrGrid;

      var featuredPost = null;
      var displayItemsForLoop = displayItems;
      var displayPostKey = function(postObj) {
        return postObj && (postObj.id || postObj.fullUrl || postObj.title)
          ? String(postObj.id || postObj.fullUrl || postObj.title)
          : '';
      };
      if (!isSinglePost && faCfg && faCfg.show === true && sortedItems.length > 0) {
        featuredPost = self._resolveFeaturedPostForCollection(isSinglePost, faCfg, sortedItems, displayPostKey);
        if (featuredPost) {
          displayItemsForLoop = self._applyFeaturedPostDisplayLayout(featuredPost, faCfg, displayItems, displayPostKey);
        }
        if (self._featuredDebugEnabled()) {
          console.warn('[BlogOverlay][featured-debug] resolved', {
            bbFeatured: faCfg.featuredPostId,
            featuredTitle: featuredPost && featuredPost.title,
            poolLen: sortedItems.length,
            displayLen: displayItems.length
          });
        }
      }

      try {
        var selectedPostForLog = isSinglePost && displayItems[0] ? displayItems[0] : null;
        var renderLogPayload = {
          path: typeof window !== 'undefined' && window.location ? (window.location.pathname || '/') + (window.location.search || '') + (window.location.hash || '') : '',
          viewerMode: viewerMode,
          selectedIndex: selectedIndex,
          isSinglePost: isSinglePost,
          itemCount: items ? items.length : 0,
          displayItemCount: displayItems.length,
          selectedTitle: selectedPostForLog ? (selectedPostForLog.title || null) : null,
          selectedFullUrl: selectedPostForLog ? (selectedPostForLog.fullUrl || null) : null,
          selectedBodyLength: selectedPostForLog && selectedPostForLog.body ? String(selectedPostForLog.body).length : 0,
          selectedExcerptLength: selectedPostForLog && selectedPostForLog.excerpt ? String(selectedPostForLog.excerpt).length : 0,
          paywallFullActive: paywallFullActiveForRender,
          paywallShowFooter: paywalledLoggedOut && !isSinglePost,
          paywallGateSinglePostBody: paywalledLoggedOut && isSinglePost && selectedPostForLog && self._shouldGateSinglePostBody(selectedPostForLog),
          paywallReplaceCollectionTeaser: paywalledLoggedOut && !isSinglePost,
          paywallDetectionState: rawCfg.paywallDetectionState || null,
          paywallMode: rawCfg.paywallMode || null
        };
        var renderLogSig = JSON.stringify(renderLogPayload);
        if (renderLogSig !== this._lastViewerModeRenderLogSig) {
          this._lastViewerModeRenderLogSig = renderLogSig;
          console.log('[BetterBlog auth] render state', renderLogPayload);
        }
      } catch (eLogState) {}

      return {
        baseCfg: baseCfg,
        viewerMode: viewerMode,
        selectedIndex: selectedIndex,
        searchQuery: searchQuery,
        hasSearchQuery: hasSearchQuery,
        categoryFilter: categoryFilter,
        hasCategoryFilter: hasCategoryFilter,
        tagFilter: tagFilter,
        hasTagFilter: hasTagFilter,
        hasAnyFilter: hasAnyFilter,
        filteredItems: filteredItems,
        isSinglePostForCfg: isSinglePostForCfg,
        levelCfgForSort: levelCfgForSort,
        cfgForSort: cfgForSort,
        hasPostSortModule: hasPostSortModule,
        postSort: postSort,
        postViewCounts: postViewCounts,
        sortedItems: sortedItems,
        paginationCfg: paginationCfg,
        usePagination: usePagination,
        paginationMode: paginationMode,
        postsPerPage: postsPerPage,
        totalFiltered: totalFiltered,
        totalPages: totalPages,
        currentPage: currentPage,
        displayItems: displayItems,
        isSinglePost: isSinglePost,
        levelCfg: levelCfg,
        cfg: cfg,
        recentPostsCount: recentPostsCount,
        leftSidebarCfg: leftSidebarCfg,
        rightSidebarCfg: rightSidebarCfg,
        headerContentCfg: headerContentCfg,
        footerContentCfg: footerContentCfg,
        useLevelConfig: useLevelConfig,
        showTableOfContents: showTableOfContents,
        tableOfContentsPosition: tableOfContentsPosition,
        showRecentPostsSidebar: showRecentPostsSidebar,
        sidebarPosition: sidebarPosition,
        showDate: showDate,
        showAuthor: showAuthor,
        showReadingTime: showReadingTime,
        showProgressBar: showProgressBar,
        showPostExcerpt: showPostExcerpt,
        fiCfg: fiCfg,
        faCfg: faCfg,
        collectionLayout: collectionLayout,
        collectionLayoutRaw: collectionLayoutRaw,
        gridColsDigestOrGrid: gridColsDigestOrGrid,
        gridColsEffective: gridColsEffective,
        gridMobileNarrow: gridMobileNarrow,
        digestMobileNarrow: digestMobileNarrow,
        collectionMobileGridNarrow: collectionMobileGridNarrow,
        featuredPost: featuredPost,
        displayItemsForLoop: displayItemsForLoop,
        displayPostKey: displayPostKey,
        categoryFilterUiEnabled: self._collectionCategoryFilterUiEnabled(baseCfg),
        paywallFullActive: paywallFullActiveForRender,
        paywallShowFooter: paywalledLoggedOut && !isSinglePost,
        paywallGateSinglePostBody: paywalledLoggedOut && isSinglePost && displayItems[0] && self._shouldGateSinglePostBody(displayItems[0]),
        paywallReplaceCollectionTeaser: paywalledLoggedOut && !isSinglePost,
      };
    },

    _fetchPlaceholderImageMap: async function(featuredPost, displayItemsForLoop) {
      var self = this;
      var placeholderMap = {};
      var baseUrl = self.config && self.config.baseUrl;
      var urlsToCheck = [];
      function addImgUrl(u) {
        if (u && typeof u === 'string' && u.trim() && (u.indexOf('http://') === 0 || u.indexOf('https://') === 0) && urlsToCheck.indexOf(u) < 0) urlsToCheck.push(u);
      }
      if (featuredPost) {
        addImgUrl(featuredPost.assetUrl || featuredPost.thumbnailUrl || (featuredPost.assets && featuredPost.assets[0] && featuredPost.assets[0].assetUrl) || null);
      }
      for (var ui = 0; ui < displayItemsForLoop.length; ui++) {
        var pu = displayItemsForLoop[ui];
        addImgUrl(pu && (pu.assetUrl || pu.thumbnailUrl || (pu.assets && pu.assets[0] && pu.assets[0].assetUrl) || null));
      }
      if (urlsToCheck.length > 0 && baseUrl) {
        try {
          var res = await fetch(baseUrl.replace(/\/+$/, '') + '/api/config/check-placeholder-images', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ urls: urlsToCheck })
          });
          if (res.ok) {
            var data = await res.json();
            if (data.placeholders && typeof data.placeholders === 'object') placeholderMap = data.placeholders;
          } else {
            placeholderMap = null;
          }
        } catch (e) {
          placeholderMap = null;
        }
      }
      return placeholderMap;
    },

    _placeholderImageUrlsKey: function(featuredPost, displayItemsForLoop) {
      var urlsToCheck = [];
      function addImgUrl(u) {
        if (u && typeof u === 'string' && u.trim() && (u.indexOf('http://') === 0 || u.indexOf('https://') === 0) && urlsToCheck.indexOf(u) < 0) urlsToCheck.push(u);
      }
      if (featuredPost) {
        addImgUrl(featuredPost.assetUrl || featuredPost.thumbnailUrl || (featuredPost.assets && featuredPost.assets[0] && featuredPost.assets[0].assetUrl) || null);
      }
      for (var ui = 0; ui < (displayItemsForLoop ? displayItemsForLoop.length : 0); ui++) {
        var pu = displayItemsForLoop[ui];
        addImgUrl(pu && (pu.assetUrl || pu.thumbnailUrl || (pu.assets && pu.assets[0] && pu.assets[0].assetUrl) || null));
      }
      if (urlsToCheck.length === 0) return '';
      urlsToCheck.sort();
      return urlsToCheck.join('\n');
    },

    _schedulePlaceholderMapFollowUp: function(featuredPost, displayItemsForLoop, renderSeq) {
      var self = this;
      if (self._previewMode || self._bbPreview) return;
      var baseUrl = self.config && self.config.baseUrl;
      if (!baseUrl) return;
      var fetchKey = self._placeholderImageUrlsKey(featuredPost, displayItemsForLoop);
      if (!fetchKey) return;
      if (fetchKey === self._placeholderMapFetchKey && self._placeholderImageMap) return;
      if (self._placeholderMapFetchInFlight === fetchKey) return;
      self._placeholderMapFetchInFlight = fetchKey;
      self._fetchPlaceholderImageMap(featuredPost, displayItemsForLoop)
        .then(function(resolved) {
          self._placeholderMapFetchInFlight = null;
          if (renderSeq !== self._renderSeq) return;
          if (!resolved || typeof resolved !== 'object') return;
          self._placeholderMapFetchKey = fetchKey;
          self._placeholderImageMap = resolved;
          var needsPatch = false;
          for (var pk in resolved) {
            if (Object.prototype.hasOwnProperty.call(resolved, pk) && resolved[pk] === true) {
              needsPatch = true;
              break;
            }
          }
          if (needsPatch && self.items && self.items.length) {
            self._renderContent(self.items);
          }
        })
        .catch(function() {
          self._placeholderMapFetchInFlight = null;
        });
    },

    _buildItemIndexMap: function(items) {
      if (!items || !items.length) return null;
      try {
        if (typeof Map === 'function') {
          var map = new Map();
          for (var i = 0; i < items.length; i++) map.set(items[i], i);
          return map;
        }
      } catch (e) { /* ignore */ }
      return null;
    },

    _postIndexInItems: function(items, post, itemIndexMap) {
      if (itemIndexMap && typeof itemIndexMap.get === 'function') {
        var mapped = itemIndexMap.get(post);
        if (typeof mapped === 'number') return mapped;
      }
      return items.indexOf(post);
    },

    _buildCollectionPaginationNav: function(vs) {
      var self = this;
      var usePagination = vs.usePagination;
      var paginationMode = vs.paginationMode;
      var totalFiltered = vs.totalFiltered;
      var postsPerPage = vs.postsPerPage;
      var totalPages = vs.totalPages;
      var currentPage = vs.currentPage;
      var collectionPaginationEl = null;
      if (usePagination && (paginationMode === 'infiniteScroll' ? totalFiltered > 0 : totalPages > 1)) {
        var paginationEl = document.createElement('nav');
        paginationEl.className = 'blog-overlay-pagination';
        paginationEl.setAttribute('aria-label', 'Pagination');
        paginationEl.style.display = 'flex';
        paginationEl.style.alignItems = 'center';
        paginationEl.style.justifyContent = 'center';
        paginationEl.style.flexWrap = 'wrap';
        paginationEl.style.gap = '12px';
        paginationEl.style.marginTop = '24px';
        paginationEl.style.paddingTop = '20px';
        paginationEl.style.width = '100%';
        paginationEl.style.boxSizing = 'border-box';
        if (paginationMode === 'infiniteScroll') {
          paginationEl.style.flexDirection = 'column';
          paginationEl.style.gap = '10px';
          if (self._infiniteScrollLoaded < totalFiltered) {
            var loadMoreBtn = document.createElement('button');
            loadMoreBtn.type = 'button';
            loadMoreBtn.className = 'bb-load-more';
            loadMoreBtn.textContent = 'Load more';
            loadMoreBtn.onmouseover = function() { loadMoreBtn.style.filter = 'brightness(0.92)'; };
            loadMoreBtn.onmouseout = function() { loadMoreBtn.style.filter = ''; };
            loadMoreBtn.onclick = function() {
              var prevLoaded = self._infiniteScrollLoaded;
              self._infiniteScrollLoaded = Math.min(self._infiniteScrollLoaded + postsPerPage, totalFiltered);
              self._scrollToFirstNewPostIndex = prevLoaded;
              self._renderContent(self.items);
            };
            paginationEl.appendChild(loadMoreBtn);
          }
          var shownCount = Math.min(self._infiniteScrollLoaded, totalFiltered);
          var statusLine = document.createElement('p');
          statusLine.className = 'blog-overlay-pagination-infinite-status bb-pagination-status';
          statusLine.textContent = 'Showing ' + shownCount + ' ' + (shownCount === 1 ? 'post' : 'posts') + ' of ' + totalFiltered;
          statusLine.setAttribute('aria-live', 'polite');
          paginationEl.appendChild(statusLine);
        } else {
          var pagBtns = document.createElement('div');
          pagBtns.style.display = 'flex';
          pagBtns.style.alignItems = 'center';
          pagBtns.style.justifyContent = 'center';
          pagBtns.style.gap = '6px';
          pagBtns.style.flexWrap = 'wrap';
          var makePageBtn = function(pageNum, isCurrent) {
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'bb-pagination-btn' + (isCurrent ? ' bb-pagination-btn--active' : '');
            btn.textContent = String(pageNum);
            btn.setAttribute('aria-label', 'Page ' + pageNum);
            btn.setAttribute('aria-current', isCurrent ? 'page' : 'false');
            if (!isCurrent) {
              btn.onclick = function() {
                self._currentPage = pageNum;
                self._renderContent(self.items);
              };
            }
            return btn;
          };
          var addEllipsis = function() {
            var span = document.createElement('span');
            span.textContent = '…';
            span.style.padding = '0 4px';
            span.style.fontSize = '14px';
            span.style.color = 'var(--bb-muted,#999)';
            pagBtns.appendChild(span);
          };
          var pageSet = {};
          var addP = function(n) {
            if (n >= 1 && n <= totalPages) pageSet[n] = true;
          };
          addP(1);
          addP(totalPages);
          addP(currentPage);
          addP(currentPage - 1);
          addP(currentPage + 1);
          var sortedPages = Object.keys(pageSet).map(Number).sort(function(a, b) { return a - b; });
          for (var si = 0; si < sortedPages.length; si++) {
            if (si > 0) {
              var prevP = sortedPages[si - 1];
              var curP = sortedPages[si];
              var skip = curP - prevP - 1;
              if (skip === 1) {
                pagBtns.appendChild(makePageBtn(prevP + 1, prevP + 1 === currentPage));
              } else if (skip >= 2) {
                addEllipsis();
              }
            }
            pagBtns.appendChild(makePageBtn(sortedPages[si], sortedPages[si] === currentPage));
          }
          paginationEl.appendChild(pagBtns);
        }
        collectionPaginationEl = paginationEl;
      }
      return collectionPaginationEl;
    },

    _renderStandardPostListIntoMain: function(mainEl, items, vs, placeholderMap, navbarOffset, ensureSinglePostHeaderInnerEl, headerZoneRef) {
      var self = this;
      var cfg = vs.cfg;
      var isSinglePost = vs.isSinglePost;
      var displayItemsForLoop = vs.displayItemsForLoop;
      var selectedIndex = vs.selectedIndex;
      var featuredPost = vs.featuredPost;
      var displayPostKey = vs.displayPostKey;
      var faCfg = vs.faCfg;
      var fiCfg = vs.fiCfg;
      var collectionLayout = vs.collectionLayout;
      var gridColsDigestOrGrid = vs.gridColsDigestOrGrid;
      var gridColsEffective = vs.gridColsEffective != null ? vs.gridColsEffective : gridColsDigestOrGrid;
      var gridMobileNarrow = Boolean(vs.gridMobileNarrow);
      var digestMobileNarrow = Boolean(vs.digestMobileNarrow);
      var collectionMobileGridNarrow = Boolean(vs.collectionMobileGridNarrow) || gridMobileNarrow || digestMobileNarrow;
      var leftSidebarCfg = vs.leftSidebarCfg;
      var rightSidebarCfg = vs.rightSidebarCfg;
      var displayItems = vs.displayItems;
      var hasSearchQuery = vs.hasSearchQuery;
      var searchQuery = vs.searchQuery;
      var showDate = vs.showDate;
      var showAuthor = vs.showAuthor;
      var showReadingTime = vs.showReadingTime;
      var showPostExcerpt = vs.showPostExcerpt !== false;
      var hasAnyFilter = vs.hasAnyFilter;
      var categoryFilterUiEnabled = vs.categoryFilterUiEnabled;
      var siteAccentForPostCats = self._getSiteAccentColor();
      var paywallReplaceCollectionTeaser = Boolean(vs.paywallReplaceCollectionTeaser);
      var paywallGateSinglePostBody = Boolean(vs.paywallGateSinglePostBody);
      /** Newsroom (listRows): compact row on narrow viewports / preview phone — tighter spacing, fixed thumb, stacked text */
      var listRowsMobileCompact = false;
      if (!isSinglePost && collectionLayout === 'listRows') {
        try {
          var lrVpNarrow = typeof window !== 'undefined' && (window.matchMedia ? window.matchMedia('(max-width: 767px)').matches : window.innerWidth <= 767);
          var lrRootW = 0;
          if (self._root && self._root.getBoundingClientRect) {
            lrRootW = Math.round(self._root.getBoundingClientRect().width) || 0;
          }
          if (!lrRootW && self._root && self._root.clientWidth) lrRootW = self._root.clientWidth;
          var lrPreviewPhone = Boolean(self._previewMode && self.config && self.config.previewDevice === 'mobile');
          listRowsMobileCompact = lrVpNarrow || (lrRootW > 0 && lrRootW <= 767) || lrPreviewPhone;
        } catch (eLrMob) {
          listRowsMobileCompact = typeof window !== 'undefined' && window.innerWidth <= 767;
        }
      }
      /** Digest mobile: featured hero image full-bleed; 2-col grid thumbnails stay inset. */
      var digestMobileFullBleed = digestMobileNarrow;
      var postHeaderCfg = cfg.postHeader && typeof cfg.postHeader === 'object' ? cfg.postHeader : null;
      var phImagePos = postHeaderCfg && (postHeaderCfg.imagePosition === 'fullBleed' || postHeaderCfg.imagePosition === 'leftOfInfo' || postHeaderCfg.imagePosition === 'rightOfInfo' || postHeaderCfg.imagePosition === 'belowInfo') ? postHeaderCfg.imagePosition : 'fullBleed';
      var phAlign = postHeaderCfg && (postHeaderCfg.contentAlignment === 'left' || postHeaderCfg.contentAlignment === 'center' || postHeaderCfg.contentAlignment === 'right') ? postHeaderCfg.contentAlignment : 'left';
      var phSideImageGapPx = isSinglePost && (phImagePos === 'leftOfInfo' || phImagePos === 'rightOfInfo') && postHeaderCfg && typeof postHeaderCfg.sideGap === 'number'
        ? Math.min(150, Math.max(0, Math.round(postHeaderCfg.sideGap)))
        : 0;
      var phShowBreadcrumbs = isSinglePost && postHeaderCfg && Boolean(postHeaderCfg.showBreadcrumbs);
      var phShowCategories = isSinglePost && postHeaderCfg && Boolean(postHeaderCfg.showCategories);
      var phShowByline = isSinglePost && postHeaderCfg && Boolean(postHeaderCfg.showByline);
      var phShowDecorativeAccentLine = isSinglePost && postHeaderCfg && Boolean(postHeaderCfg.showDecorativeAccentLine);
      var writerPostLayout = isSinglePost && self._isWriterPostLayout(cfg);
      var storyPostLayout = isSinglePost && self._isStoryPostLayout(cfg);
      var sidebarRowPostLayout = isSinglePost && (
        self._isFeaturePostLayout(cfg) ||
        self._isReporterPostLayout(cfg) ||
        self._isPublisherPostLayout(cfg)
      );
      var postHeaderAccentDividerLayout = phShowDecorativeAccentLine && (writerPostLayout || storyPostLayout);
      for (var j = 0; j < displayItemsForLoop.length; j++) {
        var post = displayItemsForLoop[j];
        var gatedCard = paywallReplaceCollectionTeaser && !self._isPaywallPublicPreviewPost(post);
        var nwPaywallColSide = null;
        var postIndex = isSinglePost ? selectedIndex : self._postIndexInItems(items, post, self._itemIndexMap);
        var featLayoutKey = featuredPost ? displayPostKey(featuredPost) : null;
        var postLayoutKey = displayPostKey(post);
        var isFeaturedInLayout = !isSinglePost && faCfg && faCfg.show && faCfg.position === 'inLayout' && !!featuredPost && (post === featuredPost || (featLayoutKey && postLayoutKey === featLayoutKey));
        var fiShow = Boolean(fiCfg.show !== false);
        var fiLayout = fiCfg.layoutMode === 'fullBleed' ? 'fullBleed' : fiCfg.layoutMode === 'rightJustified' ? 'rightJustified' : 'leftJustified';
        var fiImageWidth = Math.min(60, Math.max(25, parseInt(fiCfg.imageWidthPercent, 10) || 40));
        var imgUrl = post.assetUrl || post.thumbnailUrl || (post.assets && post.assets[0] && post.assets[0].assetUrl) || null;
        if (imgUrl && self._isPlaceholderWithMap(imgUrl, placeholderMap)) imgUrl = null;
        var showFiPlaceholder = !isSinglePost && fiShow && !imgUrl;
        if (isSinglePost) {
          fiLayout = phImagePos === 'fullBleed' ? 'fullBleed' : phImagePos === 'rightOfInfo' ? 'rightJustified' : 'leftJustified';
          if (phImagePos === 'leftOfInfo' || phImagePos === 'rightOfInfo') fiImageWidth = fiImageWidth;
        } else if (collectionLayout === 'listRows' && fiShow) {
          fiLayout = 'leftJustified';
          fiImageWidth = 14;
        } else if (collectionLayout === 'grid' || collectionLayout === 'digest') {
          fiLayout = 'fullBleed';
        }
        var fiAspect = fiCfg.aspectBehavior === 'cropped' ? 'cropped' : 'original';
        var fiRatio = (fiCfg.aspectRatio === '4:3' ? '4:3' : fiCfg.aspectRatio === '3:2' ? '3:2' : fiCfg.aspectRatio === '2:3' ? '2:3' : fiCfg.aspectRatio === '1:1' ? '1:1' : fiCfg.aspectRatio === '21:9' ? '21:9' : fiCfg.aspectRatio === '21:8' ? '21:8' : '16:9');
        if (!isSinglePost && collectionLayout === 'digest' && isFeaturedInLayout) fiRatio = '21:9';
        /** Reporter (split header): 3:2 cover crop regardless of saved aspectBehavior. */
        var reporterPostHeaderLayout = isSinglePost && self._isReporterPostLayout(cfg);
        var reporterPostHeaderImage = reporterPostHeaderLayout && fiShow;
        if (reporterPostHeaderImage) {
          fiRatio = '3:2';
        }
        /** Story (split header): cover crop at 4:3 (spec). */
        var storyPostHeaderCrop = isSinglePost && storyPostLayout && fiShow;
        if (storyPostHeaderCrop) {
          fiAspect = 'cropped';
          fiRatio = '4:3';
        }
        /** Feature (stacked fullBleed header): cover crop at 16:9 (spec). */
        var featureStackedHeaderCrop = isSinglePost && self._isFeaturePostLayout(cfg) && phImagePos === 'fullBleed' && postHeaderCfg && postHeaderCfg.fullBleedLayout === 'stacked' && fiShow;
        if (featureStackedHeaderCrop) {
          fiAspect = 'cropped';
          fiRatio = '16:9';
        }
        /** Masthead (grid), Newsroom (listRows), Digest: same aspect + cover crop on every card thumbnail. */
        var uniformCollectionThumbs = !isSinglePost && (collectionLayout === 'grid' || collectionLayout === 'listRows' || collectionLayout === 'digest');
        var fiFixedAspectCrop = fiAspect === 'cropped' || uniformCollectionThumbs;
        var fiShadow = Boolean(fiCfg.shadow);
        var fiCaption = Boolean(fiCfg.showCaption !== false);
        var fiSpacing = (fiCfg.verticalSpacing === 'tight' ? 'tight' : fiCfg.verticalSpacing === 'spacious' ? 'spacious' : 'normal');
        var phFullBleedOverlay = isSinglePost && phImagePos === 'fullBleed' && fiShow && !(postHeaderCfg && postHeaderCfg.fullBleedLayout === 'stacked');
        var phVertRaw = postHeaderCfg && postHeaderCfg.contentVerticalAlignment;
        var phVertical = (phVertRaw === 'center' || phVertRaw === 'bottom' || phVertRaw === 'top') ? phVertRaw : (phFullBleedOverlay ? 'bottom' : 'top');
        var phVerticalAlignItems = phVertical === 'center' ? 'center' : phVertical === 'bottom' ? 'flex-end' : 'flex-start';
        var article = document.createElement('article');
        article.id = 'blog-post-' + j;
        var displayIdx = displayItems.indexOf(post);
        if (displayIdx >= 0) article.setAttribute('data-display-index', String(displayIdx));
        article.style.marginBottom = '24px';
        article.style.paddingBottom = '24px';
        if (sidebarRowPostLayout) {
          article.classList.add('blog-overlay-post-article--sidebar-row');
          article.style.marginTop = '0';
          article.style.paddingTop = '0';
        }
        if (!isSinglePost && collectionLayout === 'grid' && gridMobileNarrow) {
          article.style.marginBottom = '12px';
          article.style.paddingBottom = '12px';
        }
        if (!isSinglePost && collectionLayout === 'listRows') {
          article.classList.add('blog-overlay-list-rows-row');
          article.style.marginBottom = '0';
          if (listRowsMobileCompact) {
            article.style.paddingTop = j === 0 ? '4px' : '7px';
            article.style.paddingBottom = '7px';
            article.style.paddingLeft = '8px';
            article.classList.add('blog-overlay-list-rows-mobile-compact');
          } else {
            article.style.paddingTop = '12px';
            article.style.paddingBottom = '12px';
          }
          if (j === displayItemsForLoop.length - 1) {
            article.classList.add('blog-overlay-list-rows-row--last');
          }
        }
        if (navbarOffset > 0) {
          article.style.scrollMarginTop = (navbarOffset + 8) + 'px';
        }
        if (isFeaturedInLayout) article.classList.add('blog-overlay-featured-article');
        if (isFeaturedInLayout && !isSinglePost) {
          article.style.marginTop = (collectionLayout === 'listRows' && listRowsMobileCompact && j === 0) ? '6px' : '12px';
        }
        if (isFeaturedInLayout && (collectionLayout === 'grid' || collectionLayout === 'digest')) {
          article.style.gridColumn = '1 / span ' + gridColsEffective;
        }
        if (!isSinglePost && (collectionLayout === 'grid' || collectionLayout === 'digest')) {
          article.style.minWidth = '0';
          article.style.width = '100%';
          article.style.maxWidth = '100%';
          article.style.boxSizing = 'border-box';
          if (!collectionMobileGridNarrow) {
            article.style.marginBottom = '0';
            article.style.paddingBottom = '0';
          }
        }
        if (digestMobileNarrow && isFeaturedInLayout && collectionLayout === 'digest') {
          article.style.overflow = 'visible';
          article.style.textAlign = 'left';
        }
        var digestFeaturedIntro = null;
        if (isFeaturedInLayout && collectionLayout === 'digest') {
          if (!isSinglePost) {
            article.classList.add('blog-overlay-digest-featured-article');
            article.style.width = '100%';
            article.style.maxWidth = '100%';
            article.style.minWidth = '0';
            article.style.boxSizing = 'border-box';
            article.style.display = 'flex';
            article.style.flexDirection = 'column';
            article.style.alignItems = 'stretch';
            digestFeaturedIntro = document.createElement('div');
            digestFeaturedIntro.className = 'blog-overlay-digest-featured-intro';
            digestFeaturedIntro.style.width = '100%';
            digestFeaturedIntro.style.maxWidth = '100%';
            digestFeaturedIntro.style.boxSizing = 'border-box';
            if (digestMobileFullBleed) {
              digestFeaturedIntro.style.paddingLeft = '0';
              digestFeaturedIntro.style.paddingRight = '0';
              digestFeaturedIntro.style.paddingTop = '12px';
              digestFeaturedIntro.style.paddingBottom = '0';
              digestFeaturedIntro.style.textAlign = 'left';
              digestFeaturedIntro.style.display = 'flex';
              digestFeaturedIntro.style.flexDirection = 'column';
              digestFeaturedIntro.style.alignItems = 'flex-start';
            }
          }
        }

        var imgCaption = (post.asset && post.asset.caption) ? post.asset.caption : (post.caption || null);
        var isSideBySide = !isSinglePost && (collectionLayout !== 'listRows' || imgUrl || showFiPlaceholder) && (fiLayout === 'leftJustified' || fiLayout === 'rightJustified') && fiShow && (imgUrl || showFiPlaceholder);
        if (isSinglePost && (phImagePos === 'belowInfo' || phImagePos === 'leftOfInfo' || phImagePos === 'rightOfInfo')) isSideBySide = false;
        if (isSinglePost && (phImagePos === 'leftOfInfo' || phImagePos === 'rightOfInfo') && fiShow && (imgUrl || showFiPlaceholder)) isSideBySide = true;
        var rowEl = null;
        var contentEl = null;
        if (isSideBySide) {
          rowEl = document.createElement('div');
          rowEl.style.display = 'flex';
          rowEl.style.flexDirection = (isSinglePost ? phImagePos === 'rightOfInfo' : fiLayout === 'rightJustified') ? 'row-reverse' : 'row';
          if (storyPostLayout) {
            rowEl.classList.add('blog-overlay-story-header-row');
            rowEl.style.gap = '40px';
            rowEl.style.alignItems = 'stretch';
            rowEl.style.marginBottom = '0';
          } else {
            rowEl.style.gap = (collectionLayout === 'listRows' && listRowsMobileCompact)
              ? '10px'
              : (isSinglePost && phSideImageGapPx > 0 ? (phSideImageGapPx + 'px') : '20px');
            rowEl.style.alignItems =
              (isSinglePost && (phImagePos === 'leftOfInfo' || phImagePos === 'rightOfInfo'))
                ? 'stretch'
                : ((!isSinglePost && collectionLayout === 'listRows')
                    ? 'center'
                    : (isSinglePost ? phVerticalAlignItems : 'flex-start'));
            rowEl.style.marginBottom = (!isSinglePost && collectionLayout === 'listRows')
              ? '0'
              : (fiSpacing === 'tight' ? '12px' : fiSpacing === 'spacious' ? '28px' : '20px');
          }
          contentEl = document.createElement('div');
          contentEl.style.flex = storyPostLayout ? '0 0 42%' : (reporterPostHeaderLayout ? '0 0 40%' : '1');
          contentEl.style.minWidth = '0';
          if (isSinglePost && (phImagePos === 'leftOfInfo' || phImagePos === 'rightOfInfo')) {
            if (storyPostLayout) contentEl.classList.add('blog-overlay-story-info-col');
            contentEl.style.display = 'flex';
            contentEl.style.flexDirection = 'column';
            contentEl.style.justifyContent = 'flex-start';
            contentEl.style.alignSelf = 'stretch';
          }
          if (!isSinglePost && collectionLayout === 'listRows') {
            contentEl.style.display = 'flex';
            contentEl.style.flexDirection = 'column';
            contentEl.style.justifyContent = 'center';
            contentEl.style.alignItems = 'flex-start';
            contentEl.style.alignSelf = 'center';
            contentEl.style.gap = '2px';
          }
        }
        var appendTo = isSideBySide ? contentEl : article;
        var hasFullBleedImg = isSinglePost && phImagePos === 'fullBleed' && fiShow && !!imgUrl;
        var fullBleedLayoutStacked = postHeaderCfg && postHeaderCfg.fullBleedLayout === 'stacked';
        var singlePostFullBleedStacked = hasFullBleedImg && fullBleedLayoutStacked;
        var singlePostFullBleedHero = hasFullBleedImg && !fullBleedLayoutStacked;
        var singlePostBelowInfo = isSinglePost && phImagePos === 'belowInfo' && fiShow && !!imgUrl;
        var fullBleedHeaderBlock = null;
        var stackedFullBleedWrap = null;
        var stackedHeaderBlock = null;
        if (singlePostFullBleedHero) {
          var publisherFullBleedHero = isSinglePost && self._isPublisherPostLayout(cfg);
          fullBleedHeaderBlock = document.createElement('div');
          fullBleedHeaderBlock.className = 'blog-overlay-post-header-fullbleed';
          fullBleedHeaderBlock.style.background = self._featuredImageAreaBackground(imgUrl, placeholderMap, post, items);
          if (publisherFullBleedHero) {
            fullBleedHeaderBlock.classList.add('blog-overlay-post-header-fullbleed--publisher');
            fullBleedHeaderBlock.style.height = '500px';
            fullBleedHeaderBlock.style.boxSizing = 'border-box';
          } else {
            fullBleedHeaderBlock.style.minHeight = 'min(42vw, 420px)';
          }
          /* Full-bleed post hero: viewport width (exception to site side margins). */
          self._applyViewportFullBleed(fullBleedHeaderBlock);
          fullBleedHeaderBlock.style.position = 'relative';
          fullBleedHeaderBlock.style.marginBottom = (fiSpacing === 'tight' ? '12px' : fiSpacing === 'spacious' ? '28px' : '20px');
          fullBleedHeaderBlock.style.display = 'flex';
          fullBleedHeaderBlock.style.alignItems = phVerticalAlignItems;
          if (!publisherFullBleedHero) {
            fullBleedHeaderBlock.style.padding = '48px 24px 32px';
          }
          fullBleedHeaderBlock.style.position = 'relative';
          var overlay = document.createElement('div');
          overlay.style.position = 'absolute';
          overlay.style.top = '0';
          overlay.style.left = '0';
          overlay.style.right = '0';
          overlay.style.bottom = '0';
          overlay.style.background = 'linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.6) 100%)';
          overlay.setAttribute('aria-hidden', 'true');
          fullBleedHeaderBlock.appendChild(overlay);
          var fullBleedHeaderContent = document.createElement('div');
          fullBleedHeaderContent.style.position = 'relative';
          fullBleedHeaderContent.style.zIndex = '1';
          fullBleedHeaderContent.style.width = '100%';
          fullBleedHeaderContent.style.color = '#fff';
          fullBleedHeaderContent.style.textShadow = '0 1px 2px rgba(0,0,0,0.5)';
          fullBleedHeaderBlock.appendChild(fullBleedHeaderContent);
          fullBleedHeaderBlock._contentEl = fullBleedHeaderContent;
          if (isSinglePost) {
            if (!headerZoneRef.current) {
              headerZoneRef.current = document.createElement('div');
              headerZoneRef.current.className = 'blog-overlay-header-zone';
              headerZoneRef.current.style.position = 'relative';
              headerZoneRef.current.style.zIndex = '100';
            }
            headerZoneRef.current.appendChild(fullBleedHeaderBlock);
          } else {
            article.insertBefore(fullBleedHeaderBlock, article.firstChild);
          }
        }
        if (singlePostFullBleedStacked) {
          var featureStackedHero = isSinglePost && self._isFeaturePostLayout(cfg);
          stackedFullBleedWrap = document.createElement('div');
          stackedFullBleedWrap.className = 'blog-overlay-featured-image blog-overlay-featured-image-stacked-fullbleed';
          if (featureStackedHero) {
            stackedFullBleedWrap.classList.add('blog-overlay-featured-image-stacked-fullbleed--feature');
          }
          stackedFullBleedWrap.style.marginBottom = (fiSpacing === 'tight' ? '12px' : fiSpacing === 'spacious' ? '28px' : '20px');
          self._applyViewportFullBleed(stackedFullBleedWrap);
          var stackFiInner = document.createElement('div');
          stackFiInner.style.overflow = 'hidden';
          stackFiInner.style.position = 'relative';
          self._applyFeaturedImageRadius(stackFiInner);
          if (fiShadow) stackFiInner.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
          if (fiFixedAspectCrop || featureStackedHero) {
            stackFiInner.style.aspectRatio = featureStackedHero ? '16 / 9' : fiRatio.replace(':', ' / ');
            stackFiInner.style.width = '100%';
            if (featureStackedHero) stackFiInner.style.maxHeight = '600px';
          }
          if (imgUrl) {
            var stackImg = document.createElement('img');
            stackImg.src = imgUrl;
            stackImg.alt = post.title || '';
            stackImg.style.width = '100%';
            stackImg.style.height = '100%';
            stackImg.style.display = 'block';
            stackImg.style.objectFit = (fiFixedAspectCrop || featureStackedHero) ? 'cover' : 'contain';
            stackImg.style.objectPosition = 'center';
            stackImg.onerror = function() { if (stackedFullBleedWrap) stackedFullBleedWrap.style.display = 'none'; };
            stackFiInner.appendChild(stackImg);
          } else {
            var stackPh = document.createElement('div');
            stackPh.setAttribute('role', 'img');
            stackPh.setAttribute('aria-label', post.title || 'Post');
            stackPh.style.width = '100%';
            stackPh.style.height = '100%';
            stackPh.style.minHeight = featureStackedHero ? '0' : '120px';
            stackPh.style.background = self._featuredImageAreaBackground(null, placeholderMap, post, items);
            if (featureStackedHero) {
              stackPh.style.backgroundSize = 'cover';
              stackPh.style.backgroundPosition = 'center';
            }
            stackFiInner.appendChild(stackPh);
          }
          stackedFullBleedWrap.appendChild(stackFiInner);
          if (fiCaption && imgCaption) {
            var stackCap = document.createElement('div');
            stackCap.className = 'blog-overlay-featured-caption';
            stackCap.textContent = imgCaption;
            stackCap.style.fontSize = '0.85rem';
            stackCap.style.color = '#666';
            stackCap.style.marginTop = '6px';
            stackCap.style.fontStyle = 'italic';
            stackedFullBleedWrap.appendChild(stackCap);
          }
        }
        if (fiShow && (imgUrl || showFiPlaceholder) && !singlePostFullBleedHero && !singlePostFullBleedStacked) {
          var fiWrap = document.createElement('div');
          fiWrap.className = 'blog-overlay-featured-image';
          if (fiLayout === 'fullBleed') {
            fiWrap.style.marginBottom = (fiSpacing === 'tight' ? '12px' : fiSpacing === 'spacious' ? '28px' : '20px');
            if (!isSinglePost && (collectionLayout === 'grid' || collectionLayout === 'digest')) {
              if (digestMobileFullBleed && isFeaturedInLayout) {
                fiWrap.setAttribute('data-digest-viewport-bleed', '1');
                fiWrap.style.marginTop = '0';
                if (collectionMobileGridNarrow) {
                  var digestMainPad = 12;
                  fiWrap.style.width = 'calc(100% + ' + (digestMainPad * 2) + 'px)';
                  fiWrap.style.maxWidth = 'none';
                  fiWrap.style.marginLeft = (-digestMainPad) + 'px';
                  fiWrap.style.marginRight = (-digestMainPad) + 'px';
                  fiWrap.style.boxSizing = 'border-box';
                }
              } else {
                fiWrap.style.marginLeft = '0';
                fiWrap.style.marginRight = '0';
                fiWrap.style.width = '100%';
                fiWrap.style.maxWidth = '100%';
                fiWrap.style.boxSizing = 'border-box';
                fiWrap.removeAttribute('data-digest-viewport-bleed');
              }
            } else {
              self._applyViewportFullBleed(fiWrap);
            }
          } else if (isSideBySide) {
            if (storyPostLayout) {
              fiWrap.classList.add('blog-overlay-story-featured-image');
              fiWrap.style.flex = '0 0 58%';
            } else if (reporterPostHeaderLayout) {
              fiWrap.style.flex = '0 0 60%';
            } else if (collectionLayout === 'listRows' && listRowsMobileCompact) {
              fiWrap.style.flex = '0 0 80px';
              fiWrap.style.width = '80px';
              fiWrap.style.maxWidth = '80px';
            } else {
              fiWrap.style.flex = '0 0 ' + fiImageWidth + '%';
            }
            fiWrap.style.minWidth = '0';
            fiWrap.style.alignSelf = storyPostLayout || (isSinglePost && (phImagePos === 'leftOfInfo' || phImagePos === 'rightOfInfo'))
              ? 'stretch'
              : ((!isSinglePost && collectionLayout === 'listRows') ? 'center' : 'flex-start');
          }
          var fiInner = document.createElement('div');
          fiInner.style.overflow = 'hidden';
          fiInner.style.position = 'relative';
          var digestFeaturedViewportBleed = collectionLayout === 'digest' && isFeaturedInLayout && digestMobileFullBleed;
          self._applyFeaturedImageRadius(fiInner);
          if (fiShadow && !digestFeaturedViewportBleed) fiInner.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
          if (reporterPostHeaderImage) {
            fiInner.style.aspectRatio = '3 / 2';
            fiInner.style.width = '100%';
          } else if (fiFixedAspectCrop || digestFeaturedViewportBleed) {
            fiInner.style.aspectRatio = (collectionLayout === 'listRows' && listRowsMobileCompact)
              ? '4 / 3'
              : fiRatio.replace(':', ' / ');
            fiInner.style.width = '100%';
          }
          if (collectionLayout === 'listRows' && listRowsMobileCompact && isSideBySide) {
            fiInner.style.maxHeight = '60px';
          }
          if (imgUrl) {
            var img = document.createElement('img');
            img.src = imgUrl;
            img.alt = post.title || '';
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.display = 'block';
            img.style.objectFit = (reporterPostHeaderImage || fiFixedAspectCrop || digestFeaturedViewportBleed) ? 'cover' : 'contain';
            img.style.objectPosition = 'center';
            img.onerror = function() { fiWrap.style.display = 'none'; };
            fiInner.appendChild(img);
          } else {
            fiInner.style.background = self._featuredImageAreaBackground(null, placeholderMap, post, items);
            if (!fiFixedAspectCrop && !digestFeaturedViewportBleed) fiInner.style.minHeight = '200px';
          }
          if (!isSinglePost && gatedCard && (collectionLayout === 'grid' || collectionLayout === 'listRows' || collectionLayout === 'digest')) {
            self._appendPaywallCardImageLock(fiInner, {
              thumbnail: collectionLayout === 'listRows' && listRowsMobileCompact
            });
          }
          fiWrap.appendChild(fiInner);
          if (fiCaption && imgCaption) {
            var capEl = document.createElement('div');
            capEl.className = 'blog-overlay-featured-caption';
            capEl.textContent = imgCaption;
            capEl.style.fontSize = '0.85rem';
            capEl.style.color = '#666';
            capEl.style.marginTop = '6px';
            capEl.style.fontStyle = 'italic';
            if (digestFeaturedViewportBleed) {
              capEl.style.paddingLeft = '0';
              capEl.style.paddingRight = '0';
              capEl.style.textAlign = 'left';
              capEl.style.boxSizing = 'border-box';
            }
            fiWrap.appendChild(capEl);
          }
          if (isSideBySide && rowEl) {
            rowEl.appendChild(contentEl);
            rowEl.insertBefore(fiWrap, contentEl);
          } else if (!singlePostBelowInfo) {
            article.insertBefore(fiWrap, article.firstChild);
          }
        }

        if (digestFeaturedIntro) {
          article.appendChild(digestFeaturedIntro);
        }

        var alignStyle = isSinglePost ? (phAlign === 'center' ? 'center' : phAlign === 'right' ? 'flex-end' : 'flex-start') : null;
        var textAlignStyle = isSinglePost ? (phAlign === 'center' ? 'center' : phAlign === 'right' ? 'right' : 'left') : null;
        var postInfoWrap = null;
        if (isSinglePost) {
          postInfoWrap = document.createElement('div');
          postInfoWrap.style.display = 'flex';
          postInfoWrap.style.flexDirection = 'column';
          postInfoWrap.style.alignItems = alignStyle || 'flex-start';
          postInfoWrap.style.textAlign = textAlignStyle || 'left';
          postInfoWrap.style.gap = '8px';
          postInfoWrap.style.width = '100%';
          if (self._isFeaturePostLayout(cfg)) {
            postInfoWrap.classList.add('blog-overlay-feature-header-stack');
            postInfoWrap.style.gap = '0';
          }
          if (storyPostLayout) {
            postInfoWrap.classList.add('blog-overlay-story-info-panel');
            postInfoWrap.style.gap = '0';
          }
          if (isSinglePost && (phImagePos === 'leftOfInfo' || phImagePos === 'rightOfInfo')) {
            postInfoWrap.style.flex = '1 1 auto';
            postInfoWrap.style.minHeight = '0';
            postInfoWrap.style.justifyContent = phVertical === 'center' ? 'center' : phVertical === 'bottom' ? 'flex-end' : 'flex-start';
          }
          if (reporterPostHeaderLayout) {
            postInfoWrap.classList.add('blog-overlay-reporter-header-stack');
          }
        }
        var headlineMount = postInfoWrap || digestFeaturedIntro || appendTo;
        var postBreadcrumbNav = null;
        if (isSinglePost && phShowBreadcrumbs) {
          postBreadcrumbNav = document.createElement('nav');
          postBreadcrumbNav.setAttribute('aria-label', 'Breadcrumb');
          var bcNav = postBreadcrumbNav;
          bcNav.className = 'blog-overlay-post-breadcrumbs' + (
            storyPostLayout ? ' blog-overlay-post-breadcrumbs--on-dark-solid'
              : singlePostFullBleedHero ? ' blog-overlay-post-breadcrumbs--on-dark' : ''
          );
          bcNav.style.setProperty('display', 'flex', 'important');
          bcNav.style.setProperty('flex-direction', 'row', 'important');
          bcNav.style.flexWrap = 'wrap';
          bcNav.style.alignItems = 'center';
          bcNav.style.gap = '0';
          bcNav.style.justifyContent = alignStyle === 'flex-end' ? 'flex-end' : alignStyle === 'center' ? 'center' : 'flex-start';
          var meta = self._blogMeta || {};
          var siteTitle = meta.siteTitle || '';
          var blogName = meta.blogName || 'Blog';
          var previewBreadcrumbNav = Boolean(self._bbPreview || self._previewMode);
          var blogCollectionHref = self._blogCollectionNavHref({});
          var sep = function() { var s = document.createElement('span'); s.textContent = ' › '; s.style.margin = '0 4px'; return s; };
          var makeLink = function(txt, href, onClick, el) {
            var a = document.createElement('a');
            a.textContent = txt;
            a.href = href || '#';
            a.style.textDecoration = 'none';
            a.style.setProperty('cursor', 'pointer', 'important');
            if (el) a.setAttribute('data-analytics-element', el);
            if (onClick) {
              a.onclick = function(e) {
                e.preventDefault();
                onClick();
              };
            }
            return a;
          };
          var goToBlogIndex = function() {
            self._categoryFilter = []; self._tagFilter = []; self._currentPage = 1; self._searchQuery = '';
            try { window.history.replaceState(null, '', window.location.pathname + (window.location.search || '')); } catch (err) {}
            window.location.hash = '';
            self._renderContent(self.items);
          };
          var goToBlogCategory = function(cat) {
            self._categoryFilter = [cat];
            self._tagFilter = [];
            self._currentPage = 1;
            window.location.hash = '';
            self._renderContent(self.items);
          };
          if (siteTitle) {
            bcNav.appendChild(makeLink(siteTitle, blogCollectionHref, previewBreadcrumbNav ? goToBlogIndex : null, 'breadcrumb'));
            bcNav.appendChild(sep());
          }
          bcNav.appendChild(makeLink(blogName, blogCollectionHref, previewBreadcrumbNav ? goToBlogIndex : null, 'breadcrumb'));
          var postCats = self._getPostCategories(post);
          if (postCats.length > 0) {
            bcNav.appendChild(sep());
            for (var ci = 0; ci < postCats.length; ci++) {
              if (ci > 0) bcNav.appendChild(self._breadcrumbCommaSeparator());
              var catNm = postCats[ci];
              var catHref = self._blogCollectionNavHref({ category: catNm });
              bcNav.appendChild(makeLink(catNm, catHref, previewBreadcrumbNav ? (function(c) { return function() { goToBlogCategory(c); }; })(catNm) : null, 'categoryTag'));
            }
          }
          bcNav.appendChild(sep());
          var pt = post.title || 'Untitled';
          var pu = self._getPostUrl(post);
          if (pu) bcNav.appendChild(makeLink(pt, pu, null, 'breadcrumb'));
          else { var sp = document.createElement('span'); sp.textContent = pt; bcNav.appendChild(sp); }
        }

        var publisherPostLayout = isSinglePost && self._isPublisherPostLayout(cfg);
        var featurePostLayoutForCat = isSinglePost && self._isFeaturePostLayout(cfg);
        /** Publisher ribbon is template-locked; other templates respect postHeader.showCategories. */
        var postHeaderCategoryLayout = isSinglePost && (
          publisherPostLayout ||
          (phShowCategories && (featurePostLayoutForCat || writerPostLayout || storyPostLayout))
        );
        if (postHeaderCategoryLayout) {
          var postHeaderCatModifier = publisherPostLayout ? 'blog-overlay-post-category--ribbon'
            : writerPostLayout ? 'blog-overlay-post-category--writer'
            : storyPostLayout ? 'blog-overlay-post-category--story'
            : 'blog-overlay-post-category--feature';
          var postHeaderCatsLine = self._createCollectionPostCategoriesLine(post, siteAccentForPostCats, false, {
            onDark: singlePostFullBleedHero,
            onDarkSolid: storyPostLayout
          });
          if (postHeaderCatsLine) {
            postHeaderCatsLine.classList.add('blog-overlay-post-header-categories');
            if (storyPostLayout) {
              postHeaderCatsLine.style.marginBottom = '18px';
            } else {
              postHeaderCatsLine.style.marginBottom = '12px';
            }
            postHeaderCatsLine.style.justifyContent = phAlign === 'center' ? 'center' : phAlign === 'right' ? 'flex-end' : 'flex-start';
            postHeaderCatsLine.style.width = '100%';
            var postHeaderCatLabels = postHeaderCatsLine.querySelectorAll('.bb-category-label');
            for (var pli = 0; pli < postHeaderCatLabels.length; pli++) {
              postHeaderCatLabels[pli].classList.add(postHeaderCatModifier);
            }
            headlineMount.appendChild(postHeaderCatsLine);
          }
        }

        var postCategoriesLine = (!isSinglePost && (collectionLayout === 'listRows' || collectionLayout === 'grid' || collectionLayout === 'digest'))
          ? self._createCollectionPostCategoriesLine(post, siteAccentForPostCats, categoryFilterUiEnabled, {
            compact: collectionLayout === 'listRows'
          })
          : null;

        var listRowsDesktop = !isSinglePost && collectionLayout === 'listRows' && !listRowsMobileCompact;
        var titleEl = document.createElement(isSinglePost ? 'h1' : 'h2');
        titleEl.className = 'blog-overlay-title';
        titleEl.style.margin = storyPostLayout ? '0 0 24px 0' : '0 0 8px 0';
        if (isSinglePost) {
          titleEl.classList.add('blog-overlay-post-title');
          self._applyTitleStyle(titleEl, {
            size: 'post',
            onImage: singlePostFullBleedHero,
            onDarkSolid: storyPostLayout
          });
        } else if (!isSinglePost && collectionLayout === 'listRows' && listRowsMobileCompact) {
          titleEl.style.fontSize = '1.05rem';
          titleEl.style.lineHeight = '1.2';
          titleEl.style.margin = '0 0 2px 0';
          titleEl.classList.add('bb-title--on-bg');
        } else if (listRowsDesktop || (!isSinglePost && collectionLayout === 'listRows')) {
          self._applyTitleStyle(titleEl, { size: 'compact', onImage: false, margin: '0 0 2px 0' });
        } else if (!isSinglePost && collectionLayout === 'grid' && gridMobileNarrow && !isFeaturedInLayout) {
          titleEl.style.fontSize = 'clamp(1.5rem, 4vw, 2.25rem)';
          titleEl.style.lineHeight = '1.08';
          titleEl.style.margin = '0 0 6px 0';
          titleEl.classList.add('bb-title--on-bg');
        } else if (!isSinglePost && collectionLayout === 'grid') {
          self._applyTitleStyle(titleEl, { size: isFeaturedInLayout ? 'lg' : 'masthead', onImage: false });
        } else if (!isSinglePost && collectionLayout === 'digest') {
          self._applyTitleStyle(titleEl, { size: isFeaturedInLayout ? 'lg' : 'masthead', onImage: false });
        }
        if (!isSinglePost && collectionLayout === 'digest' && isFeaturedInLayout && digestMobileNarrow) {
          titleEl.style.textAlign = 'left';
          titleEl.style.width = '100%';
        }
        if (singlePostFullBleedHero) titleEl.style.color = '#fff';
        if (singlePostFullBleedHero) titleEl.style.textShadow = '0 1px 2px rgba(0,0,0,0.5)';
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
            if (self._bbPreview && hasAnyFilter && postIndex >= 0) {
              titleLink.onclick = (function(idx) {
                return function(e) {
                  e.preventDefault();
                  self._categoryFilter = [];
                  self._tagFilter = [];
                  self._searchQuery = '';
                  self._currentPage = 1;
                  var targetHash = '#post-' + idx;
                  if (window.location.hash !== targetHash) {
                    window.location.hash = targetHash;
                  } else {
                    self._renderContent(self.items);
                  }
                };
              })(postIndex);
            }
          titleEl.appendChild(titleLink);
        } else {
          titleEl.textContent = post.title || 'Untitled';
        }
        /* Keep categories in the text column on mobile — separate cat row adds height and vertical spread. */
        var listRowsMobileCatsAboveRow = false;
        var mastheadPaywallGatedCard = gatedCard && collectionLayout === 'grid';
        var digestPaywallGatedCard = gatedCard && collectionLayout === 'digest';
        var newsroomPaywallGatedCard = gatedCard && collectionLayout === 'listRows';
        var newsroomPaywallMobile = newsroomPaywallGatedCard && listRowsMobileCompact;
        var appendCategoriesToHeadline = postCategoriesLine && !listRowsMobileCatsAboveRow && !mastheadPaywallGatedCard && !digestPaywallGatedCard;
        var useFeaturedHeadlineStack = isFeaturedInLayout && collectionLayout !== 'listRows' && !mastheadPaywallGatedCard && !digestPaywallGatedCard && !newsroomPaywallMobile;
        if (appendCategoriesToHeadline && !isSinglePost && collectionLayout === 'grid' && gridMobileNarrow) {
          postCategoriesLine.style.fontSize = '0.85rem';
          postCategoriesLine.style.marginBottom = '3px';
          postCategoriesLine.style.lineHeight = '1.25';
        }
        if (appendCategoriesToHeadline && !useFeaturedHeadlineStack) {
          headlineMount.appendChild(postCategoriesLine);
        }
        var titleBlock = null;
        if (useFeaturedHeadlineStack) {
          var featuredHeadlineStack = document.createElement('div');
          featuredHeadlineStack.className = 'blog-overlay-featured-headline-stack';
          featuredHeadlineStack.style.display = 'flex';
          featuredHeadlineStack.style.flexDirection = 'column';
          featuredHeadlineStack.style.alignItems = 'flex-start';
          featuredHeadlineStack.style.gap = (collectionLayout === 'listRows' && listRowsMobileCompact) ? '4px' : (collectionLayout === 'listRows' ? '2px' : '6px');
          featuredHeadlineStack.style.width = '100%';
          var featuredBadge = self._createFeaturedBadge();
          featuredHeadlineStack.appendChild(featuredBadge);
          if (appendCategoriesToHeadline) {
            featuredHeadlineStack.appendChild(postCategoriesLine);
          }
          featuredHeadlineStack.appendChild(titleEl);
          titleBlock = featuredHeadlineStack;
        } else {
          titleBlock = titleEl;
        }
        if (newsroomPaywallMobile) {
          headlineMount.appendChild(titleBlock);
          var nwMoMobile = self._createMembersOnlyTeaserLabel(false);
          nwMoMobile.style.marginTop = '4px';
          headlineMount.appendChild(nwMoMobile);
        } else if (newsroomPaywallGatedCard) {
          nwPaywallColSide = document.createElement('div');
          nwPaywallColSide.className = 'bb-paywall-collection-newsroom-cta';
          nwPaywallColSide.style.display = 'flex';
          nwPaywallColSide.style.flexDirection = 'column';
          nwPaywallColSide.style.alignItems = 'center';
          nwPaywallColSide.style.justifyContent = 'center';
          nwPaywallColSide.style.alignSelf = 'center';
          nwPaywallColSide.style.gap = '8px';
          nwPaywallColSide.style.flex = '0 0 auto';
          nwPaywallColSide.style.maxWidth = '40%';
          nwPaywallColSide.style.marginTop = '0';
          nwPaywallColSide.style.marginBottom = '0';
          var nwMoLbl = self._createMembersOnlyTeaserLabel(false);
          nwMoLbl.style.width = 'auto';
          nwMoLbl.style.maxWidth = '100%';
          nwMoLbl.style.justifyContent = 'center';
          nwPaywallColSide.appendChild(nwMoLbl);
          nwPaywallColSide.appendChild(self._createSubscribeToReadPillLink());
          headlineMount.appendChild(titleBlock);
          if (rowEl) rowEl.appendChild(nwPaywallColSide);
        } else {
          headlineMount.appendChild(titleBlock);
        }
        if (digestPaywallGatedCard) {
          var moDigestLbl = self._createMembersOnlyTeaserLabel(false);
          moDigestLbl.style.marginTop = '8px';
          headlineMount.appendChild(moDigestLbl);
        }

        var singlePostDeckText = null;
        if (isSinglePost && postInfoWrap && !phShowByline && !publisherPostLayout) {
          var deckSourceText = self._plainTextFromBlogHtml(post.excerpt || post.body || '');
          var deckSourceSentences = deckSourceText ? deckSourceText.match(/[^.!?]*[.!?]/g) : null;
          singlePostDeckText = deckSourceSentences && deckSourceSentences.length > 0 ? deckSourceSentences[0].trim() : '';
          if (!singlePostDeckText) singlePostDeckText = self._truncateText(post.excerpt || post.body || '', 200);
          if (singlePostDeckText) singlePostDeckText = self._stripLeadingSquarespaceSectionMarkers(singlePostDeckText);
          if (!singlePostDeckText) singlePostDeckText = null;
        }
        if (featurePostLayoutForCat && singlePostDeckText && postInfoWrap) {
          var featureDeckEl = document.createElement('p');
          featureDeckEl.className = 'blog-overlay-post-deck blog-overlay-post-deck--feature';
          featureDeckEl.textContent = singlePostDeckText;
          postInfoWrap.appendChild(featureDeckEl);
        }

        var pendingWriterMetaRow = null;
        var pendingWriterShareRow = null;

        if (phShowByline && postInfoWrap && !publisherPostLayout) {
          var bylineDeckText = self._plainTextFromBlogHtml(post.excerpt || post.body || '');
          var bylineSentences = bylineDeckText ? bylineDeckText.match(/[^.!?]*[.!?]/g) : null;
          var bylineText = bylineSentences && bylineSentences.length > 0 ? bylineSentences[0].trim() : '';
          if (!bylineText) bylineText = self._truncateText(post.excerpt || post.body || '', 200);
          if (bylineText) bylineText = self._stripLeadingSquarespaceSectionMarkers(bylineText);
          if (bylineText) {
            var bylineEl = document.createElement('p');
            bylineEl.className = 'blog-overlay-post-deck' + (reporterPostHeaderLayout ? ' blog-overlay-post-deck--reporter' : storyPostLayout ? ' blog-overlay-post-deck--on-dark-solid' : '');
            bylineEl.textContent = bylineText;
            postInfoWrap.appendChild(bylineEl);
          }
        }

        var metaParts = [];
        if (isSinglePost) {
          if (showAuthor) {
            var authorStrSingle = self._getAuthorsForPost(post, cfg);
            if (authorStrSingle) metaParts.push(authorStrSingle);
          }
          if (showDate) {
            var dateStrSingle = self._getDate(post);
            if (dateStrSingle) metaParts.push(dateStrSingle);
          }
          if (showReadingTime) {
            var minsSingle = self._getReadingTimeMinutes(post.body);
            metaParts.push(minsSingle === 1 ? '1 min read' : minsSingle + ' min read');
          }
        } else if (collectionLayout === 'listRows') {
          if (showAuthor) {
            var listRowsAuthorStr = self._getAuthorsForPost(post, cfg);
            if (listRowsAuthorStr) metaParts.push(listRowsAuthorStr);
          }
          if (showDate) {
            var listRowsDateStr = self._getDate(post);
            if (listRowsDateStr) metaParts.push(listRowsDateStr);
          }
          if (showReadingTime) {
            var listRowsMins = self._getReadingTimeMinutes(post.body);
            metaParts.push(listRowsMins === 1 ? '1 min read' : listRowsMins + ' min read');
          }
        } else {
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
        }
        if (metaParts.length > 0 && !mastheadPaywallGatedCard && !digestPaywallGatedCard && !newsroomPaywallMobile) {
          var metaRow = document.createElement('div');
          metaRow.className = 'blog-overlay-meta-row';
          metaRow.style.marginBottom = (!isSinglePost && collectionLayout === 'listRows' && listRowsMobileCompact) ? '0' : (listRowsDesktop ? '2px' : '8px');
          if (!isSinglePost && collectionLayout === 'listRows' && listRowsMobileCompact) {
            metaRow.style.marginTop = '0';
          }
          var meta = document.createElement('div');
          meta.className = 'blog-overlay-meta';
          meta.textContent = metaParts.join(' · ');
          if (singlePostFullBleedHero) {
            self._applyMetaStyle(meta, { onImage: true, variant: isSinglePost ? 'post' : null });
            meta.style.textShadow = '0 1px 2px rgba(0,0,0,0.5)';
            metaRow.style.color = 'var(--bb-meta-on-image,rgba(255,255,255,0.78))';
          } else if (storyPostLayout) {
            self._applyMetaStyle(meta, { onDarkSolid: true, variant: isSinglePost ? 'post' : null });
          } else {
            self._applyMetaStyle(meta, { onImage: false, variant: isSinglePost ? 'post' : null });
          }
          metaRow.appendChild(meta);
          if (!isSinglePost && collectionLayout === 'listRows' && listRowsMobileCompact) {
            meta.style.fontSize = '0.8rem';
            meta.style.lineHeight = '1.2';
            meta.style.margin = '0';
          }
          if (!isSinglePost && collectionLayout === 'grid' && gridMobileNarrow) {
            meta.style.fontSize = '1rem';
            meta.style.lineHeight = '1.25';
          }
          if (!isSinglePost && collectionLayout === 'digest' && isFeaturedInLayout && digestMobileNarrow) {
            metaRow.style.textAlign = 'left';
            metaRow.style.width = '100%';
            meta.style.textAlign = 'left';
          }
          if (postHeaderAccentDividerLayout) {
            pendingWriterMetaRow = metaRow;
            metaRow.style.marginBottom = '0';
          } else if (isSinglePost && reporterPostHeaderLayout && phShowDecorativeAccentLine) {
            headlineMount.appendChild(self._createReporterPostHeaderDivider());
            headlineMount.appendChild(metaRow);
          } else {
            headlineMount.appendChild(metaRow);
          }
        }
        if (!isSinglePost && collectionLayout === 'listRows' && listRowsMobileCompact && postCategoriesLine) {
          postCategoriesLine.style.marginBottom = '0';
        }
        var smCfg = cfg.socialMediaLinks && typeof cfg.socialMediaLinks === 'object' ? cfg.socialMediaLinks : null;
        /** Social sharing is post-only; collection pages never render share links. */
        var showShare = isSinglePost && smCfg && smCfg.show && Array.isArray(smCfg.platforms) && smCfg.platforms.length > 0;
        var shareUrl = self._getPostUrl(post);
        if (!shareUrl && typeof window !== 'undefined') {
          shareUrl = window.location.origin + window.location.pathname + (window.location.search || '') + '#post-' + postIndex;
        }
        var shareImageUrl = post.assetUrl || post.thumbnailUrl || (post.assets && post.assets[0] && post.assets[0].assetUrl) || null;
        var shareLinks = showShare ? self._createShareLinks(shareUrl, post.title || 'Untitled', smCfg.platforms, cfg.baseUrl, shareImageUrl, singlePostFullBleedHero || storyPostLayout) : null;
        if (shareLinks && !mastheadPaywallGatedCard && !digestPaywallGatedCard && !newsroomPaywallMobile) {
          var shareRow = document.createElement('div');
          shareRow.className = 'blog-overlay-share-row';
          if (storyPostLayout) {
            shareRow.classList.add('blog-overlay-share-row--story');
          } else if (featurePostLayoutForCat) {
            shareRow.classList.add('blog-overlay-share-row--feature');
          }
          shareRow.style.justifyContent = alignStyle === 'flex-end' ? 'flex-end' : alignStyle === 'center' ? 'center' : 'flex-start';
          shareRow.appendChild(shareLinks);
          if (postHeaderAccentDividerLayout) {
            pendingWriterShareRow = shareRow;
          } else {
            headlineMount.appendChild(shareRow);
          }
        }

        if (postHeaderAccentDividerLayout && postInfoWrap) {
          postInfoWrap.appendChild(storyPostLayout ? self._createStoryPostHeaderDivider() : self._createWriterPostHeaderDivider(phAlign));
          if (pendingWriterMetaRow) postInfoWrap.appendChild(pendingWriterMetaRow);
          if (pendingWriterShareRow) postInfoWrap.appendChild(pendingWriterShareRow);
        }

        if (mastheadPaywallGatedCard) {
          var moMastheadLbl = self._createMembersOnlyTeaserLabel(false);
          moMastheadLbl.style.marginTop = '8px';
          if (gridMobileNarrow) {
            var moMastheadText = moMastheadLbl.querySelector('.bb-members-only-text');
            if (moMastheadText) moMastheadText.style.fontSize = '0.36rem';
            var moMastheadLock = moMastheadLbl.querySelector('.bb-lock-icon');
            if (moMastheadLock) {
              moMastheadLock.setAttribute('width', '7');
              moMastheadLock.setAttribute('height', '7');
            }
          }
          headlineMount.appendChild(moMastheadLbl);
        }

        if (isSinglePost && postInfoWrap) {
          if (singlePostDeckText && !featurePostLayoutForCat && !singlePostFullBleedStacked && !phShowByline && !publisherPostLayout) {
            var deckEl = document.createElement('p');
            var deckModifier = singlePostFullBleedHero ? ' blog-overlay-post-deck--on-dark' : '';
            if (reporterPostHeaderLayout) deckModifier += ' blog-overlay-post-deck--reporter';
            deckEl.className = 'blog-overlay-post-deck' + deckModifier;
            deckEl.textContent = singlePostDeckText;
            postInfoWrap.appendChild(deckEl);
          }
          var useDedicatedSinglePostHeaderZone = isSinglePost && !singlePostFullBleedHero && !singlePostFullBleedStacked;
          var postInfoTarget = useDedicatedSinglePostHeaderZone
            ? (isSideBySide ? appendTo : ensureSinglePostHeaderInnerEl())
            : (singlePostFullBleedHero && fullBleedHeaderBlock && fullBleedHeaderBlock._contentEl ? fullBleedHeaderBlock._contentEl : appendTo);
          if (singlePostFullBleedStacked) {
            if (!headerZoneRef.current) {
              headerZoneRef.current = document.createElement('div');
              headerZoneRef.current.className = 'blog-overlay-header-zone';
              headerZoneRef.current.style.position = 'relative';
              headerZoneRef.current.style.zIndex = '100';
            }
            stackedHeaderBlock = document.createElement('div');
            stackedHeaderBlock.className = 'blog-overlay-post-header-stacked';
            stackedHeaderBlock.style.width = '100%';
            stackedHeaderBlock.style.boxSizing = 'border-box';
            stackedHeaderBlock.style.paddingTop = '8px';
            stackedHeaderBlock.style.marginBottom = '8px';
            var stackedInfoWrap = document.createElement('div');
            stackedInfoWrap.style.boxSizing = 'border-box';
            stackedInfoWrap.style.width = '100%';
            stackedInfoWrap.appendChild(postInfoWrap);
            stackedHeaderBlock.appendChild(stackedInfoWrap);
            if (stackedFullBleedWrap) stackedHeaderBlock.appendChild(stackedFullBleedWrap);
            headerZoneRef.current.appendChild(stackedHeaderBlock);
          } else {
            postInfoTarget.appendChild(postInfoWrap);
          }
        }

        if (singlePostBelowInfo) {
          var belowFiWrap = document.createElement('div');
          belowFiWrap.className = 'blog-overlay-featured-image';
          belowFiWrap.style.marginBottom = (fiSpacing === 'tight' ? '12px' : fiSpacing === 'spacious' ? '28px' : '20px');
          belowFiWrap.style.marginLeft = '0';
          belowFiWrap.style.marginRight = '0';
          belowFiWrap.style.width = '100%';
          var belowFiInner = document.createElement('div');
          belowFiInner.style.overflow = 'hidden';
          belowFiInner.style.position = 'relative';
          self._applyFeaturedImageRadius(belowFiInner);
          if (fiShadow) belowFiInner.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
          if (fiAspect === 'cropped') {
            belowFiInner.style.aspectRatio = fiRatio.replace(':', ' / ');
            belowFiInner.style.width = '100%';
          }
          if (imgUrl) {
            var belowImg = document.createElement('img');
            belowImg.src = imgUrl;
            belowImg.alt = post.title || '';
            belowImg.style.width = '100%';
            belowImg.style.height = '100%';
            belowImg.style.display = 'block';
            belowImg.style.objectFit = fiAspect === 'cropped' ? 'cover' : 'contain';
            belowImg.style.objectPosition = 'center';
            belowImg.onerror = function() { belowFiWrap.style.display = 'none'; };
            belowFiInner.appendChild(belowImg);
          } else {
            belowFiInner.style.background = self._featuredImageAreaBackground(null, placeholderMap, post, items);
            if (fiAspect !== 'cropped') belowFiInner.style.minHeight = '200px';
          }
          belowFiWrap.appendChild(belowFiInner);
          if (fiCaption && imgCaption) {
            var belowCap = document.createElement('div');
            belowCap.className = 'blog-overlay-featured-caption';
            belowCap.textContent = imgCaption;
            belowCap.style.fontSize = '0.85rem';
            belowCap.style.color = '#666';
            belowCap.style.marginTop = '6px';
            belowCap.style.fontStyle = 'italic';
            belowFiWrap.appendChild(belowCap);
          }
          if (isSinglePost && !singlePostFullBleedHero && !singlePostFullBleedStacked) {
            ensureSinglePostHeaderInnerEl().appendChild(belowFiWrap);
          } else {
            article.appendChild(belowFiWrap);
          }
        }

        if (isSinglePost && postBreadcrumbNav) {
          if (!storyPostLayout && !featurePostLayoutForCat) postBreadcrumbNav.style.marginBottom = '8px';
          postBreadcrumbNav.style.flexShrink = '0';
          postBreadcrumbNav.style.width = '100%';
          postBreadcrumbNav.style.boxSizing = 'border-box';
          var bcJustify = alignStyle === 'flex-end' ? 'flex-end' : alignStyle === 'center' ? 'center' : 'flex-start';
          if (singlePostFullBleedStacked && stackedHeaderBlock && postInfoWrap) {
            postBreadcrumbNav.style.justifyContent = bcJustify;
            postBreadcrumbNav.style.position = '';
            postBreadcrumbNav.style.top = '';
            postBreadcrumbNav.style.left = '';
            postBreadcrumbNav.style.right = '';
            postBreadcrumbNav.style.zIndex = '';
            if (featurePostLayoutForCat) {
              postInfoWrap.insertBefore(postBreadcrumbNav, postInfoWrap.firstChild);
            } else {
              var stackedInfoWrap = stackedHeaderBlock.firstElementChild;
              if (stackedInfoWrap) {
                stackedInfoWrap.insertBefore(postBreadcrumbNav, postInfoWrap);
              }
            }
          } else if (singlePostFullBleedHero && fullBleedHeaderBlock) {
            postBreadcrumbNav.style.justifyContent = bcJustify;
            postBreadcrumbNav.style.position = 'absolute';
            postBreadcrumbNav.style.top = (fiSpacing === 'tight' ? '12px' : fiSpacing === 'spacious' ? '24px' : '20px');
            postBreadcrumbNav.style.left = '24px';
            postBreadcrumbNav.style.right = '24px';
            postBreadcrumbNav.style.zIndex = '2';
            postBreadcrumbNav.style.marginBottom = '0';
            var heroOverlayEl = fullBleedHeaderBlock.querySelector('[aria-hidden="true"]');
            if (heroOverlayEl && heroOverlayEl.nextSibling) {
              fullBleedHeaderBlock.insertBefore(postBreadcrumbNav, heroOverlayEl.nextSibling);
            } else {
              fullBleedHeaderBlock.insertBefore(postBreadcrumbNav, fullBleedHeaderBlock.firstChild);
            }
          } else if (
            isSideBySide &&
            isSinglePost &&
            (phImagePos === 'leftOfInfo' || phImagePos === 'rightOfInfo') &&
            contentEl
          ) {
            postBreadcrumbNav.style.justifyContent = bcJustify;
            if (!storyPostLayout) postBreadcrumbNav.style.marginBottom = '8px';
            contentEl.insertBefore(postBreadcrumbNav, contentEl.firstChild);
          } else if (singlePostBelowInfo && postInfoWrap && postInfoWrap.parentNode) {
            postBreadcrumbNav.style.justifyContent = bcJustify;
            postBreadcrumbNav.style.position = '';
            postBreadcrumbNav.style.top = '';
            postBreadcrumbNav.style.left = '';
            postBreadcrumbNav.style.right = '';
            postBreadcrumbNav.style.zIndex = '';
            postInfoWrap.parentNode.insertBefore(postBreadcrumbNav, postInfoWrap);
          } else {
            postBreadcrumbNav.style.justifyContent = bcJustify;
            headlineMount.insertBefore(postBreadcrumbNav, headlineMount.firstChild);
          }
        }

        var body = document.createElement('div');
        body.className = 'blog-overlay-body';
        if (isSinglePost) {
          if (paywallGateSinglePostBody) {
            var gatedBodyHtml = self._resolvePaywallSinglePostBodyHtml(post);
            if (gatedBodyHtml.trim()) {
              body.innerHTML = gatedBodyHtml;
              var gatedFirstHeading = body.querySelector('h1, h2, h3, h4, h5, h6');
              if (gatedFirstHeading && /^Section\s+\d+$/i.test((gatedFirstHeading.textContent || '').trim())) {
                gatedFirstHeading.remove();
              }
            }
            self._applySinglePostPaywallBodyTeaser(body, post, cfg);
          } else {
            var bodyHtml = post.body || post.excerpt || '';
            if (bodyHtml.trim()) {
              body.innerHTML = bodyHtml;
              var firstHeading = body.querySelector('h1, h2, h3, h4, h5, h6');
              if (firstHeading && /^Section\s+\d+$/i.test((firstHeading.textContent || '').trim())) {
                firstHeading.remove();
              }
            }
          }
        } else if (gatedCard) {
          /* Label + optional CTA live in layout-specific slots above; keep teaser column empty */
        } else if (collectionLayout === 'digest') {
          /** Digest: excerpt only on the featured article; grid cards stay title/meta/image only. */
          if (isFeaturedInLayout) {
            var digestFeaturedExcerpt = self._extractFirstNSentences(post.excerpt || post.body || '', 2);
            if (digestFeaturedExcerpt) {
              body.textContent = digestFeaturedExcerpt;
              self._applyExcerptStyle(body, 'lg');
              if (digestMobileNarrow) body.style.textAlign = 'left';
            }
          }
        } else if (showPostExcerpt && collectionLayout === 'listRows') {
          if (!listRowsMobileCompact) {
            var excerptText = self._truncateText(post.excerpt || post.body || '', 120);
            if (excerptText) {
              body.textContent = excerptText;
              self._applyExcerptStyle(body, 'std');
              body.style.marginTop = '0';
            }
          }
        } else if (showPostExcerpt && collectionLayout === 'grid') {
          // Masthead grid — short teaser on desktop; hidden on narrow viewports
          if (!gridMobileNarrow) {
            var gridExcerptText = self._extractFirstNSentences(post.excerpt || post.body || '', 2);
            if (gridExcerptText) {
              body.textContent = gridExcerptText;
              self._applyExcerptStyle(body, isFeaturedInLayout ? 'lg' : 'std');
            }
          }
        } else if (showPostExcerpt && collectionLayout === 'editorial') {
          if (!gridMobileNarrow) {
            var editorialExcerptText = self._extractFirstNSentences(post.excerpt || post.body || '', 2);
            if (editorialExcerptText) {
              body.textContent = editorialExcerptText;
              self._applyExcerptStyle(body, isFeaturedInLayout ? 'lg' : 'std');
            }
          }
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
          if (!paywallGateSinglePostBody) {
            self._applyStoryPostHorizontalInset(body, cfg);
            if (sidebarRowPostLayout) self._normalizePostBodyTopForSidebarRow(body);
          }
          body.style.paddingTop = BB_POST_CONTENT_TOP_PADDING + 'px';
        }
        var bodyAppendTo = (isSinglePost && isSideBySide) ? article : appendTo;
        if (isSideBySide) {
          if (!nwPaywallColSide) rowEl.appendChild(contentEl);
          if (isSinglePost && !singlePostFullBleedHero && !singlePostFullBleedStacked) {
            ensureSinglePostHeaderInnerEl().appendChild(rowEl);
          } else {
            if (listRowsMobileCatsAboveRow && postCategoriesLine) {
              var catAlignRow = document.createElement('div');
              catAlignRow.className = 'blog-overlay-list-rows-cat-align-row';
              catAlignRow.style.display = 'flex';
              catAlignRow.style.flexDirection = (isSinglePost ? phImagePos === 'rightOfInfo' : fiLayout === 'rightJustified') ? 'row-reverse' : 'row';
              catAlignRow.style.gap = (collectionLayout === 'listRows' && listRowsMobileCompact) ? '12px' : '20px';
              catAlignRow.style.alignItems = 'flex-start';
              catAlignRow.style.width = '100%';
              catAlignRow.style.boxSizing = 'border-box';
              var catColSpacer = document.createElement('div');
              catColSpacer.setAttribute('aria-hidden', 'true');
              catColSpacer.style.flex = '0 0 ' + fiImageWidth + '%';
              catColSpacer.style.minWidth = '0';
              var catColText = document.createElement('div');
              catColText.style.flex = '1';
              catColText.style.minWidth = '0';
              catColText.appendChild(postCategoriesLine);
              catAlignRow.appendChild(catColSpacer);
              catAlignRow.appendChild(catColText);
              article.appendChild(catAlignRow);
            }
            article.appendChild(rowEl);
          }
        }
        var omitDigestNonFeaturedBody = !isSinglePost && collectionLayout === 'digest' && !isFeaturedInLayout;
        if (!omitDigestNonFeaturedBody) {
          bodyAppendTo.appendChild(body);
        }
        mainEl.appendChild(article);
      }
    },

    _renderShowcasePostsIntoMain: function(mainEl, items, vs, placeholderMap, navbarOffset) {
      var self = this;
      var paywallReplaceCollectionTeaser = Boolean(vs.paywallReplaceCollectionTeaser);
      var cfg = vs.cfg;
      var isSinglePost = vs.isSinglePost;
      var displayItemsForLoop = vs.displayItemsForLoop;
      var displayItems = vs.displayItems;
      var featuredPost = vs.featuredPost;
      var displayPostKey = vs.displayPostKey;
      var faCfg = vs.faCfg;
      var showDate = vs.showDate;
      var showAuthor = vs.showAuthor;
      var showReadingTime = vs.showReadingTime;
      var showPostExcerpt = vs.showPostExcerpt !== false;
      var hasAnyFilter = vs.hasAnyFilter;
      var hasSearchQuery = vs.hasSearchQuery;
      var searchQuery = vs.searchQuery;
      var siteAccent = self._getSiteAccentColor();
      var categoryFilterUiEnabled = vs.categoryFilterUiEnabled;
      var showcaseMobile = !isSinglePost && self._isNarrowCollectionViewport();

        for (var j = 0; j < displayItemsForLoop.length; j++) {
        var post = displayItemsForLoop[j];
        var gatedShowcase = paywallReplaceCollectionTeaser && !isSinglePost && !self._isPaywallPublicPreviewPost(post);
        var postIndex = self._postIndexInItems(items, post, self._itemIndexMap);
        var imgUrl = post.assetUrl || post.thumbnailUrl || (post.assets && post.assets[0] && post.assets[0].assetUrl) || null;
        if (imgUrl && self._isPlaceholderWithMap(imgUrl, placeholderMap)) imgUrl = null;
        var imgUrlValid = imgUrl && typeof imgUrl === 'string' && imgUrl.trim().length > 0 && imgUrl !== '#' && (imgUrl.indexOf('http://') === 0 || imgUrl.indexOf('https://') === 0);
        var imgLeft = j % 2 === 0;
        var postUrl = self._getPostUrl(post) || (self._bbPreview ? '#post-' + postIndex : '#');
        var displayIdx = displayItems.indexOf(post);
        function wireShowcaseNavLink(el) {
          if (self._bbPreview && hasAnyFilter && postIndex >= 0) {
            el.onclick = (function(idx) {
              return function(e) {
                e.preventDefault();
                self._categoryFilter = [];
                self._tagFilter = [];
                self._searchQuery = '';
                self._currentPage = 1;
                var targetHash = '#post-' + idx;
                if (window.location.hash !== targetHash) {
                  window.location.hash = targetHash;
                } else {
                  self._renderContent(self.items);
                }
              };
            })(postIndex);
          }
        }
        function setShowcasePostAnalytics(el) {
          if (!isSinglePost) {
            el.setAttribute('data-analytics-element', 'postTitle');
            el.setAttribute('data-post-index', String(postIndex));
            if (hasSearchQuery && searchQuery) {
              el.setAttribute('data-search-term', searchQuery);
            }
          }
        }
        var card = document.createElement('div');
        card.className = 'blog-overlay-showcase-card' + (showcaseMobile ? ' blog-overlay-showcase-card-mobile' : '');
        card.style.display = 'grid';
        card.style.gap = '0';
        card.style.marginTop = j === 0 ? '0' : (showcaseMobile ? '20px' : '7.5%');
        card.style.marginBottom = showcaseMobile ? '20px' : '36px';
        card.style.gridTemplateColumns = '1fr';
        card.style.width = '100%';
        card.style.maxWidth = '100%';
        card.style.boxSizing = 'border-box';
        card.style.alignSelf = 'stretch';
        if (navbarOffset > 0) card.style.scrollMarginTop = (navbarOffset + 8) + 'px';
        if (displayIdx >= 0) card.setAttribute('data-display-index', String(displayIdx));
        var bodyCol = document.createElement('div');
        bodyCol.style.display = 'flex';
        bodyCol.style.flexDirection = 'column';
        bodyCol.style.justifyContent = 'center';
        bodyCol.style.alignSelf = 'center';
        bodyCol.style.padding = showcaseMobile ? '10px 8px' : '24px 0';
        bodyCol.style.minWidth = '0';
        if (!isSinglePost && faCfg && faCfg.show && faCfg.position === 'inLayout' && featuredPost) {
          var shFpK = displayPostKey(featuredPost);
          var shPk = displayPostKey(post);
          if (post === featuredPost || (shFpK && shPk === shFpK)) {
            var shBadge = self._createFeaturedBadge({ marginBottom: showcaseMobile ? '4px' : '6px' });
            shBadge.style.boxSizing = 'border-box';
            bodyCol.appendChild(shBadge);
          }
        }
        if (gatedShowcase) {
          var moScTop = self._createMembersOnlyTeaserLabel(false);
          moScTop.style.marginBottom = '8px';
          bodyCol.appendChild(moScTop);
        }
        var postCategoriesLineShowcase = !isSinglePost
          ? self._createCollectionPostCategoriesLine(post, siteAccent, categoryFilterUiEnabled, { compact: showcaseMobile })
          : null;
        if (postCategoriesLineShowcase) {
          if (showcaseMobile) postCategoriesLineShowcase.style.marginBottom = '4px';
          bodyCol.appendChild(postCategoriesLineShowcase);
        }
        var titleEl = document.createElement('h2');
        titleEl.className = 'blog-overlay-title';
        titleEl.style.margin = showcaseMobile ? '0 0 4px 0' : '0 0 8px 0';
        if (showcaseMobile) {
          titleEl.style.fontSize = '1.05rem';
          titleEl.style.lineHeight = '1.25';
          titleEl.classList.add('bb-title--on-bg');
        } else {
          self._applyTitleStyle(titleEl, { size: 'lg', onImage: false, margin: '0 0 8px 0' });
        }
        var titleLink = document.createElement('a');
        titleLink.href = postUrl;
        titleLink.textContent = post.title || 'Untitled';
        titleLink.style.color = 'inherit';
        titleLink.style.textDecoration = 'none';
        titleLink.style.cursor = 'pointer';
        setShowcasePostAnalytics(titleLink);
        wireShowcaseNavLink(titleLink);
        titleEl.appendChild(titleLink);
        var excerptText = (!showPostExcerpt || showcaseMobile) ? '' : self._extractFirstNSentences(post.excerpt || post.body || '', 2);
        var bodyEl = null;
        if (!showcaseMobile) {
          bodyEl = document.createElement('div');
          bodyEl.className = 'blog-overlay-body';
          if (gatedShowcase) {
            /* Teaser replaced by masthead row above */
          } else if (excerptText) {
            bodyEl.textContent = excerptText;
            self._applyExcerptStyle(bodyEl, 'lg');
          }
        }
        var metaParts = [];
        if (showDate) { var ds = self._getDate(post); if (ds) metaParts.push(ds); }
        if (showAuthor) { var as = self._getAuthorsForPost(post, cfg); if (as) metaParts.push(as); }
        if (showReadingTime) {
          var minsShowcase = self._getReadingTimeMinutes(post.body);
          metaParts.push(minsShowcase === 1 ? '1 min read' : minsShowcase + ' min read');
        }
        var metaEl = document.createElement('div');
        metaEl.className = 'blog-overlay-meta-row';
        metaEl.style.display = 'flex';
        metaEl.style.alignItems = 'center';
        metaEl.style.marginBottom = '0';
        metaEl.style.gap = showcaseMobile ? '6px' : '12px';
        metaEl.style.flexWrap = 'wrap';
        if (showcaseMobile) {
          metaEl.style.fontSize = '0.75rem';
          metaEl.style.lineHeight = '1.35';
        }
        self._applyMetaStyle(metaEl, { onImage: false });
        metaEl.textContent = metaParts.join(' · ');
        var readLink = document.createElement('a');
        readLink.href = postUrl;
        readLink.className = 'blog-overlay-showcase-read-link bb-read-link';
        if (showcaseMobile) {
          readLink.style.gap = '4px';
          readLink.style.marginTop = '6px';
          readLink.style.fontSize = '0.8rem';
        }
        readLink.setAttribute('aria-label', 'Read article: ' + (post.title || 'Untitled'));
        setShowcasePostAnalytics(readLink);
        wireShowcaseNavLink(readLink);
        var readLabel = document.createElement('span');
        readLabel.textContent = 'Read article';
        readLink.appendChild(readLabel);
        var arrowNs = 'http://www.w3.org/2000/svg';
        var arrowSvg = document.createElementNS(arrowNs, 'svg');
        arrowSvg.setAttribute('width', showcaseMobile ? '14' : '16');
        arrowSvg.setAttribute('height', showcaseMobile ? '14' : '16');
        arrowSvg.setAttribute('viewBox', '0 0 24 24');
        arrowSvg.setAttribute('fill', 'none');
        arrowSvg.setAttribute('stroke', 'currentColor');
        arrowSvg.setAttribute('stroke-width', '2');
        arrowSvg.setAttribute('stroke-linecap', 'round');
        arrowSvg.setAttribute('stroke-linejoin', 'round');
        arrowSvg.style.display = 'block';
        arrowSvg.style.flexShrink = '0';
        var arrowPath = document.createElementNS(arrowNs, 'path');
        arrowPath.setAttribute('d', 'M5 12h14m-7-7l7 7-7 7');
        arrowSvg.appendChild(arrowPath);
        readLink.appendChild(arrowSvg);
        bodyCol.appendChild(titleEl);
        if (bodyEl) bodyCol.appendChild(bodyEl);
        bodyCol.appendChild(metaEl);
        if (gatedShowcase) {
          var scPill = self._createSubscribeToReadPillLink({ compact: true });
          scPill.style.marginTop = '8px';
          scPill.style.alignSelf = 'flex-start';
          bodyCol.appendChild(scPill);
        } else {
          bodyCol.appendChild(readLink);
        }
        card.appendChild(bodyCol);
        var showcaseHasImage = imgUrlValid && !self._isPlaceholderWithMap(imgUrl, placeholderMap);
        card.style.alignItems = 'center';
        var imgCol = document.createElement('div');
        imgCol.style.overflow = 'hidden';
        imgCol.style.borderRadius = '4px';
        imgCol.style.aspectRatio = showcaseMobile ? '1 / 1' : '3 / 2';
        imgCol.style.width = '100%';
        imgCol.style.height = 'auto';
        imgCol.style.alignSelf = 'center';
        imgCol.style.minWidth = '0';
        if (!imgLeft) imgCol.style.order = '2';
        var imgLink = document.createElement('a');
        imgLink.href = postUrl;
        imgLink.style.display = 'block';
        imgLink.style.color = 'inherit';
        imgLink.style.textDecoration = 'none';
        imgLink.style.height = '100%';
        setShowcasePostAnalytics(imgLink);
        wireShowcaseNavLink(imgLink);
        var showcaseHoverTarget;
        if (showcaseHasImage) {
          var imgEl = document.createElement('img');
          imgEl.src = imgUrl;
          imgEl.alt = post.title || '';
          imgEl.style.width = '100%';
          imgEl.style.height = '100%';
          imgEl.style.objectFit = 'cover';
          imgEl.style.objectPosition = 'center';
          imgEl.style.display = 'block';
          imgEl.style.transition = 'transform 0.5s';
          showcaseHoverTarget = imgEl;
          imgLink.appendChild(imgEl);
        } else {
          var phEl = document.createElement('div');
          phEl.setAttribute('role', 'img');
          phEl.setAttribute('aria-label', post.title || 'Post');
          phEl.style.width = '100%';
          phEl.style.height = '100%';
          phEl.style.display = 'block';
          phEl.style.background = self._featuredImageAreaBackground(null, placeholderMap, post, items);
          phEl.style.transition = 'transform 0.5s';
          showcaseHoverTarget = phEl;
          imgLink.appendChild(phEl);
        }
        imgCol.appendChild(imgLink);
        if (showcaseMobile) {
          card.style.gridTemplateColumns = imgLeft ? '55% 45%' : '45% 55%';
          bodyCol.style.padding = '10px 8px';
          if (imgLeft) {
            bodyCol.style.paddingLeft = '8px';
            bodyCol.style.paddingRight = '0';
          } else {
            bodyCol.style.paddingLeft = '12px';
            bodyCol.style.paddingRight = '8px';
            bodyCol.style.order = '1';
          }
        } else {
          card.style.gridTemplateColumns = imgLeft ? '58% 42%' : '42% 58%';
          bodyCol.style.padding = '48px 56px';
          if (imgLeft) { bodyCol.style.paddingRight = '0'; bodyCol.style.paddingLeft = '56px'; }
          else { bodyCol.style.paddingLeft = '0'; bodyCol.style.paddingRight = '56px'; bodyCol.style.order = '1'; }
        }
        card.insertBefore(imgCol, bodyCol);
        card.onmouseover = function() { showcaseHoverTarget.style.transform = 'scale(1.03)'; };
        card.onmouseout = function() { showcaseHoverTarget.style.transform = 'scale(1)'; };
        mainEl.appendChild(card);
      }
    },

    _refreshCollectionPostsOnly: async function(items) {
      var self = this;
      var vs = this._computeCollectionViewState(items);
      function fallback(reason, details) {
        self._debugLog('search incremental fallback: ' + reason, details || {});
        return false;
      }
      if (vs.isSinglePost) return fallback('single-post-mode', { hasAnyFilter: vs.hasAnyFilter });
      if (vs.collectionLayout === 'editorial') {
        return fallback('unsupported-layout', { collectionLayout: vs.collectionLayout });
      }
      if (vs.faCfg && vs.faCfg.position === 'header' && vs.featuredPost) {
        return fallback('header-featured-active', { featuredTitle: vs.featuredPost && vs.featuredPost.title });
      }

      var shellKey = vs.collectionLayout + '|' + (vs.gridColsEffective != null ? vs.gridColsEffective : vs.gridColsDigestOrGrid);
      if (this._lastCollectionShellKey && this._lastCollectionShellKey !== shellKey) {
        return fallback('shell-key-mismatch', {
          expected: this._lastCollectionShellKey,
          actual: shellKey
        });
      }

      var mainEl = document.getElementById('blog-overlay-main-posts');
      if (!mainEl || !mainEl.parentNode) return fallback('missing-main-container');

      var pagZone = document.getElementById('blog-overlay-pagination-zone');
      var needsPagination = vs.usePagination && (vs.paginationMode === 'infiniteScroll'
        ? vs.totalFiltered > 0
        : vs.totalPages > 1);
      if (needsPagination && !pagZone) {
        var wrapper = document.getElementById('blog-overlay-list');
        if (!wrapper) return fallback('missing-wrapper-for-pagination');
        pagZone = document.createElement('div');
        pagZone.id = 'blog-overlay-pagination-zone';
        pagZone.className = 'blog-overlay-pagination-zone';
        pagZone.style.width = '100%';
        pagZone.style.maxWidth = '100%';
        pagZone.style.boxSizing = 'border-box';
        pagZone.style.position = 'relative';
        pagZone.style.zIndex = '1';
        wrapper.appendChild(pagZone);
      }

      var placeholderMap = null;

      var collectionLayout = vs.collectionLayout;
      var gridColsDigestOrGrid = vs.gridColsDigestOrGrid;
      var gridColsEffective = vs.gridColsEffective != null ? vs.gridColsEffective : gridColsDigestOrGrid;
      if (collectionLayout === 'grid' || collectionLayout === 'digest') {
        this._applyCollectionGridMainLayout(mainEl, {
          collectionMobileGridNarrow: vs.collectionMobileGridNarrow,
          gridMobileNarrow: vs.gridMobileNarrow,
          gridColsEffective: gridColsEffective,
          digestMobileNarrow: vs.digestMobileNarrow
        });
      } else {
        mainEl.style.display = 'flex';
        mainEl.style.flexDirection = 'column';
        mainEl.style.alignItems = 'stretch';
        mainEl.style.gap = '0';
        mainEl.style.gridTemplateColumns = '';
        if (collectionLayout === 'showcase') {
          mainEl.style.width = '100%';
          mainEl.style.maxWidth = '100%';
          mainEl.style.marginLeft = '0';
          mainEl.style.marginRight = '0';
          mainEl.style.boxSizing = 'border-box';
        } else {
          mainEl.style.width = '';
          mainEl.style.maxWidth = '';
          mainEl.style.marginLeft = '';
          mainEl.style.marginRight = '';
          mainEl.style.boxSizing = '';
        }
      }

      var navbarOffset = this._getNavbarOffset();
      this._itemIndexMap = this._buildItemIndexMap(items);
      mainEl.replaceChildren();
      if (collectionLayout === 'showcase') {
        this._renderShowcasePostsIntoMain(mainEl, items, vs, placeholderMap, navbarOffset);
      } else {
        var headerZoneRef = { current: null };
        function noopSinglePostHeader() {
          return document.createDocumentFragment();
        }
        this._renderStandardPostListIntoMain(mainEl, items, vs, placeholderMap, navbarOffset, noopSinglePostHeader, headerZoneRef);
      }

      if (vs.displayItems.length === 0) {
        var empty = document.createElement('div');
        empty.textContent = 'No posts found.';
        mainEl.appendChild(empty);
      }

      var newPag = this._buildCollectionPaginationNav(vs);
      if (pagZone) {
        pagZone.replaceChildren();
        if (newPag) pagZone.appendChild(newPag);
      }

      this._debugLog('search incremental refresh success', {
        query: vs.searchQuery,
        totalFiltered: vs.totalFiltered,
        displayCount: vs.displayItems.length,
        layout: vs.collectionLayout,
        paginationMode: vs.paginationMode
      });
      if (typeof self._blogOverlaySidebarLayoutFn === 'function') {
        requestAnimationFrame(function() {
          self._blogOverlaySidebarLayoutFn();
        });
      }
      self._scheduleDigestMobileFeaturedImageBleed(vs);
      return true;
    },

    _renderContent: async function(items) {
      var self = this;
      this._perfMark('renderStart');
      if (!this._previewMode && !this._bbPreview && typeof window !== 'undefined' && window.location) {
        var currentPathname = window.location.pathname || '/';
        var currentBlogPath = this._currentBlogPathForRouteMatch();
        if (!this._isOnEffectiveBlogRoute()) {
          this._debugLog('render content skipped outside blog route', { path: currentPathname, blogPath: currentBlogPath || null });
          return;
        }
      }
      // NOTE: do *not* tear down the root-injection guard here. The guard's
      // allow-list already ignores BetterBlog's own #blog-overlay-list and
      // #blog-overlay-progress nodes, and `_renderContent` only ever appends
      // those two as direct children of `root`. Keeping the guard active
      // across the async re-render closes the window in which Squarespace's
      // SPA router can re-inject native blog markup into `root` between when
      // the previous overlay is torn down (line ~7250) and when the new one
      // is committed. The guard is still torn down on bail / editor / paywall
      // paths, which is where re-injection is intentional. The
      // `SPA navigation from collection to post` e2e test specifically
      // regresses on this assumption — if you re-introduce the
      // `_stopRootInjectionGuard()` call here, that test will fail.
      if (self._blogOverlaySidebarRO) {
        try { self._blogOverlaySidebarRO.disconnect(); } catch (eRo) {}
        self._blogOverlaySidebarRO = null;
      }
      if (self._blogOverlayStickySidebarAbort) {
        try { self._blogOverlayStickySidebarAbort(); } catch (eStickyAbort) { /* ignore */ }
        self._blogOverlayStickySidebarAbort = null;
      }
      self._blogOverlayStickySidebarSyncFn = null;
      self._teardownSiteContentInsetSync();
      self._blogOverlaySidebarLayoutFn = null;
      this._clearPendingSearchRender();
      var rootIsConnected = false;
      try {
        rootIsConnected = Boolean(this._root && this._root.isConnected !== false && document.documentElement && document.documentElement.contains(this._root));
      } catch (eRoot) {}
      var root = rootIsConnected ? this._root : (findBlogContainer() || document.getElementById('blogga-blogga-root'));
      if (!root) return;
      this._root = root;
      this._renderContentInProgress = true;
      self._ensureCollectionStylesheet();
      var collectionStyleTokens = self._resolveCollectionStyleTokens(root);
      this._siteContentInsets = this._getSquarespaceSiteContentInsets();
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

      var existingLists = root.querySelectorAll('#blog-overlay-list');
      for (var elIdx = 0; elIdx < existingLists.length; elIdx++) existingLists[elIdx].remove();
      var existingProgressBars = root.querySelectorAll('#blog-overlay-progress');
      for (var pbIdx = 0; pbIdx < existingProgressBars.length; pbIdx++) existingProgressBars[pbIdx].remove();
      if (existingLists.length > 1 || existingProgressBars.length > 1) {
        this._debugLog('removed duplicate overlay nodes before render', {
          listNodesRemoved: existingLists.length,
          progressNodesRemoved: existingProgressBars.length
        });
      }

      /* Replace original content with our overlay (avoids duplicate content, keeps root for style inheritance) */
      var toRemove = [];
      for (var i = 0; i < root.childNodes.length; i++) {
        var child = root.childNodes[i];
        if (child && child.id !== 'blog-overlay-list' && child.id !== 'blog-overlay-progress') {
          toRemove.push(child);
        }
      }
      // #region agent log
      console.warn('[BB-DEBUG-7918cd] _renderContent replacing root children:', toRemove.length, 'nodes in', root.tagName, root.id || '', 'hypothesisId=H4');
      // #endregion
      if (!this._originalRootChildren) this._originalRootChildren = [];
      if (this._originalRootChildren.length === 0 && toRemove.length > 0) {
        this._originalRootChildren = toRemove.slice();
      }
      for (var r = 0; r < toRemove.length; r++) {
        root.removeChild(toRemove[r]);
      }

      var vs = this._computeCollectionViewState(items);
      var baseCfg = vs.baseCfg;
      var selectedIndex = vs.selectedIndex;
      var searchQuery = vs.searchQuery;
      var hasSearchQuery = vs.hasSearchQuery;
      var categoryFilter = vs.categoryFilter;
      var hasCategoryFilter = vs.hasCategoryFilter;
      var tagFilter = vs.tagFilter;
      var hasTagFilter = vs.hasTagFilter;
      var hasAnyFilter = vs.hasAnyFilter;
      var filteredItems = vs.filteredItems;
      var isSinglePostForCfg = vs.isSinglePostForCfg;
      var levelCfgForSort = vs.levelCfgForSort;
      var cfgForSort = vs.cfgForSort;
      var hasPostSortModule = vs.hasPostSortModule;
      var postSort = vs.postSort;
      var postViewCounts = vs.postViewCounts;
      var sortedItems = vs.sortedItems;
      var paginationCfg = vs.paginationCfg;
      var usePagination = vs.usePagination;
      var paginationMode = vs.paginationMode;
      var postsPerPage = vs.postsPerPage;
      var totalFiltered = vs.totalFiltered;
      var totalPages = vs.totalPages;
      var currentPage = vs.currentPage;
      var displayItems = vs.displayItems;
      var isSinglePost = vs.isSinglePost;
      var levelCfg = vs.levelCfg;
      var cfg = vs.cfg;
      var siteAccentUi = self._getSiteAccentColor();
      this._renderSeq += 1;
      this._debugLog('render start', {
        renderSeq: this._renderSeq,
        viewerMode: vs.viewerMode || null,
        selectedIndex: selectedIndex,
        isSinglePost: isSinglePost,
        hasAnyFilter: hasAnyFilter,
        usingLevel: isSinglePost ? 'postConfig' : 'collectionConfig',
        siteContentInsets: this._siteContentInsets || null,
        siteContentInsetsSource: this._siteContentInsetsSource || null,
        leftSidebarModules: cfg.leftSidebar && Array.isArray(cfg.leftSidebar.modules) ? cfg.leftSidebar.modules.slice() : [],
        rightSidebarModules: cfg.rightSidebar && Array.isArray(cfg.rightSidebar.modules) ? cfg.rightSidebar.modules.slice() : [],
        footerModules: cfg.footerContent && Array.isArray(cfg.footerContent.modules) ? cfg.footerContent.modules.slice() : []
      });
      var recentPostsCount = vs.recentPostsCount;
      var leftSidebarCfg = vs.leftSidebarCfg;
      var rightSidebarCfg = vs.rightSidebarCfg;
      var headerContentCfg = vs.headerContentCfg;
      var footerContentCfg = vs.footerContentCfg;
      var paywallShowFooter = Boolean(vs.paywallShowFooter);
      var paywallGateSinglePostBody = Boolean(vs.paywallGateSinglePostBody);
      var featurePostLayout = isSinglePost && self._isFeaturePostLayout(cfg);
      var featureBelowRowAuthorEl = null;
      var featureBelowRowMoreToReadEl = null;
      var featureBelowRowLeadMagnetEl = null;
      var featureBelowRowHost = null;
      var featureCommentsSectionEl = null;
      var featureFooterLeftPad = 0;
      var featureFooterRightPad = 0;
      var featureFooterTopPad = 16;
      this._emitPaywallRenderDebug(vs, { renderSeq: this._renderSeq });
      var useLevelConfig = vs.useLevelConfig;
      var showTableOfContents = vs.showTableOfContents;
      var tableOfContentsPosition = vs.tableOfContentsPosition;
      var showRecentPostsSidebar = vs.showRecentPostsSidebar;
      var sidebarPosition = vs.sidebarPosition;
      var autoSidebarWidth = isSinglePost ? 300 : 220;
      if (!useLevelConfig) {
        if (!leftSidebarCfg && cfg.showTableOfContents) {
          leftSidebarCfg = cfg.tableOfContentsPosition === 'left' ? { show: true, modules: ['tableOfContents'], width: 300, sticky: false } : null;
        }
        if (!rightSidebarCfg && cfg.showTableOfContents) {
          rightSidebarCfg = cfg.tableOfContentsPosition === 'right' ? { show: true, modules: ['tableOfContents'], width: 300, sticky: false } : null;
        }
        if (!leftSidebarCfg && cfg.showRecentPostsSidebar) {
          leftSidebarCfg = cfg.sidebarPosition === 'left' ? { show: true, modules: ['recentPosts'], width: autoSidebarWidth, sticky: false } : leftSidebarCfg;
        }
        if (!rightSidebarCfg && cfg.showRecentPostsSidebar) {
          rightSidebarCfg = cfg.sidebarPosition === 'right' ? { show: true, modules: ['recentPosts'], width: autoSidebarWidth, sticky: false } : rightSidebarCfg;
        }
      } else {
        if (!leftSidebarCfg) leftSidebarCfg = { show: false, modules: [], width: autoSidebarWidth, sticky: false };
        if (!rightSidebarCfg) rightSidebarCfg = { show: false, modules: [], width: autoSidebarWidth, sticky: false };
      }
      var showDate = vs.showDate;
      var showAuthor = vs.showAuthor;
      var showReadingTime = vs.showReadingTime;
      var categoryFilterUiEnabled = vs.categoryFilterUiEnabled;
      var siteAccentForPostCats = self._getSiteAccentColor();
      var fiCfg = vs.fiCfg;
      var faCfg = vs.faCfg;
      var collectionLayout = vs.collectionLayout;
      var collectionLayoutRaw = vs.collectionLayoutRaw;
      var gridColsDigestOrGrid = vs.gridColsDigestOrGrid;
      var gridColsEffective = vs.gridColsEffective != null ? vs.gridColsEffective : gridColsDigestOrGrid;
      var gridMobileNarrow = Boolean(vs.gridMobileNarrow);
      var digestMobileNarrow = Boolean(vs.digestMobileNarrow);
      var collectionMobileGridNarrow = Boolean(vs.collectionMobileGridNarrow) || gridMobileNarrow || digestMobileNarrow;
      var featuredPost = vs.featuredPost;
      var displayItemsForLoop = vs.displayItemsForLoop;
      var displayPostKey = vs.displayPostKey;
      var newsroomMobileCompact = !isSinglePost && collectionLayout === 'listRows' && self._isNarrowCollectionViewport();
      var itemIndexMap = self._buildItemIndexMap(items);
      self._itemIndexMap = itemIndexMap;

      var wrapper = document.createElement('div');
      wrapper.id = 'blog-overlay-list';
      wrapper.className = 'blog-overlay-wrapper';
      wrapper.style.display = 'block';
      self._applyCollectionTokensToElement(wrapper, collectionStyleTokens);
      var navbarOffset = this._getNavbarOffset();
      var wrapperPadTop = navbarOffset > 0 ? navbarOffset + 16 : 16;
      if (isSinglePost) {
        wrapper.setAttribute('data-bb-spec-horizontal-padding', '1');
        if (self._isWriterPostLayout(cfg)) {
          wrapper.setAttribute('data-bb-writer-layout', '1');
        } else {
          wrapper.removeAttribute('data-bb-writer-layout');
        }
      } else {
        wrapper.removeAttribute('data-bb-spec-horizontal-padding');
        wrapper.removeAttribute('data-bb-writer-layout');
      }
      self._applySiteContentInsetsToWrapper(wrapper, wrapperPadTop);
      if (collectionMobileGridNarrow) {
        wrapper.style.maxWidth = '100%';
        if (collectionLayout === 'digest') {
          wrapper.style.overflowX = 'visible';
        } else {
          wrapper.style.overflowX = 'hidden';
        }
      }
      /*
       * Cold load: build off-document, commit once at the end (#8).
       * SPA / follow-up re-renders (body already visible): commit the shell
       * immediately so root is never empty while Squarespace hydrates post markup.
       */
      var overlayFragment = document.createDocumentFragment();
      overlayFragment.appendChild(wrapper);
      var deferOverlayCommit = self._isBootstrapLoadingActive();
      if (!deferOverlayCommit) {
        root.prepend(overlayFragment);
      }
      /* Do not set fontFamily - inherit from site for consistent typography */

      var main = document.createElement('div');
      main.id = 'blog-overlay-main-posts';
      main.className = 'blog-overlay-posts';
      main.style.flex = '1';
      main.style.minWidth = '0';
      var collectionPaginationEl = null;
      var BB_SIDEBAR_LAYOUT_GAP = 24;
      var BB_POST_SIDEBAR_ROW_GAP = BB_SIDEBAR_LAYOUT_GAP + 12;
      var mainRowEl = document.createElement('div');
      mainRowEl.className = 'blog-overlay-main-row';
      mainRowEl.style.display = 'flex';
      mainRowEl.style.flexDirection = 'row';
      mainRowEl.style.alignItems = 'flex-start';
      mainRowEl.style.gap = BB_SIDEBAR_LAYOUT_GAP + 'px';
      mainRowEl.style.width = '100%';
      mainRowEl.style.boxSizing = 'border-box';
      var headerZoneEl = null;
      var singlePostHeaderZoneEl = null;
      var singlePostHeaderInnerEl = null;
      var postHeaderCfgForZone = isSinglePost && cfg.postHeader && typeof cfg.postHeader === 'object' ? cfg.postHeader : null;
      var postHeaderImagePosForZone = postHeaderCfgForZone && (postHeaderCfgForZone.imagePosition === 'leftOfInfo' || postHeaderCfgForZone.imagePosition === 'rightOfInfo') ? postHeaderCfgForZone.imagePosition : null;
      var postHeaderSideGapPx = postHeaderImagePosForZone && typeof postHeaderCfgForZone.sideGap === 'number'
        ? Math.min(150, Math.max(0, Math.round(postHeaderCfgForZone.sideGap)))
        : 24;
      function ensureSinglePostHeaderInnerEl() {
        var normalizedSideGap = postHeaderImagePosForZone ? 0 : Math.min(150, Math.max(0, Math.round(postHeaderSideGapPx)));
        if (!singlePostHeaderZoneEl) {
          singlePostHeaderZoneEl = document.createElement('div');
          singlePostHeaderZoneEl.className = 'blog-overlay-header-zone blog-overlay-single-post-header-zone';
          singlePostHeaderZoneEl.style.position = 'relative';
          singlePostHeaderZoneEl.style.zIndex = '100';
          singlePostHeaderZoneEl.style.width = '100%';
          singlePostHeaderZoneEl.style.maxWidth = '100%';
          singlePostHeaderZoneEl.style.marginLeft = '0';
          singlePostHeaderZoneEl.style.marginRight = '0';
          singlePostHeaderZoneEl.style.paddingTop = '16px';
          singlePostHeaderZoneEl.style.paddingBottom = '16px';
          singlePostHeaderZoneEl.style.boxSizing = 'border-box';
          singlePostHeaderZoneEl.style.background = 'transparent';
        }
        if (self._isStoryPostLayout(cfg)) {
          singlePostHeaderZoneEl.classList.add('blog-overlay-single-post-header-zone--story');
          singlePostHeaderZoneEl.style.background = self._resolveStoryHeaderBackgroundColor(postHeaderCfgForZone);
          singlePostHeaderZoneEl.style.paddingTop = '';
          singlePostHeaderZoneEl.style.paddingBottom = '';
          singlePostHeaderZoneEl.style.paddingLeft = '';
          singlePostHeaderZoneEl.style.paddingRight = '';
          singlePostHeaderZoneEl.style.marginBottom = '';
          if (!self._isNarrowCollectionViewport()) {
            self._applyViewportFullBleed(singlePostHeaderZoneEl);
          } else {
            singlePostHeaderZoneEl.style.marginLeft = '';
            singlePostHeaderZoneEl.style.marginRight = '';
            singlePostHeaderZoneEl.style.width = '100%';
            singlePostHeaderZoneEl.style.maxWidth = '100%';
          }
        } else {
          singlePostHeaderZoneEl.style.paddingLeft = normalizedSideGap + 'px';
          singlePostHeaderZoneEl.style.paddingRight = normalizedSideGap + 'px';
          singlePostHeaderZoneEl.style.marginLeft = '';
          singlePostHeaderZoneEl.style.marginRight = '';
          singlePostHeaderZoneEl.style.width = '100%';
          singlePostHeaderZoneEl.style.maxWidth = '100%';
        }
        if (!singlePostHeaderInnerEl) {
          singlePostHeaderInnerEl = document.createElement('div');
          singlePostHeaderInnerEl.className = 'blog-overlay-single-post-header-inner';
          singlePostHeaderInnerEl.style.width = '100%';
          singlePostHeaderInnerEl.style.maxWidth = 'none';
          singlePostHeaderInnerEl.style.margin = '0 auto';
          singlePostHeaderInnerEl.style.boxSizing = 'border-box';
          singlePostHeaderInnerEl.style.display = 'flex';
          singlePostHeaderInnerEl.style.flexDirection = 'column';
          singlePostHeaderInnerEl.style.gap = self._isStoryPostLayout(cfg) ? '0' : '16px';
          singlePostHeaderZoneEl.appendChild(singlePostHeaderInnerEl);
        }
        return singlePostHeaderInnerEl;
      }
      var headerModulesHostEl = null;
      var footerZoneEl = document.createElement('div');
      footerZoneEl.className = 'blog-overlay-footer-zone';
      footerZoneEl.style.position = 'relative';
      footerZoneEl.style.zIndex = '10';
      footerZoneEl.style.width = '100%';

      /* Use layout values from _computeCollectionViewState (already resolved per viewer context). */
      if (isSinglePost) {
        main.style.display = 'flex';
        main.style.flexDirection = 'column';
        main.style.alignItems = 'stretch';
        main.style.gap = '0';
        main.style.gridTemplateColumns = '';
      } else if (collectionLayout === 'grid' || collectionLayout === 'digest') {
        self._applyCollectionGridMainLayout(main, {
          collectionMobileGridNarrow: collectionMobileGridNarrow,
          gridMobileNarrow: gridMobileNarrow,
          gridColsEffective: gridColsEffective,
          digestMobileNarrow: digestMobileNarrow
        });
      } else if (collectionLayout === 'showcase') {
        main.style.display = 'flex';
        main.style.flexDirection = 'column';
        main.style.alignItems = 'stretch';
        main.style.gap = '0';
        main.style.gridTemplateColumns = '';
        main.style.width = '100%';
        main.style.maxWidth = '100%';
        main.style.marginLeft = '0';
        main.style.marginRight = '0';
        main.style.boxSizing = 'border-box';
      } else {
        /* listRows, editorial, etc. — single column of sections; editorial rows are their own grids. */
        main.style.display = 'flex';
        main.style.flexDirection = 'column';
        main.style.alignItems = 'stretch';
        main.style.gap = '0';
        main.style.gridTemplateColumns = '';
      }
      if (!isSinglePost) {
        headerZoneEl = document.createElement('div');
        headerZoneEl.className = 'blog-overlay-header-zone';
        headerZoneEl.style.position = 'relative';
        headerZoneEl.style.zIndex = '100';
        headerZoneEl.style.width = '100%';
        headerZoneEl.style.maxWidth = '100%';
        headerZoneEl.style.marginLeft = '0';
        headerZoneEl.style.marginRight = '0';
        headerZoneEl.style.padding = newsroomMobileCompact ? '16px 0 8px 0' : '16px 0';
        headerZoneEl.style.boxSizing = 'border-box';
        headerZoneEl.style.background = 'transparent';
        headerModulesHostEl = document.createElement('div');
        headerModulesHostEl.className = 'blog-overlay-header-modules-host';
        headerModulesHostEl.style.marginTop = '0';
        headerModulesHostEl.style.display = 'flex';
        headerModulesHostEl.style.flexDirection = self._isNarrowCollectionViewport() ? 'column' : 'row';
        headerModulesHostEl.style.flexWrap = self._isNarrowCollectionViewport() ? 'nowrap' : 'wrap';
        headerModulesHostEl.style.alignItems = self._isNarrowCollectionViewport() ? 'stretch' : 'center';
        headerModulesHostEl.style.gap = self._isNarrowCollectionViewport() ? '10px' : '12px 16px';
        headerModulesHostEl.style.width = '100%';
        headerModulesHostEl.style.maxWidth = '100%';
        headerModulesHostEl.style.boxSizing = 'border-box';
        headerZoneEl.appendChild(headerModulesHostEl);
      }

      var progressTrackForPreview = null;
      var showProgressBar = Boolean(vs.showProgressBar);
      var progressBarPosition = 'top';
      var progressBarThickness = 6;
      var progressBarColor = self._resolveProgressBarColor(cfg);
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
        /** Fixed top-positioned bar overlays the wrapper; reserve its height so content doesn't sit under it. */
        if (progressBarPosition === 'top' && !this._previewMode) {
          self._applySiteContentInsetsToWrapper(wrapper, wrapperPadTop + progressBarThickness);
        }
      }

      var featuredPost = null;
      var displayItemsForLoop = displayItems;
      var displayPostKey = function(postObj) {
        return postObj && (postObj.id || postObj.fullUrl || postObj.title)
          ? String(postObj.id || postObj.fullUrl || postObj.title)
          : '';
      };
      if (!isSinglePost && faCfg && faCfg.show === true && sortedItems.length > 0) {
        featuredPost = self._resolveFeaturedPostForCollection(isSinglePost, faCfg, sortedItems, displayPostKey);
        if (featuredPost) {
          displayItemsForLoop = self._applyFeaturedPostDisplayLayout(featuredPost, faCfg, displayItems, displayPostKey);
        }
        if (self._featuredDebugEnabled()) {
          console.warn('[BlogOverlay][featured-debug] resolved', {
            bbFeatured: faCfg.featuredPostId,
            featuredTitle: featuredPost && featuredPost.title,
            poolLen: sortedItems.length,
            displayLen: displayItems.length
          });
        }
      }
      var placeholderMap = (self._placeholderImageMap && typeof self._placeholderImageMap === 'object')
        ? self._placeholderImageMap
        : {};
      var placeholderRenderSeq = self._renderSeq;
      self._schedulePlaceholderMapFollowUp(featuredPost, displayItemsForLoop, placeholderRenderSeq);
      if (faCfg && faCfg.position === 'header' && featuredPost) {
          var mastheadHeroMobile = collectionLayout === 'grid' && gridMobileNarrow;
          var heroLink = document.createElement('a');
          heroLink.href = self._getPostUrl(featuredPost) || (self._bbPreview ? '#post-' + self._postIndexInItems(items, featuredPost, itemIndexMap) : '#');
          heroLink.style.display = 'block';
          heroLink.style.textDecoration = 'none';
          heroLink.style.color = '#fff';
          heroLink.style.marginBottom = mastheadHeroMobile ? '16px' : '24px';
          heroLink.setAttribute('data-analytics-element', 'featuredHero');
          heroLink.className = 'blog-overlay-featured-hero' + (mastheadHeroMobile ? ' blog-overlay-featured-hero-mobile' : '');
          if (mastheadHeroMobile) {
            self._applyViewportFullBleed(heroLink);
          }

          var heroInner = document.createElement('div');
          heroInner.style.position = 'relative';
          heroInner.style.width = '100%';
          heroInner.style.aspectRatio = mastheadHeroMobile ? '4 / 3' : '21 / 9';
          heroInner.style.overflow = 'hidden';
          self._applyFeaturedImageRadius(heroInner);
          heroInner.style.background = 'linear-gradient(160deg, #1a1a2e 0%, #2d1a3a 45%, #0f2027 100%)';
          heroInner.style.minHeight = mastheadHeroMobile ? '260px' : '200px';

          var heroImgUrl = featuredPost.assetUrl || featuredPost.thumbnailUrl || (featuredPost.assets && featuredPost.assets[0] && featuredPost.assets[0].assetUrl) || null;
          if (heroImgUrl && self._isPlaceholderWithMap(heroImgUrl, placeholderMap)) heroImgUrl = null;
          var hasHeroImg = Boolean(heroImgUrl);
          if (heroImgUrl) {
            var heroImg = document.createElement('img');
            heroImg.src = heroImgUrl;
            heroImg.alt = featuredPost.title || '';
            heroImg.style.position = 'absolute';
            heroImg.style.left = '0';
            heroImg.style.top = '0';
            heroImg.style.width = '100%';
            heroImg.style.height = '100%';
            heroImg.style.objectFit = 'cover';
            heroImg.style.display = 'block';
            heroInner.appendChild(heroImg);
          }

          var heroScrim = document.createElement('div');
          heroScrim.style.position = 'absolute';
          heroScrim.style.left = '0';
          heroScrim.style.right = '0';
          heroScrim.style.top = '0';
          heroScrim.style.bottom = '0';
          heroScrim.style.pointerEvents = 'none';
          heroScrim.style.background = hasHeroImg
            ? 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.45) 45%, rgba(0,0,0,0.15) 100%)'
            : 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 100%)';
          heroInner.appendChild(heroScrim);

          var heroContent = document.createElement('div');
          heroContent.style.position = 'absolute';
          heroContent.style.left = '0';
          heroContent.style.right = '0';
          heroContent.style.zIndex = '2';
          heroContent.style.boxSizing = 'border-box';
          heroContent.style.maxWidth = '100%';
          if (mastheadHeroMobile) {
            heroContent.style.top = '0';
            heroContent.style.bottom = '0';
            heroContent.style.display = 'flex';
            heroContent.style.flexDirection = 'column';
            heroContent.style.justifyContent = 'flex-end';
            heroContent.style.padding = '20px';
          } else {
            heroContent.style.bottom = '0';
            heroContent.style.padding = '28px 32px 32px';
          }

          var heroMuted = 'rgba(255,255,255,0.78)';

          var heroBadge = self._createFeaturedBadge({
            text: 'Featured',
            absolute: mastheadHeroMobile,
            top: '16px',
            left: '16px',
            zIndex: '3',
            marginBottom: mastheadHeroMobile ? '0' : '16px'
          });
          if (mastheadHeroMobile) {
            heroInner.appendChild(heroBadge);
          } else {
            heroContent.appendChild(heroBadge);
          }
          var heroCats = self._getPostCategories(featuredPost);
          if (heroCats.length > 0) {
            var heroCat = document.createElement('div');
            heroCat.textContent = heroCats[0];
            self._applyCategoryLabelStyle(heroCat, { onImage: true });
            heroCat.style.marginBottom = '8px';
            if (mastheadHeroMobile) heroCat.style.fontSize = '22px';
            heroContent.appendChild(heroCat);
          }
          var heroTitle = document.createElement('h2');
          heroTitle.className = 'blog-overlay-title';
          heroTitle.textContent = featuredPost.title || 'Untitled';
          self._applyTitleStyle(heroTitle, { size: 'lg', onImage: true, margin: '0 0 10px 0' });
          if (mastheadHeroMobile) {
            heroTitle.style.fontSize = 'clamp(1.5rem, 4vw, 2.25rem)';
          }
          heroContent.appendChild(heroTitle);
          /* Masthead hero has no excerpt per collection template spec. */
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
            self._applyMetaStyle(heroMeta, { onImage: true });
            if (mastheadHeroMobile) heroMeta.style.fontSize = '24px';
            heroContent.appendChild(heroMeta);
          }

          heroInner.appendChild(heroContent);
          heroLink.appendChild(heroInner);
          if (!isSinglePost && headerZoneEl && headerModulesHostEl) {
            heroLink.style.marginTop = '0';
            if (mastheadHeroMobile) {
              headerZoneEl.style.overflow = 'visible';
              headerZoneEl.appendChild(heroLink);
              heroLink.style.marginTop = '12px';
            } else {
              headerZoneEl.insertBefore(heroLink, headerModulesHostEl);
            }
          } else {
            main.insertBefore(heroLink, main.firstChild);
          }
      }

      function createSidebarSection(headerText, content) {
        var section = document.createElement('div');
        section.className = 'blog-overlay-sidebar-section';
        section.style.marginBottom = '20px';
        var header = document.createElement('h3');
        header.className = 'bb-sidebar-header';
        header.style.marginTop = '0';
        header.style.paddingTop = '0';
        header.style.marginBottom = '8px';
        header.textContent = headerText;
        section.appendChild(header);
        var bar = document.createElement('hr');
        bar.className = 'bb-sidebar-divider';
        section.appendChild(bar);
        section.appendChild(content);
        return section;
      }
      function createTocModule(sidebarWidth) {
        if (self._isTocDebugEnabled()) {
          self._tocDebug('createTocModule enter', {
            itemsLength: items.length,
            isSinglePost: isSinglePost,
            selectedIndex: selectedIndex,
            sidebarWidth: sidebarWidth
          });
        }
        if (items.length === 0) {
          if (self._isTocDebugEnabled()) self._tocDebug('createTocModule abort', { reason: 'items.length === 0' });
          return null;
        }
        var tocStyle = (cfg.postModules && cfg.postModules.tableOfContents && cfg.postModules.tableOfContents.style) || 'numbered';
        var el = document.createElement('nav');
        el.className = 'blog-overlay-toc';
        el.setAttribute('data-toc-style', tocStyle);
        el.style.flexShrink = '0';
        el.style.width = (sidebarWidth || 200) + 'px';
        if (tocStyle === 'connectedDots') {
          el.style.position = 'relative';
          el.style.paddingLeft = '18px';
          var line = document.createElement('div');
          line.className = 'blog-overlay-toc-line';
          line.style.position = 'absolute';
          line.style.left = '3px';
          line.style.top = '10px';
          line.style.bottom = '10px';
          line.style.width = '2px';
          line.style.background = '#e5e4e0';
          line.style.borderRadius = '1px';
          line.style.pointerEvents = 'none';
          el.appendChild(line);
          var lineFill = document.createElement('div');
          lineFill.className = 'blog-overlay-toc-line-fill';
          lineFill.style.position = 'absolute';
          lineFill.style.left = '3px';
          lineFill.style.top = '10px';
          lineFill.style.width = '2px';
          lineFill.style.background = 'var(--bb-accent, #5B4FE8)';
          lineFill.style.borderRadius = '1px';
          lineFill.style.pointerEvents = 'none';
          lineFill.style.transition = 'height 0.15s ease';
          el.appendChild(lineFill);
        }

        function smoothScrollToTocTarget(targetId) {
          if (!targetId) return;
          var targetEl = document.getElementById(targetId);
          if (!targetEl) return;
          var navbarOffset = self._getNavbarOffset ? self._getNavbarOffset() : 0;
          var topOffset = Math.max(0, navbarOffset + 8);
          var scrollTarget = self._getScrollContainer ? self._getScrollContainer() : null;
          if (
            scrollTarget &&
            scrollTarget !== window &&
            scrollTarget !== document.body &&
            scrollTarget !== document.documentElement
          ) {
            var containerRect = scrollTarget.getBoundingClientRect();
            var targetRect = targetEl.getBoundingClientRect();
            var nextTop = scrollTarget.scrollTop + (targetRect.top - containerRect.top) - topOffset;
            scrollTarget.scrollTo({ top: Math.max(0, nextTop), behavior: 'smooth' });
          } else if (typeof window !== 'undefined') {
            var absoluteTop = targetEl.getBoundingClientRect().top + (window.pageYOffset || 0) - topOffset;
            window.scrollTo({ top: Math.max(0, absoluteTop), behavior: 'smooth' });
          }
          requestAnimationFrame(function() { self._updateTocHighlight(); });
        }

        function addTocLink(link, level, prefix) {
          var href = link.getAttribute('href') || '';
          if (/^#toc-\d+$/.test(href)) {
            link.onclick = function(e) {
              e.preventDefault();
              try {
                var tocLinks = el.querySelectorAll('a');
                for (var li = 0; li < tocLinks.length; li++) {
                  var other = tocLinks[li];
                  var active = other === link;
                  other.classList.toggle('blog-overlay-toc-active', active);
                  other.classList.toggle('is-active', active);
                }
              } catch (e2) {}
              smoothScrollToTocTarget(href.slice(1));
            };
          }
          link.classList.add('bb-toc-item');
          if (tocStyle === 'numbered') {
            link.style.paddingLeft = (12 + (level - 1) * 8) + 'px';
            if (prefix) link.textContent = prefix + ' ' + (link.textContent || '');
          } else if (tocStyle === 'connectedDots') {
            var row = document.createElement('div');
            row.className = 'blog-overlay-toc-row';
            var dot = document.createElement('div');
            dot.style.width = '8px';
            dot.style.height = '8px';
            dot.style.borderRadius = '50%';
            dot.style.background = 'var(--bb-border, #e5e4e0)';
            dot.style.flexShrink = '0';
            dot.style.position = 'relative';
            dot.style.zIndex = '1';
            dot.className = 'blog-overlay-toc-dot';
            row.appendChild(dot);
            row.appendChild(link);
            el.appendChild(row);
            return;
          } else if (tocStyle === 'bookmark') {
            if (level > 1) link.style.paddingLeft = (12 + (level - 1) * 8) + 'px';
          }
          el.appendChild(link);
        }

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
              var prefix = tocStyle === 'numbered' ? (hi + 1) + '.' : null;
              addTocLink(tocLink, level, prefix);
            }
          } else {
            var titleLink = document.createElement('a');
            titleLink.href = '#toc-0';
            titleLink.setAttribute('data-analytics-element', 'toc');
            titleLink.textContent = post.title || 'Untitled';
            addTocLink(titleLink, 1, tocStyle === 'numbered' ? '1.' : null);
          }
          if (self._isTocDebugEnabled()) {
            self._tocDebug('createTocModule singlePost done', {
              postTitle: post.title || null,
              bodyHtmlLength: (bodyHtml || '').length,
              headingCount: headings.length,
              tocAnchorsBuilt: el.querySelectorAll('a').length
            });
          }
          self._tocScrollHandler = function() { self._updateTocHighlight(); };
          var scrollTarget = self._getScrollContainer() || window;
          scrollTarget.addEventListener('scroll', self._tocScrollHandler, { passive: true });
          self._tocScrollTarget = scrollTarget;
          requestAnimationFrame(function() { self._updateTocHighlight(); });
          return createSidebarSection('Table of Contents', el, isSinglePost);
        }

        if (self._isTocDebugEnabled()) {
          self._tocDebug('createTocModule collectionBranch', {
            reason: !isSinglePost
              ? 'notSinglePostView'
              : (selectedIndex < 0 ? 'selectedIndexNegative' : 'selectedIndexOutOfRange'),
            isSinglePost: isSinglePost,
            selectedIndex: selectedIndex,
            itemsLength: items.length
          });
        }
        for (var i = 0; i < items.length; i++) {
          var tocItem = items[i];
          var tocUrl = self._getPostUrl(tocItem);
          var tocLink = document.createElement('a');
          tocLink.href = tocUrl || '#post-' + i;
          tocLink.setAttribute('data-post-index', String(i));
          tocLink.setAttribute('data-analytics-element', 'toc');
          tocLink.textContent = tocItem.title || 'Untitled';
          var prefix = tocStyle === 'numbered' ? (i + 1) + '.' : null;
          addTocLink(tocLink, 1, prefix);
        }
        if (self._isTocDebugEnabled()) {
          self._tocDebug('createTocModule collectionList done', { postLinkCount: items.length, tocAnchorsBuilt: el.querySelectorAll('a').length });
        }
        self._tocScrollHandler = function() { self._updateTocHighlight(); };
        var scrollTarget = self._getScrollContainer() || window;
        scrollTarget.addEventListener('scroll', self._tocScrollHandler, { passive: true });
        self._tocScrollTarget = scrollTarget;
        requestAnimationFrame(function() { self._updateTocHighlight(); });
        return createSidebarSection('Table of Contents', el, isSinglePost);
      }
      function createPopularPostsModule(sidebarWidth) {
        if (items.length === 0) return null;
        var pmPop = cfg.postModules && cfg.postModules.popularPosts && typeof cfg.postModules.popularPosts === 'object' ? cfg.postModules.popularPosts : null;
        var cmPop = cfg.collectionModules && cfg.collectionModules.popularPosts && typeof cfg.collectionModules.popularPosts === 'object' ? cfg.collectionModules.popularPosts : null;
        var count = 3;
        var el = document.createElement('aside');
        el.className = 'blog-overlay-popular-posts';
        el.style.flexShrink = '0';
        el.style.width = (sidebarWidth || 220) + 'px';
        var others = [];
        for (var oi = 0; oi < items.length; oi++) {
          if (!(isSinglePost && selectedIndex >= 0 && oi === selectedIndex)) others.push(items[oi]);
        }
        if (others.length === 0) return null;
        var ranked = others.slice();
        var pvc = postViewCounts;
        if (pvc && typeof pvc === 'object' && Object.keys(pvc).length > 0) {
          ranked.sort(function(a, b) {
            var idA = String(a.id || a.fullUrl || a.title || '');
            var idB = String(b.id || b.fullUrl || b.title || '');
            var viewsA = idA ? (parseInt(pvc[idA], 10) || 0) : 0;
            var viewsB = idB ? (parseInt(pvc[idB], 10) || 0) : 0;
            return viewsB - viewsA;
          });
        } else {
          ranked.sort(function(a, b) {
            var tsA = a.publishedOn || a.publishOn || a.addedOn || 0;
            var tsB = b.publishedOn || b.publishOn || b.addedOn || 0;
            return (tsB || 0) - (tsA || 0);
          });
        }
        var popularItems = ranked.slice(0, count);
        for (var r = 0; r < popularItems.length; r++) {
          var ppPost = popularItems[r];
          var ppIdx = self._postIndexInItems(items, ppPost, itemIndexMap);
          var ppCard = self._createModulePostCard(ppPost, {
            variant: 'list',
            items: items,
            itemIndexMap: itemIndexMap,
            placeholderMap: placeholderMap,
            postIndex: ppIdx,
            analyticsElement: 'popularPosts',
            cfg: cfg,
            onSinglePostView: isSinglePost
          });
          if (!ppCard) continue;
          var ppEntry = document.createElement('div');
          ppEntry.style.marginBottom = '14px';
          ppEntry.appendChild(ppCard);
          el.appendChild(ppEntry);
        }
        return createSidebarSection('Popular Posts', el, isSinglePost);
      }
      function createRecentPostsModule(sidebarWidth) {
        if (items.length === 0) return null;
        var el = document.createElement('aside');
        el.className = 'blog-overlay-recent-posts';
        el.style.flexShrink = '0';
        el.style.width = (sidebarWidth || 220) + 'px';
        var recentItems = items.slice(0, Math.max(1, Math.min(3, recentPostsCount)));
        for (var r = 0; r < recentItems.length; r++) {
          var rpPost = recentItems[r];
          var rpIdx = self._postIndexInItems(items, rpPost, itemIndexMap);
          var rpCard = self._createModulePostCard(rpPost, {
            variant: 'list',
            items: items,
            itemIndexMap: itemIndexMap,
            placeholderMap: placeholderMap,
            postIndex: rpIdx >= 0 ? rpIdx : r,
            analyticsElement: 'recentPosts',
            cfg: cfg,
            onSinglePostView: isSinglePost
          });
          if (!rpCard) continue;
          var rpEntry = document.createElement('div');
          rpEntry.style.marginBottom = '14px';
          rpEntry.appendChild(rpCard);
          el.appendChild(rpEntry);
        }
        return createSidebarSection('Recent Posts', el);
      }
      function relevantPostFooterFirstLine(post) {
        var t = self._plainTextFromBlogHtml(post.body || post.excerpt || '').replace(/\r/g, '').trim();
        if (!t) return '';
        var lines = t.split('\n');
        for (var li = 0; li < lines.length; li++) {
          var L = lines[li].trim();
          if (L) return self._truncateText(L, 160);
        }
        return self._truncateText(t, 160);
      }
      function createRelevantPostsModule(sidebarWidth, opts) {
        var isFooter = opts && opts.variant === 'footer';
        if (items.length === 0) return null;
        var pool = isSinglePost && selectedIndex >= 0
          ? items.filter(function(_, i) { return i !== selectedIndex; })
          : items.slice();
        var limit = 3;
        var relevantItems = pool.slice(0, limit);
        if (relevantItems.length === 0) return null;

        if (isFooter) {
          var grid = document.createElement('div');
          grid.className = 'blog-overlay-relevant-posts blog-overlay-relevant-posts--footer';
          grid.style.display = 'grid';
          grid.style.gridTemplateColumns = 'repeat(3, minmax(0, 1fr))';
          grid.style.gap = '20px';
          grid.style.width = '100%';
          grid.style.maxWidth = '100%';
          grid.style.boxSizing = 'border-box';
          for (var rf = 0; rf < relevantItems.length; rf++) {
            var fp = relevantItems[rf];
            var fIdx = self._postIndexInItems(items, fp, itemIndexMap);
            if (fIdx < 0) continue;
            var card = self._createModulePostCard(fp, {
              variant: 'footer',
              items: items,
              itemIndexMap: itemIndexMap,
              placeholderMap: placeholderMap,
              postIndex: fIdx,
              analyticsElement: 'relevantPosts',
              deckText: relevantPostFooterFirstLine(fp),
              cfg: cfg,
              onSinglePostView: isSinglePost
            });
            if (card) grid.appendChild(card);
          }
          var footSection = document.createElement('div');
          footSection.className = 'blog-overlay-sidebar-section blog-overlay-more-to-read';
          footSection.style.borderTop = '1px solid var(--bb-border, #e5e4e0)';
          footSection.style.marginTop = '48px';
          footSection.style.paddingTop = '24px';
          var footHead = document.createElement('h2');
          footHead.className = 'bb-below-main-heading';
          footHead.textContent = 'More to Read';
          footSection.appendChild(footHead);
          footSection.appendChild(grid);
          return footSection;
        }

        var el = document.createElement('aside');
        el.className = 'blog-overlay-relevant-posts';
        el.style.flexShrink = '0';
        el.style.width = (sidebarWidth || 220) + 'px';
        for (var r = 0; r < relevantItems.length; r++) {
          var rpIdx = self._postIndexInItems(items, relevantItems[r], itemIndexMap);
          if (rpIdx < 0) continue;
          var rpPost = relevantItems[r];
          var rpCard = self._createModulePostCard(rpPost, {
            variant: 'list',
            items: items,
            itemIndexMap: itemIndexMap,
            placeholderMap: placeholderMap,
            postIndex: rpIdx,
            analyticsElement: 'relevantPosts',
            cfg: cfg,
            onSinglePostView: isSinglePost
          });
          if (!rpCard) continue;
          var rpEntry = document.createElement('div');
          rpEntry.style.marginBottom = '14px';
          rpEntry.appendChild(rpCard);
          el.appendChild(rpEntry);
        }
        return createSidebarSection('Related Posts', el, isSinglePost);
      }
      function createPrevNextArticleModule() {
        var activeIdx = -1;
        if (selectedIndex >= 0 && selectedIndex < items.length) {
          activeIdx = selectedIndex;
        } else if (displayItems && displayItems.length === 1) {
          var idxFromDisplay = self._postIndexInItems(items, displayItems[0], itemIndexMap);
          if (idxFromDisplay >= 0) activeIdx = idxFromDisplay;
        } else if (self._previewMode && self.config && typeof self.config.previewSelectedPostIndex === 'number') {
          activeIdx = Math.min(Math.max(0, self.config.previewSelectedPostIndex), Math.max(0, items.length - 1));
        }
        if (activeIdx < 0 || activeIdx >= items.length) return null;
        var prev = activeIdx > 0 ? items[activeIdx - 1] : null;
        var next = activeIdx < items.length - 1 ? items[activeIdx + 1] : null;
        if (!prev && !next) return null;

        function halfCell(postObj, side) {
          var cell = document.createElement(postObj ? 'a' : 'div');
          cell.className = 'blog-overlay-prev-next-col' + (side === 'next' ? ' blog-overlay-prev-next-col--next' : '');
          if (!postObj) {
            cell.setAttribute('aria-hidden', 'true');
            return cell;
          }
          var idx = self._postIndexInItems(items, postObj, itemIndexMap);
          cell.href = self._getPostUrl(postObj) || '#post-' + idx;
          cell.setAttribute('data-analytics-element', side === 'prev' ? 'previousArticle' : 'nextArticle');

          var navEl = document.createElement('div');
          navEl.className = 'blog-overlay-prev-next-label';
          navEl.textContent = side === 'prev' ? 'Previous' : 'Next';
          cell.appendChild(navEl);

          var cats = self._getPostCategories(postObj);
          if (cats.length > 0) {
            var catEl = document.createElement('div');
            catEl.className = 'bb-category-label blog-overlay-prev-next-category';
            catEl.textContent = cats[0];
            cell.appendChild(catEl);
          }

          var titleEl = document.createElement('div');
          titleEl.className = 'blog-overlay-prev-next-title';
          titleEl.textContent = postObj.title || 'Untitled';
          cell.appendChild(titleEl);
          return cell;
        }

        var el = document.createElement('nav');
        el.className = 'blog-overlay-prev-next';
        el.setAttribute('aria-label', 'Previous and next articles');
        el.appendChild(halfCell(prev, 'prev'));
        el.appendChild(halfCell(next, 'next'));
        return el;
      }
      function createEmailCaptureForm(ecCfg, width, hideHeader, placement) {
        if (!ecCfg) return null;
        if (placement !== 'footer' && !ecCfg.header) return null;

        function wireEmailCaptureSubmit(emailInput, btn, msgEl) {
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
        }

        if (placement === 'footer') {
          var headerText = ecCfg.header || 'Subscribe to our newsletter';
          var outer = document.createElement('div');
          outer.className = 'blog-overlay-email-capture blog-overlay-email-capture-footer bb-footer-card';
          if (self._isStoryPostLayout(cfg)) {
            outer.classList.add('blog-overlay-email-capture-footer--story');
          }
          outer.style.width = '100%';
          var footerWidth = typeof width === 'number' ? width : parseInt(width, 10);
          outer.style.maxWidth = (footerWidth && footerWidth > 0) ? footerWidth + 'px' : '100%';
          outer.style.display = 'flex';
          outer.style.flexDirection = 'column';
          outer.style.gap = '10px';

          var row = document.createElement('div');
          row.className = 'bb-newsletter-footer-row';

          var leftCol = document.createElement('div');
          leftCol.className = 'bb-newsletter-footer-copy';
          var titleFooter = document.createElement('h3');
          titleFooter.className = 'bb-newsletter-heading';
          titleFooter.textContent = headerText;
          titleFooter.style.lineHeight = '1.3';
          leftCol.appendChild(titleFooter);
          if (ecCfg.byline && ecCfg.byline.trim()) {
            var bylineFooter = document.createElement('div');
            bylineFooter.textContent = ecCfg.byline;
            bylineFooter.style.fontSize = '0.85rem';
            bylineFooter.style.color = '#666';
            bylineFooter.style.marginTop = '6px';
            bylineFooter.style.lineHeight = '1.45';
            leftCol.appendChild(bylineFooter);
          }
          row.appendChild(leftCol);

          var rightCol = document.createElement('div');
          rightCol.className = 'bb-newsletter-footer-form';

          var emailInputF = document.createElement('input');
          emailInputF.type = 'email';
          emailInputF.name = 'bb-newsletter-email-footer';
          emailInputF.id = 'bb-newsletter-email-footer';
          emailInputF.setAttribute('autocomplete', 'section-newsletter email');
          emailInputF.placeholder = 'you@example.com';
          emailInputF.setAttribute('aria-label', 'Email address');
          emailInputF.className = 'bb-form-input';
          var btnF = document.createElement('button');
          btnF.textContent = ecCfg.buttonText || 'Subscribe';
          btnF.type = 'button';
          btnF.className = 'sqs-button-element--primary';
          btnF.style.flexShrink = '0';
          rightCol.appendChild(emailInputF);
          rightCol.appendChild(btnF);
          row.appendChild(rightCol);

          outer.appendChild(row);

          var msgFooter = document.createElement('div');
          msgFooter.style.fontSize = '0.85rem';
          msgFooter.style.textAlign = 'right';
          msgFooter.style.width = '100%';
          outer.appendChild(msgFooter);

          wireEmailCaptureSubmit(emailInputF, btnF, msgFooter);
          return outer;
        }

        var wrap = document.createElement('div');
        wrap.className = 'blog-overlay-email-capture';
        wrap.style.width = '100%';
        wrap.style.maxWidth = (width || 280) + 'px';
        if (!hideHeader) {
          var headerEl = document.createElement('div');
          headerEl.className = 'bb-newsletter-heading';
          headerEl.textContent = ecCfg.header || 'Subscribe to our newsletter';
          headerEl.style.marginBottom = '8px';
          wrap.appendChild(headerEl);
        }
        if (ecCfg.byline && ecCfg.byline.trim()) {
          var bylineEl = document.createElement('div');
          bylineEl.textContent = ecCfg.byline;
          bylineEl.style.fontSize = '0.85rem';
          bylineEl.style.color = 'var(--bb-muted,#666)';
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
        self._applyChromeInputStyle(emailInput);
        form.appendChild(emailInput);
        var btn = document.createElement('button');
        btn.textContent = ecCfg.buttonText || 'Subscribe';
        btn.type = 'button';
        btn.className = 'bb-newsletter-btn';
        btn.onmouseover = function() { btn.style.filter = 'brightness(0.92)'; };
        btn.onmouseout = function() { btn.style.filter = ''; };
        var msgEl = document.createElement('div');
        msgEl.style.fontSize = '0.85rem';
        msgEl.style.marginTop = '4px';
        form.appendChild(btn);
        form.appendChild(msgEl);
        wrap.appendChild(form);
        wireEmailCaptureSubmit(emailInput, btn, msgEl);
        return wrap;
      }
      function createLeadMagnetForm(lmCfg, width, hideHeader) {
        if (!lmCfg) return null;
        var resourceTitle = (lmCfg.resourceTitle && lmCfg.resourceTitle.trim()) ? lmCfg.resourceTitle.trim() : 'Lead Magnet';
        var wrap = document.createElement('div');
        wrap.className = 'blog-overlay-lead-magnet';
        wrap.style.width = '100%';
        wrap.style.maxWidth = (width || 280) + 'px';
        if (!hideHeader) {
          var titleEl = document.createElement('div');
          titleEl.textContent = resourceTitle;
          titleEl.style.fontSize = '0.95rem';
          titleEl.style.fontWeight = '600';
          titleEl.style.marginBottom = '8px';
          wrap.appendChild(titleEl);
        }
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
        btn.style.background = siteAccentUi;
        btn.style.color = 'white';
        btn.style.border = 'none';
        btn.style.borderRadius = '6px';
        btn.style.cursor = 'pointer';
        btn.onmouseover = function() { btn.style.filter = 'brightness(0.92)'; };
        btn.onmouseout = function() { btn.style.filter = ''; };
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
            body: JSON.stringify({ siteKey: siteKey, type: 'lead_magnet', email: email, resourceTitle: resourceTitle }),
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
      function createLeadMagnetFooterCard(lmCfg) {
        if (!lmCfg) return null;
        var resourceTitle = (lmCfg.resourceTitle && lmCfg.resourceTitle.trim()) ? lmCfg.resourceTitle.trim() : 'Lead Magnet';
        var buttonText = (lmCfg.buttonText && lmCfg.buttonText.trim()) ? lmCfg.buttonText.trim() : 'Get it free';
        var description = (lmCfg.description && lmCfg.description.trim()) ? lmCfg.description.trim() : '';

        var card = document.createElement('div');
        card.className = 'blog-overlay-lead-magnet-footer bb-lead-magnet-card';
        card.style.width = '100%';
        card.style.maxWidth = '100%';

        var title = document.createElement('h3');
        title.className = 'bb-lead-magnet-header';
        title.textContent = resourceTitle;
        card.appendChild(title);
        if (description) {
          var desc = document.createElement('p');
          desc.className = 'bb-lead-magnet-subtitle';
          desc.textContent = description;
          card.appendChild(desc);
        }

        var formRow = document.createElement('div');
        formRow.style.display = 'flex';
        formRow.style.gap = '12px';
        formRow.style.alignItems = 'center';
        formRow.style.flexWrap = 'wrap';
        formRow.style.width = '100%';
        var emailInput = document.createElement('input');
        emailInput.type = 'email';
        emailInput.name = 'bb-lead-magnet-footer-email';
        emailInput.id = 'bb-lead-magnet-footer-email';
        emailInput.className = 'bb-form-input';
        emailInput.placeholder = 'you@example.com';
        emailInput.setAttribute('aria-label', 'Email address');
        emailInput.style.flex = '1 1 240px';
        emailInput.style.minWidth = '0';
        formRow.appendChild(emailInput);

        var btn = document.createElement('button');
        btn.className = 'sqs-button-element--primary';
        btn.textContent = buttonText;
        btn.type = 'button';
        btn.style.flexShrink = '0';
        formRow.appendChild(btn);
        card.appendChild(formRow);

        var msgEl = document.createElement('div');
        msgEl.style.fontSize = '0.85rem';
        msgEl.style.width = '100%';
        card.appendChild(msgEl);

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
            btn.textContent = buttonText;
            return;
          }
          var url = baseUrl.replace(/\/+$/, '') + '/api/capture';
          fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ siteKey: siteKey, type: 'lead_magnet', email: email, resourceTitle: resourceTitle }),
            credentials: 'omit'
          }).then(function(res) {
            return res.json().then(function(data) { return { ok: res.ok, data: data }; });
          }).catch(function() { return { ok: false, data: { error: 'Network error' } }; }).then(function(result) {
            btn.disabled = false;
            btn.textContent = buttonText;
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

        return card;
      }
      var ecCfg = isSinglePost
        ? ((cfg.postModules && cfg.postModules.emailCapture) || (cfg.collectionModules && cfg.collectionModules.emailCapture))
        : ((cfg.collectionModules && cfg.collectionModules.emailCapture) || (cfg.postModules && cfg.postModules.emailCapture));
      var lmCfg = isSinglePost
        ? ((cfg.postModules && cfg.postModules.leadMagnet) || (cfg.collectionModules && cfg.collectionModules.leadMagnet))
        : ((cfg.collectionModules && cfg.collectionModules.leadMagnet) || (cfg.postModules && cfg.postModules.leadMagnet));
      function buildSidebarModules(sidebarCfg, zoneLabel) {
        if (zoneLabel == null) zoneLabel = '';
        if (!sidebarCfg || !sidebarCfg.show) {
          if (self._isTocDebugEnabled() && zoneLabel) {
            var sm = sidebarCfg && sidebarCfg.modules;
            var som = sidebarCfg && sidebarCfg.moduleOrder;
            var wantsToc = (Array.isArray(sm) && sm.indexOf('tableOfContents') >= 0) ||
              (Array.isArray(som) && som.indexOf('tableOfContents') >= 0);
            if (wantsToc) {
              self._tocDebug('buildSidebarModules skippedShowFalse', {
                zone: zoneLabel,
                sidebarShow: sidebarCfg ? sidebarCfg.show : null,
                modules: sm,
                moduleOrder: som
              });
            }
          }
          return [];
        }
        var avail = Array.isArray(sidebarCfg.modules) ? sidebarCfg.modules : [];
        var mo = Array.isArray(sidebarCfg.moduleOrder) ? sidebarCfg.moduleOrder : [];
        /* Match Configure effectiveZoneModuleOrder + _orderedZoneModules: header honors moduleOrder vs modules, but
           an empty modules array with a non-empty moduleOrder must still resolve (otherwise e.g. TOC never renders). */
        var moduleIds;
        if (!isSinglePost && cfg.collectionModules) {
          var resolvedZoneModules = self._resolveCollectionZoneModuleIds(avail, mo, 'sidebar', cfg.collectionModules);
          moduleIds = (mo.length > 0 && avail.length === 0) ? resolvedZoneModules.slice() : self._orderedZoneModules(resolvedZoneModules, resolvedZoneModules);
        } else {
          moduleIds = (mo.length > 0 && avail.length === 0) ? mo.slice() : self._orderedZoneModules(avail, mo);
        }
        var tocWanted = (Array.isArray(avail) && avail.indexOf('tableOfContents') >= 0) ||
          (Array.isArray(mo) && mo.indexOf('tableOfContents') >= 0);
        var tocInResolved = moduleIds && moduleIds.indexOf('tableOfContents') >= 0;
        if (self._isTocDebugEnabled() && zoneLabel && tocWanted) {
          self._tocDebug('buildSidebarModules toc path', {
            zone: zoneLabel,
            show: sidebarCfg.show,
            modulesRaw: avail.slice(),
            moduleOrderRaw: mo.slice(),
            moduleIdsResolved: moduleIds ? moduleIds.slice() : [],
            tocInResolved: tocInResolved
          });
        }
        if (!tocWanted && self._isTocDebugEnabled() && zoneLabel && moduleIds && moduleIds.indexOf('tableOfContents') >= 0) {
          self._tocDebug('buildSidebarModules resolved', {
            zone: zoneLabel,
            show: sidebarCfg.show,
            modulesRaw: avail.slice(),
            moduleOrderRaw: mo.slice(),
            moduleIdsResolved: moduleIds.slice()
          });
        }
        if (!moduleIds || moduleIds.length === 0) {
          if (self._isTocDebugEnabled() && zoneLabel) {
            self._tocDebug('buildSidebarModules empty', { zone: zoneLabel, show: sidebarCfg.show, modules: avail, moduleOrder: mo });
          }
          return [];
        }
        self._warnDuplicateValues('sidebar', moduleIds);
        var width = Math.min(400, Math.max(160, sidebarCfg.width || (isSinglePost ? 300 : 240)));
        if (featurePostLayout) width = 300;
        var mods = [];
        var hideRecentPostsInBbPreview = self._bbPreview && isSinglePost;
        for (var m = 0; m < moduleIds.length; m++) {
          var mod = moduleIds[m];
          if (hideRecentPostsInBbPreview && mod === 'recentPosts') continue;
          if (mod === 'tableOfContents' && isSinglePost && self._isStoryPostLayout(cfg)) continue;
          var el = null;
          if (mod === 'tableOfContents') {
            el = createTocModule(width);
            if (!el && self._isTocDebugEnabled()) {
              self._tocDebug('buildSidebarModules tableOfContentsReturnedNull', { zone: zoneLabel });
            }
          } else if (mod === 'recentPosts') el = createRecentPostsModule(width);
          else if (mod === 'popularPosts') el = createPopularPostsModule(width);
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
            searchInput.onfocus = function() {
              searchInput.style.borderColor = siteAccentUi;
              searchInput.style.boxShadow = '0 0 0 2px color-mix(in srgb, ' + siteAccentUi + ' 22%, transparent)';
            };
            searchInput.onblur = function() { searchInput.style.borderColor = '#ddd'; searchInput.style.boxShadow = ''; };
            searchInput.oninput = function() {
              self._searchQuery = searchInput.value;
              self._scheduleSearchDrivenRender();
            };
            searchInput.onkeydown = function(e) {
              if (e.key === 'Escape') {
                self._clearPendingSearchRender();
                searchInput.value = '';
                self._searchQuery = '';
                self._currentPage = 1;
                self._renderContent(self.items);
                searchInput.blur();
              }
            };
            searchInput.className = 'blog-overlay-search-input';
            searchWrap.appendChild(searchInput);
            el = createSidebarSection('Search Posts', searchWrap);
          } else if (mod === 'filterByCategory') {
            el = createSidebarSection('Categories', self._createFilterByCategoryModule(items, width || 200, true, 'sidebar'));
          } else if (mod === 'filterByTag') {
            el = createSidebarSection('Tags', self._createFilterByTagModule(items, width || 200, true, 'sidebar'));
          } else if (mod === 'filterByTagsAndCategories') {
            var legacyCatEl = self._createFilterByCategoryModule(items, width || 200, true, 'sidebar');
            if (legacyCatEl) mods.push(createSidebarSection('Categories', legacyCatEl));
            var legacyTagEl = self._createFilterByTagModule(items, width || 200, true, 'sidebar');
            el = legacyTagEl ? createSidebarSection('Tags', legacyTagEl) : null;
          } else if (mod === 'postSort') {
            el = createSidebarSection('Sort Posts', self._createPostSortModule(cfg, width || 200, true));
          } else if (mod === 'authorProfiles') {
            var authorPost = (isSinglePost && displayItems.length > 0) ? displayItems[0] : null;
            var authorResult = self._createAuthorProfilesModule(authorPost, cfg, width || 200);
            el = authorResult ? createSidebarSection(authorResult.header, authorResult.content, isSinglePost) : null;
          } else if (mod === 'emailCapture' && ecCfg) {
            var ecForm = createEmailCaptureForm(ecCfg, width, isSinglePost);
            el = ecForm ? createSidebarSection(ecCfg.header || 'Email Capture', ecForm, isSinglePost) : null;
          } else if (mod === 'leadMagnet' && lmCfg) {
            var lmForm = createLeadMagnetForm(lmCfg, width, isSinglePost);
            el = lmForm ? createSidebarSection(lmCfg.resourceTitle || 'Lead Magnet', lmForm, isSinglePost) : null;
          }
          if (el) mods.push(el);
        }
        return mods;
      }
      var leftModules = buildSidebarModules(leftSidebarCfg, 'left');
      var rightModules = buildSidebarModules(rightSidebarCfg, 'right');

      if (collectionLayout === 'editorial') {
        var posts = displayItemsForLoop;
        var paywallReplaceEditorial = Boolean(vs.paywallReplaceCollectionTeaser);
        /* Mobile striping: real phones use the viewport. Configure / bbPreview use a wide window with a narrow overlay root (~375px), so also use root width and optional previewDevice. */
        var editorialMobile = false;
        var narrowByViewport = false;
        var overlayW = 0;
        try {
          if (typeof window !== 'undefined') {
            narrowByViewport = window.matchMedia
              ? window.matchMedia('(max-width: 767px)').matches
              : window.innerWidth <= 767;
          }
        } catch (eVp) {
          narrowByViewport = typeof window !== 'undefined' && window.innerWidth <= 767;
        }
        try {
          if (root && root.getBoundingClientRect) {
            overlayW = Math.round(root.getBoundingClientRect().width) || 0;
          }
          if (!overlayW && root && root.clientWidth) overlayW = root.clientWidth;
        } catch (eOw) {
          overlayW = 0;
        }
        var previewDeviceMobile = Boolean(
          self.config && self.config.previewDevice === 'mobile' &&
          (self._previewMode || self._bbPreview)
        );
        editorialMobile =
          narrowByViewport ||
          previewDeviceMobile ||
          (overlayW > 0 && overlayW <= 767);

        var makeEditorialCard = function(p, isLarge, mobilePairCard) {
          var gatedEditorialCard =
            paywallReplaceEditorial && !isSinglePost && !self._isPaywallPublicPreviewPost(p);
          var cardUrl = p.assetUrl || p.thumbnailUrl || (p.assets && p.assets[0] && p.assets[0].assetUrl) || null;
          if (cardUrl && self._isPlaceholderWithMap(cardUrl, placeholderMap)) cardUrl = null;
          var bgStyle = self._featuredImageAreaBackground(cardUrl, placeholderMap, p, items);
          var link = document.createElement('a');
          link.href = self._getPostUrl(p) || (self._bbPreview ? '#post-' + self._postIndexInItems(items, p, itemIndexMap) : '#');
          link.style.position = 'relative';
          link.style.overflow = 'hidden';
          link.style.textDecoration = 'none';
          link.style.color = 'inherit';
          link.style.width = '100%';
          link.style.height = '100%';
          link.style.minHeight = '0';
          if (mobilePairCard) {
            link.style.display = 'grid';
            link.style.gridTemplateRows = 'subgrid';
            link.style.gridRow = '1 / -1';
            link.className = 'blog-overlay-editorial-card blog-overlay-editorial-card-mobile-pair';
          } else {
            link.style.display = 'block';
          }
          var bg = document.createElement('div');
          bg.style.position = 'absolute';
          bg.style.inset = '0';
          bg.style.background = bgStyle;
          bg.style.transition = 'transform 0.4s';
          bg.style.zIndex = '0';
          link.onmouseover = function() { bg.style.transform = 'scale(1.03)'; };
          link.onmouseout = function() { bg.style.transform = 'scale(1)'; };
          var overlay = document.createElement('div');
          overlay.style.position = 'absolute';
          overlay.style.inset = '0';
          overlay.style.background = self._getCollectionStyleTokens().imageGradient;
          overlay.style.zIndex = '1';
          overlay.style.pointerEvents = 'none';
          var edMoImageCorner = null;
          if (gatedEditorialCard) {
            self._appendPaywallCardImageLock(link, { compact: true });
            edMoImageCorner = self._createMembersOnlyTeaserLabel({ subscribeButton: false, imageOverlay: true });
            edMoImageCorner.style.position = 'absolute';
            edMoImageCorner.style.top = '12px';
            edMoImageCorner.style.left = '12px';
            edMoImageCorner.style.right = 'auto';
            edMoImageCorner.style.zIndex = '5';
            edMoImageCorner.style.marginTop = '0';
            edMoImageCorner.style.maxWidth = 'calc(100% - 24px)';
          }
          var title = document.createElement('h2');
          title.className = 'blog-overlay-title blog-overlay-editorial-card-title';
          self._applyTitleStyle(title, { size: isLarge ? 'lg' : 'std', onImage: true, margin: '0' });
          title.textContent = p.title || 'Untitled';
          if (!isSinglePost && faCfg && faCfg.show && faCfg.position === 'inLayout' && featuredPost) {
            var edFpK = displayPostKey(featuredPost);
            var edPk = displayPostKey(p);
            if (p === featuredPost || (edFpK && edPk === edFpK)) {
              var edBadge = self._createFeaturedBadge({
                tagName: 'div',
                absolute: true,
                top: '14px',
                left: '14px',
                zIndex: '4'
              });
              link.appendChild(edBadge);
            }
          }
          var metaParts = [];
          if (showDate) { var ds = self._getDate(p); if (ds) metaParts.push(ds); }
          if (showAuthor) { var as = self._getAuthorsForPost(p, cfg); if (as) metaParts.push(as); }
          if (showReadingTime) {
            var minsGrid = self._getReadingTimeMinutes(p.body);
            metaParts.push(minsGrid === 1 ? '1 min read' : minsGrid + ' min read');
          }
          var meta = document.createElement('div');
          meta.className = 'blog-overlay-editorial-card-meta';
          self._applyMetaStyle(meta, { onImage: true });
          meta.textContent = metaParts.join(' · ');
          var edCategoriesLine = self._createCollectionPostCategoriesLine(
            p,
            siteAccentForPostCats,
            categoryFilterUiEnabled,
            { onDark: true, compact: !isLarge }
          );
          if (mobilePairCard) {
            var edSpacer = document.createElement('div');
            edSpacer.className = 'blog-overlay-editorial-card-spacer';
            edSpacer.setAttribute('aria-hidden', 'true');
            edSpacer.style.gridRow = '1';
            edSpacer.style.minHeight = '0';
            edSpacer.style.zIndex = '2';

            var edAboveTitle = document.createElement('div');
            edAboveTitle.className = 'blog-overlay-editorial-card-above-title';
            edAboveTitle.style.gridRow = '2';
            edAboveTitle.style.zIndex = '2';
            edAboveTitle.style.padding = '0 18px';
            edAboveTitle.style.display = 'flex';
            edAboveTitle.style.flexDirection = 'column';
            edAboveTitle.style.gap = '5px';
            edAboveTitle.style.boxSizing = 'border-box';
            edAboveTitle.style.alignSelf = 'start';
            if (edCategoriesLine) {
              edCategoriesLine.style.marginBottom = '0';
              edAboveTitle.appendChild(edCategoriesLine);
            }

            title.style.margin = '0';
            title.style.padding = '0';
            meta.style.margin = '0';
            meta.style.padding = '0';
            meta.style.lineHeight = '1.35';

            var edTitleBlock = document.createElement('div');
            edTitleBlock.className = 'blog-overlay-editorial-card-title-block';
            edTitleBlock.style.gridRow = '3';
            edTitleBlock.style.zIndex = '2';
            edTitleBlock.style.display = 'flex';
            edTitleBlock.style.flexDirection = 'column';
            edTitleBlock.style.alignItems = 'flex-start';
            edTitleBlock.style.alignSelf = 'start';
            edTitleBlock.style.justifyContent = 'flex-start';
            edTitleBlock.style.gap = '5px';
            edTitleBlock.style.padding = '0 18px 16px';
            edTitleBlock.style.boxSizing = 'border-box';
            edTitleBlock.style.width = '100%';
            edTitleBlock.style.minHeight = '0';
            edTitleBlock.appendChild(title);
            edTitleBlock.appendChild(meta);

            link.appendChild(bg);
            link.appendChild(overlay);
            if (edMoImageCorner) link.appendChild(edMoImageCorner);
            link.appendChild(edSpacer);
            link.appendChild(edAboveTitle);
            link.appendChild(edTitleBlock);
          } else {
            var content = document.createElement('div');
            content.style.position = 'absolute';
            content.style.bottom = '0';
            content.style.left = '0';
            content.style.right = '0';
            content.style.zIndex = '2';
            var edMobileSingleRow = editorialMobile && isLarge && !mobilePairCard;
            if (edMobileSingleRow && gatedEditorialCard) {
              content.style.padding = '14px 16px';
              title.style.fontSize = '18px';
              title.style.lineHeight = '1.08';
              meta.style.marginTop = '3px';
              meta.style.fontSize = '10px';
              meta.style.lineHeight = '1.2';
            } else {
              content.style.padding = isLarge ? '28px' : '16px 18px';
              meta.style.marginTop = isLarge ? '8px' : '5px';
            }
            if (edCategoriesLine) {
              edCategoriesLine.style.marginBottom =
                (edMobileSingleRow && gatedEditorialCard) ? '4px' : (isLarge ? '8px' : '5px');
              content.appendChild(edCategoriesLine);
            }
            content.appendChild(title);
            content.appendChild(meta);
            link.appendChild(bg);
            link.appendChild(overlay);
            if (edMoImageCorner) link.appendChild(edMoImageCorner);
            link.appendChild(content);
          }
          var idx = displayItems.indexOf(p);
          if (idx >= 0) link.setAttribute('data-display-index', String(idx));
          if (!isSinglePost) {
            var edPostIdx = self._postIndexInItems(items, p, itemIndexMap);
            link.setAttribute('data-analytics-element', 'postTitle');
            link.setAttribute('data-post-index', String(edPostIdx));
            if (hasSearchQuery && searchQuery) {
              link.setAttribute('data-search-term', searchQuery);
            }
          }
          return link;
        };

        if (editorialMobile) {
          /* Narrow viewports: equal-height rows alternating one full-width card, then two equal columns (matches Tailwind md breakpoint at 768px). */
          var pi = 0;
          var stripe = 0;
          while (pi < posts.length) {
            var edRow = document.createElement('div');
            edRow.className = 'blog-overlay-editorial-row';
            edRow.style.display = 'grid';
            edRow.style.gridTemplateRows = '1fr';
            edRow.style.gap = '2px';
            edRow.style.width = '100%';
            edRow.style.maxWidth = '100%';
            edRow.style.boxSizing = 'border-box';
            edRow.style.aspectRatio = '2 / 1';
            edRow.style.minHeight = '220px';
            if (stripe % 2 === 0) {
              edRow.style.gridTemplateColumns = '1fr';
              var pSingle = posts[pi];
              pi += 1;
              edRow.appendChild(makeEditorialCard(pSingle, true));
            } else {
              /* Subgrid rows: image fill, optional badges, title+meta stack (titles align; meta wraps naturally). */
              edRow.style.gridTemplateRows = 'minmax(0, 1fr) auto auto';
              edRow.style.gridTemplateColumns = '1fr 1fr';
              var pFirst = posts[pi];
              pi += 1;
              var cFirst = makeEditorialCard(pFirst, false, true);
              edRow.appendChild(cFirst);
              if (pi < posts.length) {
                var pSecond = posts[pi];
                pi += 1;
                edRow.appendChild(makeEditorialCard(pSecond, false, true));
              } else {
                cFirst.style.gridColumn = '1 / -1';
              }
            }
            stripe += 1;
            edRow.style.marginBottom = pi < posts.length ? '2px' : '24px';
            main.appendChild(edRow);
          }
        } else {
          var batchSize = 3;
          for (var bi = 0; bi < posts.length; bi += batchSize) {
            var batch = posts.slice(bi, bi + batchSize);
            var rowA = (bi / batchSize) % 2 === 0;
            var row = document.createElement('div');
            row.className = 'blog-overlay-editorial-row';
            row.style.display = 'grid';
            row.style.gridTemplateColumns = rowA ? '2fr 1fr' : '1fr 2fr';
            row.style.gridTemplateRows = '1fr';
            row.style.gap = '2px';
            row.style.marginBottom = (bi + batchSize < posts.length ? '2px' : '24px');
            row.style.width = '100%';
            row.style.maxWidth = '100%';
            row.style.boxSizing = 'border-box';
            row.style.aspectRatio = '2 / 1';
            row.style.minHeight = '220px';
            var stack = document.createElement('div');
            stack.style.display = 'grid';
            stack.style.gridTemplateRows = '1fr 1fr';
            stack.style.gap = '2px';
            stack.style.minHeight = '0';
            stack.style.height = '100%';
            stack.style.alignSelf = 'stretch';
            var bigPost = batch[0];
            var smallPosts = batch.slice(1);
            if (rowA) {
              if (bigPost) {
                var bigCard = makeEditorialCard(bigPost, true);
                if (smallPosts.length === 0) bigCard.style.gridColumn = '1 / -1';
                row.appendChild(bigCard);
              }
              for (var si = 0; si < smallPosts.length; si++) stack.appendChild(makeEditorialCard(smallPosts[si], false));
              if (smallPosts.length > 0) row.appendChild(stack);
            } else {
              for (var sj = 0; sj < smallPosts.length; sj++) stack.appendChild(makeEditorialCard(smallPosts[sj], false));
              if (smallPosts.length > 0) row.appendChild(stack);
              if (bigPost) {
                var bigCard2 = makeEditorialCard(bigPost, true);
                if (smallPosts.length === 0) bigCard2.style.gridColumn = '1 / -1';
                row.appendChild(bigCard2);
              }
            }
            main.appendChild(row);
          }
        }
      } else if (collectionLayout === 'showcase') {
        this._renderShowcasePostsIntoMain(main, items, vs, placeholderMap, navbarOffset);
      } else {
          var headerZoneRef = { current: headerZoneEl };
          this._renderStandardPostListIntoMain(main, items, vs, placeholderMap, navbarOffset, ensureSinglePostHeaderInnerEl, headerZoneRef);
          headerZoneEl = headerZoneRef.current;
      }


          if (displayItems.length === 0) {
            var empty = document.createElement('div');
            empty.textContent = 'No posts found.';
            main.appendChild(empty);
          }

          collectionPaginationEl = this._buildCollectionPaginationNav(vs);


          var sidebarWidthDefault = isSinglePost ? 300 : 240;
          var leftSidebarWidth = leftSidebarCfg && leftSidebarCfg.width ? Math.min(400, Math.max(160, leftSidebarCfg.width)) : sidebarWidthDefault;
          var rightSidebarWidth = rightSidebarCfg && rightSidebarCfg.width ? Math.min(400, Math.max(160, rightSidebarCfg.width)) : sidebarWidthDefault;
          if (featurePostLayout) {
            leftSidebarWidth = 300;
            rightSidebarWidth = 300;
          }
          var leftSpaceAbove = isSinglePost
            ? BB_POST_CONTENT_TOP_PADDING
            : (leftSidebarCfg && typeof leftSidebarCfg.spaceAbove === 'number' ? Math.max(0, leftSidebarCfg.spaceAbove) : 0);
          var rightSpaceAbove = isSinglePost
            ? BB_POST_CONTENT_TOP_PADDING
            : (rightSidebarCfg && typeof rightSidebarCfg.spaceAbove === 'number' ? Math.max(0, rightSidebarCfg.spaceAbove) : 0);
          var leftSticky = leftSidebarCfg && leftSidebarCfg.sticky === true;
          var rightSticky = rightSidebarCfg && rightSidebarCfg.sticky === true;
          var stickySidebarTopPx = self._getSidebarStickyTopPx();
          var stickySidebarPadTop = 0;
          var postHeaderCfgForRails = cfg.postHeader && typeof cfg.postHeader === 'object' ? cfg.postHeader : null;
          var leftPadTop = leftSpaceAbove;
          var rightPadTop = rightSpaceAbove;
          var leftSidebarEl = document.createElement('div');
          leftSidebarEl.className = 'blog-overlay-sidebar-rail';
          leftSidebarEl.style.display = 'flex';
          leftSidebarEl.style.flexDirection = 'column';
          leftSidebarEl.style.gap = '16px';
          leftSidebarEl.style.width = '100%';
          leftSidebarEl.style.boxSizing = 'border-box';
          if (leftSticky) {
            leftSidebarEl.setAttribute('data-bb-sticky-rail', '1');
            leftSidebarEl.style.position = 'relative';
            leftSidebarEl.style.paddingTop = (stickySidebarPadTop + leftPadTop) + 'px';
          } else {
            leftSidebarEl.style.position = 'static';
            if (leftPadTop > 0) leftSidebarEl.style.paddingTop = leftPadTop + 'px';
          }
          for (var lm = 0; lm < leftModules.length; lm++) leftSidebarEl.appendChild(leftModules[lm]);
          var leftSidebarWrapEl = document.createElement('div');
          leftSidebarWrapEl.className = 'blog-overlay-sidebar-anchor';
          leftSidebarWrapEl.style.flexShrink = '0';
          leftSidebarWrapEl.style.width = leftSidebarWidth + 'px';
          leftSidebarWrapEl.style.alignSelf = 'flex-start';
          leftSidebarWrapEl.style.position = 'relative';
          leftSidebarWrapEl.style.boxSizing = 'border-box';
          if (leftSidebarEl.childNodes.length) leftSidebarWrapEl.appendChild(leftSidebarEl);

          var rightSidebarEl = document.createElement('div');
          rightSidebarEl.className = 'blog-overlay-sidebar-rail';
          rightSidebarEl.style.display = 'flex';
          rightSidebarEl.style.flexDirection = 'column';
          rightSidebarEl.style.gap = '16px';
          rightSidebarEl.style.width = '100%';
          rightSidebarEl.style.boxSizing = 'border-box';
          if (rightSticky) {
            rightSidebarEl.setAttribute('data-bb-sticky-rail', '1');
            rightSidebarEl.style.position = 'relative';
            rightSidebarEl.style.paddingTop = (stickySidebarPadTop + rightPadTop) + 'px';
          } else {
            rightSidebarEl.style.position = 'static';
            if (rightPadTop > 0) rightSidebarEl.style.paddingTop = rightPadTop + 'px';
          }
          for (var rm = 0; rm < rightModules.length; rm++) rightSidebarEl.appendChild(rightModules[rm]);
          var rightSidebarWrapEl = document.createElement('div');
          rightSidebarWrapEl.className = 'blog-overlay-sidebar-anchor';
          rightSidebarWrapEl.style.flexShrink = '0';
          rightSidebarWrapEl.style.width = rightSidebarWidth + 'px';
          rightSidebarWrapEl.style.alignSelf = 'flex-start';
          rightSidebarWrapEl.style.position = 'relative';
          rightSidebarWrapEl.style.boxSizing = 'border-box';
          if (rightSidebarEl.childNodes.length) rightSidebarWrapEl.appendChild(rightSidebarEl);

          var BB_SIDEBAR_MIN_MAIN = 300;
          function applySidebarResponsiveLayout() {
            var leftHas = leftSidebarWrapEl.childNodes.length > 0;
            var rightHas = rightSidebarWrapEl.childNodes.length > 0;
            if (!leftHas && !rightHas) {
              mainRowEl.style.flexDirection = 'row';
              mainRowEl.style.alignItems = 'flex-start';
              mainRowEl.style.gap = BB_SIDEBAR_LAYOUT_GAP + 'px';
              main.style.order = '';
              main.style.flex = '1';
              main.style.minWidth = '0';
              return;
            }
            var cw = wrapper.clientWidth;
            if (!cw && typeof window !== 'undefined' && window.innerWidth) cw = window.innerWidth;
            var gapCount = (leftHas && rightHas) ? 2 : 1;
            var sideSum = (leftHas ? leftSidebarWidth : 0) + (rightHas ? rightSidebarWidth : 0);
            var desktopRowGap = isSinglePost ? BB_POST_SIDEBAR_ROW_GAP : BB_SIDEBAR_LAYOUT_GAP;
            var stack = cw < sideSum + BB_SIDEBAR_MIN_MAIN + gapCount * desktopRowGap;

            if (stack) {
              mainRowEl.style.gap = BB_SIDEBAR_LAYOUT_GAP + 'px';
              mainRowEl.style.flexDirection = 'column';
              mainRowEl.style.alignItems = 'stretch';
              main.style.order = '0';
              main.style.flex = '1 1 auto';
              main.style.minWidth = '0';
              main.style.width = '100%';
              main.style.maxWidth = '100%';
              if (collectionLayout === 'showcase') {
                main.style.marginLeft = '0';
                main.style.marginRight = '0';
              }
              if (leftHas) {
                leftSidebarWrapEl.style.order = '1';
                leftSidebarWrapEl.style.width = '100%';
                leftSidebarWrapEl.style.maxWidth = '100%';
                leftSidebarWrapEl.style.flexShrink = '1';
                leftSidebarWrapEl.style.alignSelf = 'stretch';
                leftSidebarEl.removeAttribute('data-bb-sticky-rail');
                leftSidebarEl.style.position = 'static';
                leftSidebarEl.style.top = '';
                leftSidebarEl.style.paddingTop = leftPadTop > 0 ? leftPadTop + 'px' : '';
                self._clearStickySidebarRailFixed(leftSidebarEl, leftSidebarWrapEl);
              }
              if (rightHas) {
                rightSidebarWrapEl.style.order = '2';
                rightSidebarWrapEl.style.width = '100%';
                rightSidebarWrapEl.style.maxWidth = '100%';
                rightSidebarWrapEl.style.flexShrink = '1';
                rightSidebarWrapEl.style.alignSelf = 'stretch';
                rightSidebarEl.removeAttribute('data-bb-sticky-rail');
                rightSidebarEl.style.position = 'static';
                rightSidebarEl.style.top = '';
                rightSidebarEl.style.paddingTop = rightPadTop > 0 ? rightPadTop + 'px' : '';
                self._clearStickySidebarRailFixed(rightSidebarEl, rightSidebarWrapEl);
              }
            } else {
              mainRowEl.style.flexDirection = 'row';
              mainRowEl.style.alignItems = 'flex-start';
              mainRowEl.style.gap = desktopRowGap + 'px';
              main.style.order = '';
              main.style.flex = '1';
              main.style.minWidth = '0';
              main.style.width = '';
              main.style.maxWidth = '';
              if (collectionLayout === 'showcase') {
                main.style.width = '100%';
                main.style.maxWidth = '100%';
                main.style.marginLeft = '0';
                main.style.marginRight = '0';
                main.style.boxSizing = 'border-box';
              } else {
                main.style.marginLeft = '';
                main.style.marginRight = '';
                main.style.boxSizing = '';
              }
              if (leftHas) {
                leftSidebarWrapEl.style.order = '';
                leftSidebarWrapEl.style.width = leftSidebarWidth + 'px';
                leftSidebarWrapEl.style.maxWidth = '';
                leftSidebarWrapEl.style.flexShrink = '0';
                leftSidebarWrapEl.style.alignSelf = 'flex-start';
                if (leftSticky) {
                  leftSidebarEl.setAttribute('data-bb-sticky-rail', '1');
                  leftSidebarEl.style.position = 'relative';
                  leftSidebarEl.style.top = '';
                  leftSidebarEl.style.paddingTop = (stickySidebarPadTop + leftPadTop) + 'px';
                } else {
                  leftSidebarEl.removeAttribute('data-bb-sticky-rail');
                  leftSidebarEl.style.position = 'static';
                  leftSidebarEl.style.top = '';
                  leftSidebarEl.style.paddingTop = leftPadTop > 0 ? leftPadTop + 'px' : '';
                  self._clearStickySidebarRailFixed(leftSidebarEl, leftSidebarWrapEl);
                }
              }
              if (rightHas) {
                rightSidebarWrapEl.style.order = '';
                rightSidebarWrapEl.style.width = rightSidebarWidth + 'px';
                rightSidebarWrapEl.style.maxWidth = '';
                rightSidebarWrapEl.style.flexShrink = '0';
                rightSidebarWrapEl.style.alignSelf = 'flex-start';
                if (rightSticky) {
                  rightSidebarEl.setAttribute('data-bb-sticky-rail', '1');
                  rightSidebarEl.style.position = 'relative';
                  rightSidebarEl.style.top = '';
                  rightSidebarEl.style.paddingTop = (stickySidebarPadTop + rightPadTop) + 'px';
                } else {
                  rightSidebarEl.removeAttribute('data-bb-sticky-rail');
                  rightSidebarEl.style.position = 'static';
                  rightSidebarEl.style.top = '';
                  rightSidebarEl.style.paddingTop = rightPadTop > 0 ? rightPadTop + 'px' : '';
                  self._clearStickySidebarRailFixed(rightSidebarEl, rightSidebarWrapEl);
                }
              }
            }
            if (typeof self._blogOverlayStickySidebarSyncFn === 'function') {
              self._blogOverlayStickySidebarSyncFn();
            }
            if (collectionLayout === 'digest' && digestMobileNarrow) {
              self._syncDigestMobileFeaturedImageBleed(wrapper);
            }
          }

          if (headerContentCfg && headerContentCfg.show) {
            var hcAvail = Array.isArray(headerContentCfg.modules) ? headerContentCfg.modules.slice() : [];
            if (hcAvail.length === 0 && (headerContentCfg.tableOfContents || headerContentCfg.breadcrumbs)) {
              if (headerContentCfg.tableOfContents) hcAvail.push('tableOfContents');
              if (headerContentCfg.breadcrumbs) hcAvail.push('breadcrumbs');
            }
            var hcModules;
            if (!isSinglePost && cfg.collectionModules) {
              hcModules = self._resolveCollectionZoneModuleIds(
                hcAvail,
                headerContentCfg.moduleOrder,
                'header',
                cfg.collectionModules
              );
            } else {
              hcModules = self._orderedZoneModules(hcAvail, headerContentCfg.moduleOrder);
            }
            self._warnDuplicateValues('header', hcModules);
            var headerHeight = Math.min(120, Math.max(32, parseInt(headerContentCfg.height, 10) || 48));
            if (hcModules.length > 0) {
              var headerEl = document.createElement('div');
              headerEl.className = 'blog-overlay-header-content';
              headerEl.style.marginBottom = newsroomMobileCompact ? '8px' : '16px';
              headerEl.style.paddingBottom = newsroomMobileCompact ? '6px' : '12px';
              headerEl.style.display = 'flex';
              var collectionHeaderRow = !isSinglePost;
              if (collectionHeaderRow) {
                hcModules = self._canonicalCollectionHeaderModuleOrder(hcModules);
              }
              var collectionHeaderUtilityStarted = false;
              var headerMobile = collectionHeaderRow && self._isNarrowCollectionViewport();
              var headerFilterRow = null;
              var headerUtilityRow = null;
              if (headerMobile) {
                headerFilterRow = document.createElement('div');
                headerFilterRow.className = 'blog-overlay-header-filter-row';
                headerFilterRow.style.display = 'flex';
                headerFilterRow.style.flexWrap = 'wrap';
                headerFilterRow.style.alignItems = 'center';
                headerFilterRow.style.gap = '8px 10px';
                headerFilterRow.style.width = '100%';
                headerFilterRow.style.boxSizing = 'border-box';
                headerFilterRow.style.paddingLeft = '12px';
                headerFilterRow.style.paddingRight = '12px';
                headerUtilityRow = document.createElement('div');
                headerUtilityRow.className = 'blog-overlay-header-utility-row';
                headerUtilityRow.style.display = 'flex';
                headerUtilityRow.style.alignItems = 'center';
                headerUtilityRow.style.justifyContent = 'space-between';
                headerUtilityRow.style.gap = '10px';
                headerUtilityRow.style.width = '100%';
                headerUtilityRow.style.boxSizing = 'border-box';
              }
              if (collectionHeaderRow) {
                if (headerMobile) {
                  headerEl.style.flexDirection = 'column';
                  headerEl.style.flexWrap = 'nowrap';
                  headerEl.style.alignItems = 'stretch';
                  headerEl.style.alignContent = 'stretch';
                  headerEl.style.justifyContent = 'flex-start';
                  headerEl.style.gap = '10px';
                } else {
                  headerEl.style.flexDirection = 'row';
                  headerEl.style.flexWrap = 'wrap';
                  headerEl.style.alignItems = 'center';
                  headerEl.style.alignContent = 'center';
                  headerEl.style.justifyContent = 'flex-start';
                  headerEl.style.gap = '12px 16px';
                }
                headerEl.style.width = '100%';
                headerEl.style.maxWidth = '100%';
                headerEl.style.boxSizing = 'border-box';
                headerEl.style.flex = '1 1 100%';
                headerEl.style.minWidth = '0';
              } else {
                headerEl.style.flexDirection = 'column';
                headerEl.style.flexWrap = 'nowrap';
                headerEl.style.alignItems = 'stretch';
                headerEl.style.gap = '16px';
              }
              headerEl.style.minHeight = headerHeight + 'px';
              for (var hm = 0; hm < hcModules.length; hm++) {
                var mod = hcModules[hm];
                if (mod === 'breadcrumbs' && isSinglePost) continue;
                if (mod === 'breadcrumbs') {
                  var breadcrumbEl = document.createElement('nav');
                  breadcrumbEl.setAttribute('aria-label', 'Breadcrumb');
                  breadcrumbEl.style.fontSize = '0.85rem';
                  breadcrumbEl.style.color = '#666';
                  breadcrumbEl.style.setProperty('display', 'flex', 'important');
                  breadcrumbEl.style.setProperty('flex-direction', 'row', 'important');
                  breadcrumbEl.style.flexWrap = 'wrap';
                  breadcrumbEl.style.alignItems = 'center';
                  breadcrumbEl.style.gap = '0';
                  var meta = self._blogMeta || {};
                  var siteTitle = meta.siteTitle || '';
                  var blogName = meta.blogName || 'Blog';
                  var previewHeaderBc = Boolean(self._bbPreview || self._previewMode);
                  var blogCollectionHref = self._blogCollectionNavHref({});
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
                    a.style.setProperty('cursor', 'pointer', 'important');
                    if (analyticsEl) a.setAttribute('data-analytics-element', analyticsEl);
                    if (onClick) {
                      a.onclick = function(e) {
                        e.preventDefault();
                        onClick();
                      };
                    }
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
                  var goToBlogCategory = function(cat) {
                    self._categoryFilter = [cat];
                    self._tagFilter = [];
                    self._currentPage = 1;
                    window.location.hash = '';
                    self._renderContent(self.items);
                  };
                  if (siteTitle) {
                    breadcrumbEl.appendChild(makeLink(siteTitle, blogCollectionHref, previewHeaderBc ? goToBlogIndex : null, 'breadcrumb'));
                    breadcrumbEl.appendChild(sep());
                  }
                  breadcrumbEl.appendChild(makeLink(blogName, blogCollectionHref, previewHeaderBc ? goToBlogIndex : null, 'breadcrumb'));
                  if (isSinglePost && selectedIndex >= 0) {
                    var post = items[selectedIndex];
                    var postCats = self._getPostCategories(post);
                    if (postCats.length > 0) {
                      breadcrumbEl.appendChild(sep());
                      var catParts = postCats;
                      for (var ci = 0; ci < catParts.length; ci++) {
                        if (ci > 0) breadcrumbEl.appendChild(self._breadcrumbCommaSeparator());
                        var catName = catParts[ci];
                        var catHref = self._blogCollectionNavHref({ category: catName });
                        breadcrumbEl.appendChild(makeLink(catName, catHref, previewHeaderBc ? (function(c) { return function() { goToBlogCategory(c); }; })(catName) : null, 'categoryTag'));
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
                  if (collectionHeaderRow) {
                    breadcrumbEl.style.flex = '1 1 100%';
                    breadcrumbEl.style.width = '100%';
                    breadcrumbEl.style.boxSizing = 'border-box';
                  }
                } else if (mod === 'tableOfContents' && items.length > 0) {
                  var headerToc = createTocModule(200);
                  if (headerToc) {
                    headerToc.style.position = 'static';
                    headerToc.style.width = 'auto';
                    headerToc.style.display = 'inline-block';
                    if (collectionHeaderRow) {
                      headerToc.style.flex = '1 1 100%';
                      headerToc.style.width = '100%';
                      headerToc.style.maxWidth = '100%';
                    }
                    headerEl.appendChild(headerToc);
                  } else if (self._isTocDebugEnabled()) {
                    self._tocDebug('header tableOfContents not appended', { reason: 'createTocModuleReturnedNull', itemsLength: items.length });
                  }
                } else if (mod === 'tableOfContents' && self._isTocDebugEnabled()) {
                  self._tocDebug('header tableOfContents skipped', { reason: 'items.length === 0' });
                } else if (mod === 'postSearch' || mod === 'searchPosts') {
                  var searchWrap = self._createCollectionHeaderSearchControl(siteAccentUi, { mobile: headerMobile });
                  if (!headerMobile) {
                    if (collectionHeaderRow) {
                      if (!collectionHeaderUtilityStarted) {
                        collectionHeaderUtilityStarted = true;
                        searchWrap.style.marginLeft = 'auto';
                      }
                    } else {
                      searchWrap.style.width = '100%';
                      searchWrap.style.maxWidth = '320px';
                      searchWrap.style.flex = '';
                      searchWrap.style.minWidth = '';
                    }
                  }
                  if (headerMobile && headerUtilityRow) headerUtilityRow.appendChild(searchWrap);
                  else headerEl.appendChild(searchWrap);
                } else if (mod === 'filterByCategory') {
                  var catMod = self._createFilterByCategoryModule(items, null, false, 'header');
                  if (catMod) {
                    if (headerMobile && headerFilterRow) {
                      catMod.style.flex = '1 1 100%';
                      catMod.style.width = '100%';
                      catMod.style.minWidth = '0';
                      catMod.style.maxWidth = '100%';
                      headerFilterRow.appendChild(catMod);
                    } else {
                      if (collectionHeaderRow) {
                        catMod.style.flex = '1 1 200px';
                        catMod.style.width = 'auto';
                        catMod.style.minWidth = '140px';
                        catMod.style.maxWidth = '100%';
                      } else {
                        catMod.style.width = '100%';
                        catMod.style.minWidth = '0';
                      }
                      headerEl.appendChild(catMod);
                    }
                  }
                } else if (mod === 'filterByTag') {
                  var tagMod = self._createFilterByTagModule(items, null, false, 'header');
                  if (tagMod) {
                    if (headerMobile && headerFilterRow) {
                      tagMod.style.flex = '1 1 100%';
                      tagMod.style.width = '100%';
                      tagMod.style.minWidth = '0';
                      tagMod.style.maxWidth = '100%';
                      headerFilterRow.appendChild(tagMod);
                    } else {
                      if (collectionHeaderRow) {
                        tagMod.style.flex = '1 1 200px';
                        tagMod.style.width = 'auto';
                        tagMod.style.minWidth = '140px';
                        tagMod.style.maxWidth = '100%';
                      } else {
                        tagMod.style.width = '100%';
                        tagMod.style.minWidth = '0';
                      }
                      headerEl.appendChild(tagMod);
                    }
                  }
                } else if (mod === 'filterByTagsAndCategories') {
                  var combinedMod = self._createFilterByTagsAndCategoriesModule(items, null, false, 'header');
                  if (combinedMod) {
                    if (headerMobile && headerFilterRow) {
                      combinedMod.style.flex = '1 1 100%';
                      combinedMod.style.width = '100%';
                      combinedMod.style.minWidth = '0';
                      combinedMod.style.maxWidth = '100%';
                      headerFilterRow.appendChild(combinedMod);
                    } else {
                      if (collectionHeaderRow) {
                        combinedMod.style.flex = '1 1 240px';
                        combinedMod.style.width = 'auto';
                        combinedMod.style.minWidth = '160px';
                        combinedMod.style.maxWidth = '100%';
                      } else {
                        combinedMod.style.width = '100%';
                        combinedMod.style.minWidth = '0';
                      }
                      headerEl.appendChild(combinedMod);
                    }
                  }
                } else if (mod === 'postSort') {
                  var sortMod = self._createPostSortModule(cfg, headerMobile ? 148 : 200, true);
                  if (sortMod) {
                    sortMod.style.display = 'inline-block';
                    if (headerMobile) {
                      sortMod.style.flex = '0 0 auto';
                      sortMod.style.width = 'auto';
                      sortMod.style.marginLeft = '0';
                      sortMod.style.marginRight = '0';
                      var sortSelect = sortMod.querySelector('select');
                      if (sortSelect) {
                        sortSelect.style.width = 'auto';
                        sortSelect.style.minWidth = '108px';
                        sortSelect.style.height = '38px';
                        sortSelect.style.minHeight = '38px';
                        sortSelect.style.padding = '8px 28px 8px 12px';
                        sortSelect.style.fontSize = '0.9rem';
                        sortSelect.style.lineHeight = '1.25';
                        sortSelect.style.color = '#111';
                        sortSelect.style.webkitTextFillColor = '#111';
                        sortSelect.style.border = '1px solid #e8e7e4';
                        sortSelect.style.borderRadius = '6px';
                        sortSelect.style.background = '#fff';
                        sortSelect.style.boxSizing = 'border-box';
                        sortSelect.style.cursor = 'pointer';
                        sortSelect.style.appearance = 'none';
                        sortSelect.style.webkitAppearance = 'none';
                      }
                    } else if (collectionHeaderRow) {
                      if (!collectionHeaderUtilityStarted) {
                        collectionHeaderUtilityStarted = true;
                        sortMod.style.marginLeft = 'auto';
                      } else {
                        sortMod.style.marginLeft = '12px';
                      }
                      sortMod.style.marginRight = '0';
                      sortMod.style.flex = '0 0 auto';
                    } else {
                      sortMod.style.marginRight = '16px';
                    }
                    if (headerMobile && headerUtilityRow) headerUtilityRow.appendChild(sortMod);
                    else headerEl.appendChild(sortMod);
                  }
                } else if (!collectionHeaderRow && mod === 'emailCapture' && ecCfg) {
                  var ecHeaderForm = createEmailCaptureForm(ecCfg, 280);
                  if (ecHeaderForm) {
                    ecHeaderForm.style.display = 'inline-block';
                    ecHeaderForm.style.minWidth = '200px';
                    headerEl.appendChild(ecHeaderForm);
                  }
                } else if (!collectionHeaderRow && mod === 'leadMagnet' && lmCfg) {
                  var lmHeaderForm = createLeadMagnetForm(lmCfg, 280);
                  if (lmHeaderForm) {
                    lmHeaderForm.style.display = 'inline-block';
                    lmHeaderForm.style.minWidth = '200px';
                    headerEl.appendChild(lmHeaderForm);
                  }
                }
              }
              if (headerMobile) {
                if (headerFilterRow && headerFilterRow.childNodes.length > 0) {
                  headerEl.appendChild(headerFilterRow);
                }
                if (headerUtilityRow && headerUtilityRow.childNodes.length > 0) {
                  headerEl.appendChild(headerUtilityRow);
                }
              }
              if (headerEl.childNodes.length > 0) {
                if (isSinglePost) {
                  if (singlePostHeaderZoneEl) {
                    var headerHost = ensureSinglePostHeaderInnerEl();
                    headerHost.insertBefore(headerEl, headerHost.firstChild);
                  } else {
                    if (!headerZoneEl) {
                      headerZoneEl = document.createElement('div');
                      headerZoneEl.className = 'blog-overlay-header-zone';
                      headerZoneEl.style.position = 'relative';
                      headerZoneEl.style.zIndex = '100';
                    }
                    headerZoneEl.appendChild(headerEl);
                  }
                } else if (headerModulesHostEl) {
                  headerModulesHostEl.appendChild(headerEl);
                }
              }
            }
          }
          if (!isSinglePost && headerModulesHostEl && headerModulesHostEl.childNodes.length === 0) {
            headerModulesHostEl.style.display = 'none';
            headerModulesHostEl.style.marginTop = '0';
          }

          if (footerContentCfg) {
            var fcAvail = Array.isArray(footerContentCfg.modules) ? footerContentCfg.modules : [];
            var fcOrder = Array.isArray(footerContentCfg.moduleOrder) ? footerContentCfg.moduleOrder : [];
            /* Prefer moduleOrder (Configure source of truth). An empty modules list with a
               non-empty moduleOrder must still render — same as sidebar TOC. */
            var fcModules = (fcOrder.length > 0) ? fcOrder.slice() : fcAvail.slice();
            self._warnDuplicateValues('footer', fcModules);
            if ((footerContentCfg.show || fcModules.length > 0) && fcModules.length > 0) {
              var footerHeight = Math.min(120, Math.max(32, parseInt(footerContentCfg.height, 10) || 48));
              if (isSinglePost) {
                featureFooterLeftPad = 0;
                featureFooterRightPad = 0;
              } else {
                featureFooterLeftPad = Math.min(80, Math.max(0, parseInt(footerContentCfg.leftPadding, 10) ?? parseInt(footerContentCfg.sideMargin, 10) ?? 0));
                featureFooterRightPad = Math.min(80, Math.max(0, parseInt(footerContentCfg.rightPadding, 10) ?? parseInt(footerContentCfg.sideMargin, 10) ?? 0));
              }
              var footerTopPadRaw = footerContentCfg.topPadding;
              var footerTopPadParsed = typeof footerTopPadRaw === 'number' ? footerTopPadRaw : parseInt(footerTopPadRaw, 10);
              featureFooterTopPad = Math.min(120, Math.max(0, isFinite(footerTopPadParsed) ? footerTopPadParsed : 16));
              var footerLeftPad = featureFooterLeftPad;
              var footerRightPad = featureFooterRightPad;
              var footerTopPad = featureFooterTopPad;
              var footerEl = document.createElement('div');
              footerEl.className = 'blog-overlay-footer-content';
              footerEl.style.marginTop = '24px';
              footerEl.style.paddingLeft = footerLeftPad + 'px';
              footerEl.style.paddingRight = footerRightPad + 'px';
              footerEl.style.paddingTop = footerTopPad + 'px';
              if (isSinglePost) self._applyPostFooterSideMargins(footerEl, cfg, footerContentCfg);
              footerEl.style.display = 'flex';
              footerEl.style.flexDirection = 'column';
              footerEl.style.gap = '24px';
              footerEl.style.alignItems = 'center';
              footerEl.style.width = '100%';
              footerEl.style.boxSizing = 'border-box';
              footerEl.style.minHeight = footerHeight + 'px';
              for (var fm = 0; fm < fcModules.length; fm++) {
                var fmod = fcModules[fm];
                var fmodEl = null;
                if (fmod === 'relevantPosts') {
                  fmodEl = createRelevantPostsModule(220, { variant: 'footer' });
                  if (fmodEl) {
                    fmodEl.style.width = '100%';
                    fmodEl.style.maxWidth = '100%';
                    fmodEl.style.minWidth = '0';
                  }
                } else if (fmod === 'authorProfiles' && isSinglePost && displayItems.length > 0) {
                  var authorResult = self._createAuthorProfilesModule(displayItems[0], cfg, 220, { useLongBio: true });
                  fmodEl = authorResult ? authorResult.content : null;
                  if (fmodEl) {
                    fmodEl.style.width = '100%';
                    fmodEl.style.maxWidth = '100%';
                    fmodEl.style.minWidth = '0';
                  }
                } else if (fmod === 'emailCapture' && ecCfg) {
                  fmodEl = createEmailCaptureForm(ecCfg, null, true, 'footer');
                  if (fmodEl) {
                    fmodEl.style.width = '100%';
                    fmodEl.style.maxWidth = '100%';
                    fmodEl.style.minWidth = '0';
                  }
                } else if (fmod === 'leadMagnet' && lmCfg) {
                  fmodEl = createLeadMagnetFooterCard(lmCfg);
                  if (fmodEl) {
                    fmodEl.style.width = '100%';
                    fmodEl.style.maxWidth = '100%';
                    fmodEl.style.minWidth = '0';
                  }
                } else if (fmod === 'prevNextArticle') {
                  fmodEl = createPrevNextArticleModule();
                  if (fmodEl) {
                    fmodEl.style.width = '100%';
                    fmodEl.style.maxWidth = '100%';
                    fmodEl.style.minWidth = '0';
                  }
                }
                if (fmodEl) {
                  if (featurePostLayout && fmod === 'authorProfiles') {
                    featureBelowRowAuthorEl = fmodEl;
                  } else if (featurePostLayout && fmod === 'relevantPosts') {
                    featureBelowRowMoreToReadEl = fmodEl;
                  } else if (featurePostLayout && fmod === 'leadMagnet') {
                    featureBelowRowLeadMagnetEl = fmodEl;
                  } else {
                    footerEl.appendChild(fmodEl);
                  }
                }
              }
              if (footerEl.childNodes.length > 0) footerZoneEl.appendChild(footerEl);
            }
          }
          if (paywallShowFooter && !featurePostLayout) {
            self._appendPaywallFooter(footerZoneEl);
          }

          if (headerZoneEl && headerZoneEl.childNodes.length) wrapper.appendChild(headerZoneEl);
          var reporterPostLayout = isSinglePost && self._isReporterPostLayout(cfg);
          var pinPostHeaderInMainColumn = isSinglePost &&
            !reporterPostLayout &&
            singlePostHeaderZoneEl &&
            singlePostHeaderZoneEl.childNodes.length > 0 &&
            (leftSidebarWrapEl.childNodes.length > 0 || rightSidebarWrapEl.childNodes.length > 0);
          if (singlePostHeaderZoneEl && singlePostHeaderZoneEl.childNodes.length) {
            if (pinPostHeaderInMainColumn) {
              singlePostHeaderZoneEl.style.paddingTop = '0';
              main.insertBefore(singlePostHeaderZoneEl, main.firstChild);
            } else {
              wrapper.appendChild(singlePostHeaderZoneEl);
            }
          }
          if (leftSidebarWrapEl.childNodes.length) mainRowEl.appendChild(leftSidebarWrapEl);
          var sidebarRowPostLayoutActive = isSinglePost && (
            self._isFeaturePostLayout(cfg) ||
            self._isReporterPostLayout(cfg) ||
            self._isPublisherPostLayout(cfg)
          );
          if (sidebarRowPostLayoutActive) {
            if (leftSidebarEl.childNodes.length) self._normalizeSidebarTopForSidebarRow(leftSidebarEl);
            if (rightSidebarEl.childNodes.length) self._normalizeSidebarTopForSidebarRow(rightSidebarEl);
          }
          mainRowEl.appendChild(main);
          if (rightSidebarWrapEl.childNodes.length) mainRowEl.appendChild(rightSidebarWrapEl);
          wrapper.appendChild(mainRowEl);

          var stickySidebarRails = [];
          if (leftSticky && leftSidebarWrapEl.childNodes.length) {
            stickySidebarRails.push({ rail: leftSidebarEl, wrap: leftSidebarWrapEl, side: 'left' });
          }
          if (rightSticky && rightSidebarWrapEl.childNodes.length) {
            stickySidebarRails.push({ rail: rightSidebarEl, wrap: rightSidebarWrapEl, side: 'right' });
          }
          if (stickySidebarRails.length) {
            self._bindStickySidebarRails({
              mainRowEl: mainRowEl,
              topPx: stickySidebarTopPx,
              rails: stickySidebarRails
            });
          }

          if (collectionPaginationEl) {
            var paginationZoneEl = document.createElement('div');
            paginationZoneEl.id = 'blog-overlay-pagination-zone';
            paginationZoneEl.className = 'blog-overlay-pagination-zone';
            paginationZoneEl.style.width = '100%';
            paginationZoneEl.style.maxWidth = '100%';
            paginationZoneEl.style.boxSizing = 'border-box';
            paginationZoneEl.style.position = 'relative';
            paginationZoneEl.style.zIndex = '1';
            paginationZoneEl.appendChild(collectionPaginationEl);
            wrapper.appendChild(paginationZoneEl);
          }

          var commentCfg = cfg && cfg.commentSettings;
          var commentsTurnedOff = commentCfg && commentCfg.commentsEnabled === false;
          var viewerLoggedIn = self._resolveViewerMode() === 'loggedIn';
          var commentPostForGate =
            isSinglePost && selectedIndex >= 0 && selectedIndex < items.length ? items[selectedIndex] : null;
          var hideCommentsForLoggedOutPost =
            isSinglePost &&
            !viewerLoggedIn &&
            self._isPaywalledSite() &&
            commentPostForGate &&
            !self._isPaywallPublicPreviewPost(commentPostForGate);
          self._setAllCommentUiHidden(!!commentsTurnedOff || hideCommentsForLoggedOutPost);
          var featureCommentsWillMount =
            featurePostLayout &&
            isSinglePost &&
            selectedIndex >= 0 &&
            items[selectedIndex] &&
            cfg &&
            commentCfg &&
            commentCfg.commentsEnabled &&
            (viewerLoggedIn || !hideCommentsForLoggedOutPost);
          if (featurePostLayout) {
            featureBelowRowHost = document.createElement('div');
            featureBelowRowHost.className = 'blog-overlay-feature-below-row';
            featureBelowRowHost.style.width = '100%';
            featureBelowRowHost.style.maxWidth = '100%';
            featureBelowRowHost.style.boxSizing = 'border-box';
            featureBelowRowHost.style.marginTop = '24px';
            featureBelowRowHost.style.paddingTop = featureFooterTopPad + 'px';
            featureBelowRowHost.style.display = 'flex';
            featureBelowRowHost.style.flexDirection = 'column';
            featureBelowRowHost.style.gap = '24px';
            featureBelowRowHost.style.alignItems = 'stretch';
            var appendFeatureBelowRowSection = function(el) {
              if (!el) return;
              var section = document.createElement('div');
              section.className = 'blog-overlay-feature-below-row-section';
              section.style.width = '100%';
              section.style.boxSizing = 'border-box';
              if (isSinglePost) {
                self._applyPostFooterSideMargins(section, cfg, footerContentCfg);
              } else {
                section.style.paddingLeft = featureFooterLeftPad + 'px';
                section.style.paddingRight = featureFooterRightPad + 'px';
              }
              section.appendChild(el);
              featureBelowRowHost.appendChild(section);
            };
            appendFeatureBelowRowSection(featureBelowRowAuthorEl);
            if (featureCommentsWillMount) {
              featureCommentsSectionEl = document.createElement('div');
              featureCommentsSectionEl.className = 'blog-overlay-feature-below-row-section blog-overlay-feature-comments-section';
              featureCommentsSectionEl.style.width = '100%';
              featureCommentsSectionEl.style.boxSizing = 'border-box';
              if (isSinglePost) {
                self._applyPostFooterSideMargins(featureCommentsSectionEl, cfg, footerContentCfg);
              } else {
                featureCommentsSectionEl.style.paddingLeft = featureFooterLeftPad + 'px';
                featureCommentsSectionEl.style.paddingRight = featureFooterRightPad + 'px';
              }
              featureBelowRowHost.appendChild(featureCommentsSectionEl);
            }
            appendFeatureBelowRowSection(featureBelowRowMoreToReadEl);
            appendFeatureBelowRowSection(featureBelowRowLeadMagnetEl);
            if (paywallShowFooter) self._appendPaywallFooter(featureBelowRowHost);
            var featureFooterSideMarginsMode = self._getPostFooterSideMarginsMode(footerContentCfg);
            if (featureFooterSideMarginsMode === 'postBody') {
              main.appendChild(featureBelowRowHost);
            } else {
              wrapper.appendChild(featureBelowRowHost);
            }
          }
          if (
            isSinglePost &&
            selectedIndex >= 0 &&
            items[selectedIndex] &&
            cfg &&
            commentCfg &&
            commentCfg.commentsEnabled &&
            (viewerLoggedIn || !hideCommentsForLoggedOutPost)
          ) {
            try {
              var commentsMountEl = featurePostLayout && featureCommentsSectionEl ? featureCommentsSectionEl : main;
              self._initComments(commentsMountEl, items[selectedIndex], cfg);
            } catch (e) {
              console.error('[BlogOverlay] Comments init error:', e);
            }
          }
          if (footerZoneEl.childNodes.length > 0) {
            footerZoneEl.style.boxSizing = 'border-box';
            footerZoneEl.style.width = '100%';
            footerZoneEl.style.maxWidth = '100%';
            self._clearPostFooterZoneBleed(footerZoneEl);
            var footerSideMarginsMode = self._getPostFooterSideMarginsMode(footerContentCfg);
            var publisherPostLayoutForFooter = isSinglePost && self._isPublisherPostLayout(cfg);
            var sidebarSpanFooterLayout = reporterPostLayout || publisherPostLayoutForFooter;
            var postBodyFooterInMainColumn =
              isSinglePost &&
              footerSideMarginsMode === 'postBody' &&
              sidebarSpanFooterLayout;
            if (featurePostLayout) {
              wrapper.appendChild(footerZoneEl);
            } else if (postBodyFooterInMainColumn || (isSinglePost && !sidebarSpanFooterLayout)) {
              main.appendChild(footerZoneEl);
            } else if (isSinglePost) {
              wrapper.appendChild(footerZoneEl);
            } else {
              wrapper.appendChild(footerZoneEl);
            }
          }

          /* Commit overlay in one DOM operation when still on the cold-load path (#8). */
          if (deferOverlayCommit) {
            root.prepend(overlayFragment);
          }

          if (!isSinglePost) {
            this._lastCollectionShellKey = collectionLayout + '|' + gridColsEffective;
          } else {
            this._lastCollectionShellKey = '';
          }

          self._blogOverlaySidebarLayoutFn = applySidebarResponsiveLayout;
          requestAnimationFrame(function() {
            applySidebarResponsiveLayout();
          });
          self._scheduleDigestMobileFeaturedImageBleed(vs);
          if (typeof ResizeObserver !== 'undefined') {
            self._blogOverlaySidebarRO = new ResizeObserver(function() {
              applySidebarResponsiveLayout();
            });
            try { self._blogOverlaySidebarRO.observe(wrapper); } catch (eObs) {}
          }
          self._bindSiteContentInsetSync(wrapper, root);
          if (self._isTocDebugEnabled()) {
            requestAnimationFrame(function() {
              var n = 0;
              try {
                n = wrapper.querySelectorAll('.blog-overlay-toc').length;
              } catch (eTocDom) {}
              self._tocDebug('postRender', { tocNavElementsInWrapper: n, isSinglePost: isSinglePost, renderSeq: self._renderSeq });
            });
          }
          var overlayCount = root.querySelectorAll('#blog-overlay-list').length;
          if (overlayCount > 1) {
            self._debugLog('multiple overlay roots detected after render', { overlayCount: overlayCount });
          }

      if (typeof self._scrollToFirstNewPostIndex === 'number') {
        var scrollIdx = self._scrollToFirstNewPostIndex;
        self._scrollToFirstNewPostIndex = undefined;
        requestAnimationFrame(function() {
          var target = wrapper.querySelector('[data-display-index="' + scrollIdx + '"]');
          if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      }

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
        self._applySiteContentInsetsToWrapper(wrapper, offset + 16);
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
      self._analyticsPageContextPostId =
        isSinglePost && selectedIndex >= 0 && items[selectedIndex] ? (items[selectedIndex].id || null) : null;
      self._analyticsPageContextPostIndex = isSinglePost && selectedIndex >= 0 ? selectedIndex : null;

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
            self._analyticsFlush();
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

      // Arm the root-injection guard last so late-loading Squarespace Y bundles
      // can't repopulate `root` after the loading overlay has been cleared.
      self._perfMark('renderDomCommitted');
      self._startRootInjectionGuard(root);
      this._renderContentInProgress = false;
    }
  };

  // Wrap key entrypoints so renderer errors always fail closed to native Squarespace.
  (function() {
    var r = window.BlogOverlayRenderer;
    if (!r || typeof r._guard !== 'function') return;
    var methods = ['init', 'updateConfig', 'render', '_renderContent'];
    for (var i = 0; i < methods.length; i++) {
      var name = methods[i];
      if (typeof r[name] !== 'function') continue;
      (function(methodName, original) {
        if (original.__bbGuardWrapped) return;
        var wrapped = function() {
          var self = this;
          var args = arguments;
          return self._guard(methodName, function() {
            return original.apply(self, args);
          });
        };
        wrapped.__bbGuardWrapped = true;
        r[methodName] = wrapped;
      })(name, r[name]);
    }
  })();

  // Expose a lightweight mount API used by loader.js to initialize the renderer
  if (typeof window.mount !== 'function') {
    window.mount = function(params) {
      try {
        var cfg = params && params.config ? params.config : {};
        window.BlogOverlayRenderer.init(cfg);
      } catch (e) {
        console.error('[BlogOverlay] Failed to mount renderer:', e);
        try {
          if (window.BlogOverlayRenderer && typeof window.BlogOverlayRenderer._bailToNative === 'function') {
            window.BlogOverlayRenderer._bailToNative('mount', e);
          }
        } catch (e2) {}
      }
    };
  }

})();
