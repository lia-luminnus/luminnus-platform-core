import { defineConfig } from 'tsup';

export default defineConfig((options) => ({
    entry: ['src/index.ts'],
    format: ['cjs', 'esm'],
    dts: false,
    splitting: false,
    sourcemap: true,
    clean: false,
    treeshake: true,
}));
