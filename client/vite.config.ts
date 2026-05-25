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

console.info('[BetterBlog/build] is-live env at client build:', {
  IS_BETTER_BLOG_LIVE: process.env.IS_BETTER_BLOG_LIVE ?? '(unset)',
  VITE_IS_BETTER_BLOG_LIVE: process.env.VITE_IS_BETTER_BLOG_LIVE ?? '(unset)',
  bakedViteIsBetterBlogLive: buildTimeIsLive ? 'true' : 'false',
  VERCEL_ENV: process.env.VERCEL_ENV ?? '(unset)',
  VERCEL_GIT_COMMIT_REF: process.env.VERCEL_GIT_COMMIT_REF ?? '(unset)',
})

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
