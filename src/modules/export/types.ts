/**
 * Export vocabulary. See CONTEXT.md.
 */

/** Every step in the pipeline, in the order they run. */
export type ExportStage = 'concat' | 'crop' | 'overlay' | 'trim' | 'encode'

export interface TrimRange {
  readonly startSeconds: number
  readonly endSeconds: number
}

export interface CropRect {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

export interface FramePlacement {
  readonly corner: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right'
  readonly width: number
  /** Pixels from the outer edge. */
  readonly margin: number
}

/** What Export needs to build its argument list. */
export interface ExportRequest {
  readonly segments: readonly string[]
  readonly cameraPath?: string
  readonly crop?: CropRect
  readonly frame?: FramePlacement
  readonly trim?: TrimRange
  readonly outputPath: string
}

export interface ExportProgress {
  readonly stage: ExportStage
  /** 0 to 1, measured from ffmpeg's own progress output. Never a fake timer. */
  readonly fraction: number
}

export const ENCODE_ARGS = [
  '-c:v',
  'libx264',
  '-crf',
  '23',
  '-preset',
  'veryfast',
  '-pix_fmt',
  'yuv420p',
  '-c:a',
  'aac',
  '-movflags',
  '+faststart',
] as const