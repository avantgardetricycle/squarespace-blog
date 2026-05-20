import path from 'path'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** Baked in at build time from Vercel env (Preview vs Production). */
const buildTimeIsLive =
  process.env.VITE_IS_BETTER_BLOG_LIVE === 'true' ||
  process.env.IS_BETTER_BLOG_LIVE === 'true'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    'import.meta.env.VITE_IS_BETTER_BLOG_LIVE': JSON.stringify(
      buildTimeIsLive ? 'true' : 'false'
    ),
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
        timeout: 60000,
        secure: false,
      },
      '/renderer.js': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
      '/loader.js': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
    },
  },
})
