# Lumen

A screen recorder that records only what you choose to show. macOS and
Windows. Free, no account, nothing uploaded.

## Why it exists

Loom puts window selection behind a paid plan. When you present, you need your
slides visible and your notes hidden from the audience, and that specific
combination costs money after the trial ends.

Lumen does that, and it does not cost anything.

## What it does

- Record a single window, so nothing else appears in the file at all
- Record the full screen, or a region you drag
- Switch between windows while recording, without stopping
- Put your camera in a corner with the room behind you blurred, or sharp, or
  turned off
- Trim the dead air off the start and end
- Export MP4 that any school or team will accept

## Install

Download the build for your system from the Releases page, then:

**macOS.** Open the `.dmg` and drag Lumen to Applications. macOS will warn you
the first time that the app is from an unidentified developer. Click "More
Info", then "Open". It only asks once.

**Windows.** Download the `.exe` and run it. Windows will show "Windows
protected your PC". Click "More info", then "Run anyway".

On first launch you will be asked for two permissions:

- **Screen Recording**, so Lumen can capture what you point it at
- **Microphone**, so your narration is included

Both are requested by macOS itself. If you deny them, Lumen will tell you
rather than recording a blank desktop.

## Where your recordings go

`~/Movies/Lumen/`. That is the only folder Lumen writes to. Nothing is
uploaded, and there is no account.

Recordings are encrypted on disk. You unlock the library with a password when
you open the app, and you can still record while it is locked. Playback and
export ask you to unlock first.

## What it does not do

- No system audio. Microphone only, for now.
- No timeline editor. Trim sets a start and an end, nothing more.
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
