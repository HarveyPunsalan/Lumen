/**
 * Permission checks. Runs in the main process because systemPreferences is
 * not available in the renderer.
 */

import { systemPreferences, shell } from 'electron'
import type { PermissionReport, PermissionState } from '../types.js'

export async function getPermissions(): Promise<PermissionReport> {
  return {
    screen: systemPreferences.getMediaAccessStatus('screen') as PermissionState,
    microphone: systemPreferences.getMediaAccessStatus('microphone') as PermissionState,
  }
}

/** macOS only. Returns false on Windows, which has no equivalent gate. */
export async function openScreenRecordingSettings(): Promise<boolean> {
  if (process.platform !== 'darwin') return false
  await shell.openExternal(
    'x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture',
  )
  return true
}