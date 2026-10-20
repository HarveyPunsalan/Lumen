/**
 * The only surface between the renderer and the main process.
 *
 * Every handler is registered through trusted(), which rejects any message
 * from a frame that is not our own window. See SECURITY.md, Validate the
 * sender of all IPC messages.
 */

import { ipcMain, type IpcMainInvokeEvent } from 'electron'
import { encodeLumenError, isLumenError } from '../../kernel/index.js'
import { LUMEN_SCHEME } from './protocol.js'

export type Handler = (event: IpcMainInvokeEvent, ...args: unknown[]) => unknown

const DEV_SERVER_ORIGIN = 'http://localhost:5173'

/**
 * Only our own window may talk to the main process.
 *
 * The check is on origin, not URL. about:blank, blob: and sandboxed documents
 * have URLs that do not identify who controls them.
 */
export function isTrustedSender(event: IpcMainInvokeEvent): boolean {
  const url = event.senderFrame?.url
  if (url === undefined) return false
  return url.startsWith(`${LUMEN_SCHEME}://app`) || url.startsWith(DEV_SERVER_ORIGIN)
}

/** Wrap a handler so it refuses to run for an untrusted sender. */
export function trusted(handler: Handler): Handler {
  return async (event, ...args) => {
    if (!isTrustedSender(event)) {
      throw new Error('Rejected IPC from an untrusted frame.')
    }
    try {
      return await handler(event, ...args)
    } catch (cause) {
      // A thrown LumenError is a plain object and gets flattened to
      // "[object Object]" crossing IPC, so it travels packed instead.
      if (isLumenError(cause)) throw new Error(encodeLumenError(cause))
      throw cause
    }
  }
}

/**
 * Register handlers. Called explicitly from main.ts.
 * Importing this file must have no side effects. See architecture.md.
 */
export function registerHandlers(handlers: Readonly<Record<string, Handler>>): void {
  for (const [channel, handler] of Object.entries(handlers)) {
    ipcMain.handle(channel, trusted(handler))
  }
}