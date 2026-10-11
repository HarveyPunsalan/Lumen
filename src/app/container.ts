/**
 * The composition root. The only place modules meet.
 *
 * Each module stays unaware of the others. Wiring happens here, once, at
 * startup. See architecture.md, The dependency rule.
 */

import type { Handler } from '../platform/main/ipc.js'
import { setLibraryRoot, ensureLibrary, libraryRoot, totalBytes } from '../modules/library/paths.js'
import { getPermissions, openScreenRecordingSettings } from '../modules/capture/main/permissions.js'
import { listSources } from '../modules/capture/main/sources.js'
import { listRecordings } from '../modules/library/catalog.js'

/**
 * Map IPC channel names to module functions.
 *
 * Each entry is a thin adapter: it unpacks arguments, calls one module
 * function, and returns. No logic belongs here.
 */
export function wireModules(root: string): Record<string, Handler> {
  setLibraryRoot(root)

  return {
    'permissions:get': async () => getPermissions(),
    'capture:sources': async () => listSources(),
    'capture:open-settings': async () => openScreenRecordingSettings(),
    'library:root': async () => libraryRoot(),
    'library:total-bytes': async () => totalBytes(),
    'library:list': async () => listRecordings(),
  }
}

export async function bootstrap(): Promise<void> {
  await ensureLibrary()
}