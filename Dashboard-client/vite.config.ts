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
        '/api/auth': {
          target: 'http://127.0.0.1:5000',
          changeOrigin: true,
        },
        '/api/integrations': {
          target: 'http://127.0.0.1:5000',
          changeOrigin: true,
        },
        '/api': {
          target: 'http://127.0.0.1:3000',
          changeOrigin: true,
        },
        '/chat': {
          target: 'http://127.0.0.1:3000',
          changeOrigin: true,
        },
        '/socket.io': {
          target: 'http://127.0.0.1:3000',
          ws: true,
          changeOrigin: true,
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
      }
    },
    optimizeDeps: {
      exclude: ['@luminnus/lia-runtime']
    }
  };
});
