import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

const rendererRoot = fileURLToPath(new URL('./src/platform/renderer', import.meta.url))

/**
 * The strict CSP lives in index.html and is what ships.
 *
 * Vite injects an inline script for React Fast Refresh and opens a WebSocket
 * for hot reload, both of which the strict policy blocks. That left the dev
 * window black with no error. So in development only, relax the two rules that
 * break, and leave every other rule identical.
 */
function cspForMode(): Plugin {
  return {
    name: 'lumen-csp-per-mode',
    transformIndexHtml(html, ctx) {
      const dev =
        !ctx.bundle &&
        html.includes("script-src 'self'; style-src") &&
        !html.includes("script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'")
      if (!dev) return html
      return html.replace(
        "script-src 'self'; style-src 'self' 'unsafe-inline'",
        "script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
      ).replace("connect-src 'self'", "connect-src 'self' ws://localhost:5173")
    },
  }
}

export default defineConfig({
  root: rendererRoot,
  base: './',
  plugins: [react(), tailwindcss(), cspForMode()],
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