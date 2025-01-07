import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
});
