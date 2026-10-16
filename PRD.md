# Lumen, product requirements

What Lumen is, who it is for, what it must do, and what it must never do. The
vocabulary is defined in [CONTEXT.md](./CONTEXT.md) and is used exactly as
defined there. Decisions of record live in [docs/adr/](./docs/adr/) and are
referenced rather than restated. Session history lives in
[docs/activity-log.md](./docs/activity-log.md).

## The problem

Someone presenting needs their slides in the file and their notes out of it.

That is the whole problem, and it has a commercial shape. Loom puts Window
capture behind a paid plan. A student or a small team who wants a clean file of
one window rather than a whole desktop pays for it after the trial ends. The
alternative is not a free tool that does the same thing, it is a worse file.

The available workarounds all fail in the same way. Record a whole Display and
blur everything else, which leaves the hidden content in the file, repainted
rather than removed. Record a whole Display and crop later, which requires a
video editor and produces a file the size of the desktop rather than the size
of the subject. Screenshot and stitch, which loses the live quality of the
recording. Use a paid tool, which is what we are trying to avoid.

There is a second problem underneath the first. A screen recorder reads
everything on the screen: passwords, two factor codes, banking tabs, private
messages. Most tools treat that as a feature. Lumen treats it as the thing
that has to be right.

## Who it is for

One person, one machine, no account.

Students recording coursework and presentations. Small teams recording a demo
or a walkthrough. Anyone whose notes, notifications, or other windows must not
appear in the file.

Not a team product. Not a service. There is no seat, no invite, no
organisation, and no login.

## What it does

Lumen records a Session from press to stop, and turns it into one MP4 at
Export.

**Isolate** one Window, so that nothing else appears in the file. Other
applications are not blurred or dimmed, they are absent. A Window is captured
even when something is drawn on top of it.

**Full Screen**, an entire Display with no crop.

**Region**, a rectangle inside a Display, defined by dragging. Produces a
Display Recording cropped to that rectangle, with no black padding and nothing
outside it.

**Frame**, the camera image placed in a Recording. Off, or in any of four
corners, with the room behind it blurred or sharp.

**Trim**, removing seconds from the start or the end of a Recording.

**Export**, turning a finished Session into a playable MP4. H.264, `yuv420p`,
front-loaded index. A file that a school, a team, or a Windows machine will
open without complaint.

Switching between Windows and Regions mid-Session is expected and does not
stop the Recording.

## What it must never do

No backend. No server, no database, no accounts. A Recording is written to the
user's disk and never leaves the machine. [ADR 0001](./docs/adr/0001-local-only-no-backend.md).

No network. Not `fetch`, not analytics, not crash reporting, not an update
check. This is checkable: the Network panel stays empty during a Recording.

No sharing link and no cloud sync. Either would require a server, which
contradicts ADR 0001.

The Library at `~/Movies/Lumen/` is the only location Lumen writes. Every path
is resolved and confined through `library/paths.ts`. No move, no overwrite, no
traversal, and `fs` is imported nowhere else.

Delete means delete. The file is removed. No trash folder inside the Library,
because a recycle bin is a directory that grows forever on a small disk and
contradicts the promise that the Library holds only what the user chose to keep.

No secrets in logs. No file paths, no keys, no Recording contents.

No `file://`. It grants the renderer read access to the whole disk. The renderer
is served from a custom protocol restricted to the built assets and to the
Library.

No shell. FFmpeg runs through `spawn` with an argument array, never `exec` and
never a string. The argument array is the control, not the filename.

MIT licensed. Not on merit. `ffmpeg-static` ships binaries built with GPL
components, so linking libx264 under anything else would place Lumen under the
GPL and require publishing its source.
[ADR 0005](./docs/adr/0005-mit-license-for-gpl-compliance.md).

## How it works

A Session writes to disk as many small Segment files rather than one file, and
the Segments are joined at Export.
[ADR 0002](./docs/adr/0002-record-to-segments-not-single-file.md). Three
things follow from that choice. Switching Target costs nothing, because the
recorder is stopped and restarted at a Segment boundary rather than anything
being switched in place. A crash loses at most one second instead of the whole
Recording, because chunks are already on disk. Memory stays flat across a long
Session.

Most effects are applied at Export rather than during capture, because they are
better chosen afterwards and Export is cheap.
[ADR 0004](./docs/adr/0004-effects-at-export-not-live.md).

There are two deliberate exceptions.

A Region is applied live, during capture. It cannot wait until Export, because
if the crop ran afterwards, whatever passed through the rectangle at any moment
during the Session would end up in the Recording. That is precisely what the
user is trying to prevent.

The Frame's background blur is applied live, because person segmentation on a
ninety minute file afterwards is not reasonable in time or memory. The Frame's
corner and its sharp-or-blurred treatment are still Export choices.

