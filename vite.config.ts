import path from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

import { cloudflare } from "@cloudflare/vite-plugin";

// Fonts are referenced from CSS, so the browser only finds them after the stylesheet
// is downloaded and parsed, and a late JetBrains Mono swap shifted the dashboard
// layout (CLS). Preload the latin files every dashboard page renders with; the names
// are content-hashed, so they are read from the bundle at build time.
const PRELOAD_FONTS = [
  /geist-latin-wght-normal-.*\.woff2$/,
  /jetbrains-mono-latin-(400|500|600)-normal-.*\.woff2$/,
]

function preloadFonts(): Plugin {
  return {
    name: 'preload-fonts',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(_html, ctx) {
        if (!ctx.bundle) return
        return Object.keys(ctx.bundle)
          .filter(file => PRELOAD_FONTS.some(re => re.test(file)))
          .map(file => ({
            tag: 'link',
            attrs: { rel: 'preload', href: `/${file}`, as: 'font', type: 'font/woff2', crossorigin: '' },
            injectTo: 'head' as const,
          }))
      },
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), cloudflare(), preloadFonts()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  build: {
    // Explicit budget — kept tight now that vendors are split out.
    chunkSizeWarningLimit: 600,
    rolldownOptions: {
      output: {
        // Rolldown groups pull their dependencies in recursively, and the
        // higher-priority group wins a contested module. react-vendor must rank
        // highest: otherwise `charts` (recharts depends on react) absorbs React and
        // the whole charts chunk lands on the eager entry graph.
        codeSplitting: {
          groups: [
            // clsx is a shared low-level dep of both recharts and the app's own
            // `cn()` helper. Pin it to the always-eager react-vendor chunk so
            // recharts's internal usage imports it from there instead of dragging
            // the `charts` chunk onto the eager entry graph.
            { name: 'react-vendor', test: /node_modules[\\/](react|react-dom|scheduler|clsx)[\\/]/, priority: 40 },
            { name: 'router', test: /node_modules[\\/]react-router/, priority: 30 },
            { name: 'query', test: /node_modules[\\/]@tanstack[\\/]/, priority: 20 },
            { name: 'charts', test: /node_modules[\\/](recharts|d3-|victory)/, priority: 10 },
          ],
        },
      },
    },
  },
})