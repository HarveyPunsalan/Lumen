/**
 * The ffmpeg process. Every invocation goes through here.
 *
 * spawn with an argument array. Never exec, execSync, or a shell string. This
 * is a security control, not a style choice. See security.md, DA1.
 */

import { spawn } from 'node:child_process'
import type { ExportProgress } from './types.js'

export interface RunOptions {
  readonly args: readonly string[]
  /** Total duration in seconds, so progress is a real fraction. */
  readonly durationSeconds?: number | undefined
  readonly onProgress?: ((progress: ExportProgress) => void) | undefined
}

/**
 * Run ffmpeg once. Resolves with stderr on exit code 0, rejects otherwise.
 *
 * Capture stderr even on success. When ffmpeg fails the reason is in there,
 * and "export failed" with no detail is the least useful error message there
 * is. See system-design.md, Failure behaviour.
 */
export function run(ffmpegPath: string, options: RunOptions): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpegPath, [...options.args])
    let stderr = ''
    let progressText = ''
    let reported = 0

    child.stderr.on('data', (chunk: Buffer) => {
      const text = chunk.toString()
      stderr += text
      if (stderr.length > 64_000) stderr = stderr.slice(-64_000)
      // ffmpeg reports its own progress. Parse it rather than running a fake
      // timer, so the bar reflects real work. See export.md, Progress.
      //
      // Keep a tail across chunks: a key=value line can be split between two
      // data events, and matching one chunk at a time then sees neither half.
      progressText = (progressText + text).slice(-4096)
      let match: RegExpExecArray | null = null
      for (const candidate of progressText.matchAll(/out_time_us=(\d+)/g)) match = candidate
      const total = options.durationSeconds
      if (match === null || total === undefined || total <= 0) return

      const seconds = Number(match[1]) / 1_000_000
      const fraction = Math.min(seconds / total, 1)
      // Only emit on whole percent, otherwise React re-renders 60 times a second.
      const step = Math.floor(fraction * 100)
      if (step > reported) {
        reported = step
        options.onProgress?.({ stage: 'encode', fraction })
      }
    })

    child.on('error', reject)

    child.on('close', (code) => {
      if (code === 0) {
        options.onProgress?.({ stage: 'encode', fraction: 1 })
        resolve(stderr)
        return
      }
      reject(new Error(reasonFrom(stderr) ?? `ffmpeg exited with code ${String(code)}.`))
    })
  })
}

/**
 * The most useful line ffmpeg printed.
 *
 * ffmpeg prints the real cause first and then closes with a generic trailer,
 * so "Conversion failed!" is always the last error line and never the useful
 * one. Taking the last match threw away the actual reason. The first match is
 * the one that names the problem, and the trailer is only reported when there
 * was nothing better to say.
 */
function reasonFrom(stderr: string): string | null {
  const lines = stderr.split('\n').filter((line) => line.trim().length > 0)
  const error = lines.filter((line) => /error|invalid|failed|no such/i.test(line))
  const specific = error.filter((line) => !/conversion failed/i.test(line))
  const chosen = specific.length > 0 ? specific : error
  return chosen.length > 0 ? (chosen[0] ?? null) : null
}