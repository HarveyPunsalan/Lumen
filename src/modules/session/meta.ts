/**
 * Reading and writing meta.json. The file records what a Session folder
 * contains so the Library can list it after a restart, and so a crashed
 * Session can be recovered.
 */

import type { SessionInfo } from './session.js'

export async function writeSessionInfo(_folder: string, _info: SessionInfo): Promise<void> {
  throw new Error('writeSessionInfo is not implemented yet.')
}

export async function readSessionInfo(_folder: string): Promise<SessionInfo | null> {
  throw new Error('readSessionInfo is not implemented yet.')
}

/** Every folder under the Library root that holds a meta.json. */
export async function listSessionFolders(_libraryRoot: string): Promise<string[]> {
  throw new Error('listSessionFolders is not implemented yet.')
}