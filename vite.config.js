import { defineConfig } from 'vite'
export default defineConfig({
  server: { port: 5173, strictPort: true },
  // main.js uses a top-level `await import('lil-gui')` in the debug panel;
  // the default esbuild target list predates top-level-await support.
  build: { target: 'es2022' },
})
