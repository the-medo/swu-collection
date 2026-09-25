import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import svgr from 'vite-plugin-svgr';
import tailwindcss from '@tailwindcss/vite';
import { crossfireTrainingPlugin } from './dev/crossfire-training-plugin.ts';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      crossfireTrainingPlugin(path.resolve(__dirname, '..')),
      svgr(),
      tanstackRouter(),
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@server': path.resolve(__dirname, './../server'),
      },
    },
    server: {
      proxy: {
        ...(env.CROSSFIRE_PROXY_URL
          ? {
              '/api/ws/crossfire': {
                target: env.CROSSFIRE_PROXY_URL,
                changeOrigin: true,
                ws: true,
              },
            }
          : {}),
        '/api': {
          target: env.VITE_BACKEND_URL || 'http://127.0.0.1:3010',
          changeOrigin: true,
          ws: true,
        },
      },
    },
  };
});
