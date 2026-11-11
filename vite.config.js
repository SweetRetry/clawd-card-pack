import { defineConfig } from 'vite';

// Builds the single classic script the mini tool container loads from the zip.
//
// The container's CSP has no `unsafe-inline` and its offline loader cannot resolve
// `type="module"` relative imports, so the artifact must be one classic IIFE script.
// Chrome 61 / Android 8.1 is the minimum kernel, so the bundle transpiles to ES2017.
export default defineConfig({
  base: './',
  build: {
    target: ['es2017', 'chrome61'],
    modulePreload: false,
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        format: 'iife',
        inlineDynamicImports: true,
        entryFileNames: 'assets/app.js',
        assetFileNames: 'assets/[name][extname]',
      },
    },
  },
});
