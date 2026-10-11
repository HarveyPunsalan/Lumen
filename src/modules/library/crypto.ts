/**
 * Library encryption. Argon2id derives the key, AES-256-GCM encrypts.
 *
 * See library.md and SECURITY.md DA3, DA4.
 *
 * The derived key is held in memory for the lifetime of the process and is
 * never written to disk, never logged, and never included in an error.
 */

export interface LockState {
  readonly locked: boolean
}

export interface EncryptedEnvelope {
  /** base64 */
  readonly ciphertext: string
  /** base64, unique per file */
  readonly nonce: string
  /** base64, unique per Library */
  readonly salt: string
  readonly algorithm: 'argon2id+aes-256-gcm'
}

/** In memory only. Never serialised. */
let derivedKey: Uint8Array | null = null

/**
 * Derive the key from the password. Asked once per launch, not per Recording.
 * Recording has to keep working while the Library is Locked.
 */
export async function unlock(_password: string): Promise<LockState> {
  throw new Error('unlock is not implemented yet.')
}

/** Drop the key. The Library cannot be read or exported afterwards. */
export function lock(): LockState {
  throw new Error('lock is not implemented yet.')
}

export function isLocked(): boolean {
  return derivedKey === null
}

export async function encrypt(_plaintext: Uint8Array): Promise<EncryptedEnvelope> {
  throw new Error('encrypt is not implemented yet.')
}

/**
 * Decrypt an envelope.
 * A failed GCM tag means the content is corrupt or was tampered with. Report
 * it, do not decrypt it. See library.md, Encryption.
 */
export async function decrypt(_envelope: EncryptedEnvelope): Promise<Uint8Array> {
  throw new Error('decrypt is not implemented yet.')
}