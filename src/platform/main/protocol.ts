/**
 * The custom protocol that serves the renderer.
 *
 * file:// grants read access to the whole disk, so the renderer is served
 * from lumen:// instead, restricted to the built assets. See SECURITY.md DA6.
 */

import { protocol, net } from 'electron'
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import path from 'node:path'
import { Readable } from 'node:stream'
import { fileURLToPath, pathToFileURL } from 'node:url'

export const LUMEN_SCHEME = 'lumen'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

/** dist-electron/platform/main -> project root, then into dist. */
export const rendererDistRoot = path.resolve(currentDir, '../../../dist')

export function registerSchemePrivileges(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: LUMEN_SCHEME,
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        corsEnabled: false,
        stream: true,
      },
    },
  ])
}

export function handleRendererRequests(): void {
  protocol.handle(LUMEN_SCHEME, async (request) => {
    const url = new URL(request.url)
    const relative = url.pathname === '/' ? 'index.html' : url.pathname.slice(1)

    // Recordings live outside dist, so they get their own route. Both are
    // confined to a directory, and neither can reach anywhere else on disk.
    if (relative.startsWith('recordings/')) {
      return serveRecordings(relative.slice('recordings/'.length), request)
    }

    const resolved = path.resolve(path.join(rendererDistRoot, relative))
    if (resolved !== rendererDistRoot && !resolved.startsWith(rendererDistRoot + path.sep)) {
      return new Response('Forbidden', { status: 403 })
    }

    return net.fetch(pathToFileURL(resolved).toString())
  })
}

/** Serve one MP4 from the Library, and nothing else. */
async function serveRecordings(relative: string, request: Request): Promise<Response> {
  const { recordingPath } = await import('../../modules/library/catalog.js')
  // The URL carries the Recording folder only, percent encoded. recordingPath
  // appends the MP4 name itself, so feeding it a full path produced a doubled
  // recording.mp4/recording.mp4 and the player never loaded.
  let folder: string
  try {
    folder = decodeURIComponent(relative)
  } catch {
    return new Response('Forbidden', { status: 403 })
  }
  // recordingPath resolves against the Library root and throws if the result
  // escapes it, so a traversal attempt cannot reach anywhere else on disk.
  let resolved: string
  try {
    resolved = recordingPath(folder)
  } catch {
    return new Response('Forbidden', { status: 403 })
  }
  if (!resolved.endsWith('.mp4')) {
    return new Response('Forbidden', { status: 403 })
  }

  let size: number
  try {
    const info = await stat(resolved)
    if (!info.isFile()) return new Response('Not Found', { status: 404 })
    size = info.size
  } catch {
    return new Response('Not Found', { status: 404 })
  }

  // The player seeks with a Range request. Without one it gets the file from
  // the beginning, cannot jump, and snaps the playhead back. This is the whole
  // reason a long Recording would not seek. See activity-log.md, 2026-11-12.
  const headers = {
    'content-type': 'video/mp4',
    'accept-ranges': 'bytes',
  }

  if (request.method === 'HEAD') {
    return new Response(null, {
      headers: { ...headers, 'content-length': String(size) },
    })
  }

  const range = request.headers.get('range')
  if (range === null) {
    return new Response(streamFile(resolved), {
      headers: { ...headers, 'content-length': String(size) },
    })
  }

  const bounds = parseRange(range, size)
  if (bounds === null) {
    return new Response('Range Not Satisfiable', {
      status: 416,
      headers: { 'content-range': `bytes */${size}` },
    })
  }

  const { start, end } = bounds
  return new Response(streamFile(resolved, start, end), {
    status: 206,
    headers: {
      ...headers,
      'content-length': String(end - start + 1),
      'content-range': `bytes ${start}-${end}/${size}`,
    },
  })
}

/** One range, in bytes. Multi-range requests are not something a player sends. */
function parseRange(
  header: string,
  size: number,
): { start: number; end: number } | null {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim())
  if (match === null) return null

  const [, rawStart = '', rawEnd = ''] = match
  if (rawStart === '' && rawEnd === '') return null

  let start: number
  let end: number
  if (rawStart === '') {
    // bytes=-500 means the last 500 bytes.
    const suffix = Number(rawEnd)
    if (!Number.isSafeInteger(suffix) || suffix <= 0) return null
    start = Math.max(0, size - suffix)
    end = size - 1
  } else {
    start = Number(rawStart)
    end = rawEnd === '' ? size - 1 : Number(rawEnd)
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end)) return null
    if (start >= size || start > end) return null
    end = Math.min(end, size - 1)
  }

  return { start, end }
}

function streamFile(file: string, start?: number, end?: number): ReadableStream {
  const stream =
    start === undefined || end === undefined
      ? createReadStream(file)
      : createReadStream(file, { start, end })
  return Readable.toWeb(stream) as unknown as ReadableStream
}
