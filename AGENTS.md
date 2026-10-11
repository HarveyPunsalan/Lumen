# AGENTS.md

Guidance for AI agents working in this repo. Solo dev, optimise for velocity
and my own future context, not team coordination.

## What Lumen is

A screen recorder that captures only what the user chooses to show. macOS and
Windows. No server, no accounts, nothing uploaded.

## Commands

No scripts exist yet. These arrive with the Electron scaffold.

- Install: `npm install`
- Dev: `npm run dev`
- Typecheck: `npm run typecheck`
- Build: `npm run build`
- Package macOS: `npm run package:mac`
- Package Windows: `npm run package:win`
- Audit shipped code: `npm run audit`

Always run typecheck and build before saying a task is done.

`npm audit` flags dev dependencies, mostly Tailwind and electron-builder. Those
never ship. `npm run audit` checks production only, and the answer is zero.

No tests until after v1. Do not add a test framework or any test file without
asking.

## Rules

Read the file that matches what you are doing. Do not read all of them.

- `.agents/rules/architecture.md` - before creating or moving a file, and
  before adding an import between modules
- `.agents/rules/system-design.md` - before changing how capture, recording or
  export fit together
- `.agents/rules/security.md` - before touching the main process, IPC, the
  filesystem, or anything that runs a command
- `.agents/rules/export.md` - before touching ffmpeg or the Export pipeline
- `.agents/rules/library.md` - before touching the Library, encryption, or
  deleting anything
- `.agents/rules/react.md` - before writing anything in the renderer
- `.agents/rules/design.md` - before building or changing any screen
- `.agents/rules/autonomy.md` - before deciding whether to ask or act
- `.agents/rules/git.md` - before committing
- `.agents/rules/style.md` - before writing any code at all

## Vocabulary

Defined in `CONTEXT.md`. Read it before naming anything.

Recording, Session, Segment, Source, Display, Window, Target, Isolate, Region,
Full Screen, Frame, Trim, Export, Library, Lock.

Every term has an avoid list. Use the CONTEXT.md word, not a synonym.
"Blur the rest", "system audio" and "sharing link" were cut on purpose. Do not
bring them back in code or in conversation.

## Three rules that override everything else

Never launch the app, take a screenshot, or run anything that captures the
screen without asking me first. Not to check your own work. Not to verify a
build. This is the rule Lumen exists to honour, so breaking it here is worse
than breaking it anywhere.

Do not do work I did not ask for. No scaffolding for hypothetical needs, no
refactoring outside the task, no installing packages to get ahead.

Say what you are about to do before you write code, install a package, or run
anything. One line is enough. It does not need permission, only notice.
Otherwise follow `.agents/rules/autonomy.md`, which is the default for
everything else: act, then explain.