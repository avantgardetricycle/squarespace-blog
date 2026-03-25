import { useCallback, useEffect, useRef, useState } from "react";

const RENDERER_URL = "/renderer.js";

/** Config shape expected by renderer.js - supports collectionConfig/postConfig or legacy flat */
interface RendererConfigOverrides {
  defaultAuthorIds?: string[];
  postAuthorOverrides?: Record<string, string[]>;
  authorMap?: Record<string, string>;
  authorProfiles?: Record<string, { name: string; imageUrl: string | null; bio: string | null; email: string | null; socialLinks: Record<string, string> }>;
  collectionConfig?: Record<string, unknown>;
  postConfig?: Record<string, unknown>;
  recentPostsCount?: number;
  /** Configure preview only: -1 = list/collection view, >=0 = single-post index (path/hash ignored in previewMode) */
  previewSelectedPostIndex?: number;
}

interface BlogPreviewRendererProps {
  siteKey: string;
  config?: RendererConfigOverrides | null;
  /** Stable string that changes when config changes; ensures effect runs on every config update */
  configSignature?: string;
  className?: string;
}

function buildRendererConfig(overrides: RendererConfigOverrides | null | undefined) {
  return {
    previewMode: true,
    baseUrl: typeof window !== "undefined" ? window.location.origin : "",
    defaultAuthorIds: overrides?.defaultAuthorIds ?? [],
    postAuthorOverrides: overrides?.postAuthorOverrides ?? {},
    authorMap: overrides?.authorMap ?? {},
    authorProfiles: overrides?.authorProfiles ?? {},
    collectionConfig: overrides?.collectionConfig ?? undefined,
    postConfig: overrides?.postConfig ?? undefined,
    recentPostsCount: overrides?.recentPostsCount ?? 5,
    ...(typeof overrides?.previewSelectedPostIndex === "number"
      ? { previewSelectedPostIndex: overrides.previewSelectedPostIndex }
      : {}),
  };
}

/**
 * Renders the blog overlay in preview mode using the same renderer.js as Squarespace.
 * Fetches blog JSON via our proxy and mounts the renderer into the given container.
 * When config is provided, the preview reflects those settings (live preview).
 */
export default function BlogPreviewRenderer({
  siteKey,
  config: configOverrides,
  configSignature,
  className = "",
}: BlogPreviewRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const configRef = useRef(configOverrides);
  configRef.current = configOverrides;
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const pushConfig = useCallback(() => {
    const current = configRef.current;
    if (!current || !window.BlogOverlayRenderer?.updateConfig) return false;
    window.BlogOverlayRenderer.updateConfig(buildRendererConfig(current));
    return true;
  }, []);

  // Init renderer when siteKey/container ready
  useEffect(() => {
    if (!siteKey || !containerRef.current) return;

    setError(null);
    setLoading(true);

    const initRenderer = () => {
      const root = containerRef.current;
      if (!root || !window.BlogOverlayRenderer) return;

      const config = {
        ...buildRendererConfig(configRef.current),
        rootEl: root,
        previewFetchUrl: `/api/config/blog-preview/${encodeURIComponent(siteKey)}`,
      };

      try {
        window.BlogOverlayRenderer.init(config);
        setLoading(false);
        pushConfig();
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
  }, [siteKey]);

  // Live preview: push config updates to renderer without full re-init.
  // Use configSignature so effect runs on every config change. pushConfig uses configRef
  // so timeouts always push latest config. Retry with backoff if renderer not ready yet.
  useEffect(() => {
    if (!configOverrides) return;
    if (pushConfig()) return;
    const delays = [50, 150, 400, 800];
    const timeouts = delays.map((d) => window.setTimeout(pushConfig, d));
    return () => timeouts.forEach((t) => window.clearTimeout(t));
  }, [configOverrides, configSignature, pushConfig]);

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
