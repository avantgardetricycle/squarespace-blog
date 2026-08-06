import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
// #region agent log
import { bbDebugLog } from "@/lib/bbDebugLog";
// #endregion

export interface RendererConfig {
  showDate?: boolean;
  showAuthor?: boolean;
  showReadingTime?: boolean;
  defaultAuthorIds?: string[];
  postAuthorOverrides?: Record<string, string[]>;
  authorMap?: Record<string, string>;
  showProgressBar?: boolean;
  progressBarPosition?: string;
  progressBarThickness?: number;
  progressBarColor?: string;
  leftSidebar?: { show?: boolean; modules?: string[]; width?: number; spaceAbove?: number; sticky?: boolean };
  rightSidebar?: { show?: boolean; modules?: string[]; width?: number; spaceAbove?: number; sticky?: boolean };
  headerContent?: { show?: boolean; modules?: string[]; height?: number };
  recentPostsCount?: number;
  paywallMode?: "auto" | "force_logged_out" | "force_logged_in";
}

interface BlogPreviewIframeProps {
  blogUrl: string;
  config: RendererConfig;
  /** Stable string that changes when config changes; ensures effect runs on every config update */
  configSignature?: string;
  /** When set, tells the iframe to switch to single-post view for this index (e.g. when editing post-level config) */
  selectPostIndex?: number;
  /** Bumped to re-send selectPostIndex when the parent re-selects the same view (e.g. Collection tab re-click). */
  viewSyncToken?: number;
  className?: string;
}

const MESSAGE_TYPE_READY = "BETTERBLOG_PREVIEW_READY";
const MESSAGE_TYPE_CONFIG = "BETTERBLOG_PREVIEW_CONFIG";
const MESSAGE_TYPE_SELECT_POST = "BETTERBLOG_PREVIEW_SELECT_POST";
const MESSAGE_TYPE_REQUEST_READY = "BETTERBLOG_PREVIEW_REQUEST_READY";

const DEBUG =
  typeof window !== "undefined" &&
  (window.location.search.includes("bbPreviewDebug=1") || sessionStorage.getItem("bbPreviewDebug") === "1");

/**
 * Returns true if the URL is a Squarespace subdomain (*.squarespace.com).
 * Squarespace sets X-Frame-Options: SAMEORIGIN, so these URLs cannot be embedded in iframes.
 */
export function isSquarespaceUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host.endsWith(".squarespace.com");
  } catch {
    return false;
  }
}

/**
 * Builds the blog page URL with bbPreview=1 and optional password.
 * @param debug - When true, adds bbPreviewDebug=1 for renderer console logging
 */
export function buildBlogPreviewUrl(
  site: { url: string | null; blogPath: string | null },
  blogPassword?: string,
  debug?: boolean
): string | null {
  if (!site.url) return null;
  try {
    const parsed = new URL(site.url);
    const hasPath = parsed.pathname && parsed.pathname !== "/";
    const base = site.url.replace(/\/$/, "");
    const blogPageUrl = hasPath ? base : parsed.origin + (site.blogPath || "/blog");

    const url = new URL(blogPageUrl);
    url.searchParams.set("bbPreview", "1");
    if (blogPassword?.trim()) {
      url.searchParams.set("password", blogPassword.trim());
    }
    if (debug) {
      url.searchParams.set("bbPreviewDebug", "1");
    }
    return url.toString();
  } catch {
    return null;
  }
}

/**
 * Renders the blog in an iframe with bbPreview=1.
 * Sends config updates to the iframe via postMessage when settings change.
 */
