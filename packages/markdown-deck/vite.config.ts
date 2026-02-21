import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/mount.tsx'),
      formats: ['iife'],
      name: 'MarkdownDeck',
      fileName: () => 'markdown-deck.mount.min.js',
    },
    outDir: 'dist',
    rollupOptions: {
      output: {
        assetFileNames: '[name][extname]',
      },
    },
    cssCodeSplit: false,
    sourcemap: true,
  },
})
