# React

Read this before writing anything in the renderer.

How a screen looks is `design.md`. This file is how the React works.

## The bridge

The renderer talks to the main process only through `window.lumen`, defined in
`preload.ts`.

No `ipcRenderer`. No `require`. No direct imports from `modules/`. If a screen
needs a new capability, add it to the preload surface deliberately. Never widen
the bridge by exposing Electron APIs.

## Components

One component per file. Named after what it renders, using CONTEXT.md words.

```
features/capture/
  SourcePicker.tsx
  RegionSelector.tsx
features/session/
  RecordingControls.tsx
  RecBadge.tsx
features/library/
  RecordingList.tsx
  RecordingPlayer.tsx
```

A component that renders layout and data has no state. State lives at the
lowest level that needs it, and only lifts when two siblings genuinely share
it.

Do not put application state in a context provider "for now". Most state here
belongs in one screen. Add a store when two screens need the same thing, not
before.

## State

`useState` for local. `useReducer` when transitions have more than two
branches. No global store library in v1.

Recording state is the one exception worth thinking about. It is not local UI
state, it is the recorder's state, and it outlives the screen that started it.
Model it once, clearly, rather than scattering booleans across components.

## Styling

Tailwind only. No CSS modules, no styled-components, no inline style objects
for anything a utility class covers.

Inline styles are for values computed at runtime, such as a crop rectangle's
position. Everything else is a class.

No emoji in the interface.

## Effects

An effect that synchronises with something outside React, such as a
`MediaRecorder` or an IPC subscription, returns its cleanup. Every time.

An effect that derives state from props or other state is usually the wrong
tool. Compute it during render.

Do not put a network call in an effect. There is no network.

## Naming

Components and files use PascalCase. Hooks and functions use camelCase. CSS
classes follow whatever Tailwind utility produces, so mostly nothing to name.

Words come from CONTEXT.md. A component called `VideoItem` is wrong. A
component called `RecordingList` is right.
