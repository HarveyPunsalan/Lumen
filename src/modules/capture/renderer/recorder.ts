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
export type RecorderChunkHandler = (chunk: Blob) => Promise<void> | void

export class Recorder {
  private recorder: MediaRecorder | null = null
  private stream: MediaStream | null = null
  private cropper: RegionCropper | null = null
  private handler: RecorderChunkHandler | null = null
  /** The narrator's microphone. Not part of any capture stream of ours. */
  private micTrack: MediaStreamTrack | null = null

  /**
   * Whether dispose() has run. getUserMedia does not resolve immediately, so a
   * dispose during the wait has nothing to stop, and the stream that arrives
   * afterwards belongs to nobody. Without this flag that stream records until
   * the app quits, burning CPU and holding the Display.
   */
  private disposed = false

  /**
   * The write queue. Every chunk waits for the one before it, because two
   * appends racing each other can put a cluster ahead of the WebM header and
   * leave a file ffmpeg cannot open.
   */
  private writes: Promise<void> = Promise.resolve()

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
    options: { preview?: HTMLVideoElement | undefined; narration?: boolean } = {},
  ): Promise<void> {
    const { preview, narration = false } = options
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

    // Ask the capture engine to leave the pointer out. Chromium may not support
    // this yet, so a rejection is ignored rather than failing the Segment. If
    // it is honoured, the cursor is never drawn into the file.
    const videoTrack = stream.getVideoTracks()[0]
    if (videoTrack !== undefined) {
      await videoTrack
        .applyConstraints({ cursor: 'never' } as unknown as MediaTrackConstraints)
        .catch(() => {})
    }

    this.stream = stream

    // The microphone is asked for while the Session opens, so a slow or
    // denied permission prompt does not land on top of the first frames. A
    // failure leaves the Segment silent rather than dropping it.
    if (narration) {
      try {
        const mic = await navigator.mediaDevices.getUserMedia({ audio: true })
        if (this.disposed) {
          for (const track of mic.getTracks()) track.stop()
          return
        }
        this.micTrack = mic.getAudioTracks()[0] ?? null
      } catch {
        this.micTrack = null
      }
    }

    let encoded: MediaStream
    if (target.region !== undefined) {
      this.cropper = await RegionCropper.start(stream, target.region)

      // dispose() can run while the cropper waits for its first frame. Nothing
      // owns the stream then, so release it instead of letting it record.
      if (this.disposed) {
        this.stopMic()
        this.cropper.stop()
        this.cropper = null
        for (const track of stream.getTracks()) track.stop()
        return
      }

      encoded = this.cropper.output
      if (preview !== undefined) this.cropper.attachPreview(preview)
    } else {
      encoded = stream
    }

    // A Region is cropped into a canvas, which carries video only, and the
    // display stream is asked for without system audio. The microphone is the
    // only audio there is, so it is joined onto whatever is being encoded.
    if (this.micTrack !== null) {
      encoded = new MediaStream([...encoded.getVideoTracks(), this.micTrack])
    }

    this.recorder = new MediaRecorder(encoded, {
      mimeType: this.micTrack !== null ? SEGMENT_MIME_TYPE_WITH_AUDIO : SEGMENT_MIME_TYPE,
    })
    this.handler = handler
    this.writes = Promise.resolve()
    this.recorder.ondataavailable = (event) => {
      if (event.data.size === 0) return
      this.writes = this.writes
        .then(() => {
          const handler = this.handler
          if (handler === null) return
          return handler(event.data)
        })
        .catch(() => {
          // The handler reports its own failure. Keep the queue alive so one
          // rejected write does not silently block every chunk after it.
        })
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

  /**
   * Close the Segment and wait until every chunk is on disk.
   *
   * Stop must not race Export. MediaRecorder hands over its final chunk
   * asynchronously, so asking main to save the moment Stop is pressed used to
   * run the size check before the last chunk landed, and a real recording was
   * rejected as empty.
   */
  async stop(): Promise<void> {
    const recorder = this.recorder
    this.recorder = null

    if (recorder !== null && recorder.state !== 'inactive') {
      await Promise.race([
        new Promise<void>((resolve) => {
          recorder.addEventListener('stop', () => resolve(), { once: true })
          try {
            recorder.stop()
          } catch {
            resolve()
          }
        }),
        new Promise<void>((resolve) => setTimeout(resolve, 5_000)),
      ])
    }

    await this.writes
    this.handler = null
    this.disposed = true
    this.cropper?.stop()
    this.cropper = null
    for (const track of this.stream?.getTracks() ?? []) track.stop()
    this.stream = null
    this.stopMic()
  }

  /** Release the capture stream. Called on every failure path, never at Stop. */
  dispose(): void {
    this.disposed = true
    this.handler = null
    this.recorder?.stop()
    this.recorder = null
    this.cropper?.stop()
    this.cropper = null
    for (const track of this.stream?.getTracks() ?? []) track.stop()
    this.stream = null
    this.stopMic()
  }

  /** Let go of the microphone, so the system indicator stops showing. */
  private stopMic(): void {
    this.micTrack?.stop()
    this.micTrack = null
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

/**
 * The same container, with the Opus track narration needs.
 *
 * A Session uses this or SEGMENT_MIME_TYPE, never both. Segments only join
 * with -c copy when they were encoded identically, so narration cannot be
 * switched on halfway through a Session.
 */
export const SEGMENT_MIME_TYPE_WITH_AUDIO = 'video/webm;codecs=vp9,opus'

/** How often MediaRecorder flushes. See ADR 0002. */
export const SEGMENT_TIMESLICE_MS = 1000