import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3001,
      strictPort: true,
      host: '0.0.0.0',
      // ===========================================================
      // PROXY (OPCIONAL - Apenas conveniência de dev)
      // ===========================================================
      // O frontend agora usa VITE_API_URL e VITE_SOCKET_URL via ENV
      // Este proxy é apenas um fallback para rotas relativas em dev
      // Em PRODUÇÃO o proxy NÃO existe - tudo usa URLs absolutas
      // ===========================================================
      proxy: {
        // All API routes go to LIA Backend (port 3006)
        '/api': {
          target: 'http://127.0.0.1:3006',
          changeOrigin: true,
          secure: false,
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => {
              console.log('[Proxy Error] Backend not ready yet:', err.message);
            });
          },
        },
        '/chat': {
          target: 'http://127.0.0.1:3006',
          changeOrigin: true,
          secure: false,
        },
        '/socket.io': {
          target: 'http://127.0.0.1:3006',
          ws: true,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        '@lia': path.resolve(__dirname, './components/lia'),
        '@luminnus/shared': path.resolve(__dirname, '../packages/shared/src'),
        '@luminnus/lia-runtime': path.resolve(__dirname, '../packages/lia-runtime/src'),
      }
    },
    optimizeDeps: {
      exclude: ['@luminnus/lia-runtime']
    }
  };
});
