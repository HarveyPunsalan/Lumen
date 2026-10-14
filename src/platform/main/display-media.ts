/**
 * Which Source the user picked, and writing what gets recorded.
 *
 * The renderer cannot call desktopCapturer, so the Source has to travel through
 * the main process. This module holds it, answers the display media request
 * with it, and owns the Segments on disk.
 */

import { session } from 'electron'
import path from 'node:path'
import { appendFileInLibrary, libraryRoot, relativeInLibrary } from '../../modules/library/paths.js'
import { Session } from '../../modules/session/session.js'
import { exportSession } from '../../modules/export/pipeline.js'
import type { ExportProgress } from '../../modules/export/types.js'
import type { Source } from '../../modules/capture/types.js'

let selectedSource: Source | null = null
let currentSession: Session | null = null

/** Segments written this Session, absolute, in order. */
const segmentPaths: string[] = []

/**
 * Remember the Source. The whole Source is kept because Electron's display
 * media callback wants both id and name, not a bare id string.
 */
export function selectSource(source: Source): void {
  selectedSource = source
}

export function clearSelection(): void {
  selectedSource = null
}

/** Open a Session folder. Segments are written there and nowhere else. */
/**
 * Open a Session folder. Segments are written there and nowhere else.
 *
 * Returns the folder only. Claiming a Segment name here would register a file
 * nobody writes to, and Export would then be handed a Segment that does not
 * exist. The first Segment is claimed by segmentPath().
 */
export async function beginSession(): Promise<{ folder: string }> {
  currentSession = await Session.create(libraryRoot())
  segmentPaths.length = 0
  return { folder: currentSession.folder }
}

interface SessionPaths {
  readonly relativePath: string
  readonly folder: string
}

function sessionPaths(): SessionPaths {
  if (currentSession === null) throw new Error('No Session in progress.')
  const absolute = currentSession.nextSegmentPath()
  segmentPaths.push(absolute)
  return { relativePath: relativeInLibrary(absolute), folder: currentSession.folder }
}

/**
 * Append one chunk to the Segment. Called every timeslice, so a crash loses at
 * most one chunk. ADR 0002.
 */
export async function writeSegment(relativePath: string, bytes: ArrayBuffer): Promise<void> {
  await appendFileInLibrary(relativePath, new Uint8Array(bytes))
}

/**
 * Claim the next Segment name and register it for Export.
 *
 * Distinct from beginSession, which only opens the folder. Every Segment the
 * renderer records must come from here, so Export has a list that matches what
 * is actually on disk.
 */
export async function segmentPath(): Promise<SessionPaths> {
  return sessionPaths()
}

/**
 * Turn the Segments into one MP4 and delete them.
 *
 * A MediaRecorder Webm is a live stream with no seek index, and most players
 * refuse to open one. So the Recording the user keeps is the MP4. See
 * export.md.
 */
export async function finishSession(
  durationSeconds: number,
  onProgress: (progress: ExportProgress) => void,
): Promise<string> {
  if (currentSession === null) throw new Error('No Session in progress.')

  const folder = currentSession.folder
  const outputPath = path.join(folder, 'recording.mp4')

  // A Segment is registered the moment its name is claimed, so an abandoned
  // one, such as the extra mount React StrictMode causes in development, is
  // still listed. ffmpeg cannot read a file that has no frames, so only the
  // Segments that actually hold data are exported.
  const { statInLibrary } = await import('../../modules/library/paths.js')
  const written: string[] = []
  for (const segment of segmentPaths) {
    const size = await statInLibrary(relativeInLibrary(segment)).catch(() => 0)
    if (size > 0) written.push(segment)
  }

  if (written.length === 0) {
    throw new Error('Nothing was recorded, so there is nothing to save.')
  }

  await exportSession(
    { segments: written, workFolder: folder, outputPath, durationSeconds },
    onProgress,
  )

  // The Segments are an implementation detail. The MP4 is the Recording.
  const { deleteInLibrary } = await import('../../modules/library/paths.js')
  for (const segment of segmentPaths) {
    await deleteInLibrary(relativeInLibrary(segment)).catch(() => {})
  }
  segmentPaths.length = 0

  return outputPath
}

/**
 * Answer the renderer's getUserMedia for video with the picked Source.
 *
 * The handler receives a Source object, not a bare id. Passing the id string
 * straight through typechecked only behind a cast, and at runtime getUserMedia
 * then never settled, which showed as a Start button stuck on "Starting...".
 *
 * No audio. System audio is deferred and the microphone is a separate
 * getUserMedia call. See CONTEXT.md, Removed concepts.
 */
export function handleDisplayMediaRequest(): void {
  session.defaultSession.setDisplayMediaRequestHandler((_request, callback) => {
    if (selectedSource === null) {
      // An empty object leaves getUserMedia pending forever. Passing null is the
      // documented refusal, so the renderer sees a rejection it can show.
      callback(null)
      return
    }
    callback({
      video: { id: selectedSource.id, name: selectedSource.name },
    })
  })
}