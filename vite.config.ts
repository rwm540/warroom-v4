import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import type { ViteDevServer } from 'vite';
import { appendOperationLog, normalizeOperationLogEvent, shouldWriteOperationLog } from './server/logServer';

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

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), operationLogPlugin],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
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
