# 0003 - Electron over Tauri

Lumen is built on Electron rather than Tauri and its Rust backend.

Tauri produces a much smaller binary and is the more fashionable choice for a
new desktop app in 2026. It was rejected because of what Lumen actually has to
do. The hard parts are the capture pipeline, the encoder, the container
format, and the cross platform differences between macOS and Windows. In
Electron those are mostly handled by Chromium's `desktopCapturer` and
`MediaRecorder`. In Tauri we would write the equivalent in Rust for both
platforms, on top of a language neither of us is currently working in.

The honest cost of this choice is known. Switching Target mid Session causes a
visible hiccup of roughly 100 to 300ms, because the video track is stopped and
a new one is acquired. A native ScreenCaptureKit implementation could swap
what is being captured on a live stream with no gap, but that is not reachable
from Electron.

Electron's security posture is also weaker by default than a native framework.
That is configuration rather than architecture, and it is handled by the
settings listed in [SECURITY.md](../SECURITY.md), which are treated as build
requirements in Week 1 rather than as later hardening.
