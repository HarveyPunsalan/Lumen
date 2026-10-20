/**
 * The bridge. The only thing the renderer can reach.
 *
 * No raw ipcRenderer, no ipcRenderer.on. Every event handler drops the
 * IpcRendererEvent argument, because it carries `sender`, which hands back the
 * ipcRenderer instance and with it the whole event system.
 * See SECURITY.md, Do not expose Electron APIs.
 */

// CommonJS require, not import. A sandboxed renderer cannot load an ES module
// preload, so this file is compiled as .cts and must not use import syntax.
// `moduleResolution: node16/nodenext` would reject import assignment here,
// which is why tsconfig.preload.json uses plain node resolution.
import type { ContextBridge, IpcRenderer, IpcRendererEvent } from 'electron'

const { contextBridge, ipcRenderer } = require('electron') as {
  contextBridge: ContextBridge
  ipcRenderer: IpcRenderer
}

const api = {
  // permissions
  getPermissions: () => ipcRenderer.invoke('permissions:get'),

  // capture
  listSources: () => ipcRenderer.invoke('capture:sources'),
  openScreenRecordingSettings: () => ipcRenderer.invoke('capture:open-settings'),
  selectSource: (sourceId: string, sourceName: string) =>
    ipcRenderer.invoke('capture:select-source', sourceId, sourceName),
  clearSource: () => ipcRenderer.invoke('capture:clear-source'),

  // session
  beginSession: () => ipcRenderer.invoke('session:begin'),
  nextSegmentPath: () => ipcRenderer.invoke('session:segment-path'),
  writeChunk: (relativePath: string, bytes: ArrayBuffer) =>
    ipcRenderer.invoke('session:write-chunk', relativePath, bytes),
  finishSession: (durationSeconds: number) =>
    ipcRenderer.invoke('session:finish', durationSeconds),
  onExportProgress: (handler: (fraction: number) => void) => {
    // Drop the event argument, which carries sender and with it ipcRenderer.
    const listener = (_event: IpcRendererEvent, progress: { fraction: number }): void => {
      handler(progress.fraction)
    }
    ipcRenderer.on('export:progress', listener)
    // Returned so the renderer can unsubscribe. Without it every mount adds a
    // listener that outlives the screen it belonged to.
    return () => {
      ipcRenderer.removeListener('export:progress', listener)
    }
  },

  // library
  libraryRoot: () => ipcRenderer.invoke('library:root'),
  listRecordings: () => ipcRenderer.invoke('library:list'),
  playbackUrl: (folder: string) => ipcRenderer.invoke('library:playback-url', folder),
  deleteRecording: (folder: string) => ipcRenderer.invoke('library:delete', folder),
} as const

export type LumenApi = typeof api

contextBridge.exposeInMainWorld('lumen', api)