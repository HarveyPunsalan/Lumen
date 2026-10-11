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
    const resolved = path.resolve(path.join(rendererDistRoot, relative))

    // Only files inside dist are reachable. Nothing else on disk.
    if (resolved !== rendererDistRoot && !resolved.startsWith(rendererDistRoot + path.sep)) {
      return new Response('Forbidden', { status: 403 })
    }

    return net.fetch(pathToFileURL(resolved).toString())
  })
}