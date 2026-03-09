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
  /** When set, tells the iframe to switch to single-post view for this index (e.g. when editing post-level config) */
  selectPostIndex?: number;
  className?: string;
}

const MESSAGE_TYPE_READY = "BETTERBLOG_PREVIEW_READY";
const MESSAGE_TYPE_CONFIG = "BETTERBLOG_PREVIEW_CONFIG";
const MESSAGE_TYPE_SELECT_POST = "BETTERBLOG_PREVIEW_SELECT_POST";

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
 */
export function buildBlogPreviewUrl(
  site: { url: string | null; blogPath: string | null },
  blogPassword?: string
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
  selectPostIndex,
  className = "",
}: BlogPreviewIframeProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const configRef = useRef(config);
  configRef.current = config;

  const getTargetOrigin = () => {
    try {
      return new URL(blogUrl).origin;
    } catch {
      return "*";
    }
  };

  // Strip non-serializable values (e.g. functions) before postMessage - they cannot be cloned
  const configForPostMessage = (c: RendererConfig) => {
    const { configUpdateCallback, ...rest } = c as RendererConfig & { configUpdateCallback?: unknown };
    return rest;
  };

  // Listen for READY from iframe and send config.
  // Use event.source (the iframe window that sent READY) for reliable delivery.
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type !== MESSAGE_TYPE_READY) return;
      const targetOrigin = getTargetOrigin();
      if (targetOrigin !== "*" && event.origin !== targetOrigin) return;

      const target = event.source as Window | null;
      if (!target || typeof target.postMessage !== "function") return;
      const latestConfig = configRef.current;
      target.postMessage(
        { type: MESSAGE_TYPE_CONFIG, config: configForPostMessage(latestConfig) },
        "*"
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
    iframe.contentWindow.postMessage(
      { type: MESSAGE_TYPE_SELECT_POST, postIndex: selectPostIndex },
      "*"
    );
    iframe.contentWindow.postMessage(
      { type: MESSAGE_TYPE_CONFIG, config: configForPostMessage(configRef.current) },
      "*"
    );
  }, [selectPostIndex, config]);

  // Send config whenever it changes (iframe must be loaded).
  // Retry when contentWindow is temporarily null (e.g. iframe reloading, browser throttling).
  useEffect(() => {
    const sendConfig = (): boolean => {
      const iframe = iframeRef.current;
      if (!iframe?.contentWindow) return false;
      try {
        const latestConfig = configForPostMessage(configRef.current);
        iframe.contentWindow.postMessage(
          { type: MESSAGE_TYPE_CONFIG, config: latestConfig },
          "*"
        );
        return true;
      } catch {
        return false;
      }
    };

    if (sendConfig()) return;

    const delays = [100, 300, 600];
    const timeouts: number[] = [];
    for (const delay of delays) {
      timeouts.push(
        window.setTimeout(() => sendConfig(), delay)
      );
    }
    return () => timeouts.forEach((t) => window.clearTimeout(t));
  }, [config, blogUrl]);

  // Send config when iframe loads (renderer may not be ready yet, but READY will trigger another send)
  const handleIframeLoad = () => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    try {
      iframe.contentWindow.postMessage(
        { type: MESSAGE_TYPE_CONFIG, config: configForPostMessage(configRef.current) },
        "*"
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
