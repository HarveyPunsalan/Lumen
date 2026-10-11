# System design

Read this before changing how capture, recording and export fit together.

## What Lumen does

Record a chosen Target, optionally with a Frame, and produce an MP4 on disk.
Nothing is transmitted.

## The pipeline

```
Record pressed
  Session created at ~/Movies/Lumen/<timestamp>_<id>/
    part-001.webm      the recorder writing a chunk every second
    part-002.webm      began after a Target switch
    cam.webm           the camera, separate file
    meta.json          Segments, timestamps, Frame settings

Stop pressed
  concat Segments      -c copy, no re-encode
  crop                 if the Target is a Region
  overlay              if the Frame is enabled
  trim                 if the user set in or out points
  encode               H.264, AAC, faststart
  delete Segments      leave the MP4 and meta.json
```

## Process shape

Electron gives three contexts.

**Main process.** Owns the filesystem, `desktopCapturer`, permissions, and the
ffmpeg process. Holds no UI.

**Preload.** The bridge. A narrow typed API. Nothing else crosses.

**Renderer.** Owns `MediaRecorder` and `getUserMedia`, because those are
browser APIs. Renders the UI.

The split is not a preference. `desktopCapturer` and the ffmpeg spawn must be
in main. `MediaRecorder` must be in the renderer. The consequence is that
Export, which is the joining point, is driven from main using data the
renderer produced.

## Three capture modes, one mechanism

Electron returns two kinds of Source. Everything else follows.

| Mode | Mechanism |
|---|---|
| Isolate a Window | Pick a Source of kind `window`. The video is that window. |
| Full Screen | Pick a Source of kind `screen`. The video is the display. |
| Region | Full Screen, then crop to a dragged rectangle. |

A Region is not blurred or dimmed. The pixels outside the rectangle are not in
the file. Do not implement it as a filter.

## Design decisions and where they live

| Decision | ADR |
|---|---|
| No server, files local | 0001 |
| Segments, not one file | 0002 |
| Electron over Tauri | 0003 |
| Effects at Export | 0004 |
| MIT license | 0005 |

If you are about to undo one of these, read its ADR first. They all look like
mistakes without the reason, which is why they are written down.

## Failure behaviour

**The app crashes mid Session.** Segments on disk survive. The next launch
should offer to recover the Session folder rather than discard it.

**Permission is denied.** `desktopCapturer.getSources` can hang instead of
rejecting on macOS. Check `getMediaAccessStatus` first and fail with a message
that names the System Settings pane. Never let it hang.

**ffmpeg exits non-zero.** Capture stderr and surface it. Do not report success
if the output file is missing or zero bytes.

**Disk is full.** Segments accumulate during a long recording. Check free space
before starting rather than failing halfway through.

## Known constraints

Switching Target mid Session causes a visible gap of roughly 100 to 300ms,
because the video track is stopped and a new one acquired. A native
ScreenCaptureKit implementation could change this without a gap, but it is not
reachable from Electron. ADR 0003.

macOS 26 will record only the desktop wallpaper, with no error, unless the app
is a properly signed bundle declaring `NSScreenCaptureUsageDescription` in its
`Info.plist`. This is the first thing to check when a Recording comes out
blank.

Retina displays report twice the pixel dimensions. A Region dragged in logical
coordinates has to be mapped to the video's real pixel size before cropping,
or the crop lands in the wrong place.
