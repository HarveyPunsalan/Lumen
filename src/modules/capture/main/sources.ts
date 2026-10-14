/**
 * Enumerate Sources. Runs in the main process because desktopCapturer is not
 * available in the renderer.
 *
 * Permission is checked in permissions.ts before this is called. On macOS,
 * calling desktopCapturer without screen recording permission can leave the
 * promise pending forever rather than rejecting, which looks like a hang.
 */

import { desktopCapturer, screen } from 'electron'
import type { Source } from '../types.js'
import { getPermissions } from './permissions.js'
import { ErrorCode, lumenError } from '../../../kernel/index.js'

/**
 * Find one Source by id, re-reading the live list.
 *
 * The renderer only gets to name an id. Everything Electron is handed back for
 * a capture is resolved here, so a tampered renderer cannot invent a Source or
 * a name. See SECURITY.md, Do not trust the renderer.
 */
export async function findSource(sourceId: unknown): Promise<Source> {
  if (typeof sourceId !== 'string' || sourceId.length === 0) {
    throw lumenError(ErrorCode.PermissionDenied, 'No Source was picked.')
  }
  const sources = await listSources()
  const match = sources.find((source) => source.id === sourceId)
  if (match === undefined) {
    throw lumenError(
      ErrorCode.PermissionDenied,
      'That Source is no longer available. Pick it again.',
    )
  }
  return match
}

/** List every Display and Window the user can capture. */
export async function listSources(): Promise<Source[]> {
  const permissions = await getPermissions()
  if (permissions.screen !== 'granted') {
    throw lumenError(
      ErrorCode.PermissionDenied,
      'Screen recording permission is not granted. Enable it in System Settings, then restart Lumen.',
    )
  }

  // 320 was small enough to look soft once stretched across the Region picker.
  // This is a one-off cost at launch, not per frame, so the size is free.
  const found = await desktopCapturer.getSources({
    types: ['screen', 'window'],
    thumbnailSize: { width: 1280, height: 720 },
  })

  // A Region is mapped onto these, and a Retina Display reports 2x, so the
  // thumbnail size is useless here. The display module has the real pixels.
  const displays = new Map(screen.getAllDisplays().map((d) => [d.id, d]))

  return found
    // Lumen's own windows are not worth recording.
    .filter((source) => !source.name.startsWith('Lumen'))
    .map((source) => {
      const base = {
        id: source.id,
        name: source.name,
        kind: source.display_id ? ('screen' as const) : ('window' as const),
        thumbnail: source.thumbnail.toDataURL(),
      }
      if (source.display_id === undefined) return base

      const display = displays.get(Number(source.display_id))
      if (display === undefined) return { ...base, displayId: source.display_id }

      return {
        ...base,
        displayId: source.display_id,
        pixelWidth: Math.round(display.bounds.width * display.scaleFactor),
        pixelHeight: Math.round(display.bounds.height * display.scaleFactor),
      }
    })
}