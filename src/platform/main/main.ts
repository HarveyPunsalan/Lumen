/**
 * Bootstrap. Nothing else lives here.
 */

import { app, BrowserWindow } from 'electron'
import path from 'node:path'
import { createMainWindow } from './window.js'
import { registerSchemePrivileges, handleRendererRequests } from './protocol.js'
import { registerHandlers } from './ipc.js'
import { handleDisplayMediaRequest } from './display-media.js'
import { wireModules, bootstrap } from '../../app/container.js'

// macOS 26 and ScreenCaptureKit: Chromium's thumbnail upload for the window
// list can miss its deadline, which surfaces as an empty picker or a single
// window. These flags pin enumeration to the older path that does not need the
// thumbnail before returning. See electron/electron#51125 and #44504.
// Remove when Electron fixes the ThumbnailCapturer path upstream.
app.commandLine.appendSwitch(
  'disable-features',
  [
    'ThumbnailCapturerMac:capture_mode/sc_screenshot_manager',
    'ScreenCaptureKitPickerScreen',
    'ScreenCaptureKitStreamPickerSonoma',
  ].join(','),
)

// Must run before app is ready.
registerSchemePrivileges()

app.whenReady().then(async () => {
  handleRendererRequests()

  const libraryRoot = path.join(app.getPath('videos'), 'Lumen')
  const { handlers, currentSource } = wireModules(libraryRoot, {
    notifyExportProgress: (progress) => {
      BrowserWindow.getAllWindows().forEach((win) =>
        win.webContents.send('export:progress', progress),
      )
    },
  })

  registerHandlers(handlers)
  handleDisplayMediaRequest(currentSource)

  // The Library has to exist before a Session can be created inside it. This was
  // written and never called, so a first launch on a machine without the
  // folder left Start stuck on "Starting..." forever.
  await bootstrap()

  createMainWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
