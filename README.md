# Lumen

A screen recorder that records only what you choose to show. macOS today;
Windows planned. Free, no account, nothing uploaded.

## Status

Early build. The core recorder works on macOS: Isolate a Window, Full Screen,
or a Region inside a Display. A Session Exports to one MP4 in the Library, and
the Library lists and plays it.

Not ready yet: encryption and Lock, the Frame, Trim, microphone narration,
switching Target mid-Session, Region inside a Window (implemented, not yet
verified), Windows testing, and release builds. Build from source for now.

## Why it exists

Loom puts window selection behind a paid plan. When you present, you need your
slides visible and your notes hidden from the audience, and that specific
combination costs money after the trial ends.

Lumen does that, and it does not cost anything.

## What it does

Works today:

- Record a single Window, so nothing else appears in the file at all
- Record a full Display, or a Region you drag
- Export an MP4 that a school or team will accept
- List and play Recordings in the Library
- Delete a Recording (implemented, not yet verified)

Planned:

- Region inside a Window (implemented, not yet verified)
- Switch between Windows while recording, without stopping
- Put your camera in a corner with the room behind you blurred, or sharp, or
  turned off
- Trim the dead air off the start and end
- Microphone narration
- Encryption and Lock
- Windows support and release builds

## Build from source

There is no release build yet. From the repository:

```bash
npm install
npm run dev
```

`npm run package` builds an installer when that path is ready.

On first launch, macOS asks for Screen Recording permission, so Lumen can
capture what you point it at. If you deny it, Lumen says so rather than
recording a blank desktop. Microphone permission is not requested yet.

## Where your recordings go

`~/Movies/Lumen/`. That is the only folder Lumen writes to. Nothing is
uploaded, and there is no account.

Recordings are not encrypted yet. Until Lock and encryption land, the files
are readable by anything running as you. See [SECURITY.md](./SECURITY.md) for
the plan.

## What it does not do

- No system audio, and no microphone yet.
- No timeline editor. Trim, when it lands, sets a start and an end, nothing
  more.
- No sharing links or cloud sync.
- No accounts.

## For developers

What the product is and must be lives in [PRD.md](./PRD.md). Architecture and
decisions live in [CONTEXT.md](./CONTEXT.md) and [docs/adr/](./docs/adr/).
Security controls are in [SECURITY.md](./SECURITY.md).

Built with Electron, React, TypeScript, and ffmpeg. Licensed MIT.

### Running locally

```bash
npm install
npm run dev
```

### Releasing

```bash
npm run build
npm run package
```

No release has been published yet.
