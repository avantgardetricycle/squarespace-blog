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
  viewerMode?: "loggedOut" | "loggedIn";
  paywallDetectionState?: string;
}

interface BlogPreviewIframeProps {
  blogUrl: string;
  config: Record<string, unknown>;
  /** Stable string that changes when config changes; ensures effect runs on every config update */
  configSignature?: string;
  /** When set, tells the iframe to switch to single-post view for this index (e.g. when editing post-level config) */
  selectPostIndex?: number;
  /** Bumped to re-send selectPostIndex when the parent re-selects the same view (e.g. Collection tab re-click). */
  viewSyncToken?: number;
  className?: string;
  /** Fired when the snapshot document finishes loading. Same-origin, so the parent can read meta tags. */
  onDocumentLoad?: (doc: Document | null) => void;
}

const MESSAGE_TYPE_READY = "BETTERBLOG_PREVIEW_READY";
const MESSAGE_TYPE_CONFIG = "BETTERBLOG_PREVIEW_CONFIG";
const MESSAGE_TYPE_SELECT_POST = "BETTERBLOG_PREVIEW_SELECT_POST";
const MESSAGE_TYPE_REQUEST_READY = "BETTERBLOG_PREVIEW_REQUEST_READY";

const DEBUG =
  typeof window !== "undefined" &&
  (window.location.search.includes("bbPreviewDebug=1") || sessionStorage.getItem("bbPreviewDebug") === "1");

export function buildSnapshotPreviewUrl(opts: {
  siteKey: string;
  view: "collection" | "post";
  path?: string | null;
  revision?: number;
  debug?: boolean;
}): string {
  const params = new URLSearchParams();
  params.set("view", opts.view);
  params.set("bbPreview", "1");
  if (opts.view === "post" && opts.path) params.set("path", opts.path);
  if (opts.debug) params.set("bbPreviewDebug", "1");
  if (opts.revision) params.set("v", String(opts.revision));
  return `/api/config/preview-snapshot/${encodeURIComponent(opts.siteKey)}?${params.toString()}`;
}

/** Pathname of a Squarespace post, or null when the item has no on-site URL. */
export function postPathFromFullUrl(fullUrl: string | undefined, siteUrl: string | null): string | null {
  if (!fullUrl || !fullUrl.trim()) return null;
  try {
    const base = siteUrl && siteUrl.trim() ? siteUrl : "https://preview.local";
    const parsed = new URL(fullUrl, base);
    if (siteUrl) {
      const site = new URL(siteUrl);
      if (parsed.origin !== site.origin && fullUrl.startsWith("http")) return null;
    }
    return parsed.pathname || null;
  } catch {
    return null;
  }
}

/**
 * Renders a same-origin snapshot of the customer's blog.
 * Config edits are postMessage updates; the iframe reloads only when its src changes.
 */
export default function BlogPreviewIframe({
  blogUrl,
  config,
  configSignature,
  selectPostIndex,
  viewSyncToken,
  className = "",
  onDocumentLoad,
}: BlogPreviewIframeProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const configRef = useRef(config);
  configRef.current = config;
  const selectPostIndexRef = useRef(selectPostIndex);
  selectPostIndexRef.current = selectPostIndex;
  const onDocumentLoadRef = useRef(onDocumentLoad);
  onDocumentLoadRef.current = onDocumentLoad;
  const readyRef = useRef(false);

  const targetOrigin = () => (typeof window !== "undefined" ? window.location.origin : "");

  const configForPostMessage = (c: Record<string, unknown>) => {
    const { configUpdateCallback, ...rest } = c;
    try {
      return JSON.parse(JSON.stringify(rest)) as Record<string, unknown>;
    } catch {
      return rest;
    }
  };

  useLayoutEffect(() => {
    readyRef.current = false;
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== targetOrigin()) return;
      if (event.data?.type !== MESSAGE_TYPE_READY) return;
      const iframeWindow = iframeRef.current?.contentWindow;
      if (!iframeWindow || event.source !== iframeWindow) return;
      readyRef.current = true;
      const latestConfig = configForPostMessage({ ...configRef.current });
      if (DEBUG) console.log("[BlogPreviewIframe] READY received, sending config");
      iframeWindow.postMessage({ type: MESSAGE_TYPE_CONFIG, config: latestConfig }, targetOrigin());
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [blogUrl]);

  const sendSelectPostIndex = useCallback(() => {
    const postIndex = selectPostIndexRef.current;
    if (typeof postIndex !== "number") return;
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    iframe.contentWindow.postMessage(
      { type: MESSAGE_TYPE_SELECT_POST, postIndex },
      targetOrigin()
    );
  }, [blogUrl]);

  useEffect(() => {
    sendSelectPostIndex();
  }, [selectPostIndex, blogUrl, viewSyncToken, sendSelectPostIndex]);

  const sendConfig = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    try {
      const latestConfig = configForPostMessage({ ...configRef.current });
      iframe.contentWindow.postMessage(
        { type: MESSAGE_TYPE_CONFIG, config: latestConfig },
        targetOrigin()
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
      iframe.contentWindow.postMessage({ type: MESSAGE_TYPE_REQUEST_READY }, targetOrigin());
      if (DEBUG) console.log("[BlogPreviewIframe] sent REQUEST_READY");
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!readyRef.current) requestReady();
    sendConfig();
    const delays = [100, 250, 500, 900, 1500, 2500];
    const timeouts = delays.map((d) => window.setTimeout(() => {
      if (!readyRef.current) requestReady();
      sendConfig();
    }, d));
    return () => timeouts.forEach((t) => window.clearTimeout(t));
  }, [config, configSignature, blogUrl, sendConfig, requestReady]);

  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        if (!readyRef.current) requestReady();
        sendConfig();
      }
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        if (!readyRef.current) requestReady();
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

  const handleIframeLoad = () => {
    if (DEBUG) console.log("[BlogPreviewIframe] iframe onLoad, sending config");
    readyRef.current = false;
    sendConfig();
    sendSelectPostIndex();
    const doc = iframeRef.current?.contentDocument ?? null;
    onDocumentLoadRef.current?.(doc);
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
