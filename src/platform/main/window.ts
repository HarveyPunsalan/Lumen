/**
 * The renderer window. Every webPreferences line here is a control from
 * SECURITY.md DA6. Do not relax one without changing SECURITY.md first.
 */

import { app, BrowserWindow } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { LUMEN_SCHEME } from './protocol.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
// preload.cjs, not preload.js. A sandboxed renderer cannot load an ES module
// preload, it fails silently and window.lumen never gets defined.
// See SECURITY.md, DA6, sandbox: true.
const preloadPath = path.join(currentDir, 'preload.cjs')

export function createMainWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1100,
    height: 760,
    minWidth: 900,
    minHeight: 640,
    title: 'Lumen',
    backgroundColor: '#0b0b0d',
    show: false,
    webPreferences: {
      preload: preloadPath,
      // DA6. These three are load bearing.
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  })

  window.once('ready-to-show', () => window.show())

  // DA5, DA6. Lumen has no reason to navigate anywhere or open new windows.
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  window.webContents.on('will-navigate', (event) => event.preventDefault())

  // DA6. Load the custom protocol, never file://, which can read the disk.
  // app.isPackaged is false when running from source, so dev uses the Vite
  // server on its default port. vite.config.ts sets strictPort, so the port
  // cannot drift without this failing loudly.
  if (app.isPackaged) {
    void window.loadURL(`${LUMEN_SCHEME}://app/index.html`)
  } else {
    void window.loadURL('http://localhost:5173')
  }

  return window
}