# 0004 - Effects are applied at Export, not during capture

Trim and the Frame's corner are applied when the Session is turned into a
Recording. Nothing else is composited while the recorder is running.

The reason is that these choices are better made after the fact. A user who
records once and then decides the Frame belongs in the bottom left with a
sharp background does not have to record a second time. Export is cheap and
the choices are reversible, so they belong at that point rather than before.

Two effects are applied during capture, because postponing them would change
what the file contains or make the work impractical.

A Region is applied live. If the crop ran at Export, whatever was inside the
rectangle at any moment during the Session would end up in the Recording,
which is exactly what the user is trying to prevent. The pixels outside the
Region never reach the file. See `region-cropper.ts`.

Blurring the Frame's background is the other exception. Person segmentation
has to run per frame while recording, because segmenting a 90 minute file
afterwards is not practical. It is therefore a separate module behind its own
interface, so the difference in timing is contained to one place and the rest
of the pipeline does not have to know about it.

The Frame's camera video is also recorded to its own file rather than being
merged into the recording stream. That is what makes the delayed choice
possible.

Amended 2026-11-12: the Region exception was added. The original decision
covered only effects that are reversible after the Session.
