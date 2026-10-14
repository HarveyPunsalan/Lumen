/**
 * The custom protocol that serves the renderer.
 *
 * file:// grants read access to the whole disk, so the renderer is served
 * from lumen:// instead, restricted to the built assets. See SECURITY.md DA6.
 */

import { protocol, net } from 'electron'
import path from 'node:path'
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
      return serveRecordings(relative.slice('recordings/'.length))
    }

    const resolved = path.resolve(path.join(rendererDistRoot, relative))
    if (resolved !== rendererDistRoot && !resolved.startsWith(rendererDistRoot + path.sep)) {
      return new Response('Forbidden', { status: 403 })
    }

    return net.fetch(pathToFileURL(resolved).toString())
  })
}

/** Serve one MP4 from the Library, and nothing else. */
async function serveRecordings(relative: string): Promise<Response> {
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
  return net.fetch(pathToFileURL(resolved).toString())
}