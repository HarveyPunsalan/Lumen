/**
 * A Result that carries failure as a value instead of an exception.
 *
 * Module boundaries in this codebase return Result rather than throwing, so a
 * caller cannot forget to handle a failure. Throwing is still allowed at the
 * boundary between a module and the outside world.
 */

export interface Ok<T> {
  readonly ok: true
  readonly value: T
}

export interface Err<E> {
  readonly ok: false
  readonly error: E
}

export type Result<T, E = string> = Ok<T> | Err<E>

export function ok<T>(value: T): Ok<T> {
  return { ok: true, value }
}

export function err<E>(error: E): Err<E> {
  return { ok: false, error }
}

export function isOk<T, E>(result: Result<T, E>): result is Ok<T> {
  return result.ok
}

export function isErr<T, E>(result: Result<T, E>): result is Err<E> {
  return !result.ok
}

/** Unwrap an Ok, or throw with the error rendered as a message. */
export function unwrap<T, E>(result: Result<T, E>): T {
  if (result.ok) return result.value
  throw new Error(typeof result.error === 'string' ? result.error : JSON.stringify(result.error))
}

/** Transform the success value, leaving a failure untouched. */
export function map<T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> {
  return result.ok ? ok(fn(result.value)) : result
}