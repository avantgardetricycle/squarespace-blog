import { useEffect, useRef } from "react";

export interface RendererConfig {
  showDate?: boolean;
  showAuthor?: boolean;
  showProgressBar?: boolean;
  progressBarPosition?: string;
  showTableOfContents?: boolean;
  tableOfContentsPosition?: string;
  showRecentPostsSidebar?: boolean;
  sidebarPosition?: string;
  recentPostsCount?: number;
}

interface BlogPreviewIframeProps {
  blogUrl: string;
  config: RendererConfig;
  className?: string;
}

const MESSAGE_TYPE_READY = "BETTERBLOG_PREVIEW_READY";
const MESSAGE_TYPE_CONFIG = "BETTERBLOG_PREVIEW_CONFIG";

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
  className = "",
}: BlogPreviewIframeProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;

    const targetOrigin = (() => {
      try {
        return new URL(blogUrl).origin;
      } catch {
        return "*";
      }
    })();

    const sendConfig = () => {
      iframe.contentWindow?.postMessage(
        { type: MESSAGE_TYPE_CONFIG, config },
        targetOrigin
      );
    };

    const handleMessage = (event: MessageEvent) => {
      if (
        event.data?.type === MESSAGE_TYPE_READY &&
        (targetOrigin === "*" || event.origin === targetOrigin)
      ) {
        sendConfig();
      }
    };

    window.addEventListener("message", handleMessage);
    sendConfig();

    return () => window.removeEventListener("message", handleMessage);
  }, [blogUrl, config]);

  return (
    <iframe
      ref={iframeRef}
      src={blogUrl}
      title="Blog preview"
      className={`w-full h-full border-0 ${className}`}
      sandbox="allow-scripts allow-same-origin allow-forms"
    />
  );
}
