import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'

// Relative base + HashRouter means the build runs from any static host or
// sub-path (GitHub Pages, Netlify, a USB stick) without rewrite rules.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  worker: { format: 'es' },
  resolve: {
    alias: {
      // espeak-ng (piper_phonemize) build from an MIT package whose export map
      // only exposes its high-level API; we need the phonemizer itself.
      'piper-phonemize': fileURLToPath(new URL('./node_modules/@mintplex-labs/piper-tts-web/dist/piper-o91UDS6e.js', import.meta.url)),
    },
  },
  optimizeDeps: { exclude: ['@huggingface/transformers'] },
})
