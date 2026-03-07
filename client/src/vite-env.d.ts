/// <reference types="vite/client" />

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
