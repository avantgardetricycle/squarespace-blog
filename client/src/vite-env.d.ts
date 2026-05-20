/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_IS_BETTER_BLOG_LIVE: 'true' | 'false'
}

declare global {
  interface Window {
    BlogOverlayRenderer?: {
      init: (config: Record<string, unknown>) => void;
      updateConfig?: (config: Record<string, unknown>) => void;
      items?: unknown[];
    };
  }
}

export {}
