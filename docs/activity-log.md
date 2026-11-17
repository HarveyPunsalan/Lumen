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

## 2026-10-14

Window recording still never started: `getUserMedia` never settled. The cause
was a type-level lie. The renderer passed a `desktopCapturer` source id where
Electron's display-media handler expected a Source object, and a cast hid the
mismatch from the compiler. Main now resolves the id to a Source and hands the
handler the whole object.

## 2026-10-15

The REC clock kept climbing after Stop because Export re-rendered the screen
and restarted the capture effect. Stop now freezes the clock through a ref,
and the player fits the window instead of making the user scroll. The duplicate
captures that re-render used to leave running are gone.

## 2026-10-16

The Region outline is stitched from the drag corners and the selection has
resize grips, so the rectangle can be adjusted before recording instead of
being dragged again from scratch.

## 2026-10-18

Moved the Session runtime to `app/session-runtime.ts` and shrank
`display-media.ts` to the Electron handler, so the composition root owns the
wiring. React StrictMode's extra mount was leaving a capture running after its
component was gone; disposal now stops the stream and drops chunks after
unmount. Region drag no longer drifts away from the pointer.

## 2026-10-19 and 2026-10-20

Window picking was the week. `getSources` returns whatever finished inside
Electron's three second budget, so every ask is a different subset. The Apple
system picker was removed after it recorded Lumen itself, and a zero-size
thumbnail returns only Lumen, so window photos stay at 1280x720. The picker
now asks three more times, 3.5 seconds apart, and merges sightings by title
into a directory, so the grid fills and the clicked window stays resolvable.

The save failure was not capture. Segments on disk held megabytes while
`finish()` rejected them as empty: the size check ran before MediaRecorder
delivered its final chunk, and chunk appends could race out of order and leave
a WebM with no header. Writes are serialized, Stop awaits the final chunk, and
Export writes `recording.partial.mp4` before renaming it. ffmpeg progress is
parsed from `-progress pipe:2 -nostats` instead of a bar stuck at 0%.

Electron 44.9.1 was audited and carried no capture fixes, so the dependency
stayed at 44.7.0.

Verified with a 12 second window recording: 4.5 MB Segment, playable MP4.
Unresolved: Stop feels heavy, playback is slightly choppy at 30 fps, Region
still records its own live preview, and three `[seg]` diagnostic logs were
committed by mistake.

## 2026-11-01

Region recording was extended from a Display to a Window, and the crop was
made resolution-independent. The rectangle is stored as fractions of the
Target's frame and resolved once the captured frame reports its size, so a
Retina Display and a Window resized mid-Session both crop correctly.

The Region picker refreshes the Display photo when it opens. The old photo was
from app launch, so the box could be drawn on a stale image and record a
different area. A Region inside a Window now uses the Selected Window flow
rather than a separate mode.

The cropper owns an offscreen video element and draws on a timer, so a covered
window does not pause the crop. Stop keeps capturing for one second after the
click so the result of the click reaches the encoder. A dispose during the
first-frame wait releases the stream instead of leaving it recording.

Unresolved: Stop feels heavy, playback is choppy at 30 fps, and the Region
preview may still appear in its own Recording. This entry was written on
2026-11-12; the session itself did not update the log.

## 2026-11-12

Reconciled the documents before starting the next feature. ADR 0004 now names
the Region and the Frame's background blur as the two effects applied during
capture; Trim and the Frame's corner remain Export choices. The architecture
rules, export guide, and system design diagram match the code again.

The readme no longer claims encryption or release builds that do not exist. It
separates what works today from what is planned. The security checklist marks
the controls that are in place and leaves the unbuilt ones open.

The verification pass is open: Delete, seeking, Region isolation when switching
apps, and a force quit. Results are in the 2026-11-15 entry.

## 2026-11-15

The verification pass ran. Delete passed: the entry disappeared, the folder was
gone, and a relaunch did not bring it back. Window Region isolation passed for
content: a VSCode window covering the Target did not appear in the file. The
Display Region preview check and the force-quit check are still open.

Two defects came out of the pass, and both are fixed.

**Seeking.** Dragging the playhead to 0:30 sent it back to where it was. The
player was asking for the bytes from 0:30 onward, which is how every player
seeks, but the `lumen://` recordings route ignored the Range header and sent
the file from the beginning. The route now answers a single byte range with
`206 Partial Content`, `Content-Range`, `Accept-Ranges: bytes`, and a streamed
slice from disk. Verified with a Recording longer than two minutes: the player
jumps to the middle and near the end and keeps playing.

Interview note: a video route that ignores Range is the difference between a
video that plays and a video that can be scrubbed. The player was already
asking correctly; the server was the broken half.

