/**
 * Session lifecycle. Runs in the main process, which owns the filesystem.
 *
 * A Session is constructed rather than held in a module global, so two can
 * exist and so a test can build one against a temp folder.
 * See architecture.md, No module-level mutable state.
 */

import type { FrameSettings } from '../frame/types.js'

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
  private frame: FrameSettings = {
    enabled: false,
    corner: 'bottom-right',
    background: 'blurred',
  }

  private constructor(
    readonly id: string,
    readonly folder: string,
    readonly startedAt: number,
  ) {}

  /**
   * Create a Session folder under the Library root.
   * @param libraryRoot absolute path to the Library, not to its parent
   */
  static async create(_libraryRoot: string): Promise<Session> {
    throw new Error('Session.create is not implemented yet.')
  }

  /** Reserve the next Segment filename. Segments are numbered in order. */
  nextSegmentPath(): string {
    throw new Error('Session.nextSegmentPath is not implemented yet.')
  }

  addSegment(_fileName: string, _sourceId: string, _sourceName: string): Segment {
    throw new Error('Session.addSegment is not implemented yet.')
  }

  /**
   * Frame settings are chosen at Export, not at record time. ADR 0004.
   * Only whether the camera is on has to be decided before recording starts.
   */
  setFrameSettings(_settings: FrameSettings): void {
    throw new Error('Session.setFrameSettings is not implemented yet.')
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

  /** Write meta.json into the Session folder. */
  async writeMetadata(): Promise<void> {
    throw new Error('Session.writeMetadata is not implemented yet.')
  }

  /**
   * Remove every Segment. Called once Export succeeds, because Segments are
   * an implementation detail and the MP4 is the Recording.
   */
  async clearSegments(): Promise<void> {
    throw new Error('Session.clearSegments is not implemented yet.')
  }
}