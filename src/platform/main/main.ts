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
