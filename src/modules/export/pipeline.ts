/**
 * Builds the Export pipeline: concat, then encode to MP4.
 *
 * A Region is already cropped live into each Segment, so the crop does not
 * happen here. See architecture.md, Effects happen at Export.
 *
 * MP4 rather than the Webm that MediaRecorder produces, because a MediaRecorder
 * Webm is a live stream with no seek index and most players, Chrome included,
 * refuse to play it. ffmpeg rewrites it as a real MP4. ADR 0004.
 */

import path from 'node:path'
import { createRequire } from 'node:module'
import { run } from './ffmpeg.js'
import { ENCODE_ARGS, type ExportRequest, type ExportProgress } from './types.js'

/**
 * ffmpeg-static is CommonJS and its default export is the binary path, or null
 * when there is no build for this platform. Read it through createRequire
 * rather than a default import, because the module is compiled as ESM and a
 * default import of a CJS module whose typings disagree with its runtime shape
 * does not narrow.
 */
const require_ = createRequire(import.meta.url)

function binary(): string {
  const binaryPath: unknown = require_('ffmpeg-static')
  if (typeof binaryPath !== 'string') {
    throw new Error('ffmpeg is not available in this build.')
  }
  return binaryPath
}

/**
 * Write the concat demuxer list. ffmpeg needs a file listing every input,
 * and the paths have to be escaped because a Session folder name is a timestamp
 * and a uuid, neither of which contains a quote, but the escaping is free.
 */
export async function writeConcatList(
  segmentPaths: readonly string[],
  listPath: string,
): Promise<void> {
  const { writeFile } = await import('node:fs/promises')
  const body = segmentPaths.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join('\n')
  await writeFile(listPath, body, 'utf8')
}

/**
 * Compose the ffmpeg argument array.
 *
 * Concat uses -c copy because every Segment was encoded identically, so joining
 * them is nearly instant. Only the final encode re-compresses.
 */
export function buildArgs(request: ExportRequest, concatListPath: string): string[] {
  return [
    '-hide_banner',
    '-y',
    '-f', 'concat',
    '-safe', '0',
    '-i', concatListPath,
    ...ENCODE_ARGS,
    request.outputPath,
  ]
}

/** Run the whole pipeline and write one MP4. */
export async function exportSession(
  request: ExportRequest,
  onProgress?: (progress: ExportProgress) => void,
): Promise<string> {
  const concatListPath = path.join(request.workFolder, 'concat.txt')

  await writeConcatList(request.segments, concatListPath)
  await run(binary(), {
    args: buildArgs(request, concatListPath),
    durationSeconds: request.durationSeconds,
    onProgress,
  })

  return request.outputPath
}