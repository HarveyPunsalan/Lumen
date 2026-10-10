# Lumen

A screen recorder that captures only what the user chooses to show. The
vocabulary below exists because several of these words started out meaning
different things in conversation, and the difference changes how the code is
written.

## Language

**Recording**:
A finished video file the user can play back.
_Avoid_: clip, take, video, export

**Session**:
One run from pressing record to pressing stop. A Session produces exactly one
Recording.
_Avoid_: recording, session file

**Segment**:
One uninterrupted run of the recorder inside a Session. Switching Target
ends the current Segment and begins another.
_Avoid_: part, chunk, file

**Source**:
Something Electron is able to capture. A Source is either a Display or a
Window.
_Avoid_: target, screen, input

**Display**:
A monitor, captured as one Source.
_Avoid_: screen, monitor

**Window**:
A single application window, captured as one Source. A Window is captured
even when something else is drawn on top of it.
_Avoid_: app, tab

**Target**:
The Source currently being captured. A Recording has one Target per Segment.
_Avoid_: source, focus

**Isolate**:
Capture one Window so that nothing else appears in the Recording. Other
applications are not blurred or dimmed, they are absent from the file.
_Avoid_: blur, cut, hide, crop

**Region**:
A rectangle inside a Display, defined by dragging. Capturing a Region
produces a full Display Recording cropped to that rectangle. Everything
outside the rectangle is absent from the file.
_Avoid_: crop, selection, area

**Full Screen**:
Capturing an entire Display with no crop.
_Avoid_: monitor, desktop

**Frame**:
The camera image placed over the Recording. It may be off, it may sit in any
of four corners, and its background may be blurred or sharp.
_Avoid_: webcam, facecam, bubble, overlay

**Trim**:
Removing seconds from the start or the end of a Recording.
_Avoid_: cut, edit, clip

**Export**:
Turning a finished Session into a Recording. Also the moment where a Frame's
corner and background treatment are chosen.
_Avoid_: save, render, convert

**Library**:
The folder holding Recordings and their metadata, at `~/Movies/Lumen/`.
_Avoid_: gallery, records, folder

**Lock**:
The state in which the Library's contents cannot be read or exported. A
Recording can still be captured while the Library is Locked.
_Avoid_: locked, locked mode, password mode

## Removed concepts

These were considered and cut. They should not reappear in code or in
conversation.

**Blur the rest**:
Record a whole Display, then blur everything except one Window. Rejected
because Isolate and Region both produce a cleaner result. If the user does
not want something in the Recording, it should not be in the Recording.

**System audio**:
Audio the computer plays, as opposed to the microphone. Deferred to a later
version. On macOS 14.2 and later Electron has no fallback for this.

**Sharing link**:
Uploading a Recording and giving someone a URL. Deferred. Adding it would
require a server, which would contradict [ADR 0001](./docs/adr/0001-local-only-no-backend.md).