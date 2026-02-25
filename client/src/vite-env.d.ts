/// <reference types="vite/client" />

declare global {
  interface Window {
    BlogOverlayRenderer?: {
      init: (config: Record<string, unknown>) => void;
    };
  }
}
