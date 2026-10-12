/**
 * Every path in Lumen goes through this file. It is the only place `fs` is
 * imported. See library.md and SECURITY.md DA5.
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import { ErrorCode, lumenError } from '../../kernel/index.js'

/** Resolved lazily so `app.getPath` runs after the app is ready. */
let root: string | null = null

export function setLibraryRoot(value: string): void {
  root = path.resolve(value)
}

export function libraryRoot(): string {
  if (root === null) {
    throw lumenError(ErrorCode.PathEscape, 'Library root has not been set.')
  }
  return root
}

export function logsDirectory(): string {
  return path.join(libraryRoot(), 'logs')
}

/**
 * Join a relative path onto the Library and prove the result stayed inside.
 *
 * The comparison is on resolved paths with a separator on the end, so
 * /Movies/LumenEvil does not pass a check written for /Movies/Lumen.
 * A separator on both sides avoids rejecting the root itself.
 */
export function resolveInLibrary(relative: string): string {
  const base = libraryRoot()
  const resolved = path.resolve(base, relative)
  if (resolved !== base && !resolved.startsWith(base + path.sep)) {
    throw lumenError(
      ErrorCode.PathEscape,
      `Refusing to touch a path outside the Library: ${relative}`,
    )
  }
  return resolved
}

/** Same check, for a path that already claims to be absolute. */
export function assertInsideLibrary(target: string): string {
  const base = libraryRoot()
  const resolved = path.resolve(target)
  if (resolved !== base && !resolved.startsWith(base + path.sep)) {
    throw lumenError(ErrorCode.PathEscape, 'Refusing to touch a path outside the Library.')
  }
  return resolved
}

export async function ensureLibrary(): Promise<string> {
  const base = libraryRoot()
  await fs.mkdir(path.join(base, 'logs'), { recursive: true })
  return base
}

/** Create a folder for one Session under the Library. */
export async function ensureSessionFolder(name: string): Promise<string> {
  const folder = resolveInLibrary(name)
  await fs.mkdir(folder, { recursive: true })
  return folder
}

/**
 * Write a file inside the Library.
 * Everything goes through here so nothing bypasses the confinement check.
 */
export async function writeFileInLibrary(relative: string, contents: Uint8Array): Promise<string> {
  const target = resolveInLibrary(relative)
  await fs.writeFile(target, contents)
  return target
}

export async function readFileInLibrary(relative: string): Promise<Uint8Array> {
  return new Uint8Array(await fs.readFile(resolveInLibrary(relative)))
}

/**
 * Append to a file inside the Library.
 *
 * Recorder chunks accumulate into one Segment file, so this appends rather
 * than overwrites. One chunk is lost at most if the app dies mid-Segment.
 */
export async function appendFileInLibrary(relative: string, bytes: Uint8Array): Promise<void> {
  await fs.appendFile(resolveInLibrary(relative), bytes)
}

/**
 * Delete a file. Delete means delete.
 *
 * No trash folder. A "safe" recycle bin inside the Library is a directory
 * that grows forever on an 8GB drive. See library.md, Deletion.
 */
export async function deleteInLibrary(relative: string): Promise<void> {
  await fs.rm(resolveInLibrary(relative), { force: true })
}

/** Absolute path to something inside the Library, relative to its root. */
export function relativeInLibrary(target: string): string {
  return path.relative(libraryRoot(), assertInsideLibrary(target))
}