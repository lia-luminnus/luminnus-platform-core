// vite.config.ts
import { defineConfig } from "file:///D:/luminnus-platform-core/node_modules/.pnpm/vite@5.4.21_@types+node@22.19.3_lightningcss@1.30.2/node_modules/vite/dist/node/index.js";
import react from "file:///D:/luminnus-platform-core/node_modules/.pnpm/@vitejs+plugin-react-swc@3.11.0_@swc+helpers@0.5.17_vite@5.4.21_@types+node@22.19.3_lightningcss@1.30.2_/node_modules/@vitejs/plugin-react-swc/index.js";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { componentTagger } from "file:///D:/luminnus-platform-core/node_modules/.pnpm/lovable-tagger@1.1.13_tsx@4.21.0_vite@5.4.21_@types+node@22.19.3_lightningcss@1.30.2_/node_modules/lovable-tagger/dist/index.js";
var __vite_injected_original_import_meta_url = "file:///D:/luminnus-platform-core/apps/web/vite.config.ts";
var __filename = fileURLToPath(__vite_injected_original_import_meta_url);
var __dirname = path.dirname(__filename);
var vite_config_default = defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    strictPort: true,
    proxy: {
      // Routes hosted on LIA Live View server (port 3006)
      "/api/admin/whatsapp": {
        target: "http://127.0.0.1:3006",
        changeOrigin: true,
        secure: false
      },
      "/api/admin": {
        target: "http://127.0.0.1:3006",
        changeOrigin: true,
        secure: false
      },
      "/api/integrations": {
        target: "http://127.0.0.1:3006",
        changeOrigin: true,
        secure: false
      },
      // Fallback for other API routes (port 3006)
      "/api": {
        target: "http://127.0.0.1:3006",
        changeOrigin: true,
        secure: false
      },
      "/health": "http://127.0.0.1:3006",
      "/version": "http://127.0.0.1:3006",
      "/ws": {
        target: "ws://127.0.0.1:3006",
        ws: true
      }
    }
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    }
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
          "vendor": ["react", "react-dom", "react-router-dom"],
          "ui-libs": ["@radix-ui/react-dialog", "@radix-ui/react-slot", "lucide-react", "class-variance-authority", "clsx", "tailwind-merge"],
          "animations": ["framer-motion"],
          "charts": ["recharts"],
          "supabase": ["@supabase/supabase-js"]
        }
      }
    },
    // Use esbuild for minification (default and fastest)
    minify: "esbuild",
    // Generate sourcemaps only for non-production to reduce build time/maintenance
    sourcemap: mode !== "production",
    // Break CSS into separate files
    cssCodeSplit: true
  },
  // Default optimization settings are usually best
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "lucide-react",
      "@radix-ui/react-dialog"
    ]
  },
  esbuild: {
    // Drop console.log in production
    drop: mode === "production" ? ["console", "debugger"] : []
  }
}));
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJEOlxcXFxsdW1pbm51cy1wbGF0Zm9ybS1jb3JlXFxcXGFwcHNcXFxcd2ViXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJEOlxcXFxsdW1pbm51cy1wbGF0Zm9ybS1jb3JlXFxcXGFwcHNcXFxcd2ViXFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9EOi9sdW1pbm51cy1wbGF0Zm9ybS1jb3JlL2FwcHMvd2ViL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSBcInZpdGVcIjtcclxuaW1wb3J0IHJlYWN0IGZyb20gXCJAdml0ZWpzL3BsdWdpbi1yZWFjdC1zd2NcIjtcclxuaW1wb3J0IHBhdGggZnJvbSBcIm5vZGU6cGF0aFwiO1xyXG5pbXBvcnQgeyBmaWxlVVJMVG9QYXRoIH0gZnJvbSAnbm9kZTp1cmwnO1xyXG5pbXBvcnQgeyBjb21wb25lbnRUYWdnZXIgfSBmcm9tIFwibG92YWJsZS10YWdnZXJcIjtcclxuXHJcbmNvbnN0IF9fZmlsZW5hbWUgPSBmaWxlVVJMVG9QYXRoKGltcG9ydC5tZXRhLnVybCk7XHJcbmNvbnN0IF9fZGlybmFtZSA9IHBhdGguZGlybmFtZShfX2ZpbGVuYW1lKTtcclxuXHJcbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXHJcbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZygoeyBtb2RlIH0pID0+ICh7XHJcbiAgc2VydmVyOiB7XHJcbiAgICBob3N0OiBcIjo6XCIsXHJcbiAgICBwb3J0OiA4MDgwLFxyXG4gICAgc3RyaWN0UG9ydDogdHJ1ZSxcclxuICAgIHByb3h5OiB7XHJcbiAgICAgIC8vIFJvdXRlcyBob3N0ZWQgb24gTElBIExpdmUgVmlldyBzZXJ2ZXIgKHBvcnQgMzAwNilcclxuICAgICAgJy9hcGkvYWRtaW4vd2hhdHNhcHAnOiB7XHJcbiAgICAgICAgdGFyZ2V0OiAnaHR0cDovLzEyNy4wLjAuMTozMDA2JyxcclxuICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXHJcbiAgICAgICAgc2VjdXJlOiBmYWxzZSxcclxuICAgICAgfSxcclxuICAgICAgJy9hcGkvYWRtaW4nOiB7XHJcbiAgICAgICAgdGFyZ2V0OiAnaHR0cDovLzEyNy4wLjAuMTozMDA2JyxcclxuICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXHJcbiAgICAgICAgc2VjdXJlOiBmYWxzZSxcclxuICAgICAgfSxcclxuICAgICAgJy9hcGkvaW50ZWdyYXRpb25zJzoge1xyXG4gICAgICAgIHRhcmdldDogJ2h0dHA6Ly8xMjcuMC4wLjE6MzAwNicsXHJcbiAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxyXG4gICAgICAgIHNlY3VyZTogZmFsc2UsXHJcbiAgICAgIH0sXHJcbiAgICAgIC8vIEZhbGxiYWNrIGZvciBvdGhlciBBUEkgcm91dGVzIChwb3J0IDMwMDYpXHJcbiAgICAgICcvYXBpJzoge1xyXG4gICAgICAgIHRhcmdldDogJ2h0dHA6Ly8xMjcuMC4wLjE6MzAwNicsXHJcbiAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxyXG4gICAgICAgIHNlY3VyZTogZmFsc2UsXHJcbiAgICAgIH0sXHJcbiAgICAgICcvaGVhbHRoJzogJ2h0dHA6Ly8xMjcuMC4wLjE6MzAwNicsXHJcbiAgICAgICcvdmVyc2lvbic6ICdodHRwOi8vMTI3LjAuMC4xOjMwMDYnLFxyXG4gICAgICAnL3dzJzoge1xyXG4gICAgICAgIHRhcmdldDogJ3dzOi8vMTI3LjAuMC4xOjMwMDYnLFxyXG4gICAgICAgIHdzOiB0cnVlXHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9LFxyXG4gIHBsdWdpbnM6IFtyZWFjdCgpLCBtb2RlID09PSBcImRldmVsb3BtZW50XCIgJiYgY29tcG9uZW50VGFnZ2VyKCldLmZpbHRlcihCb29sZWFuKSxcclxuICByZXNvbHZlOiB7XHJcbiAgICBhbGlhczoge1xyXG4gICAgICBcIkBcIjogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgXCIuL3NyY1wiKSxcclxuICAgIH0sXHJcbiAgfSxcclxuICBidWlsZDoge1xyXG4gICAgLy8gU3RhbmRhcmQgb3V0cHV0IGRpcmVjdG9yeSBjbGVhbnVwXHJcbiAgICBlbXB0eU91dERpcjogdHJ1ZSxcclxuXHJcbiAgICByb2xsdXBPcHRpb25zOiB7XHJcbiAgICAgIG91dHB1dDoge1xyXG4gICAgICAgIC8vIFN0YW5kYXJkIGNvbnRlbnQgaGFzaGluZyBmb3IgbG9uZy10ZXJtIGNhY2hpbmdcclxuICAgICAgICBlbnRyeUZpbGVOYW1lczogYGFzc2V0cy9bbmFtZV0uW2hhc2hdLmpzYCxcclxuICAgICAgICBjaHVua0ZpbGVOYW1lczogYGFzc2V0cy9bbmFtZV0uW2hhc2hdLmpzYCxcclxuICAgICAgICBhc3NldEZpbGVOYW1lczogYGFzc2V0cy9bbmFtZV0uW2hhc2hdLltleHRdYCxcclxuXHJcbiAgICAgICAgLy8gTWFudWFsIGNodW5rIHNwbGl0dGluZyB0byByZWR1Y2UgbWFpbiBidW5kbGUgc2l6ZVxyXG4gICAgICAgIG1hbnVhbENodW5rczoge1xyXG4gICAgICAgICAgJ3ZlbmRvcic6IFsncmVhY3QnLCAncmVhY3QtZG9tJywgJ3JlYWN0LXJvdXRlci1kb20nXSxcclxuICAgICAgICAgICd1aS1saWJzJzogWydAcmFkaXgtdWkvcmVhY3QtZGlhbG9nJywgJ0ByYWRpeC11aS9yZWFjdC1zbG90JywgJ2x1Y2lkZS1yZWFjdCcsICdjbGFzcy12YXJpYW5jZS1hdXRob3JpdHknLCAnY2xzeCcsICd0YWlsd2luZC1tZXJnZSddLFxyXG4gICAgICAgICAgJ2FuaW1hdGlvbnMnOiBbJ2ZyYW1lci1tb3Rpb24nXSxcclxuICAgICAgICAgICdjaGFydHMnOiBbJ3JlY2hhcnRzJ10sXHJcbiAgICAgICAgICAnc3VwYWJhc2UnOiBbJ0BzdXBhYmFzZS9zdXBhYmFzZS1qcyddLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH1cclxuICAgIH0sXHJcbiAgICAvLyBVc2UgZXNidWlsZCBmb3IgbWluaWZpY2F0aW9uIChkZWZhdWx0IGFuZCBmYXN0ZXN0KVxyXG4gICAgbWluaWZ5OiAnZXNidWlsZCcsXHJcbiAgICAvLyBHZW5lcmF0ZSBzb3VyY2VtYXBzIG9ubHkgZm9yIG5vbi1wcm9kdWN0aW9uIHRvIHJlZHVjZSBidWlsZCB0aW1lL21haW50ZW5hbmNlXHJcbiAgICBzb3VyY2VtYXA6IG1vZGUgIT09ICdwcm9kdWN0aW9uJyxcclxuICAgIC8vIEJyZWFrIENTUyBpbnRvIHNlcGFyYXRlIGZpbGVzXHJcbiAgICBjc3NDb2RlU3BsaXQ6IHRydWUsXHJcbiAgfSxcclxuICAvLyBEZWZhdWx0IG9wdGltaXphdGlvbiBzZXR0aW5ncyBhcmUgdXN1YWxseSBiZXN0XHJcbiAgb3B0aW1pemVEZXBzOiB7XHJcbiAgICBpbmNsdWRlOiBbXHJcbiAgICAgICdyZWFjdCcsXHJcbiAgICAgICdyZWFjdC1kb20nLFxyXG4gICAgICAncmVhY3Qtcm91dGVyLWRvbScsXHJcbiAgICAgICdsdWNpZGUtcmVhY3QnLFxyXG4gICAgICAnQHJhZGl4LXVpL3JlYWN0LWRpYWxvZydcclxuICAgIF1cclxuICB9LFxyXG4gIGVzYnVpbGQ6IHtcclxuICAgIC8vIERyb3AgY29uc29sZS5sb2cgaW4gcHJvZHVjdGlvblxyXG4gICAgZHJvcDogbW9kZSA9PT0gJ3Byb2R1Y3Rpb24nID8gWydjb25zb2xlJywgJ2RlYnVnZ2VyJ10gOiBbXSxcclxuICB9LFxyXG59KSk7XHJcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBZ1MsU0FBUyxvQkFBb0I7QUFDN1QsT0FBTyxXQUFXO0FBQ2xCLE9BQU8sVUFBVTtBQUNqQixTQUFTLHFCQUFxQjtBQUM5QixTQUFTLHVCQUF1QjtBQUptSixJQUFNLDJDQUEyQztBQU1wTyxJQUFNLGFBQWEsY0FBYyx3Q0FBZTtBQUNoRCxJQUFNLFlBQVksS0FBSyxRQUFRLFVBQVU7QUFHekMsSUFBTyxzQkFBUSxhQUFhLENBQUMsRUFBRSxLQUFLLE9BQU87QUFBQSxFQUN6QyxRQUFRO0FBQUEsSUFDTixNQUFNO0FBQUEsSUFDTixNQUFNO0FBQUEsSUFDTixZQUFZO0FBQUEsSUFDWixPQUFPO0FBQUE7QUFBQSxNQUVMLHVCQUF1QjtBQUFBLFFBQ3JCLFFBQVE7QUFBQSxRQUNSLGNBQWM7QUFBQSxRQUNkLFFBQVE7QUFBQSxNQUNWO0FBQUEsTUFDQSxjQUFjO0FBQUEsUUFDWixRQUFRO0FBQUEsUUFDUixjQUFjO0FBQUEsUUFDZCxRQUFRO0FBQUEsTUFDVjtBQUFBLE1BQ0EscUJBQXFCO0FBQUEsUUFDbkIsUUFBUTtBQUFBLFFBQ1IsY0FBYztBQUFBLFFBQ2QsUUFBUTtBQUFBLE1BQ1Y7QUFBQTtBQUFBLE1BRUEsUUFBUTtBQUFBLFFBQ04sUUFBUTtBQUFBLFFBQ1IsY0FBYztBQUFBLFFBQ2QsUUFBUTtBQUFBLE1BQ1Y7QUFBQSxNQUNBLFdBQVc7QUFBQSxNQUNYLFlBQVk7QUFBQSxNQUNaLE9BQU87QUFBQSxRQUNMLFFBQVE7QUFBQSxRQUNSLElBQUk7QUFBQSxNQUNOO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFBQSxFQUNBLFNBQVMsQ0FBQyxNQUFNLEdBQUcsU0FBUyxpQkFBaUIsZ0JBQWdCLENBQUMsRUFBRSxPQUFPLE9BQU87QUFBQSxFQUM5RSxTQUFTO0FBQUEsSUFDUCxPQUFPO0FBQUEsTUFDTCxLQUFLLEtBQUssUUFBUSxXQUFXLE9BQU87QUFBQSxJQUN0QztBQUFBLEVBQ0Y7QUFBQSxFQUNBLE9BQU87QUFBQTtBQUFBLElBRUwsYUFBYTtBQUFBLElBRWIsZUFBZTtBQUFBLE1BQ2IsUUFBUTtBQUFBO0FBQUEsUUFFTixnQkFBZ0I7QUFBQSxRQUNoQixnQkFBZ0I7QUFBQSxRQUNoQixnQkFBZ0I7QUFBQTtBQUFBLFFBR2hCLGNBQWM7QUFBQSxVQUNaLFVBQVUsQ0FBQyxTQUFTLGFBQWEsa0JBQWtCO0FBQUEsVUFDbkQsV0FBVyxDQUFDLDBCQUEwQix3QkFBd0IsZ0JBQWdCLDRCQUE0QixRQUFRLGdCQUFnQjtBQUFBLFVBQ2xJLGNBQWMsQ0FBQyxlQUFlO0FBQUEsVUFDOUIsVUFBVSxDQUFDLFVBQVU7QUFBQSxVQUNyQixZQUFZLENBQUMsdUJBQXVCO0FBQUEsUUFDdEM7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUFBO0FBQUEsSUFFQSxRQUFRO0FBQUE7QUFBQSxJQUVSLFdBQVcsU0FBUztBQUFBO0FBQUEsSUFFcEIsY0FBYztBQUFBLEVBQ2hCO0FBQUE7QUFBQSxFQUVBLGNBQWM7QUFBQSxJQUNaLFNBQVM7QUFBQSxNQUNQO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQUEsRUFDQSxTQUFTO0FBQUE7QUFBQSxJQUVQLE1BQU0sU0FBUyxlQUFlLENBQUMsV0FBVyxVQUFVLElBQUksQ0FBQztBQUFBLEVBQzNEO0FBQ0YsRUFBRTsiLAogICJuYW1lcyI6IFtdCn0K
