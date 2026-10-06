import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import type { ViteDevServer } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { appendOperationLog, normalizeOperationLogEvent, shouldWriteOperationLog } from './server/logServer.ts';

const MAX_LOG_BODY_BYTES = 64 * 1024;

function installLogMiddleware(server: ViteDevServer) {
  server.middlewares.use('/api/log', (request, response, next) => {
    if (request.method !== 'POST') {
      next();
      return;
    }
    let body = '';
    request.setEncoding('utf8');
    request.on('data', (chunk: string) => {
      body += chunk;
      if (Buffer.byteLength(body, 'utf8') > MAX_LOG_BODY_BYTES) {
        response.statusCode = 413;
        response.end(JSON.stringify({ ok: false, error: 'log_payload_too_large' }));
        request.destroy();
      }
    });
    request.on('end', () => {
      try {
        const payload = JSON.parse(body) as Record<string, unknown>;
        const event = normalizeOperationLogEvent(payload, request.url || '/api/log');
        if (!shouldWriteOperationLog(event)) {
          response.statusCode = 204;
          response.end();
          return;
        }
        void appendOperationLog(event)
          .then(() => {
            response.statusCode = 204;
            response.end();
          })
          .catch(() => {
            response.statusCode = 500;
            response.end(JSON.stringify({ ok: false, error: 'log_write_failed' }));
          });
      } catch {
        response.statusCode = 400;
        response.end(JSON.stringify({ ok: false, error: 'invalid_log_payload' }));
      }
    });
  });
}

const operationLogPlugin = {
  name: 'warroom-operation-log',
  configureServer: installLogMiddleware,
};

const rootDir = import.meta.dirname ?? process.cwd();

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      operationLogPlugin,
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        includeAssets: [
          'favicon.ico',
          'apple-touch-icon.png',
          'fonts/vazirmatn.css',
          'fonts/*.woff2',
          'images/logos/warroom_logo.webp',
          'images/logos/warroom_logo_sm.webp',
          'images/banners/*.webp',
          'images/backgrounds/*.webp',
          'images/badges/*.webp',
          'images/avatar/male/*.jpeg',
          'images/avatar/woman/*.jpeg',
          'images/icons/*.png',
          'pwa-192x192.png',
          'pwa-512x512.png',
          'pwa-maskable-512x512.png',
        ],
        manifest: {
          id: '/',
          name: 'اتاق جنگ | سامانه فرماندهی و عملیات',
          short_name: 'اتاق جنگ',
          description: 'سامانه یکپارچه مأموریت‌ها، آموزش‌ها، ویترین آثار و امتیازات اتاق جنگ',
          theme_color: '#030610',
          background_color: '#030610',
          display: 'standalone',
          orientation: 'portrait-primary',
          start_url: '/',
          scope: '/',
          dir: 'rtl',
          lang: 'fa',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff,woff2,jpeg,jpg,json}'],
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api\//],
          runtimeCaching: [
            {
              urlPattern: ({ request }) => request.destination === 'image',
              handler: 'CacheFirst',
              options: {
                cacheName: 'warroom-images-cache',
                expiration: {
                  maxEntries: 120,
                  maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: ({ request }) => request.destination === 'font' || request.url.includes('/fonts/'),
              handler: 'CacheFirst',
              options: {
                cacheName: 'warroom-fonts-cache',
                expiration: {
                  maxEntries: 40,
                  maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: ({ request }) => request.destination === 'style' || request.destination === 'script' || request.destination === 'worker',
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'warroom-static-assets',
              },
            },
          ],
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
    ],
    resolve: {
      extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json'],
      alias: [
        { find: /^@\/(.*)/, replacement: path.resolve(rootDir, 'src/$1') },
      ],
    },
    build: {
      target: 'esnext',
      cssCodeSplit: true,
      minify: 'esbuild',
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
              return 'vendor-react';
            }
            if (id.includes('node_modules/motion/')) {
              return 'vendor-motion';
            }
            if (id.includes('node_modules/lucide-react/')) {
              return 'vendor-icons';
            }
            if (id.includes('node_modules/@supabase/')) {
              return 'vendor-supabase';
            }
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