export default function BlogPreviewIframe({
  blogUrl,
  config,
  configSignature,
  selectPostIndex,
  viewSyncToken,
  className = "",
}: BlogPreviewIframeProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const configRef = useRef(config);
  configRef.current = config;
  const selectPostIndexRef = useRef(selectPostIndex);
  selectPostIndexRef.current = selectPostIndex;
  /** Set when we receive READY; iframe may redirect www↔non-www so we use its actual origin for postMessage */
  const resolvedTargetOriginRef = useRef<string | null>(null);

  // #region agent log
  const dbgReadyRef = useRef(false);
  useEffect(() => {
    dbgReadyRef.current = false;
    bbDebugLog("A", "BlogPreviewIframe.tsx:mount", "iframe mounting with src", {
      blogUrl,
      iframeHost: (() => { try { return new URL(blogUrl).hostname; } catch { return "unparseable"; } })(),
      parentOrigin: window.location.origin,
      sandbox: "allow-scripts allow-same-origin allow-forms",
    });

    const onCspViolation = (e: SecurityPolicyViolationEvent) => {
      bbDebugLog("D", "BlogPreviewIframe.tsx:csp", "parent page CSP violation fired", {
        violatedDirective: e.violatedDirective,
        blockedURI: e.blockedURI,
        originalPolicy: String(e.originalPolicy || "").slice(0, 300),
      });
    };
    document.addEventListener("securitypolicyviolation", onCspViolation);

    // Opaque probe: succeeds if the host is reachable from this browser even when framing is blocked.
    const probeStart = Date.now();
    fetch(blogUrl, { mode: "no-cors", credentials: "omit" }).then(
      (r) => bbDebugLog("E", "BlogPreviewIframe.tsx:probe", "no-cors probe resolved (host reachable)", {
        type: r.type, ms: Date.now() - probeStart,
      }),
      (err) => bbDebugLog("E", "BlogPreviewIframe.tsx:probe", "no-cors probe REJECTED (host unreachable/blocked)", {
        error: String(err), ms: Date.now() - probeStart,
      })
    );

    const readyTimer = window.setTimeout(() => {
      bbDebugLog("C", "BlogPreviewIframe.tsx:readyTimeout", "6s after mount: READY status", {
        readyReceived: dbgReadyRef.current,
        resolvedTargetOrigin: resolvedTargetOriginRef.current,
      });
    }, 6000);

    return () => {
      document.removeEventListener("securitypolicyviolation", onCspViolation);
      window.clearTimeout(readyTimer);
    };
  }, [blogUrl]);
  // #endregion

  const getTargetOrigin = () => {
    try {
      return new URL(blogUrl).origin;
    } catch {
      return "*";
    }
  };

  // Same domain (www vs non-www); blogUrl may be agtricycle.me but iframe redirects to www.agtricycle.me
  const originsMatch = (a: string, b: string) => {
    if (a === b) return true;
    try {
      const hostA = new URL(a).hostname.replace(/^www\./, "") || new URL(a).hostname;
      const hostB = new URL(b).hostname.replace(/^www\./, "") || new URL(b).hostname;
      return hostA === hostB;
    } catch {
      return false;
    }
  };

  // Strip non-serializable values and ensure clean serialization for postMessage.
  // postMessage uses structured clone; JSON round-trip guarantees no functions/circular refs.
  // When parent is localhost and iframe is on a different origin, omit baseUrl so the iframe
  // doesn't try to fetch localhost (blocked by Private Network Access).
  const configForPostMessage = (c: RendererConfig) => {
    const { configUpdateCallback, ...rest } = c as RendererConfig & { configUpdateCallback?: unknown };
    try {
      const serialized = JSON.parse(JSON.stringify(rest)) as Record<string, unknown>;
      try {
        const parentOrigin = typeof window !== "undefined" ? window.location.origin : "";
        const iframeOrigin = getTargetOrigin();
        if (
          parentOrigin &&
          iframeOrigin !== "*" &&
          new URL(parentOrigin).hostname !== new URL(iframeOrigin).hostname
        ) {
          delete serialized.baseUrl;
        }
      } catch {
        // keep baseUrl if origin check fails
      }
      return serialized;
    } catch {
      return rest as Record<string, unknown>;
    }
  };

  // Listen for READY from iframe and send config.
  // Use useLayoutEffect so listener is attached before iframe can load and send READY (avoids race after nav/reload).
  // Use event.source (the iframe window that sent READY) for reliable delivery.
  useLayoutEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type !== MESSAGE_TYPE_READY) return;
      // #region agent log
      dbgReadyRef.current = true;
      bbDebugLog("C", "BlogPreviewIframe.tsx:ready", "READY received from iframe", {
        eventOrigin: event.origin,
        expectedOrigin: getTargetOrigin(),
      });
      // #endregion
      const expectedOrigin = getTargetOrigin();
      if (expectedOrigin !== "*" && !originsMatch(event.origin, expectedOrigin)) return;

      const target = event.source as Window | null;
      if (!target || typeof target.postMessage !== "function") return;
      resolvedTargetOriginRef.current = event.origin;
      const latestConfig = configForPostMessage({
        ...configRef.current,
      });
      const targetOrigin = event.origin || expectedOrigin || "*";
      if (DEBUG) console.log("[BlogPreviewIframe] READY received, sending config", { targetOrigin });
      target.postMessage(
        { type: MESSAGE_TYPE_CONFIG, config: latestConfig },
        targetOrigin
      );
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [blogUrl]);

  // Use resolved origin from READY when available (iframe may redirect www↔non-www).
  // When null (e.g. missed READY after nav/reload), use "*" so config still gets through.
  const getEffectiveTargetOrigin = () =>
    resolvedTargetOriginRef.current ?? "*";

  const sendSelectPostIndex = useCallback(() => {
    const postIndex = selectPostIndexRef.current;
    if (typeof postIndex !== "number") return;
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    iframe.contentWindow.postMessage(
      { type: MESSAGE_TYPE_SELECT_POST, postIndex },
      getEffectiveTargetOrigin()
    );
  }, [blogUrl]);

  // Tell iframe to switch views when selectPostIndex changes.
  // -1 => collection/list view, >=0 => single-post view
  useEffect(() => {
    sendSelectPostIndex();
  }, [selectPostIndex, blogUrl, viewSyncToken, sendSelectPostIndex]);

  // Reset resolved origin when blogUrl changes (e.g. user switched sites)
  useEffect(() => {
    resolvedTargetOriginRef.current = null;
  }, [blogUrl]);

  const sendConfig = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    try {
      const targetOrigin = resolvedTargetOriginRef.current ?? "*";
      const latestConfig = configForPostMessage({
        ...configRef.current,
      });
      iframe.contentWindow.postMessage(
        { type: MESSAGE_TYPE_CONFIG, config: latestConfig },
        targetOrigin
      );
      if (DEBUG) console.log("[BlogPreviewIframe] sent config");
    } catch {
      // ignore
    }
  }, [blogUrl]);

  const requestReady = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    try {
      iframe.contentWindow.postMessage({ type: MESSAGE_TYPE_REQUEST_READY }, "*");
      if (DEBUG) console.log("[BlogPreviewIframe] sent REQUEST_READY");
    } catch {
      // ignore
    }
  }, []);

  // Send config whenever it changes. Use configSignature so effect reliably runs on every config update.
  // When we don't have resolved origin, request READY first so iframe responds and we can use correct origin.
  useEffect(() => {
    if (!resolvedTargetOriginRef.current) requestReady();
    sendConfig();
    const delays = [100, 250, 500, 900, 1500, 2500];
    const timeouts = delays.map((d) => window.setTimeout(() => {
      if (!resolvedTargetOriginRef.current) requestReady();
      sendConfig();
    }, d));
    return () => timeouts.forEach((t) => window.clearTimeout(t));
  }, [config, configSignature, blogUrl, sendConfig, requestReady]);

  // Re-send config when page becomes visible (e.g. bfcache restore, tab focus). Fixes iframe not updating after nav-back.
  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        if (!resolvedTargetOriginRef.current) requestReady();
        sendConfig();
      }
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        if (!resolvedTargetOriginRef.current) requestReady();
        sendConfig();
      }
    };
    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [sendConfig, requestReady]);

  // Send config when iframe loads (renderer may not be ready yet, so READY will trigger another send)
  const handleIframeLoad = () => {
    if (DEBUG) console.log("[BlogPreviewIframe] iframe onLoad, sending config");
    // #region agent log
    // A cross-origin frame that really loaded throws SecurityError on location access.
    // A frame blocked by X-Frame-Options / CSP frame-ancestors stays on the same-origin
    // initial about:blank document, so these reads succeed.
    (() => {
      const iframe = iframeRef.current;
      let locationRead: string | null = null;
      let locationError: string | null = null;
      let bodyChildren: number | null = null;
      try {
        locationRead = iframe?.contentWindow?.location?.href ?? null;
      } catch (e) {
        locationError = String(e);
      }
      try {
        bodyChildren = iframe?.contentDocument?.body?.childElementCount ?? null;
      } catch {
        bodyChildren = -1;
      }
      bbDebugLog("B", "BlogPreviewIframe.tsx:onLoad", "iframe load event fired", {
        blogUrl,
        locationRead,
        locationError,
        bodyChildren,
        subframeCount: (() => { try { return iframe?.contentWindow?.length ?? null; } catch { return -1; } })(),
        likelyBlocked: locationError === null && locationRead === "about:blank",
      });
    })();
    // #endregion
    sendConfig();
    sendSelectPostIndex();
  };

  // #region agent log
  const handleIframeError = () => {
    bbDebugLog("B", "BlogPreviewIframe.tsx:onError", "iframe error event fired", { blogUrl });
  };
  // #endregion

  return (
    <iframe
      ref={iframeRef}
      src={blogUrl}
      title="Blog preview"
      className={`w-full h-full border-0 ${className}`}
      sandbox="allow-scripts allow-same-origin allow-forms"
      onLoad={handleIframeLoad}
      onError={handleIframeError}
    />
  );
}
