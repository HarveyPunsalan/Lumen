/**
 * Live Region crop.
 *
 * A Region is applied while recording, not at Export. Everything else in Lumen
 * is an Export step, because those choices can be made afterwards. This one
 * cannot: if the crop ran at Export, whatever was inside the rectangle at any
 * moment during the Session would end up in the Recording.
 *
 * The canvas is sized to the Region and nothing else. Copying the whole
 * Display and discarding most of it was what made the recording stutter on an
 * 8GB M1, so the Recording is exactly what the user dragged: no black bars, no
 * wasted pixels. See architecture.md.
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
  private readonly outputStream: MediaStream
  private handle = 0
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

    // Sized to the Region, so the output video is only what the user dragged.
    this.canvas.width = region.width
    this.canvas.height = region.height

    // Own the video element rather than borrowing the preview's. Sharing it made
    // the crop conditional on the preview being mounted, and when it was not,
    // the Region was silently skipped and the whole Display got recorded.
    this.video = document.createElement('video')
    this.video.srcObject = source
    this.video.muted = true
    this.video.playsInline = true

    context.fillStyle = '#000000'
    context.fillRect(0, 0, this.canvas.width, this.canvas.height)

    this.outputStream = this.canvas.captureStream(CAPTURE_FPS)

    void this.video.play().then(() => {
      this.ready = true
      this.draw()
    })
  }

  static start(source: MediaStream, region: Region): RegionCropper {
    return new RegionCropper(source, region)
  }

  /** The cropped stream. MediaRecorder should encode this, not the source. */
  get output(): MediaStream {
    return this.outputStream
  }

  /** Point a preview element at the cropped output. */
  attachPreview(element: HTMLVideoElement): void {
    element.srcObject = this.outputStream
    element.muted = true
    void element.play().catch(() => {})
  }

  stop(): void {
    if (this.handle !== 0) cancelAnimationFrame(this.handle)
    this.handle = 0
    this.ready = false
    this.video.pause()
    this.video.srcObject = null
    for (const track of this.outputStream.getTracks()) track.stop()
  }

  /**
   * Copies the Region onto the canvas, one frame at a time. The canvas is what
   * the recorder encodes, and it is already Region sized, so this is a straight
   * copy with no offset maths and no wasted pixels.
   */
  private readonly draw = (): void => {
    if (!this.ready) return
    const { context, region } = this

    context.drawImage(
      this.video,
      region.x,
      region.y,
      region.width,
      region.height,
      0,
      0,
      region.width,
      region.height,
    )

    this.handle = requestAnimationFrame(this.draw)
  }
}

/**
 * Map a rectangle dragged in CSS pixels onto the Source's real pixels.
 *
 * A Retina display reports twice the resolution, so using the dragged values
 * directly puts the crop in the wrong place. This is the most likely bug in the
 * capture path. See system-design.md, Known constraints.
 */
export function mapRegionToPixels(
  region: Region,
  sourceWidth: number,
  sourceHeight: number,
  logicalWidth: number,
  logicalHeight: number,
): Region {
  const scaleX = sourceWidth / logicalWidth
  const scaleY = sourceHeight / logicalHeight
  return {
    x: Math.round(region.x * scaleX),
    y: Math.round(region.y * scaleY),
    width: Math.round(region.width * scaleX),
    height: Math.round(region.height * scaleY),
  }
}