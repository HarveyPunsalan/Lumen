# Library

Read this before touching the Library, encryption, or deleting anything.

## What the Library is

`~/Movies/Lumen/`. Each Session is a dated folder containing `meta.json` and
the exported MP4.

It is the only place Lumen writes. There is no second location, no temp
directory elsewhere, no app support folder.

## Paths

Every path goes through `library/paths.ts`. `fs` is not imported anywhere else
in the codebase.

```
resolveInLibrary(relative)  ->  absolute path inside the Library root
assertInsideLibrary(target) ->  throws if the resolved path escapes
```

Resolve before checking. `path.join(root, userInput)` does not remove `..`.
Compare the resolved path against the resolved root with a separator on the
end, so `/Movies/LumenEvil` does not pass a check written for
`/Movies/Lumen`.

## Deletion

Delete means delete. The file is removed. Do not move it to a trash folder, do
not rename it, do not overwrite it with an empty file.

The user has a small disk. A "safe" recycle bin inside the Library is a
directory that grows forever, and it contradicts the promise that the Library
only holds what the user chose to keep.

## Encryption

Argon2id derives the key. AES-256-GCM encrypts.

- Unique salt per Library, stored alongside the Library.
- Unique nonce per file. Never reuse a nonce with the same key.
- The derived key is held in memory for the process lifetime. Never written to
  disk, never logged, never included in an error message.
- Authenticate on read. A file that fails the GCM tag check is corrupt or
  tampered with. Report it, do not decrypt it.

The password is asked once at launch, not per Recording.

## Lock

Lock is a state where the Library's contents cannot be read or exported.

**Recording works while Locked.** Only playback and Export need the password.
Someone recording a two hour practice session must not be interrupted by a
prompt, and a user who records then walks away must not have an hour of work
locked behind a field they forgot.

Do not add a lock to the recording path. If Lock ever blocks capture, that is a
regression.

## Size

The Library shows total size. A user recording one to two hours a day fills an
8GB drive in a few weeks, and they need to see that number to decide what to
remove.

## Camera footage

`cam.webm` is temporary. Delete it after Export unless the user explicitly kept
the camera. Default to discarding.

A user who turned the camera off has nothing to delete, and a user who turned
it on and then exported without blur may not want their room footage on disk at
all.
