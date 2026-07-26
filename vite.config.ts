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
      '@': path.resolve(__dirname, './src'),
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
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          // clsx is a shared low-level dep of both recharts and the app's own `cn()`
          // helper. Pin it to the always-eager react-vendor chunk so recharts's
          // internal usage imports it from there instead of Rollup hoisting a
          // cross-chunk import that would drag the whole `charts` chunk (and
          // recharts) onto the eager entry graph.
          if (id.includes('clsx')) return 'react-vendor';
          if (id.includes('recharts') || id.includes('d3-') || id.includes('victory')) return 'charts';
          if (id.includes('react-router')) return 'router';
          if (id.includes('@tanstack')) return 'query';
          if (id.includes('react-dom') || id.includes('scheduler') || id.includes('/react/')) return 'react-vendor';
        },
      },
    },
  },
})