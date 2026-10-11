/**
 * Error codes shared across modules. A module reports one of these rather
 * than an ad hoc string, so the renderer can react to a failure without
 * matching on message text.
 */

export const ErrorCode = {
  /** The user has not granted a permission the operation needs. */
  PermissionDenied: 'PERMISSION_DENIED',
  /** A permission was never asked for. Distinct from denied. */
  PermissionNotDetermined: 'PERMISSION_NOT_DETERMINED',
  /** A path resolved outside the Library. */
  PathEscape: 'PATH_ESCAPE',
  /** No Session is in progress but one was required. */
  NoActiveSession: 'NO_ACTIVE_SESSION',
  /** A Session is already in progress. */
  SessionAlreadyActive: 'SESSION_ALREADY_ACTIVE',
  /** ffmpeg exited non-zero or produced no output. */
  ExportFailed: 'EXPORT_FAILED',
  /** The Library could not be decrypted, or failed its authentication tag. */
  CryptoFailure: 'CRYPTO_FAILURE',
  /** Encrypted content was requested while the Library was locked. */
  LibraryLocked: 'LIBRARY_LOCKED',
  /** A function exists as a signature but has no implementation yet. */
  NotImplemented: 'NOT_IMPLEMENTED',
} as const

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode]

export interface LumenError {
  readonly code: ErrorCode
  /** Human readable. Names the problem and the fix. */
  readonly message: string
  /** Optional. The System Settings pane or command that resolves it. */
  readonly remedy?: string
}

export function lumenError(code: ErrorCode, message: string, remedy?: string): LumenError {
  return remedy === undefined ? { code, message } : { code, message, remedy }
}

export function notImplemented(what: string): LumenError {
  return lumenError(ErrorCode.NotImplemented, `${what} is not implemented yet.`)
}