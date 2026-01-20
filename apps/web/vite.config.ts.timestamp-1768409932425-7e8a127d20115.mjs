// vite.config.ts
import { defineConfig } from "file:///D:/luminnus-platform-core/node_modules/.pnpm/vite@5.4.21_@types+node@22.19.3_lightningcss@1.30.2/node_modules/vite/dist/node/index.js";
import react from "file:///D:/luminnus-platform-core/node_modules/.pnpm/@vitejs+plugin-react-swc@3.11.0_@swc+helpers@0.5.17_vite@5.4.21_@types+node@22.19.3_lightningcss@1.30.2_/node_modules/@vitejs/plugin-react-swc/index.js";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { componentTagger } from "file:///D:/luminnus-platform-core/node_modules/.pnpm/lovable-tagger@1.1.13_tsx@4.21.0_vite@5.4.21_@types+node@22.19.3_lightningcss@1.30.2_/node_modules/lovable-tagger/dist/index.js";
var __vite_injected_original_import_meta_url = "file:///D:/luminnus-platform-core/apps/web/vite.config.ts";
var __filename = fileURLToPath(__vite_injected_original_import_meta_url);
var __dirname = path.dirname(__filename);
var timestamp = Date.now();
var vite_config_default = defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    strictPort: true,
    // Desabilita cache no servidor de desenvolvimento
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0"
    },
    proxy: {
      "/api": "http://localhost:5000",
      "/health": "http://localhost:5000",
      "/version": "http://localhost:5000",
      "/ws": {
        target: "ws://localhost:5000",
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
        banner: `/* Build: ${(/* @__PURE__ */ new Date()).toISOString()} | Cache-bust: ${timestamp} */`,
        // Força regeneração de chunks
        manualChunks: void 0
      }
    },
    // Garante que todos os módulos sejam reconstruídos
    minify: "esbuild",
    // Configurações adicionais para forçar rebuild
    sourcemap: false,
    // Remove cache de módulos
    commonjsOptions: {
      transformMixedEsModules: true
    },
    // Força rebuild de todos os assets
    cssCodeSplit: true,
    // Adiciona timestamp aos CSS também
    assetsInlineLimit: 0
  },
  // Desabilita otimização de dependências em cache
  optimizeDeps: {
    force: true,
    // Inclui componentes admin para garantir rebuild
    include: [
      "react",
      "react-dom",
      "react-router-dom"
    ]
  },
  // Desabilita cache de ESBuild
  esbuild: {
    keepNames: false
  },
  // Define variáveis globais para cache busting no código
  define: {
    __BUILD_TIMESTAMP__: JSON.stringify(timestamp),
    __BUILD_DATE__: JSON.stringify((/* @__PURE__ */ new Date()).toISOString())
  }
}));
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJEOlxcXFxsdW1pbm51cy1wbGF0Zm9ybS1jb3JlXFxcXGFwcHNcXFxcd2ViXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJEOlxcXFxsdW1pbm51cy1wbGF0Zm9ybS1jb3JlXFxcXGFwcHNcXFxcd2ViXFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9EOi9sdW1pbm51cy1wbGF0Zm9ybS1jb3JlL2FwcHMvd2ViL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSBcInZpdGVcIjtcclxuaW1wb3J0IHJlYWN0IGZyb20gXCJAdml0ZWpzL3BsdWdpbi1yZWFjdC1zd2NcIjtcclxuaW1wb3J0IHBhdGggZnJvbSBcIm5vZGU6cGF0aFwiO1xyXG5pbXBvcnQgeyBmaWxlVVJMVG9QYXRoIH0gZnJvbSAnbm9kZTp1cmwnO1xyXG5pbXBvcnQgeyBjb21wb25lbnRUYWdnZXIgfSBmcm9tIFwibG92YWJsZS10YWdnZXJcIjtcclxuXHJcbmNvbnN0IF9fZmlsZW5hbWUgPSBmaWxlVVJMVG9QYXRoKGltcG9ydC5tZXRhLnVybCk7XHJcbmNvbnN0IF9fZGlybmFtZSA9IHBhdGguZGlybmFtZShfX2ZpbGVuYW1lKTtcclxuXHJcbi8vIEdlcmEgdGltZXN0YW1wIFx1MDBGQW5pY28gcGFyYSBjYWNoZSBidXN0aW5nXHJcbmNvbnN0IHRpbWVzdGFtcCA9IERhdGUubm93KCk7XHJcbi8vIEZvcmNlIFR5cGVTY3JpcHQgcmVidWlsZCBhZnRlciBTdXBhYmFzZSBzY2hlbWEgdXBkYXRlXHJcblxyXG4vLyBodHRwczovL3ZpdGVqcy5kZXYvY29uZmlnL1xyXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoKHsgbW9kZSB9KSA9PiAoe1xyXG4gIHNlcnZlcjoge1xyXG4gICAgaG9zdDogXCI6OlwiLFxyXG4gICAgcG9ydDogODA4MCxcclxuICAgIHN0cmljdFBvcnQ6IHRydWUsXHJcbiAgICAvLyBEZXNhYmlsaXRhIGNhY2hlIG5vIHNlcnZpZG9yIGRlIGRlc2Vudm9sdmltZW50b1xyXG4gICAgaGVhZGVyczoge1xyXG4gICAgICAnQ2FjaGUtQ29udHJvbCc6ICduby1zdG9yZSwgbm8tY2FjaGUsIG11c3QtcmV2YWxpZGF0ZScsXHJcbiAgICAgICdQcmFnbWEnOiAnbm8tY2FjaGUnLFxyXG4gICAgICAnRXhwaXJlcyc6ICcwJ1xyXG4gICAgfSxcclxuICAgIHByb3h5OiB7XHJcbiAgICAgICcvYXBpJzogJ2h0dHA6Ly9sb2NhbGhvc3Q6NTAwMCcsXHJcbiAgICAgICcvaGVhbHRoJzogJ2h0dHA6Ly9sb2NhbGhvc3Q6NTAwMCcsXHJcbiAgICAgICcvdmVyc2lvbic6ICdodHRwOi8vbG9jYWxob3N0OjUwMDAnLFxyXG4gICAgICAnL3dzJzoge1xyXG4gICAgICAgIHRhcmdldDogJ3dzOi8vbG9jYWxob3N0OjUwMDAnLFxyXG4gICAgICAgIHdzOiB0cnVlXHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9LFxyXG4gIHBsdWdpbnM6IFtyZWFjdCgpLCBtb2RlID09PSBcImRldmVsb3BtZW50XCIgJiYgY29tcG9uZW50VGFnZ2VyKCldLmZpbHRlcihCb29sZWFuKSxcclxuICByZXNvbHZlOiB7XHJcbiAgICBhbGlhczoge1xyXG4gICAgICBcIkBcIjogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgXCIuL3NyY1wiKSxcclxuICAgIH0sXHJcbiAgfSxcclxuICBidWlsZDoge1xyXG4gICAgLy8gTGltcGEgbyBkaXJldFx1MDBGM3JpbyBkZSBzYVx1MDBFRGRhIGFudGVzIGRlIGJ1aWxkYXIgKGVxdWl2YWxlbnRlIGFvIGNsZWFuRGlzdERpcilcclxuICAgIGVtcHR5T3V0RGlyOiB0cnVlLFxyXG4gICAgLy8gRm9yXHUwMEU3YSByZWJ1aWxkIGNvbXBsZXRvIGFvIGRlc2FiaWxpdGFyIGNhY2hlIGRvIFJvbGx1cFxyXG4gICAgcm9sbHVwT3B0aW9uczoge1xyXG4gICAgICBjYWNoZTogZmFsc2UsXHJcbiAgICAgIG91dHB1dDoge1xyXG4gICAgICAgIC8vIEFkaWNpb25hIGhhc2ggRSB0aW1lc3RhbXAgYW9zIGFycXVpdm9zIHBhcmEgaW52YWxpZGFyIGNhY2hlIGRvIG5hdmVnYWRvclxyXG4gICAgICAgIGVudHJ5RmlsZU5hbWVzOiBgYXNzZXRzL1tuYW1lXS5baGFzaF0uJHt0aW1lc3RhbXB9LmpzYCxcclxuICAgICAgICBjaHVua0ZpbGVOYW1lczogYGFzc2V0cy9bbmFtZV0uW2hhc2hdLiR7dGltZXN0YW1wfS5qc2AsXHJcbiAgICAgICAgYXNzZXRGaWxlTmFtZXM6IGBhc3NldHMvW25hbWVdLltoYXNoXS4ke3RpbWVzdGFtcH0uW2V4dF1gLFxyXG4gICAgICAgIC8vIEFkaWNpb25hIGJhbm5lciBjb20gdGltZXN0YW1wIGVtIHRvZG9zIG9zIGFycXVpdm9zIEpTXHJcbiAgICAgICAgYmFubmVyOiBgLyogQnVpbGQ6ICR7bmV3IERhdGUoKS50b0lTT1N0cmluZygpfSB8IENhY2hlLWJ1c3Q6ICR7dGltZXN0YW1wfSAqL2AsXHJcbiAgICAgICAgLy8gRm9yXHUwMEU3YSByZWdlbmVyYVx1MDBFN1x1MDBFM28gZGUgY2h1bmtzXHJcbiAgICAgICAgbWFudWFsQ2h1bmtzOiB1bmRlZmluZWQsXHJcbiAgICAgIH1cclxuICAgIH0sXHJcbiAgICAvLyBHYXJhbnRlIHF1ZSB0b2RvcyBvcyBtXHUwMEYzZHVsb3Mgc2VqYW0gcmVjb25zdHJ1XHUwMEVEZG9zXHJcbiAgICBtaW5pZnk6ICdlc2J1aWxkJyxcclxuICAgIC8vIENvbmZpZ3VyYVx1MDBFN1x1MDBGNWVzIGFkaWNpb25haXMgcGFyYSBmb3JcdTAwRTdhciByZWJ1aWxkXHJcbiAgICBzb3VyY2VtYXA6IGZhbHNlLFxyXG4gICAgLy8gUmVtb3ZlIGNhY2hlIGRlIG1cdTAwRjNkdWxvc1xyXG4gICAgY29tbW9uanNPcHRpb25zOiB7XHJcbiAgICAgIHRyYW5zZm9ybU1peGVkRXNNb2R1bGVzOiB0cnVlXHJcbiAgICB9LFxyXG4gICAgLy8gRm9yXHUwMEU3YSByZWJ1aWxkIGRlIHRvZG9zIG9zIGFzc2V0c1xyXG4gICAgY3NzQ29kZVNwbGl0OiB0cnVlLFxyXG4gICAgLy8gQWRpY2lvbmEgdGltZXN0YW1wIGFvcyBDU1MgdGFtYlx1MDBFOW1cclxuICAgIGFzc2V0c0lubGluZUxpbWl0OiAwLFxyXG4gIH0sXHJcbiAgLy8gRGVzYWJpbGl0YSBvdGltaXphXHUwMEU3XHUwMEUzbyBkZSBkZXBlbmRcdTAwRUFuY2lhcyBlbSBjYWNoZVxyXG4gIG9wdGltaXplRGVwczoge1xyXG4gICAgZm9yY2U6IHRydWUsXHJcbiAgICAvLyBJbmNsdWkgY29tcG9uZW50ZXMgYWRtaW4gcGFyYSBnYXJhbnRpciByZWJ1aWxkXHJcbiAgICBpbmNsdWRlOiBbXHJcbiAgICAgICdyZWFjdCcsXHJcbiAgICAgICdyZWFjdC1kb20nLFxyXG4gICAgICAncmVhY3Qtcm91dGVyLWRvbSdcclxuICAgIF1cclxuICB9LFxyXG4gIC8vIERlc2FiaWxpdGEgY2FjaGUgZGUgRVNCdWlsZFxyXG4gIGVzYnVpbGQ6IHtcclxuICAgIGtlZXBOYW1lczogZmFsc2UsXHJcbiAgfSxcclxuICAvLyBEZWZpbmUgdmFyaVx1MDBFMXZlaXMgZ2xvYmFpcyBwYXJhIGNhY2hlIGJ1c3Rpbmcgbm8gY1x1MDBGM2RpZ29cclxuICBkZWZpbmU6IHtcclxuICAgIF9fQlVJTERfVElNRVNUQU1QX186IEpTT04uc3RyaW5naWZ5KHRpbWVzdGFtcCksXHJcbiAgICBfX0JVSUxEX0RBVEVfXzogSlNPTi5zdHJpbmdpZnkobmV3IERhdGUoKS50b0lTT1N0cmluZygpKSxcclxuICB9XHJcbn0pKTtcclxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUFnUyxTQUFTLG9CQUFvQjtBQUM3VCxPQUFPLFdBQVc7QUFDbEIsT0FBTyxVQUFVO0FBQ2pCLFNBQVMscUJBQXFCO0FBQzlCLFNBQVMsdUJBQXVCO0FBSm1KLElBQU0sMkNBQTJDO0FBTXBPLElBQU0sYUFBYSxjQUFjLHdDQUFlO0FBQ2hELElBQU0sWUFBWSxLQUFLLFFBQVEsVUFBVTtBQUd6QyxJQUFNLFlBQVksS0FBSyxJQUFJO0FBSTNCLElBQU8sc0JBQVEsYUFBYSxDQUFDLEVBQUUsS0FBSyxPQUFPO0FBQUEsRUFDekMsUUFBUTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sWUFBWTtBQUFBO0FBQUEsSUFFWixTQUFTO0FBQUEsTUFDUCxpQkFBaUI7QUFBQSxNQUNqQixVQUFVO0FBQUEsTUFDVixXQUFXO0FBQUEsSUFDYjtBQUFBLElBQ0EsT0FBTztBQUFBLE1BQ0wsUUFBUTtBQUFBLE1BQ1IsV0FBVztBQUFBLE1BQ1gsWUFBWTtBQUFBLE1BQ1osT0FBTztBQUFBLFFBQ0wsUUFBUTtBQUFBLFFBQ1IsSUFBSTtBQUFBLE1BQ047QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUFBLEVBQ0EsU0FBUyxDQUFDLE1BQU0sR0FBRyxTQUFTLGlCQUFpQixnQkFBZ0IsQ0FBQyxFQUFFLE9BQU8sT0FBTztBQUFBLEVBQzlFLFNBQVM7QUFBQSxJQUNQLE9BQU87QUFBQSxNQUNMLEtBQUssS0FBSyxRQUFRLFdBQVcsT0FBTztBQUFBLElBQ3RDO0FBQUEsRUFDRjtBQUFBLEVBQ0EsT0FBTztBQUFBO0FBQUEsSUFFTCxhQUFhO0FBQUE7QUFBQSxJQUViLGVBQWU7QUFBQSxNQUNiLE9BQU87QUFBQSxNQUNQLFFBQVE7QUFBQTtBQUFBLFFBRU4sZ0JBQWdCLHdCQUF3QixTQUFTO0FBQUEsUUFDakQsZ0JBQWdCLHdCQUF3QixTQUFTO0FBQUEsUUFDakQsZ0JBQWdCLHdCQUF3QixTQUFTO0FBQUE7QUFBQSxRQUVqRCxRQUFRLGNBQWEsb0JBQUksS0FBSyxHQUFFLFlBQVksQ0FBQyxrQkFBa0IsU0FBUztBQUFBO0FBQUEsUUFFeEUsY0FBYztBQUFBLE1BQ2hCO0FBQUEsSUFDRjtBQUFBO0FBQUEsSUFFQSxRQUFRO0FBQUE7QUFBQSxJQUVSLFdBQVc7QUFBQTtBQUFBLElBRVgsaUJBQWlCO0FBQUEsTUFDZix5QkFBeUI7QUFBQSxJQUMzQjtBQUFBO0FBQUEsSUFFQSxjQUFjO0FBQUE7QUFBQSxJQUVkLG1CQUFtQjtBQUFBLEVBQ3JCO0FBQUE7QUFBQSxFQUVBLGNBQWM7QUFBQSxJQUNaLE9BQU87QUFBQTtBQUFBLElBRVAsU0FBUztBQUFBLE1BQ1A7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQUE7QUFBQSxFQUVBLFNBQVM7QUFBQSxJQUNQLFdBQVc7QUFBQSxFQUNiO0FBQUE7QUFBQSxFQUVBLFFBQVE7QUFBQSxJQUNOLHFCQUFxQixLQUFLLFVBQVUsU0FBUztBQUFBLElBQzdDLGdCQUFnQixLQUFLLFdBQVUsb0JBQUksS0FBSyxHQUFFLFlBQVksQ0FBQztBQUFBLEVBQ3pEO0FBQ0YsRUFBRTsiLAogICJuYW1lcyI6IFtdCn0K
