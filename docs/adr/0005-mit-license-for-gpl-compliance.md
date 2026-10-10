# 0005 - MIT license, so that x264 is usable

Lumen is released under the MIT license. Its source is public.

This was not decided on its own merits. It was chosen to resolve a licensing
problem that would otherwise have forced the issue.

FFmpeg is LGPL, but only when built without its GPL components. The encoder we
want, libx264, is GPL. The `ffmpeg-static` package ships binaries built with
GPL enabled, so distributing it inside Lumen would place Lumen under the GPL
and require us to publish its source.

Publishing the source was an acceptable outcome, so MIT it is. This also keeps
the best available H.264 encoder, which produces smaller files at a given
quality than the LGPL compatible alternative OpenH264. OpenH264 would have
forced a download at runtime, which is a worse experience for the user and
still carries its own patent considerations.

Two notes for the future. H.264 carries MPEG-LA patent royalties. At the scale
Lumen is at now, and with no revenue, this is not a real cost, but it becomes
one if the app is ever distributed commercially. And this ADR exists so nobody
later "fixes" the license to something more restrictive on the assumption that
it is free to do so.
