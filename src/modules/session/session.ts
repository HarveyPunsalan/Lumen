/**
 * Session lifecycle. Runs in the main process, which owns the filesystem.
 *
 * A Session is constructed rather than held in a module global, so two can
 * exist and so a test can build one against a temp folder.
 * See architecture.md, No module-level mutable state.
 */

import { randomUUID } from 'node:crypto'
import path from 'node:path'
import { ensureSessionFolder } from '../library/paths.js'
import type { FrameSettings } from '../frame/types.js'
import { DEFAULT_FRAME_SETTINGS } from '../frame/types.js'

/**
 * One uninterrupted run of the recorder inside a Session. Switching Target
 * ends the current Segment and begins another. ADR 0002.
 */
export interface Segment {
  readonly index: number
  readonly fileName: string
  readonly sourceId: string
  readonly sourceName: string
  readonly startedAt: number
}

export interface SessionInfo {
  readonly id: string
  readonly folder: string
  readonly startedAt: number
  readonly segments: readonly Segment[]
  readonly frame: FrameSettings
}

export class Session {
  private readonly segments: Segment[] = []
  private reserved = 0
  private frame: FrameSettings = DEFAULT_FRAME_SETTINGS

  private constructor(
    readonly id: string,
    readonly folder: string,
    readonly startedAt: number,
  ) {}

  static async create(libraryRoot: string): Promise<Session> {
    const id = randomUUID()
    const startedAt = Date.now()
    const stamp = new Date(startedAt).toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const folder = await ensureSessionFolder(path.join(libraryRoot, `${stamp}_${id.slice(0, 8)}`))
    return new Session(id, folder, startedAt)
  }

  /**
   * Reserve the next Segment file name.
   *
   * The counter advances on each call, not on addSegment, because the caller
   * needs a name before any Segment data exists. Deriving it from segments
   * would hand out part-001 forever.
   */
  nextSegmentPath(): string {
    this.reserved += 1
    const name = `part-${String(this.reserved).padStart(3, '0')}.webm`
    return path.join(this.folder, name)
  }

  addSegment(fileName: string, sourceId: string, sourceName: string): Segment {
    const segment: Segment = {
      index: this.segments.length + 1,
      fileName,
      sourceId,
      sourceName,
      startedAt: Date.now(),
    }
    this.segments.push(segment)
    return segment
  }

  /**
   * Frame settings are chosen at Export, not at record time. ADR 0004.
   * Only whether the camera is on has to be decided before recording starts.
   */
  setFrameSettings(settings: FrameSettings): void {
    this.frame = settings
  }

  get info(): SessionInfo {
    return {
      id: this.id,
      folder: this.folder,
      startedAt: this.startedAt,
      segments: [...this.segments],
      frame: this.frame,
    }
  }
}