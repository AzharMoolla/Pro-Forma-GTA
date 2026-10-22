import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'

// Build this review artifact independently of the concurrent pro forma work.
export default defineConfig({
  root: fileURLToPath(new URL('../', import.meta.url)),
  base: './',
  build: {
    outDir: 'output/component-lab',
    emptyOutDir: false,
    rollupOptions: { input: fileURLToPath(new URL('index.html', import.meta.url)) },
  },
})
