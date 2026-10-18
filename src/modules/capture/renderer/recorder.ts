/**
 * Owns the MediaRecorder. Runs in the renderer, because MediaRecorder is a
 * browser API and is not available in the main process.
 *
 * The recorder is an instance rather than a module global so a Session can be
 * constructed with it in a test. See architecture.md, No module-level mutable
 * state.
 */

import type { Target } from '../types.js'
import { RegionCropper } from './region-cropper.js'

/** Fired once per timeslice with the blob to append to the current Segment. */
export type RecorderChunkHandler = (chunk: Blob) => void

export class Recorder {
  private recorder: MediaRecorder | null = null
  private stream: MediaStream | null = null
  private cropper: RegionCropper | null = null

  /**
   * Whether dispose() has run. getUserMedia does not resolve immediately, so a
   * dispose during the wait has nothing to stop, and the stream that arrives
   * afterwards belongs to nobody. Without this flag that stream records until
   * the app quits, burning CPU and holding the Display.
   */
  private disposed = false

  /**
   * Begin the current Segment. handler receives a blob every `timesliceMs`.
   * Stop and re-start to switch Target; that is what a Segment boundary is.
   *
   * The timeslice is not optional. Without it MediaRecorder holds every frame
   * in memory until stopped, which means a two hour Session exhausts RAM and a
   * crash loses the whole Recording. See ADR 0002.
   *
   * When the Target carries a Region, the crop runs live and the recorder
   * encodes the cropped canvas, not the raw stream.
   */
  async beginSegment(
    target: Target,
    handler: RecorderChunkHandler,
    timesliceMs: number,
    preview?: HTMLVideoElement,
  ): Promise<void> {
    this.dispose()
    this.disposed = false

    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: target.source.id,
        },
      } as unknown as MediaTrackConstraints,
      audio: false,
    })

    // dispose() ran while the stream was being acquired. Nothing owns this any
    // more, so release it rather than recording forever.
    if (this.disposed) {
      for (const track of stream.getTracks()) track.stop()
      return
    }

    this.stream = stream

    let encoded = stream
    if (target.region !== undefined) {
      this.cropper = RegionCropper.start(stream, target.region)
      encoded = this.cropper.output
      if (preview !== undefined) this.cropper.attachPreview(preview)
    }

    this.recorder = new MediaRecorder(encoded, { mimeType: SEGMENT_MIME_TYPE })
    this.recorder.ondataavailable = (event) => {
      if (event.data.size > 0) handler(event.data)
    }
    this.recorder.start(timesliceMs)
  }

  /**
   * The live capture stream, for the preview.
   *
   * The raw Source, not the cropped output, so the preview shows everything on
   * screen with the Region drawn over it. Null until beginSegment resolves.
   */
  get previewStream(): MediaStream | null {
    return this.stream
  }

  /** Release the capture stream. Called on Stop, and on every failure path. */
  dispose(): void {
    this.disposed = true
    this.recorder?.stop()
    this.recorder = null
    this.cropper?.stop()
    this.cropper = null
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