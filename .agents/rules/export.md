# Export

Read this before touching ffmpeg or the Export pipeline.

## What Export does

Takes a finished Session and produces one MP4.

```
concat Segments  ->  crop  ->  overlay Frame  ->  trim  ->  encode
```

Each step is optional. A Full Screen Isolate has no crop and no overlay. A
Recording with no Frame has neither.

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

## Crop

Only for a Region. Applied to the Display video before anything else.

A Region is given in logical coordinates from the drag. Retina displays report
twice the pixel dimensions. Map the rectangle to real pixels using the video's
actual width and height, not the display's reported size. Getting this wrong
puts the crop in the wrong place, and it is the single most likely bug in the
pipeline.

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
