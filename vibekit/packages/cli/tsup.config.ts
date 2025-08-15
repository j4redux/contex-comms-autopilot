import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/cli.js'],
  format: ['esm'],
  dts: false,
  splitting: false,
  sourcemap: true,
  clean: true,
  outDir: 'dist',
  target: 'node18',
  bundle: true,
  minify: false,
  shims: true,
  external: [],
  loader: {
    '.js': 'jsx'
  }
});