/**
 * Permission checks. Runs in the main process because systemPreferences is
 * not available in the renderer.
 */

import type { PermissionReport } from '../types.js'

/** Current state of the screen and microphone gates. */
export async function getPermissions(): Promise<PermissionReport> {
  throw new Error('getPermissions is not implemented yet.')
}

/**
 * Open the System Settings pane that grants screen recording.
 * macOS only. Returns false on Windows, where no such gate exists.
 */
export async function openScreenRecordingSettings(): Promise<boolean> {
  throw new Error('openScreenRecordingSettings is not implemented yet.')
}