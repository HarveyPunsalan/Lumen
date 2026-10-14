# Activity log

Short dated entries per session. What changed, why, anything unresolved. This
is for memory across sessions, not a team artifact.

## 2026-10-10

Scaffolded the Electron project as a modular monolith: `kernel`, five domain
modules (`capture`, `session`, `frame`, `export`, `library`), `platform` for the
Electron and React edges, and `app/container.ts` as the composition root.

Decisions worth remembering:

- TypeScript 7.0.2. React and plain Node, so no dependency on the programmatic
  compiler API that 7.0 does not ship yet.
- Tailwind 4 with the Vite plugin, CSS-first config, no `tailwind.config.js`.
- Modules split per process, so `capture/main` and `capture/renderer` cannot be
  confused at a glance.
- Main process uses NodeNext and needs explicit `.js` on relative imports.

Written as real code, not stubs, because they are the Week 1 security gate:
`window.ts`, `protocol.ts`, `ipc.ts`, `library/paths.ts`, `app/container.ts`.

Unresolved: everything is a stub except those five. No capture, no recording,
no export, no encryption.

## 2026-10-11

Ran `npm install` (335 packages) and made the scaffold build.

Errors found and fixed, 28 of them across two causes:

- One real bug. `frame/processor.ts` referenced `FrameBackground` without
  importing it, which would have broken the build.
- The rest were `noUnusedParameters` firing on stub functions whose bodies
  never read their arguments. Fixed by prefixing those parameters with `_`,
  which is TypeScript's own convention for deliberately unused parameters.

Found a gap that was not a type error: `package.json` pointed `main` at
`dist-electron/`, but the build script only compiled the renderer, so the main
process was never emitted and Electron would have had no entry point. Added a
`build:main` step and set `rootDir` in `tsconfig.main.json`, which TypeScript 7
now requires.

Verified: `npm run typecheck` clean on both tsconfigs, `npm run build` produces
both `dist/` and `dist-electron/`, `rendererDistRoot` resolves to `dist` from
its real depth, and `npm run audit` reports 0 vulnerabilities in production
dependencies. The 8 moderate warnings are all in Tailwind and electron-builder,
which never ship.

Still not done: `getPermissions` and `listSources` are stubs, so launching the
app today would show an empty window and the first IPC call would throw. The
Week 1 gate is the next task.

## 2026-10-13

Got a real Recording onto disk for the first time, then added the three capture
modes. Three failures worth remembering, because none of them were visible in a
passing build.

- **CSP only broke in dev.** `script-src 'self'` blocks the inline script Vite
  injects for React Fast Refresh, so React never booted and the window was
  black with no error. Production has no inline script, so the strict CSP was
  always correct for the shipped app. Fixed with a per-mode CSP that loosens
  only in development.
- **The preload was ESM.** A sandboxed renderer cannot load an ES module
  preload and it fails silently, so `window.lumen` was never defined and the
  app was black. Renamed to `preload.cts` with its own tsconfig emitting
  CommonJS.
- **A shape mismatch that threw every second.** `segmentPath()` returned a
  bare string, the renderer destructured `{ relativePath }` from it, and every
  chunk write threw `paths[1] must be of type string`. One line. Errors now
  render in the UI instead of only reaching the console, because a silent
  failure cost most of a session.

Two things I said that turned out wrong, worth recording so it does not
repeat: I reported the recorder as working because typecheck and build passed,
and neither test proves a video stream starts. I also claimed window selection
was unbuilt without reading the file. The lesson is that a green build is
necessary and not sufficient, and that "it is unbuilt" is a claim that needs
reading before it is said.

Architecture change today: a Region is applied live, during capture, not at
Export. Everything else is an Export step because it can be changed
afterwards. A Region cannot, because if the crop ran at Export, whatever was
inside the rectangle at any moment during the Session would end up in the
Recording, which is exactly what a user is trying to prevent. ADR 0004 still
holds for the Frame. See `region-cropper.ts`.

Not yet verified: whether the live Region actually keeps content out of the
Recording when the user alt-tabs. That needs a manual test with two windows
side by side, and it is the whole point of the feature.