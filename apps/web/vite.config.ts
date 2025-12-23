import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// Gera timestamp único para cache busting
const timestamp = Date.now();
// Force TypeScript rebuild after Supabase schema update

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    // Desabilita cache no servidor de desenvolvimento
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    },
    proxy: {
      '/api': 'http://localhost:5000',
      '/health': 'http://localhost:5000',
      '/version': 'http://localhost:5000',
      '/ws': {
        target: 'ws://localhost:5000',
        ws: true
      }
    }
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Limpa o diretório de saída antes de buildar (equivalente ao cleanDistDir)
    emptyOutDir: true,
    // Força rebuild completo ao desabilitar cache do Rollup
    rollupOptions: {
      cache: false,
      output: {
        // Adiciona hash E timestamp aos arquivos para invalidar cache do navegador
        entryFileNames: `assets/[name].[hash].${timestamp}.js`,
        chunkFileNames: `assets/[name].[hash].${timestamp}.js`,
        assetFileNames: `assets/[name].[hash].${timestamp}.[ext]`,
        // Adiciona banner com timestamp em todos os arquivos JS
        banner: `/* Build: ${new Date().toISOString()} | Cache-bust: ${timestamp} */`,
        // Força regeneração de chunks
        manualChunks: undefined,
      }
    },
    // Garante que todos os módulos sejam reconstruídos
    minify: 'esbuild',
    // Configurações adicionais para forçar rebuild
    sourcemap: false,
    // Remove cache de módulos
    commonjsOptions: {
      transformMixedEsModules: true
    },
    // Força rebuild de todos os assets
    cssCodeSplit: true,
    // Adiciona timestamp aos CSS também
    assetsInlineLimit: 0,
  },
  // Desabilita otimização de dependências em cache
  optimizeDeps: {
    force: true,
    // Inclui componentes admin para garantir rebuild
    include: [
      'react',
      'react-dom',
      'react-router-dom'
    ]
  },
  // Desabilita cache de ESBuild
  esbuild: {
    keepNames: false,
  },
  // Define variáveis globais para cache busting no código
  define: {
    __BUILD_TIMESTAMP__: JSON.stringify(timestamp),
    __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
  }
}));
