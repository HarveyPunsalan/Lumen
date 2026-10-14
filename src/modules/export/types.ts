/**
 * Export vocabulary. See CONTEXT.md.
 */

/** Every step in the pipeline, in the order they run. */
export type ExportStage = 'concat' | 'encode'

export interface ExportProgress {
  readonly stage: ExportStage
  /** 0 to 1, measured from ffmpeg's own progress output. Never a fake timer. */
  readonly fraction: number
}

/** What Export needs to build its argument list. */
export interface ExportRequest {
  /** Absolute paths to every Segment, in order. */
  readonly segments: readonly string[]
  /** The Session folder, used for the concat list. */
  readonly workFolder: string
  /** Absolute path of the MP4 to write. */
  readonly outputPath: string
  /** Length of the Recording, so progress is a real fraction. */
  readonly durationSeconds: number
}

/**
 * H.264 in MP4 with AAC audio and a front-loaded index.
 *
 * libx264 because it produces the smallest files at a given quality. yuv420p
 * because most players refuse anything else. +faststart so the file streams
 * rather than needing the whole download first.
 *
 * EVEN_SCALE is not optional. H.264 requires even width and height, and a
 * Region is whatever the user dragged, so 903x541 is an ordinary result.
 * libx264 refuses it outright with "Conversion failed!", which is ffmpeg's
 * least helpful possible error. Rounding down loses at most one pixel column
 * and row, which nobody can see, instead of losing the whole Recording.
 */
export const EVEN_SCALE = 'scale=trunc(iw/2)*2:trunc(ih/2)*2'

export const ENCODE_ARGS = [
  '-vf', EVEN_SCALE,
  '-c:v', 'libx264',
  '-crf', '23',
  '-preset', 'veryfast',
  '-pix_fmt', 'yuv420p',
  '-c:a', 'aac',
  '-movflags', '+faststart',
] as const