/**
 * The live Session, the picked Source, and the Segment list.
 *
 * This is where Session, library paths and the Export pipeline meet. It lives
 * in `app/` because only the composition root may put modules together. See
 * architecture.md, The dependency rule.
 */

import path from 'node:path'
import {
  appendFileInLibrary,
  deleteInLibrary,
  ensureSessionFolder,
  libraryRoot,
  relativeInLibrary,
  renameInLibrary,
  statInLibrary,
} from '../modules/library/paths.js'
import { Session } from '../modules/session/session.js'
import { exportSession } from '../modules/export/pipeline.js'
import { DEFAULT_FRAME_SETTINGS } from '../modules/frame/types.js'
import type { ExportProgress } from '../modules/export/types.js'
import type { Source } from '../modules/capture/types.js'

export interface SessionRuntimeDeps {
  readonly notifyExportProgress: (progress: ExportProgress) => void
}

export interface SessionRuntime {
  selectSource(source: Source): void
  clearSource(): void
  currentSource(): Source | null
  begin(): Promise<{ folder: string }>
  nextSegmentPath(): Promise<{ relativePath: string; folder: string }>
  writeChunk(relativePath: string, bytes: ArrayBuffer): Promise<void>
  finish(durationSeconds: number): Promise<string>
}

export function createSessionRuntime(deps: SessionRuntimeDeps): SessionRuntime {
  let selectedSource: Source | null = null
  let currentSession: Session | null = null

  /** Segments written this Session, absolute, in order. */
  const segmentPaths: string[] = []

  function requireSession(): Session {
    if (currentSession === null) throw new Error('No Session in progress.')
    return currentSession
  }

  function claimSegmentPath(): { relativePath: string; folder: string } {
    const session = requireSession()
    const absolute = session.nextSegmentPath()
    segmentPaths.push(absolute)
    return { relativePath: relativeInLibrary(absolute), folder: session.folder }
  }

  return {
    /** The whole Source is kept because Electron's display media callback
     * wants both id and name, not a bare id string. */
    selectSource(source) {
      selectedSource = source
    },

    clearSource() {
      selectedSource = null
    },

    currentSource: () => selectedSource,

    /**
     * Open a Session folder. Segments are written there and nowhere else.
     *
     * Returns the folder only. Claiming a Segment name here would register a
     * file nobody writes to, and Export would then be handed a Segment that
     * does not exist. The first Segment is claimed by nextSegmentPath().
     */
    async begin() {
      currentSession = await Session.create({
        libraryRoot: libraryRoot(),
        ensureFolder: ensureSessionFolder,
        frame: DEFAULT_FRAME_SETTINGS,
      })
      segmentPaths.length = 0
      return { folder: currentSession.folder }
    },

    /**
     * Claim the next Segment name and register it for Export.
     *
     * Distinct from begin, which only opens the folder. Every Segment the
     * renderer records must come from here, so Export has a list that matches
     * what is actually on disk.
     */
    async nextSegmentPath() {
      return claimSegmentPath()
    },

    /**
     * Append one chunk to the Segment. Called every timeslice, so a crash
     * loses at most one chunk. ADR 0002.
     */
    async writeChunk(relativePath, bytes) {
      console.log('[seg] chunk', relativePath, bytes.byteLength)
      await appendFileInLibrary(relativePath, new Uint8Array(bytes))
    },

    /**
     * Turn the Segments into one MP4 and delete them.
     *
     * A MediaRecorder Webm is a live stream with no seek index, and most
     * players refuse to open one. So the Recording the user keeps is the MP4.
     * See export.md.
     */
    async finish(durationSeconds) {
      const session = requireSession()
      const folder = session.folder
      const outputPath = path.join(folder, 'recording.mp4')
      const partialPath = path.join(folder, 'recording.partial.mp4')

      // A Segment is registered the moment its name is claimed, so an
      // abandoned one, such as the extra mount React StrictMode causes in
      // development, is still listed. ffmpeg cannot read a file that has no
      // frames, so only the Segments that actually hold data are exported.
      const written: string[] = []
      for (const segment of segmentPaths) {
        const size = await statInLibrary(relativeInLibrary(segment)).catch(() => 0)
        console.log('[seg] size', segment, size)
        if (size > 0) written.push(segment)
      }
      console.log('[seg] finish', written.length, 'of', segmentPaths.length)

      if (written.length === 0) {
        throw new Error('Nothing was recorded, so there is nothing to save.')
      }

      try {
        await exportSession(
          {
            segments: written,
            workFolder: folder,
            outputPath: partialPath,
            durationSeconds,
          },
          deps.notifyExportProgress,
        )
      } catch (cause) {
        await deleteInLibrary(relativeInLibrary(partialPath)).catch(() => {})
        throw cause
      }
      await renameInLibrary(relativeInLibrary(partialPath), relativeInLibrary(outputPath))

      // The Segments are an implementation detail. The MP4 is the Recording.
      for (const segment of segmentPaths) {
        await deleteInLibrary(relativeInLibrary(segment)).catch(() => {})
      }
      segmentPaths.length = 0

      return outputPath
    },
  }
}
