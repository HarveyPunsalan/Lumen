/**
 * Enumerate Sources. Runs in the main process because desktopCapturer is not
 * available in the renderer.
 *
 * Permission is checked in permissions.ts before this is called. On macOS,
 * calling desktopCapturer without screen recording permission can leave the
 * promise pending forever rather than rejecting, which looks like a hang.
 */

import { desktopCapturer } from 'electron'
import type { Source } from '../types.js'
import { getPermissions } from './permissions.js'
import { ErrorCode, lumenError } from '../../../kernel/index.js'

/** List every Display and Window the user can capture. */
export async function listSources(): Promise<Source[]> {
  const permissions = await getPermissions()
  if (permissions.screen !== 'granted') {
    throw lumenError(
      ErrorCode.PermissionDenied,
      'Screen recording permission is not granted. Enable it in System Settings, then restart Lumen.',
    )
  }

  const found = await desktopCapturer.getSources({
    types: ['screen', 'window'],
    thumbnailSize: { width: 320, height: 180 },
  })

  return found
    // Lumen's own windows are not worth recording.
    .filter((source) => !source.name.startsWith('Lumen'))
    .map((source) => ({
      id: source.id,
      name: source.name,
      kind: source.display_id ? ('screen' as const) : ('window' as const),
      thumbnail: source.thumbnail.toDataURL(),
      ...(source.display_id ? { displayId: source.display_id } : {}),
    }))
}