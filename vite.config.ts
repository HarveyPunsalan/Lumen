import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

const rendererRoot = fileURLToPath(new URL('./src/platform/renderer', import.meta.url))

export default defineConfig({
  root: rendererRoot,
  base: './',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@lumen/kernel': fileURLToPath(new URL('./src/kernel', import.meta.url)),
      '@lumen/modules': fileURLToPath(new URL('./src/modules', import.meta.url)),
    },
  },
  build: {
    outDir: fileURLToPath(new URL('./dist', import.meta.url)),
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    strictPort: true,
  },
})