The Frame sits behind a `FrameProcessor` interface. The implementation is not
yet decided. macOS Vision gives better edges and runs locally, but needs a
Swift bridge. MediaPipe is pure JavaScript and works on both platforms, with
blurrier edges and a large dependency. Nothing outside the frame module knows
which one is in use.

The architecture is a modular monolith, and the boundaries are in
`.agents/rules/architecture.md`.

## Platforms and permissions

macOS and Windows.

Capture runs on Electron's `desktopCapturer` and `MediaRecorder` rather than on
platform APIs written by hand, which is the reason for choosing Electron at
all. [ADR 0003](./docs/adr/0003-electron-over-tauri.md).

macOS requires Screen Recording permission, and Microphone for narration. Both
are requested by the OS, not by Lumen. If either is denied, Lumen says so
rather than recording a blank desktop.

Permissions are attributed to the host application during development, so
running from a terminal attributes the capture permission to that terminal
rather than to Lumen.

## Privacy

A compromised Lumen is not a data leak, it is a screenlogger. The controls are
build requirements rather than hardening added later, and they are specified in
[SECURITY.md](./SECURITY.md).

The four that shape the architecture: `contextIsolation` on and
`nodeIntegration` off, which is why the renderer talks to the main process only
through a narrow preload bridge. `sandbox` on, which is why the preload is
CommonJS and why nothing in the renderer can reach Node. A custom protocol
instead of `file://`. Sender validation on every IPC message, so only our own
window can drive the recorder.

The Library is encrypted at rest with Argon2id and AES-256-GCM, a unique salt
per Library and a unique nonce per file. A file that fails its tag check is
reported as corrupt rather than decrypted.

The key is derived from a password asked once at launch and held in memory for
the process lifetime. It is never written to disk and never logged.

Recording works while the Library is Locked. Playback and Export do not. A user
recording a two hour session must not be interrupted by a prompt, and someone
who records and then walks away must not have an afternoon of work locked
behind a field they forgot. If Lock ever blocks capture, that is a regression.

Application encryption is not a substitute for FileVault. FileVault protects
the disk while the machine is powered off. While the user is logged in and
recording, the disk is decrypted and every file is readable by any process
running as that user. That is why this layer exists.

## Acceptance criteria

Testable statements. A capability is done when its criteria pass in the app,
not when it compiles.

**Isolate.** The chosen Window appears in the Recording. A second application
brought to the front does not appear in the Recording at any point. The
Recording continues while another application is in front.

**Full Screen.** Everything on the Display appears in the Recording at its
native resolution.

**Region.** The Recording contains only the dragged rectangle, edge to edge,
with no black padding. The rectangle holds on a Retina Display and on a
non-Retina one. A rectangle of any odd width and height still exports, because
H.264 requires even dimensions and the encoder rounds rather than refusing.

**Session.** Pressing Stop writes one playable MP4 and the Library lists it.
The Recording plays inside the app without scrolling. Delete removes it.

**Segment.** A crash or force quit loses at most one second, not the Recording.

**Frame.** Off is off. Any corner places it. Sharp and blurred both work. The
background treatment is chosen at Export, and changing it does not require
recording again.

**Trim.** Setting a start and an end produces a Recording of that length.

**Library.** Recording works while Locked. Playback and Export require unlock.
A traversal attempt outside the Library is refused. Deleting removes the file.

**Export.** The MP4 opens in a stock player on macOS and on Windows. It is
seekable, not a live stream with no index.

## Out of scope for v1

System audio. Deferred. On macOS 14.2 and later Electron has no fallback for
it, so this is a platform problem rather than a scheduling one.

A timeline editor. Trim sets a start and an end and nothing more.

Sharing links and cloud sync. Both require a server.

Accounts, teams, and seats.

## Status

Written, not tested. Nothing below has been verified against a passing build.

Working and confirmed by manual test: Full Screen and Region capture, a Session
producing a playable MP4, the Library listing a Recording, and playback inside
the app.

Written but never tested: Isolate, which is the headline capability and the one
the whole product thesis rests on. Delete. Whether a live Region keeps content
out of the Recording when the user switches applications, which is the reason
the Region is cropped during capture rather than at Export.

Not started: Frame and its `FrameProcessor` implementation, Trim, encryption,
and Lock. `crypto.ts` throws on every entry point, so the Library is not yet
encrypted at rest.

Two bugs found in the last week were invisible to a passing build and are
recorded here because both were type-level lies rather than logic errors. A
`desktopCapturer` source id was passed where Electron expected a source
object, behind a cast that silenced the compiler, and `getUserMedia` simply
never settled. And an absolute path was passed to a function that expected a
folder name, so path joining re-rooted it and the Library confinement check
correctly refused it. Both are the kind of failure a green build cannot catch.
