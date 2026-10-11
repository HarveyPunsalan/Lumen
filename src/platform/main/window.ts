/**
 * The renderer window. Every webPreferences line here is a control from
 * SECURITY.md DA6. Do not relax one without changing SECURITY.md first.
 */

import { BrowserWindow } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { LUMEN_SCHEME } from './protocol.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const preloadPath = path.join(currentDir, 'preload.js')
const devServer = process.env['VITE_DEV_SERVER_URL']

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
  if (devServer !== undefined && devServer !== '') {
    void window.loadURL(devServer)
  } else {
    void window.loadURL(`${LUMEN_SCHEME}://app/index.html`)
  }

  return window
}