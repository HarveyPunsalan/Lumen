/**
 * The composition root. The only place modules meet.
 *
 * Each module stays unaware of the others. Wiring happens here, once, at
 * startup. See architecture.md, The dependency rule.
 */

import type { Handler } from '../platform/main/ipc.js'
import { setLibraryRoot, ensureLibrary } from '../modules/library/paths.js'
import { getPermissions, openScreenRecordingSettings } from '../modules/capture/main/permissions.js'
import { listSources } from '../modules/capture/main/sources.js'

/**
 * Map IPC channel names to module functions.
 *
 * Each entry is a thin adapter: it unpacks arguments, calls one module
 * function, and returns. No logic belongs here.
 */
export function wireModules(
  root: string,
  extra: Record<string, Handler> = {},
): Record<string, Handler> {
  setLibraryRoot(root)

  return {
    'permissions:get': async () => getPermissions(),
    'capture:sources': async () => listSources(),
    'capture:open-settings': async () => openScreenRecordingSettings(),
    ...extra,
  }
}

export async function bootstrap(): Promise<void> {
  await ensureLibrary()
}