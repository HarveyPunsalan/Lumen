/**
 * Enumerate Sources. Runs in the main process because desktopCapturer is not
 * available in the renderer.
 *
 * Permission is checked in permissions.ts before this is called. On macOS,
 * calling desktopCapturer without screen recording permission can leave the
 * promise pending forever rather than rejecting, which looks like a hang.
 * See system-design.md, Failure behaviour.
 */

import type { Source } from '../types.js'

/** List every Screen and Window the user can capture. */
export async function listSources(): Promise<Source[]> {
  throw new Error('listSources is not implemented yet.')
}