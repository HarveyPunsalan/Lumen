/**
 * The ffmpeg process. Every invocation goes through here.
 *
 * spawn with an argument array. Never exec, execSync, or a shell string.
 * This is a security control, not a style choice. See security.md, DA1.
 */

import type { ExportProgress } from './types.js'

export interface RunOptions {
  readonly args: readonly string[]
  readonly onProgress?: (progress: ExportProgress) => void
  readonly signal?: AbortSignal
}

/**
 * Run ffmpeg once. Resolves with stderr on exit code 0, rejects otherwise.
 *
 * Uses spawn from node:child_process with an argument array. Never exec,
 * execSync, or a shell string. See security.md, DA1.
 *
 * Capture stderr even on success. When ffmpeg fails the reason is in there,
 * and "export failed" with no detail is the least useful error message there
 * is. See system-design.md, Failure behaviour.
 */
export function run(_ffmpegPath: string, _options: RunOptions): Promise<string> {
  throw new Error('ffmpeg run is not implemented yet.')
}

/** Write the concat demuxer list that joins Segments. */
export function writeConcatList(_segmentPaths: readonly string[]): string {
  throw new Error('writeConcatList is not implemented yet.')
}