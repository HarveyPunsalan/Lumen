/**
 * The bridge. The only thing the renderer can reach.
 *
 * No raw ipcRenderer, no ipcRenderer.on. Every event handler drops the
 * IpcRendererEvent argument, because it carries `sender`, which hands back the
 * ipcRenderer instance and with it the whole event system.
 * See SECURITY.md, Do not expose Electron APIs.
 */

import { contextBridge, ipcRenderer } from 'electron'

const api = {
  // permissions
  getPermissions: () => ipcRenderer.invoke('permissions:get'),

  // capture
  listSources: () => ipcRenderer.invoke('capture:sources'),
  openScreenRecordingSettings: () => ipcRenderer.invoke('capture:open-settings'),

  // session
  beginSession: () => ipcRenderer.invoke('session:begin'),
  sessionStatus: () => ipcRenderer.invoke('session:status'),
  endSession: () => ipcRenderer.invoke('session:end'),

  // library
  libraryRoot: () => ipcRenderer.invoke('library:root'),
  totalBytes: () => ipcRenderer.invoke('library:total-bytes'),
  listRecordings: () => ipcRenderer.invoke('library:list'),
} as const

export type LumenApi = typeof api

contextBridge.exposeInMainWorld('lumen', api)