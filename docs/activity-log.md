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