import path from 'node:path';

import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: '/',
    server: {
      port: 5173,
      strictPort: true,
      host: '0.0.0.0',
      // Headers para permitir embedding via iframe no Admin panel
      headers: {
        'X-Frame-Options': 'ALLOWALL',
        'Content-Security-Policy': "frame-ancestors 'self' http://localhost:* https://localhost:*",
        'Access-Control-Allow-Origin': '*',
      },
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:3000',
          changeOrigin: true,
          secure: false,
          // Silencia erros temporários de conexão durante startup
          configure: (proxy) => {
            let lastErrorCode = '';
            let lastErrorTime = 0;

            proxy.on('error', (err: Error) => {
              const code = (err as any).code || err.message;
              const now = Date.now();

              // Only log if it's a new error or 5 seconds have passed
              if (code !== lastErrorCode || (now - lastErrorTime > 5000)) {
                console.warn('[Vite Proxy] Aguardando backend:', code);
                lastErrorCode = code;
                lastErrorTime = now;
              }
            });
          }
        },
        '/chat': {
          target: 'http://127.0.0.1:3000',
          changeOrigin: true
        },
        '/socket.io': {
          target: 'http://127.0.0.1:3000',
          ws: true,
          changeOrigin: true
        }
      }
    },
    plugins: [
      react(),
      tailwindcss(),
    ],
    publicDir: 'public',
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        // Alias @ aponta para src/ (PROJETO UNIFICADO)
        '@': path.resolve(__dirname, './src'),
        // Mocks para Next.js
        'next/image': path.resolve(__dirname, './src/mocks/next-image.tsx'),
        'next/font/google': path.resolve(__dirname, './src/mocks/next-font.tsx'),
      }
    },
    optimizeDeps: {
      exclude: ['@luminnus/lia-runtime']
    }
  };
});