**Cursor.** A Window Region Recording contained the pointer even while it was
moving over another app that covered the Target. The captured pixels were still
only the Target's; macOS's capture layer draws the pointer into the stream by
default. Electron exposes no cursor option on the display media handler. The
recorder now asks the capture track for `cursor: 'never'` with
`applyConstraints`, wrapped so a rejection cannot fail the Segment. Verified:
the pointer is absent when it moves over a covering app inside the Region.

Interview note: the pointer is an OS overlay, not part of the window's content,
so it has to be controlled at the capture layer rather than cropped out later.
The cheap fix worked, but it depends on the capture engine honouring the
constraint; if a future Electron drops it, the pointer returns.

**Save lost on navigation.** While a 20 second Recording was Saving at 65%, the
user switched to the Library. The Record screen was unmounted, taking the
progress bar and the completion message with it. The Library only lists a
folder with a finished `recording.mp4`, so the interrupted
`recording.partial.mp4` was invisible and looked deleted. The raw
`part-002.webm` and the partial MP4 were both on disk; the partial decoded as
17.39 seconds. This was a bug in who owns the Save, not data loss.

The fix keeps both screens mounted, with the inactive one hidden. The Save now
lives in the app shell: a `Saving n%` bar sits in the top bar and survives a
screen switch. The Library reloads when it is shown and when a Save finishes,
and closes its player when hidden. `finish()` now deletes only the Segments its
own Export used, so a new Session cannot have its files removed by an older
Export still running. The percentage itself was always ffmpeg's real processed
time; the denominator is the REC clock, so the number can be approximate.
Verified against the reported case: a 20 second Recording was left at 65% while
the user switched to the Library, the bar kept running in the top bar, and the
Recording appeared in the Library when the Save finished, with no restart.

Interview note: a long-running task must not be owned by the screen that
started it. Navigation is not a cancel button, but if the task's state lives in
the component, the user cannot tell the difference.

Not fixed here: a Save that is interrupted by quitting the app still leaves
`recording.partial.mp4` and no Library entry. Recovery on the next launch,
including a `meta.json`, is part of the trust layer.

## 2026-11-16

**The recorder captured itself.** The last unchecked Region claim was whether a
Display Region Recording contains Lumen's own live preview. It does. The Region
was drawn over Lumen's window, the window shows a live picture of what it is
capturing, and the file came back as a mirror: Lumen inside Lumen, no end. The
check failed on the first run. The raw Segment was also heavy and laggy at that
resolution, but that part is normal for a 3072x1334 capture encoded at CRF 23.

The fix is not a hidden preview panel. macOS can mark a window as not shareable,
which keeps it out of every capture at the OS level, Lumen's own included.
`setContentProtection(true)` turns that on when a Session begins, and `finish()`
turns it off in a `finally` so a failed Export cannot leave the app invisible for
good. The preview stays live on screen and the Recording holds whatever was
behind the window. Verified on macOS 27.2.1: the window is absent from the file
and the area it covered shows the content underneath.

Interview note: the first fix you reach for is usually the one that hides the
symptom. Blanking the panel would have stopped the mirror while keeping Lumen in
the file and taking the preview away from the user. Asking the OS to exclude the
window keeps the promise that the file holds only the Target, and costs one
call. Check the platform capability before writing a UI workaround.

Side effect worth knowing: protection applies to every capture app, so while a
Session runs Lumen is also missing from screenshots and screen shares. It stops
when the Save does.

Still open: the force-quit diagnostic. That one is information, not a gate.

## 2026-11-17

**No voice.** Every Recording was silent, and there was no microphone path at
all. The capture was asked for with `audio: false`, the recorder's mime type
named only the video codec, and Export's AAC encoder had nothing to encode.
Three separate holes, any one of which would have kept the file silent.

Narration is a switch above Start, off until it is turned on, and remembered
between launches, because nothing should be recorded unless it was chosen. The
microphone is asked for while the Session opens rather than on the first frame,
so a slow permission prompt cannot land on top of the picture. Its track is
joined onto whatever is being encoded, which matters in Region mode, where the
picture comes from a canvas that has no audio of its own. It is released on
Stop and on every failure path, so the system indicator stops. The mime type
gains Opus for a whole Session or none of it, because Segments only join when
they were encoded identically.

Verified on 2026-11-17: Full Screen, Selected Window and Region all carry the
voice, and with the switch off the Recording stays silent.

Interview note: this looked like one missing feature and was three separate
bugs. The capture asked for no audio, the recorder's codec string had no audio
codec, and the export had no audio to work with. Fixing only one of them would
have produced a file that played perfectly and stayed quiet.

Still open: the Narration control is a checkbox and should be a switch before
v1. The default input is used, with no device picker. System audio stays out of
scope for v1.
