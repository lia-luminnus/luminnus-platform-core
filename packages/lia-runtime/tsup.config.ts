import { defineConfig } from 'tsup';

export default defineConfig((options) => ({
    entry: [
        'src/index.ts',
        'src/contracts/index.ts',
        'src/live/index.ts',
        'src/utils/index.ts',
        'src/version/index.ts',
        'src/memory/index.ts',
        'src/persona.ts'
    ],
    format: ['cjs', 'esm'],
    dts: false,
    splitting: false,
    sourcemap: true,
    clean: false,
    treeshake: true,
}));
