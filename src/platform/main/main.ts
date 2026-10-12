/**
 * Bootstrap. Nothing else lives here.
 */

import { app, BrowserWindow } from 'electron'
import path from 'node:path'
import { createMainWindow } from './window.js'
import { registerSchemePrivileges, handleRendererRequests } from './protocol.js'
import { registerHandlers } from './ipc.js'
import {
  handleDisplayMediaRequest,
  selectSource,
  clearSelection,
  beginSession,
  writeSegment,
  segmentPath,
} from './display-media.js'
import { wireModules } from '../../app/container.js'

// Must run before app is ready.
registerSchemePrivileges()

app.whenReady().then(() => {
  handleRendererRequests()
  handleDisplayMediaRequest()

  const libraryRoot = path.join(app.getPath('videos'), 'Lumen')
  registerHandlers(
    wireModules(libraryRoot, {
      'capture:select-source': async (_event, sourceId) => {
        selectSource(sourceId as string)
      },
      'capture:clear-source': async () => {
        clearSelection()
      },
      'session:begin': async () => beginSession(),
      'session:segment-path': async () => segmentPath(),
      'session:write-chunk': async (_event, relativePath, bytes) => {
        await writeSegment(relativePath as string, bytes as ArrayBuffer)
      },
    }),
  )

  createMainWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})