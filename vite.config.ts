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
        // Isolate heavy vendors into long-cached chunks; Recharts (the largest)
        // lands in `charts`, pulled only by the routes that render charts.
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('recharts') || id.includes('d3-') || id.includes('victory')) return 'charts';
          if (id.includes('react-router')) return 'router';
          if (id.includes('@tanstack')) return 'query';
          if (id.includes('react-dom') || id.includes('scheduler') || id.includes('/react/')) return 'react-vendor';
        },
      },
    },
  },
})