# 0002 - Record to Segments, not a single file

A Session writes to disk as many small Segment files rather than one large
file. Those Segments are joined at Export.

Switching Target in the middle of a Session cannot happen inside a running
`MediaRecorder`. The track has to be stopped and a new one acquired. If we
built for that from the start, switching Target costs nothing extra.

Three things fall out of it. Switching Target is free, because a hotkey only
has to begin a new Segment. A crash loses at most one second rather than the
whole Recording, because chunks are already on disk. And memory stays flat
during long recordings, because `MediaRecorder` is started with a timeslice
argument. Without that argument it holds every frame in RAM until it is
stopped, and a two hour practice session would be several gigabytes.

Segments are removed once Export succeeds. If they are not deleted the
Library fills with junk, and the user has 8GB of storage to lose.
