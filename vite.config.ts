import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

import { cloudflare } from "@cloudflare/vite-plugin";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), cloudflare()],
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