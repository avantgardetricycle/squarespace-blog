import { useCallback, useEffect, useLayoutEffect, useRef } from "react";

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
        const parentHost = parentOrigin ? new URL(parentOrigin).hostname : "";
        const isLocalParent = parentHost === "localhost" || parentHost === "127.0.0.1";
        if (
          parentOrigin &&
          iframeOrigin !== "*" &&
          isLocalParent &&
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
    sendConfig();
    sendSelectPostIndex();
  };

  return (
    <iframe
      ref={iframeRef}
      src={blogUrl}
      title="Blog preview"
      className={`w-full h-full border-0 ${className}`}
      sandbox="allow-scripts allow-same-origin allow-forms"
      onLoad={handleIframeLoad}
    />
  );
}
