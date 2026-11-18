# Lumen

A screen recorder that records only what you choose to show. macOS today;
Windows planned. Free, no account, nothing uploaded.

## Status

Early build. The core recorder works on macOS: Isolate a Window, Full Screen,
or a Region inside a Display. A Session Exports to one MP4 in the Library, and
the Library lists and plays it.

Not ready yet: encryption and Lock, Trim, switching Target
mid-Session, Windows testing, and release builds. Build from source for now.

## Why it exists

Loom puts window selection behind a paid plan. When you present, you need your
slides visible and your notes hidden from the audience, and that specific
combination costs money after the trial ends.

Lumen does that, and it does not cost anything.

## What it does

Works today:

- Record a single Window, so nothing else appears in the file at all
- Record a full Display, or a Region you drag
- Narrate with your microphone, if you turn Narration on
- Put your camera in a circle in any corner (implemented, not yet verified)
- Export an MP4 that a school or team will accept
- List and play Recordings in the Library
- Delete a Recording
- Record a Region inside a Window

Planned:

- Switch between Windows while recording, without stopping
- Blur the Frame's background (needs a person-segmentation processor)
- Trim the dead air off the start and end
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
recording a blank desktop. Microphone access is asked for the first time you
turn Narration on, and Camera access the first time you turn the Frame on.

## Where your recordings go

`~/Movies/Lumen/`. That is the only folder Lumen writes to. Nothing is
uploaded, and there is no account.

Recordings are not encrypted yet. Until Lock and encryption land, the files
are readable by anything running as you. See [SECURITY.md](./SECURITY.md) for
the plan.

## What it does not do

- No system audio.
- No timeline editor. Trim, when it lands, sets a start and an end, nothing
  more.
- No sharing links or cloud sync.
- No accounts.

## For developers

What the product is and must be lives in [PRD.md](./PRD.md). Architecture and
decisions live in [CONTEXT.md](./CONTEXT.md) and [docs/adr/](./docs/adr/).
Security controls are in [SECURITY.md](./SECURITY.md).

Built with Electron, React, TypeScript, and ffmpeg.

Lumen is free to use, including for paid work. Don't sell it. The full terms
are in [LICENSE](./LICENSE).

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
