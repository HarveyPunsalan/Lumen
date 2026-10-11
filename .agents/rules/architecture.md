# Architecture

Read this before creating or moving a file, and before adding an import between
modules.

## Layout

```
src/
├── kernel/          imports nothing. Result, ids, errors.
├── modules/         the domain. one folder per CONTEXT.md concept.
├── platform/        Electron and React. knows nothing about the domain.
│   ├── main/        bootstrap, window, protocol, ipc, preload
│   └── renderer/    react entry and features
└── app/             composition root. the only place modules meet.
```

Build output is `dist/` for the renderer and `dist-electron/` for the main
process. Neither is committed.

## The dependency rule

> A module imports from `kernel` and from its own folder. Nothing else.
> Modules never import each other. `app/container.ts` is the only place they
> are wired together.

This is the whole architecture. If a module needs something from another
module, either that need is wrong, or the code belongs in the module that
owns the thing.

## Modules

| Module | Owns |
|---|---|
| `capture` | Source, Target, Region, Display, Window. Permission checks. The `MediaRecorder`. |
| `session` | Session lifecycle, Segment files, `meta.json`. |
| `frame` | The camera track, corner placement, background treatment. |
| `export` | ffmpeg. Concat, crop, overlay, trim, encode. |
| `library` | Paths, encryption, listing, deletion, size. |
| `platform/main` | Electron wiring. Registers IPC handlers that call module functions. |
| `platform/renderer` | UI. Calls the preload API. Never imports a module directly. |

## Rules

**No module-level mutable state.** A module that needs state takes it as a
constructor argument. A module-level `let` means the thing cannot be tested
without launching Electron, and it means two instances cannot exist.

**Handlers register explicitly, never on import.** Importing a file must not
have side effects. `registerCaptureHandlers(ipcMain)` is called from the
bootstrap, not fired by being imported.

**`platform/` knows the domain only as types.** It may import a module's
public type. It may not reach into a module's internals.

**The renderer talks to the main process only through the preload API.** No
`ipcRenderer`, no `require`, no direct module imports. The preload surface is
narrow and typed. If the renderer needs a new capability, add it to preload,
do not widen the bridge.

## Segments

A Session writes many Segment files, not one. See ADR 0002.

`MediaRecorder.start()` takes a timeslice argument. It is not optional.
Without it the recorder holds every frame in memory until stopped, which means
a two hour practice session exhausts RAM and a crash loses the entire
Recording. With it, one second is lost.

Switching Target mid Session means stopping one recorder and starting another.
That is why Segments exist. A hotkey begins a new Segment. It does not do
anything clever.

Segments are deleted after Export succeeds.

## Effects happen at Export

Cropping, Trim, and the Frame's corner are applied when the Session becomes a
Recording, not while recording. ADR 0004.

This is why the camera video is a separate file rather than merged into the
recording stream. The user can record once and export it more than one way.

Blurring the Frame's background is the exception. Segmentation must run per
frame during recording. It lives behind one interface in `frame/processor.ts`
so it can be swapped for a different implementation or removed entirely
without touching anything else. If either implementation leaks into another
module, that interface is broken.

## No server

No database, no API layer, no cache, no queue, no load balancer. One process on
one machine. ADR 0001.

If a change seems to need any of those, it needs a new ADR, not a new
directory.
