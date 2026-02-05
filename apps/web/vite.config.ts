import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "node:path";
import { fileURLToPath } from 'node:url';
import { componentTagger } from "lovable-tagger";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    strictPort: true,
    proxy: {
      // Routes hosted on LIA Live View server (port 3006)
      '/api/admin/whatsapp': {
        target: 'http://127.0.0.1:3006',
        changeOrigin: true,
        secure: false,
      },
      '/api/admin': {
        target: 'http://127.0.0.1:3006',
        changeOrigin: true,
        secure: false,
      },
      '/api/integrations': {
        target: 'http://127.0.0.1:3006',
        changeOrigin: true,
        secure: false,
      },
      // Fallback for other API routes (port 3006)
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
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Standard output directory cleanup
    emptyOutDir: true,

    rollupOptions: {
      output: {
        // Standard content hashing for long-term caching
        entryFileNames: `assets/[name].[hash].js`,
        chunkFileNames: `assets/[name].[hash].js`,
        assetFileNames: `assets/[name].[hash].[ext]`,

        // Manual chunk splitting to reduce main bundle size
        manualChunks: {
          'vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-libs': ['@radix-ui/react-dialog', '@radix-ui/react-slot', 'lucide-react', 'class-variance-authority', 'clsx', 'tailwind-merge'],
          'animations': ['framer-motion'],
          'charts': ['recharts'],
          'supabase': ['@supabase/supabase-js'],
        },
      }
    },
    // Use esbuild for minification (default and fastest)
    minify: 'esbuild',
    // Generate sourcemaps only for non-production to reduce build time/maintenance
    sourcemap: mode !== 'production',
    // Break CSS into separate files
    cssCodeSplit: true,
  },
  // Default optimization settings are usually best
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'lucide-react',
      '@radix-ui/react-dialog'
    ]
  },
  esbuild: {
    // Drop console.log in production
    drop: mode === 'production' ? ['console', 'debugger'] : [],
  },
}));
