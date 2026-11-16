# Export

Read this before touching ffmpeg or the Export pipeline.

## What Export does

Takes a finished Session and produces one MP4.

```
concat Segments  ->  overlay Frame  ->  trim  ->  encode
```

Each step is optional. A Recording with no Frame has no overlay, and one with
no Trim has no trim step.

A Region is not an Export step. It is applied during capture, so the Segments
already contain only the Region. See ADR 0004.

## ffmpeg invocation

Always `spawn` with an argument array. Never a shell string.

```ts
const { spawn } = require('node:child_process')
const args = ['-i', input, '-c:v', 'libx264', output]
const proc = spawn(ffmpegPath, args)
```

No `exec`, no `execSync`, no template string containing a filename, no
`shell: true`. This is a security control, not a style choice. See
`security.md`.

## Codec settings

```
-c:v libx264 -crf 23 -preset veryfast -pix_fmt yuv420p
-c:a aac -movflags +faststart
```

`libx264` because it produces the smallest files at a given quality, and
because the alternative forces a runtime download. `yuv420p` for compatibility,
because half the players people will use refuse anything else.
`-movflags +faststart` moves the index to the front so the file streams
instead of needing the whole thing downloaded first.

## Concat

Segments join with `-f concat -safe 0 -i list.txt -c copy`.

`-c copy` means no re-encode, so this is nearly instant even for a long
Session. It only works because every Segment was written with identical
encoder settings. **Do not vary the mimeType between Segments.** Pin it once
and use it everywhere, or concat produces a file that will not play.

## Region

A Region is applied during capture, not here. The capture renderer sizes its
canvas from the captured frame and encodes only that stream, so the Segments
already contain nothing outside the rectangle.

The Region is stored as fractions of the Target's frame, not logical pixels.
That keeps it correct on a Retina Display and when a Window is resized during
a Session. Do not add a crop step to Export; it would crop an already cropped
Segment and could reintroduce the content the user excluded.

## Overlay

Only if the Frame is enabled.

The Frame's corner is chosen at Export, not at record time. ADR 0004.

```
scale=320:-1                       scale the camera down
overlay=W-w-20:H-h-20              bottom right
overlay=20:H-h-20                  bottom left
overlay=W-w-20:20                  top right
overlay=20:20                      top left
```

`W` and `H` are the output dimensions. `-20` is the margin from the edge.

## Trim

`-ss` before `-to`. Placing them as output options is slower than placing them
as input options, and on a long Session that difference is minutes.

Trim removes from the start or the end only. There is no timeline editor in
v1 and no code should behave as if there were.

## Progress

ffmpeg reports progress on stderr. Parse it and send it to the renderer. A
two hour practice Session takes a while to encode and a silent spinner is a
bug.

Parse the `out_time_us=` line and divide by the Session duration to get a
percentage. Do not fake it with a timer.

## After Export

Delete the Segments. Keep the MP4 and `meta.json`. If the Library fills with
orphaned `.webm` files the user has 8GB of storage to lose.

Delete `cam.webm` too unless the user kept the camera.

Check the output exists and is non-zero before reporting success.
