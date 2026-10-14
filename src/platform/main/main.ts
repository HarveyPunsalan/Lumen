/**
 * Bootstrap. Nothing else lives here.
 */

import { app, BrowserWindow } from 'electron'
import path from 'node:path'
import { createMainWindow } from './window.js'
import { registerSchemePrivileges, handleRendererRequests } from './protocol.js'
import { registerHandlers } from './ipc.js'
import {
  listRecordings,
  playbackUrl,
  deleteRecording,
} from '../../modules/library/catalog.js'
import {
  handleDisplayMediaRequest,
  selectSource,
  clearSelection,
  beginSession,
  writeSegment,
  segmentPath,
  finishSession,
} from './display-media.js'
import { wireModules, bootstrap } from '../../app/container.js'
import { findSource } from '../../modules/capture/main/sources.js'

// Must run before app is ready.
registerSchemePrivileges()

app.whenReady().then(async () => {
  handleRendererRequests()
  handleDisplayMediaRequest()

  const libraryRoot = path.join(app.getPath('videos'), 'Lumen')
  registerHandlers(
    wireModules(libraryRoot, {
      'capture:select-source': async (_event, sourceId) => {
        selectSource(await findSource(sourceId))
      },
      'capture:clear-source': async () => {
        clearSelection()
      },
      'session:begin': async () => beginSession(),
      'session:segment-path': async () => segmentPath(),
      'session:write-chunk': async (_event, relativePath, bytes) => {
        await writeSegment(relativePath as string, bytes as ArrayBuffer)
      },
      'session:finish': async (_event, durationSeconds) =>
        finishSession(durationSeconds as number, (progress) => {
          BrowserWindow.getAllWindows().forEach((win) =>
            win.webContents.send('export:progress', progress),
          )
        }),
      'library:list': async () => listRecordings(),
      'library:playback-url': async (_event, folder) => playbackUrl(folder as string),
      'library:delete': async (_event, folder) => {
        await deleteRecording(folder as string)
      },
    }),
  )

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