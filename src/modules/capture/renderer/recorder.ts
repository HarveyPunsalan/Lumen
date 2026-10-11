/**
 * Owns the MediaRecorder. Runs in the renderer, because MediaRecorder is a
 * browser API and is not available in the main process.
 *
 * The recorder is an instance rather than a module global so a Session can be
 * constructed with it in a test. See architecture.md, No module-level mutable
 * state.
 */

import type { Target } from '../types.js'

/** Fired once per timeslice with the blob to append to the current Segment. */
export type RecorderChunkHandler = (chunk: Blob) => void

export class Recorder {
  private constructor() {}

  /** Acquire the capture stream for a Target and return a Recorder for it. */
  static async start(_target: Target): Promise<Recorder> {
    throw new Error('Recorder.start is not implemented yet.')
  }

  /**
   * Begin the current Segment. handler receives a blob every `timesliceMs`.
   * Stop and re-start to switch Target; that is what a Segment boundary is.
   *
   * The timeslice is not optional. Without it MediaRecorder holds every frame
   * in memory until stopped, which means a two hour Session exhausts RAM and a
   * crash loses the whole Recording. See ADR 0002.
   */
  beginSegment(_handler: RecorderChunkHandler, _timesliceMs: number): void {
    throw new Error('Recorder.beginSegment is not implemented yet.')
  }

  /** End the current Segment and return everything it produced. */
  endSegment(): Promise<Blob> {
    throw new Error('Recorder.endSegment is not implemented yet.')
  }

  /** Release the capture stream. Called on Stop, and on every failure path. */
  dispose(): void {
    throw new Error('Recorder.dispose is not implemented yet.')
  }
}

/**
 * The one mimeType used for every Segment.
 *
 * Segments only join with -c copy if they were encoded identically. Varying
 * this between Segments produces an MP4 that will not play. Do not make it a
 * per-Session choice.
 */
export const SEGMENT_MIME_TYPE = 'video/webm;codecs=vp9'

/** How often MediaRecorder flushes. See ADR 0002. */
export const SEGMENT_TIMESLICE_MS = 1000