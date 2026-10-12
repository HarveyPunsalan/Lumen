/**
 * The grid of Displays and Windows, plus record and stop.
 *
 * Records one Segment to the Library. Switching Target is Week 2, so the
 * picker is locked once recording starts.
 */

import { useEffect, useRef, useState } from 'react'
import type { Source } from '@lumen/modules/capture/types'
import {
  Recorder,
  SEGMENT_TIMESLICE_MS,
  SEGMENT_MIME_TYPE,
} from '@lumen/modules/capture/renderer/recorder'

type Status = 'idle' | 'recording' | 'saved' | 'error'

export function SourcePicker() {
  const [sources, setSources] = useState<Source[]>([])
  const [picked, setPicked] = useState<Source | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)
  const [folder, setFolder] = useState<string | null>(null)
  const recorderRef = useRef<Recorder | null>(null)

  useEffect(() => {
    void window.lumen.listSources().then(setSources).catch((cause: unknown) => {
      setError(cause instanceof Error ? cause.message : String(cause))
      setStatus('error')
    })
  }, [])

  async function start(picked: Source) {
    try {
      await window.lumen.selectSource(picked.id)
      setFolder((await window.lumen.beginSession()).folder)
      setStatus('recording')
      setError(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
      setStatus('error')
    }
  }

  async function stop() {
    recorderRef.current?.dispose()
    await window.lumen.clearSource()
    setStatus('saved')
  }

  // One recorder per Session. Not state, because it is not UI state.
  if (status === 'recording' && picked !== null) {
    return <RecordingControls source={picked} recorderRef={recorderRef} onStop={stop} />
  }

  return (
    <div className="p-8">
      <h1 className="text-lg font-medium">Record</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Pick one window or screen. Only what you pick ends up in the file.
      </p>

      {error !== null && (
        <p className="mt-4 rounded-md border border-red-900 bg-red-950/40 p-3 text-sm text-red-200">
          {error}
        </p>
      )}

      <ul className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {sources.map((source) => (
          <li key={source.id}>
            <button
              onClick={() => setPicked(source)}
              className={`block w-full overflow-hidden rounded-lg border text-left ${
                picked?.id === source.id
                  ? 'border-neutral-100'
                  : 'border-neutral-800 hover:border-neutral-600'
              }`}
            >
              <span className="flex aspect-video items-center justify-center bg-black">
                <img src={source.thumbnail} alt="" className="max-h-full max-w-full object-contain" />
              </span>
              <span className="block px-3 py-2">
                <span className="block truncate text-xs text-neutral-300">{source.name}</span>
                <span className="mt-0.5 block text-[11px] uppercase tracking-wide text-neutral-600">
                  {source.kind}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex items-center gap-4">
        <button
          onClick={() => {
            if (picked !== null) void start(picked)
          }}
          disabled={picked === null}
          className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:bg-neutral-800 disabled:text-neutral-500"
        >
          Start recording
        </button>
        {folder !== null && (
          <p className="text-xs text-neutral-600">Saving to {folder}</p>
        )}
      </div>
    </div>
  )
}

/** The REC badge is never optional and is never hidden. See library.md. */
function RecordingControls({
  source,
  recorderRef,
  onStop,
}: {
  source: Source
  recorderRef: React.RefObject<Recorder | null>
  onStop: () => Promise<void>
}) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const recorder = new Recorder()
    recorderRef.current = recorder

    void (async () => {
      const { relativePath } = await window.lumen.nextSegmentPath()
      await recorder.beginSegment({ source }, async (chunk) => {
        await window.lumen.writeChunk(relativePath, await chunk.arrayBuffer())
      }, SEGMENT_TIMESLICE_MS)
    })()

    const timer = setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => {
      clearInterval(timer)
      recorder.dispose()
    }
  }, [source, recorderRef])

  return (
    <div className="p-8">
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-2 rounded-full bg-red-600 px-3 py-1.5 text-sm font-medium text-white">
          <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
          REC {String(Math.floor(elapsed / 60)).padStart(2, '0')}:
          {String(elapsed % 60).padStart(2, '0')}
        </span>
        <button
          onClick={() => void onStop()}
          className="rounded-md bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-900"
        >
          Stop
        </button>
      </div>
      <p className="mt-4 text-xs text-neutral-600">Encoding as {SEGMENT_MIME_TYPE}</p>
    </div>
  )
}