import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { TanStackRouterVite } from '@tanstack/router-plugin/vite';
import svgr from 'vite-plugin-svgr';

// https://vite.dev/config/
export default defineConfig({
  plugins: [svgr(), TanStackRouterVite(), react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@server': path.resolve(__dirname, './../server'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3010',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Split React core into its own chunk
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react-vendor';
            }
            // Group TanStack packages (router, query, etc.)
            if (id.includes('@tanstack')) {
              return 'tanstack';
            }
            // Default vendor chunk for other deps
            return 'vendor';
          }
        },
        // Keep filenames deterministic
        chunkFileNames: 'assets/chunk-[name]-[hash].js',
        entryFileNames: 'assets/entry-[name]-[hash].js',
        assetFileNames: 'assets/asset-[name]-[hash][extname]'
      },
    },
    // Raise warning limit if needed for larger chunks
    chunkSizeWarningLimit: 900,
  },
});
