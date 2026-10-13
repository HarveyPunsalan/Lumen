/**
 * Pick what to record. The Week 1 gate: one Window in, one file on disk.
 *
 * How a screen looks is design.md. How the React works is react.md.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Source } from '@lumen/modules/capture/types'
import {
  Recorder,
  SEGMENT_TIMESLICE_MS,
} from '@lumen/modules/capture/renderer/recorder'

type Status = 'idle' | 'starting' | 'recording' | 'saved' | 'error'

function message(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause)
}

export function SourcePicker() {
  const [sources, setSources] = useState<Source[]>([])
  const [picked, setPicked] = useState<Source | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)
  const [folder, setFolder] = useState<string | null>(null)
  const recorder = useRef<Recorder | null>(null)

  useEffect(() => {
    void window.lumen
      .listSources()
      .then(setSources)
      .catch((cause: unknown) => {
        setError(message(cause))
        setStatus('error')
      })
  }, [])

  async function start(source: Source) {
    try {
      setStatus('starting')
      setError(null)
      await window.lumen.selectSource(source.id)
      const session = await window.lumen.beginSession()
      setFolder(session.folder)
      setStatus('recording')
    } catch (cause) {
      setError(message(cause))
      setStatus('error')
    }
  }

  const stop = useCallback(async () => {
    recorder.current?.dispose()
    recorder.current = null
    await window.lumen.clearSource()
    setStatus('saved')
  }, [])

  if (status === 'recording' && picked !== null) {
    return (
      <RecordingControls
        source={picked}
        recorderRef={recorder}
        folder={folder}
        onStop={stop}
        onError={(cause: unknown) => {
          setError(message(cause))
          setStatus('error')
        }}
      />
    )
  }

  return (
    <div className="p-8">
      <h1 className="text-lg font-medium">Record</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Pick one window or screen. Only what you pick ends up in the file.
      </p>

      {error !== null && (
        <div className="mt-4 rounded-md border border-red-900 bg-red-950/40 p-3">
          <p className="text-sm text-red-200">{error}</p>
          <p className="mt-1 text-xs text-red-300/60">
            Full detail is in the terminal running npm run dev.
          </p>
        </div>
      )}

      {status === 'saved' && error === null && (
        <p className="mt-4 rounded-md border border-neutral-800 bg-neutral-900 p-3 text-sm text-neutral-300">
          Saved to {folder}
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
          disabled={picked === null || status === 'starting'}
          className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:bg-neutral-800 disabled:text-neutral-500"
        >
          {status === 'starting' ? 'Starting...' : 'Start recording'}
        </button>
        {folder !== null && <p className="text-xs text-neutral-600">Saving to {folder}</p>}
      </div>
    </div>
  )
}

/**
 * The REC badge is never optional and is never hidden. See library.md.
 *
 * The preview shows the same stream the recorder is encoding, so what you see
 * here is exactly what lands in the file.
 */
function RecordingControls({
  source,
  recorderRef,
  folder,
  onStop,
  onError,
}: {
  source: Source
  recorderRef: React.RefObject<Recorder | null>
  folder: string | null
  onStop: () => Promise<void>
  onError: (cause: unknown) => void
}) {
  const [elapsed, setElapsed] = useState(0)
  const [ready, setReady] = useState(false)
  const preview = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    const recorder = new Recorder()
    recorderRef.current = recorder
    let stopped = false

    void (async () => {
      try {
        const { relativePath } = await window.lumen.nextSegmentPath()
        await recorder.beginSegment(
          { source },
          async (chunk) => {
            if (stopped) return
            await window.lumen.writeChunk(relativePath, await chunk.arrayBuffer())
          },
          SEGMENT_TIMESLICE_MS,
        )
        if (stopped) return
        if (preview.current !== null && recorder.previewStream !== null) {
          preview.current.srcObject = recorder.previewStream
        }
        setReady(true)
      } catch (cause) {
        if (stopped) return
        recorder.dispose()
        onError(cause)
      }
    })()

    const timer = setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => {
      stopped = true
      clearInterval(timer)
      recorder.dispose()
    }
  }, [source, recorderRef, onError])

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
        <span className="text-sm text-neutral-500">
          {ready ? 'Capturing' : 'Starting capture...'}
        </span>
      </div>

      <div className="mt-6 max-w-2xl overflow-hidden rounded-lg border border-neutral-800 bg-black">
        <video
          ref={preview}
          autoPlay
          muted
          playsInline
          className="aspect-video w-full object-contain"
        />
      </div>

      {folder !== null && <p className="mt-4 text-xs text-neutral-600">Saving to {folder}</p>}
    </div>
  )
}