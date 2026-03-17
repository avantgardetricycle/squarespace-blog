import { useEffect, useRef } from "react";

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
}

interface BlogPreviewIframeProps {
  blogUrl: string;
  config: RendererConfig;
  /** Stable string that changes when config changes; ensures effect runs on every config update */
  configSignature?: string;
  /** When set, tells the iframe to switch to single-post view for this index (e.g. when editing post-level config) */
  selectPostIndex?: number;
  className?: string;
}

const MESSAGE_TYPE_READY = "BETTERBLOG_PREVIEW_READY";
const MESSAGE_TYPE_CONFIG = "BETTERBLOG_PREVIEW_CONFIG";
const MESSAGE_TYPE_SELECT_POST = "BETTERBLOG_PREVIEW_SELECT_POST";

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
  className = "",
}: BlogPreviewIframeProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const configRef = useRef(config);
  configRef.current = config;
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
  // Use event.source (the iframe window that sent READY) for reliable delivery.
  // Use target's origin as targetOrigin for postMessage (more reliable than "*").
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type !== MESSAGE_TYPE_READY) return;
      const expectedOrigin = getTargetOrigin();
      if (expectedOrigin !== "*" && !originsMatch(event.origin, expectedOrigin)) return;

      const target = event.source as Window | null;
      if (!target || typeof target.postMessage !== "function") return;
      resolvedTargetOriginRef.current = event.origin;
      const latestConfig = configForPostMessage(configRef.current);
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

  // Tell iframe to switch to single-post view when selectPostIndex is set (e.g. user switched to Post config level)
  useEffect(() => {
    if (typeof selectPostIndex !== "number" || selectPostIndex < 0) return;
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    const targetOrigin = getEffectiveTargetOrigin();
    iframe.contentWindow.postMessage(
      { type: MESSAGE_TYPE_SELECT_POST, postIndex: selectPostIndex },
      targetOrigin
    );
    iframe.contentWindow.postMessage(
      { type: MESSAGE_TYPE_CONFIG, config: configForPostMessage(configRef.current) },
      targetOrigin
    );
  }, [selectPostIndex, config]);

  // Reset resolved origin when blogUrl changes (e.g. user switched sites)
  useEffect(() => {
    resolvedTargetOriginRef.current = null;
  }, [blogUrl]);

  // Use resolved origin from READY when available (iframe may redirect www↔non-www)
  const getEffectiveTargetOrigin = () =>
    resolvedTargetOriginRef.current || getTargetOrigin() || "*";

  // Send config whenever it changes. Use configSignature so effect reliably runs on every config update.
  useEffect(() => {
    const sendConfig = () => {
      const iframe = iframeRef.current;
      if (!iframe?.contentWindow) return;
      try {
        const targetOrigin = getEffectiveTargetOrigin();
        const latestConfig = configForPostMessage(configRef.current);
        iframe.contentWindow.postMessage(
          { type: MESSAGE_TYPE_CONFIG, config: latestConfig },
          targetOrigin
        );
      } catch {
        // ignore
      }
    };

    sendConfig();
    const delays = [100, 250, 500, 900];
    const timeouts = delays.map((d) => window.setTimeout(sendConfig, d));
    return () => timeouts.forEach((t) => window.clearTimeout(t));
  }, [config, configSignature, blogUrl]);

  // Send config when iframe loads (renderer may not be ready yet, so READY will trigger another send)
  const handleIframeLoad = () => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    try {
      const targetOrigin = getEffectiveTargetOrigin();
      if (DEBUG) console.log("[BlogPreviewIframe] iframe onLoad, sending config", { targetOrigin });
      iframe.contentWindow.postMessage(
        { type: MESSAGE_TYPE_CONFIG, config: configForPostMessage(configRef.current) },
        targetOrigin
      );
    } catch {
      // ignore
    }
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
