import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3001,
      strictPort: true,
      host: '0.0.0.0',
      proxy: {
        // Admin routes are hosted on LIA Live View server (port 3006)
        '/api/admin': {
          target: 'http://127.0.0.1:3006',
          changeOrigin: true,
          secure: false,
        },
        // Integrations routes (also on LIA Live View)
        '/api/integrations': {
          target: 'http://127.0.0.1:3006',
          changeOrigin: true,
          secure: false,
        },
        // Default API routes (port 3006)
        '/api': {
          target: 'http://127.0.0.1:3006',
          changeOrigin: true,
          secure: false,
        },
        '/health': 'http://127.0.0.1:3006',
        '/version': 'http://127.0.0.1:3006',
        '/ws': {
          target: 'ws://127.0.0.1:3006',
          ws: true
        }
      }
    },
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
