/**
 * Listing Recordings. Every path comes from paths.ts.
 */

import type { SessionInfo } from '../session/session.js'

export interface RecordingEntry {
  readonly id: string
  readonly folder: string
  readonly fileName: string
  readonly startedAt: number
  readonly durationSeconds: number
  readonly sizeBytes: number
}

/** Every exported Recording in the Library, newest first. */
export async function listRecordings(): Promise<RecordingEntry[]> {
  throw new Error('listRecordings is not implemented yet.')
}

export async function getRecording(_id: string): Promise<RecordingEntry | null> {
  throw new Error('getRecording is not implemented yet.')
}

/** Delete a Recording and its folder. Delete means delete. */
export async function deleteRecording(_id: string): Promise<void> {
  throw new Error('deleteRecording is not implemented yet.')
}

/**
 * Session folders that have Segments but no exported MP4. These are the
 * result of a crash or a cancelled Export, and they are recoverable.
 */
export async function listIncompleteSessions(): Promise<SessionInfo[]> {
  throw new Error('listIncompleteSessions is not implemented yet.')
}