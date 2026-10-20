/**
 * The composition root. The only place modules meet.
 *
 * Each module stays unaware of the others. Wiring happens here, once, at
 * startup. See architecture.md, The dependency rule.
 */

import type { Handler } from '../platform/main/ipc.js'
import { setLibraryRoot, ensureLibrary } from '../modules/library/paths.js'
import { getPermissions, openScreenRecordingSettings } from '../modules/capture/main/permissions.js'
import { createSourceDirectory } from '../modules/capture/main/sources.js'
import {
  listRecordings,
  playbackUrl,
  deleteRecording,
} from '../modules/library/catalog.js'
import { createSessionRuntime } from './session-runtime.js'
import type { ExportProgress } from '../modules/export/types.js'
import type { Source } from '../modules/capture/types.js'

/** Capabilities only `platform/` can provide. `main.ts` passes these in. */
export interface PlatformHandles {
  readonly notifyExportProgress: (progress: ExportProgress) => void
}

export interface WiredModules {
  readonly handlers: Record<string, Handler>
  /** What Electron's display media handler answers with. */
  readonly currentSource: () => Source | null
}

/**
 * Map IPC channel names to module functions.
 *
 * Each entry is a thin adapter: it unpacks arguments, calls one module
 * function, and returns. Logic lives in the module, never here.
 */
export function wireModules(root: string, platform: PlatformHandles): WiredModules {
  setLibraryRoot(root)

  const runtime = createSessionRuntime({
    notifyExportProgress: platform.notifyExportProgress,
  })

  // One directory for the app's lifetime. It merges partial enumerations, so
  // the Source the user clicked is still resolvable even if the next
  // enumeration missed it. See sources.ts.
  const sourceDirectory = createSourceDirectory()

  return {
    currentSource: runtime.currentSource,
    handlers: {
      'permissions:get': async () => getPermissions(),
      'capture:sources': async () => sourceDirectory.list(),
      'capture:open-settings': async () => openScreenRecordingSettings(),

      'capture:select-source': async (_event, sourceId, sourceName) => {
        runtime.selectSource(sourceDirectory.find(sourceId, sourceName))
      },
      'capture:clear-source': async () => {
        runtime.clearSource()
      },

      'session:begin': async () => runtime.begin(),
      'session:segment-path': async () => runtime.nextSegmentPath(),
      'session:write-chunk': async (_event, relativePath, bytes) => {
        await runtime.writeChunk(relativePath as string, bytes as ArrayBuffer)
      },
      'session:finish': async (_event, durationSeconds) =>
        runtime.finish(durationSeconds as number),

      'library:list': async () => listRecordings(),
      'library:playback-url': async (_event, folder) => playbackUrl(folder as string),
      'library:delete': async (_event, folder) => {
        await deleteRecording(folder as string)
      },
    },
  }
}

export async function bootstrap(): Promise<void> {
  await ensureLibrary()
}
