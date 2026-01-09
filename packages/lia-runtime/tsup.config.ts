import { defineConfig } from 'tsup';

export default defineConfig((options) => ({
    entry: {
        'index': 'src/index.ts',
        'live/index': 'src/live/index.ts',
        'contracts/index': 'src/contracts/index.ts',
        'utils/index': 'src/utils/index.ts',
        'version/index': 'src/version/index.ts',
        'memory/index': 'src/memory/index.ts',
    },
    format: ['cjs', 'esm'],
    dts: false,
    splitting: false,
    sourcemap: true,
    clean: false,
    treeshake: true,
}));
