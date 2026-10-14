/**
 * Listing Recordings. Every path comes from paths.ts.
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import { libraryRoot, assertInsideLibrary } from './paths.js'

const LUMEN_SCHEME = 'lumen'

export interface RecordingEntry {
  readonly name: string
  /** Folder name, which is the timestamp plus a uuid. */
  readonly folder: string
  readonly startedAt: number
  readonly sizeBytes: number
}

const RECORDING_FILE = 'recording.mp4'

/** Every exported Recording in the Library, newest first. */
export async function listRecordings(): Promise<RecordingEntry[]> {
  const root = libraryRoot()
  const found: RecordingEntry[] = []

  let entries: import('node:fs').Dirent<string>[]
  try {
    entries = await fs.readdir(root, { withFileTypes: true })
  } catch {
    // No Library yet. Nothing to list, which is not an error on a first run.
    return found
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const folder = path.join(root, entry.name)

    let sizeBytes: number
    try {
      const stat = await fs.stat(path.join(folder, RECORDING_FILE))
      if (!stat.isFile()) continue
      sizeBytes = stat.size
    } catch {
      // A Session folder with no Recording is an incomplete or crashed one.
      continue
    }

    found.push({
      name: entry.name,
      // The folder name, not an absolute path. playbackUrl and deleteRecording
      // both resolve against the Library root themselves, so handing them a
      // path joined the root twice and the confinement check refused it.
      folder: entry.name,
      startedAt: await startedAtOf(folder, entry.name),
      sizeBytes,
    })
  }

  return found.sort((a, b) => b.startedAt - a.startedAt)
}

/** The folder name starts with an ISO timestamp, so read it back from the mtime. */
async function startedAtOf(folder: string, name: string): Promise<number> {
  try {
    const stat = await fs.stat(path.join(folder, RECORDING_FILE))
    return stat.mtimeMs
  } catch {
    void name
    return 0
  }
}

/** Absolute path of a Recording's MP4, proven to be inside the Library. */
export function recordingPath(folderName: string): string {
  return assertInsideLibrary(path.join(libraryRoot(), folderName, RECORDING_FILE))
}

/**
 * A Recording needs to be readable by the player, which loads it over the
 * custom protocol rather than file://. See protocol.ts, SECURITY.md DA6.
 *
 * The URL carries the Recording folder only. protocol.ts passes that segment to
 * recordingPath, which appends the MP4 name, so including the file here would
 * request it twice.
 */
export function playbackUrl(folderName: string): string {
  return `${LUMEN_SCHEME}://app/recordings/${encodeURIComponent(folderName)}`
}

/** Delete a Recording and its folder. Delete means delete. */
export async function deleteRecording(folderName: string): Promise<void> {
  const folder = assertInsideLibrary(path.join(libraryRoot(), folderName))
  await fs.rm(folder, { recursive: true, force: true })
}