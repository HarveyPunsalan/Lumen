/**
 * The Electron display media handler.
 *
 * The renderer cannot call desktopCapturer, so the picked Source has to travel
 * through the main process. Which Source is current lives in
 * `app/session-runtime.ts`; this file only answers Electron's request.
 */

import { session } from 'electron'
import type { Source } from '../../modules/capture/types.js'

/**
 * Answer the renderer's getUserMedia for video with the picked Source.
 *
 * The handler receives a Source object, not a bare id. Passing the id string
 * straight through typechecked only behind a cast, and at runtime getUserMedia
 * then never settled, which showed as a Start button stuck on "Starting...".
 *
 * No audio. System audio is deferred and the microphone is a separate
 * getUserMedia call. See CONTEXT.md, Removed concepts.
 */
export function handleDisplayMediaRequest(currentSource: () => Source | null): void {
  session.defaultSession.setDisplayMediaRequestHandler((_request, callback) => {
    const source = currentSource()
    if (source === null) {
      // An empty object leaves getUserMedia pending forever. Passing null is
      // the documented refusal, so the renderer sees a rejection it can show.
      callback(null)
      return
    }
    callback({
      video: { id: source.id, name: source.name },
    })
  })
}
