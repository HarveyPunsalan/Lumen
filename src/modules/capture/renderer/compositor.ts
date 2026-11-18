/**
 * Live compositor: the picture the recorder encodes.
 *
 * Two effects are drawn while recording rather than at Export, because both
 * would change what the file contains if they were postponed. A Region is
 * cropped, because whatever passes through the rectangle during the Session
 * must not reach the file. The Frame is drawn, because the screen and the
 * camera are one stream here and cannot drift apart. See ADR 0004.
 *
 * The canvas is sized to the Region and nothing else. Copying the whole
 * Target and discarding most of it was what made the recording stutter on an
 * 8GB M1, so with a Region the Recording is exactly what the user dragged: no
 * black bars, no wasted pixels. Without a Region the canvas is the whole
 * frame, because the Frame still has to be drawn into something.
 *
 * A Region arrives as fractions of the Target's frame, not pixels. A Retina
 * Display and a Window report different pixel sizes, and a Window can be
 * resized mid-Session, so the crop is resolved once the captured frame reports
 * its own size.
 */

import type { FrameCorner } from '../../frame/types.js'
import type { Region } from '../types.js'

/**
 * 30fps rather than 60. Screen recording at 30 is standard, it halves the work,
 * and the capture pipeline is already the heaviest thing Lumen does. The preview
 * runs smoother but the Recording would lag if it were any higher.
 */
const CAPTURE_FPS = 30

/** The Frame's camera picture and the corner it sits in. */
export interface FrameLayer {
  readonly corner: FrameCorner
  readonly camera: MediaStream
}

/** The Frame's diameter and edge margin, as fractions of the shorter side. */
const FRAME_DIAMETER = 0.2
const FRAME_MARGIN = 0.04

export class Compositor {
  private readonly canvas: HTMLCanvasElement
  private readonly context: CanvasRenderingContext2D
  private readonly video: HTMLVideoElement
  /** The camera's own element, owned here like the screen's one. */
  private readonly cameraVideo: HTMLVideoElement | null
  private corner: FrameCorner | null = null
  private outputStream: MediaStream | null = null
  private ticker: ReturnType<typeof setInterval> | null = null
  private ready = false
  private drawCount = 0

  private constructor(
    source: MediaStream,
    private readonly region: Region | undefined,
    frame: FrameLayer | null,
  ) {
    // alpha: false skips an unused transparency channel, which is a real saving
    // when copying pixels thirty times a second.
    const context = document.createElement('canvas').getContext('2d', { alpha: false })
    if (context === null) throw new Error('Canvas 2D is unavailable.')
    this.context = context
    this.canvas = context.canvas

    const track = source.getVideoTracks()[0]
    if (track === undefined) throw new Error('The capture stream has no video track.')

    // Own the video element rather than borrowing the preview's. Sharing it made
    // the crop conditional on the preview being mounted, and when it was not,
    // the Region was silently skipped and the whole Target got recorded.
    this.video = document.createElement('video')
    this.video.srcObject = source
    this.video.muted = true
    this.video.playsInline = true

    if (frame !== null) {
      this.cameraVideo = document.createElement('video')
      this.cameraVideo.srcObject = frame.camera
      this.cameraVideo.muted = true
      this.cameraVideo.playsInline = true
      this.corner = frame.corner
    } else {
      this.cameraVideo = null
    }
  }

  static async start(
    source: MediaStream,
    region: Region | undefined,
    frame: FrameLayer | null,
  ): Promise<Compositor> {
    const compositor = new Compositor(source, region, frame)
    await compositor.initialize()
    return compositor
  }

  /**
   * Size the output from the captured frame, not from the preview.
   *
   * The frame is what the encoder will see, so it is the only size the crop can
   * trust. Taking it once also keeps the canvas and its capture stream at a
   * fixed size for the rest of the Segment.
   */
  private async initialize(): Promise<void> {
    await this.video.play()
    if (this.cameraVideo !== null) await this.cameraVideo.play()

    const width = this.video.videoWidth
    const height = this.video.videoHeight
    if (width === 0 || height === 0) {
      throw new Error('The captured frame has no size, so the picture cannot be composed.')
    }

    if (this.region === undefined) {
      this.canvas.width = width
      this.canvas.height = height
    } else {
      this.canvas.width = Math.max(1, Math.round(this.region.width * width))
      this.canvas.height = Math.max(1, Math.round(this.region.height * height))
    }

    this.context.fillStyle = '#000000'
    this.context.fillRect(0, 0, this.canvas.width, this.canvas.height)

    this.outputStream = this.canvas.captureStream(CAPTURE_FPS)
    this.ready = true
    this.draw()
    // A timer, not requestAnimationFrame. Chromium pauses animation frames
    // when the window is covered, and the user is normally looking at the
    // Target, not at Lumen. The picture has to keep running while that happens.
    this.ticker = setInterval(this.draw, Math.round(1000 / CAPTURE_FPS))
  }

