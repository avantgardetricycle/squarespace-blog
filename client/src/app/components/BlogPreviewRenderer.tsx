import { useEffect, useRef, useState } from "react";

const RENDERER_URL = "/renderer.js";

interface SidebarConfig {
  show?: boolean;
  modules?: string[];
  width?: number;
}

interface HeaderContentConfig {
  show?: boolean;
  tableOfContents?: boolean;
  breadcrumbs?: boolean;
}

interface FeaturedImageConfig {
  show?: boolean;
  layoutMode?: string;
  aspectBehavior?: string;
  aspectRatio?: string;
  roundedCorners?: string;
  shadow?: boolean;
  showCaption?: boolean;
  verticalSpacing?: string;
}

interface RendererConfigOverrides {
  showDate?: boolean;
  showAuthor?: boolean;
  defaultAuthorIds?: string[];
  postAuthorOverrides?: Record<string, string[]>;
  authorMap?: Record<string, string>;
  showProgressBar?: boolean;
  progressBarPosition?: string;
  progressBarThickness?: number;
  progressBarColor?: string;
  leftSidebar?: SidebarConfig;
  rightSidebar?: SidebarConfig;
  headerContent?: HeaderContentConfig;
  featuredImage?: FeaturedImageConfig;
  recentPostsCount?: number;
}

interface BlogPreviewRendererProps {
  siteKey: string;
  config?: RendererConfigOverrides | null;
  className?: string;
}

/**
 * Renders the blog overlay in preview mode using the same renderer.js as Squarespace.
 * Fetches blog JSON via our proxy and mounts the renderer into the given container.
 * When config is provided, the preview reflects those settings (live preview).
 */
export default function BlogPreviewRenderer({
  siteKey,
  config: configOverrides,
  className = "",
}: BlogPreviewRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!siteKey || !containerRef.current) return;

    setError(null);
    setLoading(true);

    const initRenderer = () => {
      const root = containerRef.current;
      if (!root || !window.BlogOverlayRenderer) return;

      const config = {
        previewMode: true,
        rootEl: root,
        previewFetchUrl: `/api/config/blog-preview/${encodeURIComponent(siteKey)}`,
        showAuthor: configOverrides?.showAuthor ?? false,
        defaultAuthorIds: configOverrides?.defaultAuthorIds ?? [],
        postAuthorOverrides: configOverrides?.postAuthorOverrides ?? {},
        authorMap: configOverrides?.authorMap ?? {},
        showDate: configOverrides?.showDate ?? true,
        showProgressBar: configOverrides?.showProgressBar ?? false,
        progressBarPosition: configOverrides?.progressBarPosition ?? "top",
        progressBarThickness: configOverrides?.progressBarThickness ?? 6,
        progressBarColor: configOverrides?.progressBarColor ?? "#5B4FE8",
        leftSidebar: configOverrides?.leftSidebar ?? { show: false, modules: [], width: 240 },
        rightSidebar: configOverrides?.rightSidebar ?? { show: false, modules: [], width: 240 },
        headerContent: configOverrides?.headerContent ?? { show: false, tableOfContents: false, breadcrumbs: false },
        featuredImage: configOverrides?.featuredImage ?? {
          show: true,
          layoutMode: "leftJustified",
          imageWidthPercent: 40,
          aspectBehavior: "original",
          aspectRatio: "16:9",
          roundedCorners: "off",
          shadow: false,
          showCaption: true,
          verticalSpacing: "normal",
        },
        recentPostsCount: configOverrides?.recentPostsCount ?? 5,
      };

      try {
        window.BlogOverlayRenderer.init(config);
        setLoading(false);
      } catch (e) {
        console.error("[BlogPreview] Init error:", e);
        setError("Failed to initialize preview");
        setLoading(false);
      }
    };

    if (window.BlogOverlayRenderer && typeof window.BlogOverlayRenderer.init === "function") {
      initRenderer();
      return;
    }

    const script = document.createElement("script");
    script.src = RENDERER_URL;
    script.async = true;
    script.onload = initRenderer;
    script.onerror = () => {
      setError("Failed to load renderer");
      setLoading(false);
    };
    document.head.appendChild(script);

    return () => {
      if (script.parentNode) script.parentNode.removeChild(script);
      const root = containerRef.current;
      if (root) {
        root.querySelector("#blog-overlay-list")?.remove();
        root.querySelector("#blog-overlay-progress")?.remove();
      }
    };
  }, [siteKey, configOverrides]);

  return (
    <div className={`relative w-full min-h-[400px] ${className}`}>
      <div
        ref={containerRef}
        className="w-full min-h-[400px] bg-white"
        style={{ minHeight: "400px" }}
      />
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-neutral-50 text-neutral-500">
          Loading blog preview…
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-neutral-50 text-red-600 p-4 text-center">
          {error}
        </div>
      )}
    </div>
  );
}
