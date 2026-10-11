/**
 * Bootstrap. Nothing else lives here.
 */

import { app, BrowserWindow } from 'electron'
import path from 'node:path'
import { createMainWindow } from './window.js'
import { registerSchemePrivileges, handleRendererRequests } from './protocol.js'
import { registerHandlers } from './ipc.js'
import { wireModules } from '../../app/container.js'

// Must run before app is ready.
registerSchemePrivileges()

app.whenReady().then(() => {
  handleRendererRequests()

  const libraryRoot = path.join(app.getPath('videos'), 'Lumen')
  registerHandlers(wireModules(libraryRoot))

  createMainWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})