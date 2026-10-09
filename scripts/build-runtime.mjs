import { build } from 'esbuild';
await build({
  entryPoints: ['src/runtime.ts'],
  outfile: 'dist/runtime.js',
  bundle: true,
  format: 'iife',
  target: ['chrome110', 'firefox115', 'safari16'],
  minify: true,
  legalComments: 'none',
});
