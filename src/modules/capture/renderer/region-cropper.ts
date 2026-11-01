/**
 * Live Region crop.
 *
 * A Region is applied while recording, not at Export. Everything else in Lumen
 * is an Export step, because those choices can be made afterwards. This one
 * cannot: if the crop ran at Export, whatever was inside the rectangle at any
 * moment during the Session would end up in the Recording.
 *
 * The canvas is sized to the Region and nothing else. Copying the whole Target
 * and discarding most of it was what made the recording stutter on an 8GB M1,
 * so the Recording is exactly what the user dragged: no black bars, no wasted
 * pixels. See architecture.md.
 *
 * The Region arrives as fractions of the Target's frame, not pixels. A Retina
 * Display and a Window report different pixel sizes, and a Window can be
 * resized mid-Session, so the crop is resolved once the captured frame reports
 * its own size.
 */

import type { Region } from '../types.js'

/**
 * 30fps rather than 60. Screen recording at 30 is standard, it halves the work,
 * and the capture pipeline is already the heaviest thing Lumen does. The preview
 * runs smoother but the Recording would lag if it were any higher.
 */
const CAPTURE_FPS = 30

export class RegionCropper {
  private readonly canvas: HTMLCanvasElement
  private readonly context: CanvasRenderingContext2D
  private readonly video: HTMLVideoElement
  private outputStream: MediaStream | null = null
  private ticker: ReturnType<typeof setInterval> | null = null
  private ready = false

  private constructor(
    source: MediaStream,
    private readonly region: Region,
  ) {
    // alpha: false skips an unused transparency channel, which is a real saving
    // when copying pixels sixty times a second.
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
  }

  static async start(source: MediaStream, region: Region): Promise<RegionCropper> {
    const cropper = new RegionCropper(source, region)
    await cropper.initialize()
    return cropper
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

    const width = this.video.videoWidth
    const height = this.video.videoHeight
    if (width === 0 || height === 0) {
      throw new Error('The captured frame has no size, so the Region cannot be cropped.')
    }

    this.canvas.width = Math.max(1, Math.round(this.region.width * width))
    this.canvas.height = Math.max(1, Math.round(this.region.height * height))

    this.context.fillStyle = '#000000'
    this.context.fillRect(0, 0, this.canvas.width, this.canvas.height)

    this.outputStream = this.canvas.captureStream(CAPTURE_FPS)
    this.ready = true
    this.draw()
    // A timer, not requestAnimationFrame. Chromium pauses animation frames
    // when the window is covered, and the user is normally looking at the
    // Target, not at Lumen. The crop has to keep running while that happens.
    this.ticker = setInterval(this.draw, Math.round(1000 / CAPTURE_FPS))
  }

  /** The cropped stream. MediaRecorder should encode this, not the source. */
  get output(): MediaStream {
    if (this.outputStream === null) {
      throw new Error('The Region cropper was not started.')
    }
    return this.outputStream
  }

  /** Point a preview element at the cropped output. */
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
    for (const track of this.outputStream?.getTracks() ?? []) track.stop()
    this.outputStream = null
  }

  /**
   * Copies the Region onto the canvas, one frame at a time. The canvas is what
   * the recorder encodes, and it is already Region sized, so this is a straight
   * copy with no offset maths and no wasted pixels.
   */
  private readonly draw = (): void => {
    if (!this.ready) return

    const width = this.video.videoWidth
    const height = this.video.videoHeight
    // A Window being resized can report a frame with no size for a tick.
    // drawImage() throws on that, and a throw used to kill the whole loop,
    // freezing the Recording while the clock kept running. Skip the frame
    // instead; the timer will try again.
    if (width === 0 || height === 0 || this.video.readyState < 2) return

    const { context, region } = this

    context.drawImage(
      this.video,
      region.x * width,
      region.y * height,
      region.width * width,
      region.height * height,
      0,
      0,
      this.canvas.width,
      this.canvas.height,
    )
  }
}
