/**
 * Which Source the user picked, so the renderer's getUserMedia can capture
 * that one instead of showing a picker we do not control.
 *
 * The renderer cannot call desktopCapturer, so the Source id has to travel
 * through the main process. This module holds it and answers the display media
 * request with it.
 */

import { session } from 'electron'
import path from 'node:path'
import { appendFileInLibrary, libraryRoot, relativeInLibrary } from '../../modules/library/paths.js'
import { Session } from '../../modules/session/session.js'

let selectedSourceId: string | null = null
let currentSession: Session | null = null

export function selectSource(sourceId: string): void {
  selectedSourceId = sourceId
}

export function clearSelection(): void {
  selectedSourceId = null
}

/** Open a Session folder. Segments are written there and nowhere else. */
export async function beginSession(): Promise<{ relativePath: string; folder: string }> {
  currentSession = await Session.create(libraryRoot())
  return {
    relativePath: relativeInLibrary(currentSession.nextSegmentPath()),
    folder: currentSession.folder,
  }
}

/**
 * Append one chunk to the Segment. Called every timeslice, so a crash loses at
 * most one chunk. ADR 0002.
 */
export async function writeSegment(relativePath: string, bytes: ArrayBuffer): Promise<void> {
  await appendFileInLibrary(relativePath, new Uint8Array(bytes))
}

export function currentSessionFolder(): string | null {
  return currentSession === null ? null : currentSession.folder
}

export async function segmentPath(): Promise<string> {
  if (currentSession === null) throw new Error('No Session in progress.')
  return path.relative(libraryRoot(), currentSession.nextSegmentPath())
}

/**
 * Answer the renderer's getUserMedia for video with the picked Source.
 *
 * No audio. System audio is deferred and the microphone is a separate
 * getUserMedia call. See CONTEXT.md, Removed concepts.
 */
export function handleDisplayMediaRequest(): void {
  session.defaultSession.setDisplayMediaRequestHandler((_request, callback) => {
    if (selectedSourceId === null) {
      callback({})
      return
    }
    callback({
      video: selectedSourceId as unknown as Electron.DesktopCapturerSource,
    })
  })
}