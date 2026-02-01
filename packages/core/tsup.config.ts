import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'types/index': 'src/types/index.ts',
    'identifiers/index': 'src/identifiers/index.ts',
    'check-digits/index': 'src/check-digits/index.ts',
    'protocol/index': 'src/protocol/index.ts',
    'crypto/index': 'src/crypto/index.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  minify: false,
  target: 'es2022',
  outDir: 'dist',
});
