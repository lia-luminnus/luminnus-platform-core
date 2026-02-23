import { defineConfig } from 'vite';
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js';

export default defineConfig({
    plugins: [cssInjectedByJsPlugin()],
    build: {
        target: 'esnext',
        lib: {
            entry: 'src/main.ts',
            name: 'LiaWidget',
            fileName: () => 'widget.js',
            formats: ['iife'],
        },
        rollupOptions: {
            output: {
                extend: true,
            }
        }
    },
    define: {
        'process.env.NODE_ENV': '"production"'
    }
});
