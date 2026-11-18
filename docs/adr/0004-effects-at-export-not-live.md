# 0004 - Effects are applied at Export, not during capture

Trim is applied when the Session is turned into a Recording. Nothing else is
composited while the recorder is running, except where postponing the effect
would change what the file contains or make the work impractical.

The reason for the default is that these choices are better made after the
fact. Export is cheap and the choices are reversible, so they belong at that
point rather than before.

Two effects are applied during capture.

A Region is applied live. If the crop ran at Export, whatever was inside the
rectangle at any moment during the Session would end up in the Recording,
which is exactly what the user is trying to prevent. The pixels outside the
Region never reach the file. See `compositor.ts`.

The Frame is applied live. The camera picture is drawn into the same canvas
the recorder encodes, so the screen and the face are one stream that cannot
drift apart, and the preview shows exactly what the file will contain. The
alternative, which is what this ADR originally specified, was to record the
camera to its own file and overlay it at Export. It was rejected because two
recordings have to be kept in sync and the overlay is a stitching step where
the picture can go wrong. The corner is therefore chosen before recording
starts.

Blurring the Frame's background, when it exists, is also live: person
segmentation has to run per frame while recording, because segmenting a
ninety minute file afterwards is not practical. It stays behind the
`FrameProcessor` interface so the implementation can be swapped.

If changing the corner after recording is ever wanted, that is the reason to
return to the separate camera file. v2 can revisit it, and accept the sync
cost then.

Amended 2026-11-12: the Region exception was added. The original decision
covered only effects that are reversible after the Session.

Amended 2026-11-17: the Frame moved from Export to capture. Its picture is
drawn live, its corner is chosen before Start, and there is no `cam.webm`.