  /** The composed stream. MediaRecorder should encode this, not the source. */
  get output(): MediaStream {
    if (this.outputStream === null) {
      throw new Error('The compositor was not started.')
    }
    return this.outputStream
  }

  /** Point a preview element at the composed output. */
  attachPreview(element: HTMLVideoElement): void {
    element.srcObject = this.output
    element.muted = true
    void element.play().catch(() => {})
  }

  stop(): void {
    if (this.ticker !== null) clearInterval(this.ticker)
    this.ticker = null
    this.ready = false
    this.video.pause()
    this.video.srcObject = null
    if (this.cameraVideo !== null) {
      this.cameraVideo.pause()
      // Stop camera tracks directly in case Recorder's stopCamera didn't run.
      // track.stop() is idempotent and safe to call multiple times.
      const src = this.cameraVideo.srcObject
      if (src instanceof MediaStream) {
        for (const track of src.getTracks()) {
          track.stop()
        }
      }
      this.cameraVideo.srcObject = null
    }
    for (const track of this.outputStream?.getTracks() ?? []) track.stop()
    this.outputStream = null
  }

  /**
   * Copies one frame onto the canvas: the Target, or just the Region, with the
   * Frame drawn over it when one is enabled. The canvas is what the recorder
   * encodes.
   */
  private readonly draw = (): void => {
    if (!this.ready) return

    const width = this.video.videoWidth
    const height = this.video.videoHeight
    // A Window being resized can report a frame with no size for a tick.
    // drawImage() throws on that, and a throw used to kill the whole loop,
    // freezing the Recording while the clock kept running. Skip the frame
    // instead; the timer will try again.
    if (width === 0 || height === 0 || this.video.readyState < 2) {
      console.log('[DEBUG-frame] draw skip: video not ready', { width, height, readyState: this.video.readyState })
      return
    }

    this.drawCount += 1
    if (this.drawCount % 90 === 1) {
      console.log('[DEBUG-frame] draw tick', {
        count: this.drawCount,
        canvas: `${this.canvas.width}x${this.canvas.height}`,
        source: `${width}x${height}`,
        region: this.region,
        hasCamera: this.cameraVideo !== null,
      })
    }

    const { context, region } = this
    const sourceX = region === undefined ? 0 : region.x * width
    const sourceY = region === undefined ? 0 : region.y * height
    const sourceWidth = region === undefined ? width : region.width * width
    const sourceHeight = region === undefined ? height : region.height * height

    context.drawImage(
      this.video,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      this.canvas.width,
      this.canvas.height,
    )

    this.drawFrame()
  }

  /**
   * The Frame's circle: cover-cropped from the camera, clipped to a circle,
   * and ringed so it still reads against a light or dark Recording. Skipped
   * until the camera reports a frame; the screen keeps recording either way.
   */
  private drawFrame(): void {
    const camera = this.cameraVideo
    const corner = this.corner
    if (camera === null || corner === null) return
    const cameraWidth = camera.videoWidth
    const cameraHeight = camera.videoHeight
    if (cameraWidth === 0 || cameraHeight === 0 || camera.readyState < 2) return

    const { context, canvas } = this
    const shorter = Math.min(canvas.width, canvas.height)
    const diameter = Math.round(shorter * FRAME_DIAMETER)
    const radius = diameter / 2
    const margin = Math.round(shorter * FRAME_MARGIN)
    const left = corner === 'top-left' || corner === 'bottom-left'
    const top = corner === 'top-left' || corner === 'top-right'
    const centerX = (left ? margin : canvas.width - margin - diameter) + radius
    const centerY = (top ? margin : canvas.height - margin - diameter) + radius

    // A square taken from the middle of the camera frame, so a wide camera
    // image fills the circle instead of letterboxing inside it.
    const side = Math.min(cameraWidth, cameraHeight)
    const sourceX = (cameraWidth - side) / 2
    const sourceY = (cameraHeight - side) / 2

    context.save()
    context.beginPath()
    context.arc(centerX, centerY, radius, 0, Math.PI * 2)
    context.clip()
    context.drawImage(
      camera,
      sourceX,
      sourceY,
      side,
      side,
      centerX - radius,
      centerY - radius,
      diameter,
      diameter,
    )
    context.restore()

    context.beginPath()
    context.arc(centerX, centerY, radius, 0, Math.PI * 2)
    context.lineWidth = Math.max(2, Math.round(diameter * 0.03))
    context.strokeStyle = '#0a0a0a'
    context.stroke()
  }
}
