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
  private recorder: MediaRecorder | null = null

  /**
   * Begin the current Segment. handler receives a blob every `timesliceMs`.
   * Stop and re-start to switch Target; that is what a Segment boundary is.
   *
   * The timeslice is not optional. Without it MediaRecorder holds every frame
   * in memory until stopped, which means a two hour Session exhausts RAM and a
   * crash loses the whole Recording. See ADR 0002.
   */
  async beginSegment(
    target: Target,
    handler: RecorderChunkHandler,
    timesliceMs: number,
  ): Promise<void> {
    this.dispose()

    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: target.source.id,
        },
      } as unknown as MediaTrackConstraints,
      audio: false,
    })

    this.stream = stream
    this.recorder = new MediaRecorder(stream, { mimeType: SEGMENT_MIME_TYPE })
    this.recorder.ondataavailable = (event) => {
      if (event.data.size > 0) handler(event.data)
    }
    this.recorder.start(timesliceMs)
  }

  private stream: MediaStream | null = null

  /** End the current Segment and return everything it produced. */
  async endSegment(): Promise<Blob> {
    const recorder = this.recorder
    if (recorder === null) throw new Error('No Segment is in progress.')

    const chunks: Blob[] = []
    const done = new Promise<Blob>((resolve) => {
      recorder.onstop = () => resolve(new Blob(chunks, { type: SEGMENT_MIME_TYPE }))
    })
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data)
    }

    recorder.stop()
    this.recorder = null
    return done
  }

  /** Release the capture stream. Called on Stop, and on every failure path. */
  dispose(): void {
    this.recorder?.stop()
    this.recorder = null
    for (const track of this.stream?.getTracks() ?? []) track.stop()
    this.stream = null
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