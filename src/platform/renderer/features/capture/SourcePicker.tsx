/**
 * Pick what to record, then record it.
 *
 * Three modes, matching CONTEXT.md. Whole Screen follows whatever is on the
 * display. Selected Window stays locked to one app. Region stays locked to a
 * rectangle you drag.
 *
 * How a screen looks is design.md. How the React works is react.md.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { CaptureMode, Region, Source } from '@lumen/modules/capture/types'
import {
  Recorder,
  SEGMENT_TIMESLICE_MS,
} from '@lumen/modules/capture/renderer/recorder'
import { RegionSelector } from './RegionSelector'

type Status = 'idle' | 'choosing-region' | 'starting' | 'recording' | 'saved' | 'error'

function message(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause)
}

/**
 * Stop waiting on a promise that never settles.
 *
 * Every hang so far looked identical from the outside: a button that says
 * "Starting..." forever. That is the worst failure mode, because it is
 * indistinguishable from a slow machine. Anything longer than this is reported
 * as an error with the underlying message, so the cause is visible instead of
 * inferred.
 */
async function withTimeout<T>(
  work: Promise<T>,
  label: string,
  ms = 10_000,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      work,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`${label} did not respond within ${ms / 1000} seconds.`))
        }, ms)
      }),
    ])
  } finally {
    clearTimeout(timer)
  }
}

const MODES: ReadonlyArray<{ mode: CaptureMode; label: string; hint: string }> = [
  {
    mode: 'whole-screen',
    label: 'Whole Screen',
    hint: 'Records everything. Whatever you are looking at comes with you.',
  },
  {
    mode: 'selected-window',
    label: 'Selected Window',
    hint: 'Pick one app. It stays locked there even if you switch away.',
  },
  {
    mode: 'region',
    label: 'Region',
    hint: 'Drag a box. Only that part is recorded, the rest is black.',
  },
]

export function SourcePicker() {
  const [sources, setSources] = useState<Source[]>([])
  const [mode, setMode] = useState<CaptureMode>('whole-screen')
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)
  const [folder, setFolder] = useState<string | null>(null)
  const [picked, setPicked] = useState<Source | null>(null)
  const [region, setRegion] = useState<Region | null>(null)
  const [exporting, setExporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const recorder = useRef<Recorder | null>(null)
  // True from the moment Stop is pressed until the next Start. Drives the
  // frozen REC badge, so the clock stops climbing during Export.
  const [stopping, setStopping] = useState(false)
  const stoppingRef = useRef(false)

  useEffect(() => {
    window.lumen.onExportProgress(setProgress)
  }, [])

  useEffect(() => {
    void window.lumen
      .listSources()
      .then(setSources)
      .catch((cause: unknown) => {
        setError(message(cause))
        setStatus('error')
      })
  }, [])

  // No Display means Region cannot be drawn, so fall back to the mode list
  // rather than setting state during render.
  const screens = sources.filter((source) => source.kind === 'screen')
  const windows = sources.filter((source) => source.kind === 'window')

  if (status === 'choosing-region' && screens[0] === undefined) {
    return (
      <div className="p-8">
        <h1 className="text-lg font-medium">Record</h1>
        <p className="mt-4 rounded-md border border-red-900 bg-red-950/40 p-3 text-sm text-red-200">
          No Display was found.
        </p>
      </div>
    )
  }

  function chooseMode(next: CaptureMode) {
    setError(null)
    if (next === 'region') {
      setStatus('choosing-region')
      return
    }
    setMode(next)
    setPicked(next === 'whole-screen' ? (screens[0] ?? null) : null)
    setStatus('idle')
  }

  async function start(source: Source) {
    try {
      stoppingRef.current = false
      setStopping(false)
      setStatus('starting')
      setError(null)
      // Only the id is sent. Main re-reads the live Source list and resolves the
// rest itself, so the renderer never dictates what Electron is handed.
await withTimeout(window.lumen.selectSource(source.id), 'Selecting the source')
      const session = await withTimeout(
        window.lumen.beginSession(),
        'Creating the recording folder',
      )
      setFolder(session.folder)
      setStatus('recording')
    } catch (cause) {
      setError(message(cause))
      setStatus('error')
    }
  }

  const stop = useCallback(async (seconds: number) => {
    // A ref, not state. Two fast clicks both read the same state value, so
    // only a ref stops the second Export on the same Session.
    if (stoppingRef.current) return
    stoppingRef.current = true
    // Freezes the REC number and stops the pulse. Export has not run yet, so
    // this has to be set before the await below, not after it resolves.
    setStopping(true)

    recorder.current?.dispose()
    recorder.current = null
    await window.lumen.clearSource()

    // The Segments become one MP4 here. The user waits for it rather than
    // hunting for a Webm most players refuse to open.
    try {
      setExporting(true)
      const output = await withTimeout(
        window.lumen.finishSession(seconds),
        'Saving the MP4',
        300_000,
      )
      setFolder(output)
      setStatus('saved')
    } catch (cause) {
      setError(message(cause))
      setStatus('error')
    } finally {
      setExporting(false)
    }
  }, [])

  if (status === 'choosing-region') {
    // Guarded above, so a Display exists here.
    const screen = screens[0]
    if (screen === undefined) return null
    return (
      <RegionSelector
        screen={screen}
        onCancel={() => setStatus('idle')}
        onConfirm={(pickedRegion) => {
          setRegion(pickedRegion)
          setMode('region')
          setPicked(screen)
          setStatus('idle')
        }}
      />
    )
  }

  if (status === 'recording' && picked !== null) {
    const target = region === null ? undefined : region
    return (
      <RecordingControls
        source={picked}
        region={target ?? null}
        recorderRef={recorder}
        folder={folder}
        exporting={exporting}
        stopping={stopping}
        progress={progress}
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
      <p className="mt-1 text-sm text-neutral-500">Choose what gets recorded.</p>

      {error !== null && (
        <div className="mt-4 rounded-md border border-red-900 bg-red-950/40 p-3">
          <p className="text-sm text-red-200">{error}</p>
        </div>
      )}

      {status === 'saved' && error === null && (
        <p className="mt-4 rounded-md border border-neutral-800 bg-neutral-900 p-3 text-sm text-neutral-300">
          Saved to {folder}
        </p>
      )}

      <div className="mt-6 flex gap-3">
        {MODES.map((entry) => (
          <button
            key={entry.mode}
            onClick={() => chooseMode(entry.mode)}
            className={`flex-1 rounded-lg border p-4 text-left ${
              mode === entry.mode
                ? 'border-neutral-100 bg-neutral-900'
                : 'border-neutral-800 hover:border-neutral-600'
            }`}
          >
            <span className="block text-sm font-medium">{entry.label}</span>
            <span className="mt-1 block text-xs text-neutral-500">{entry.hint}</span>
          </button>
        ))}
      </div>

      {mode === 'selected-window' && (
        <div className="mt-6">
          <h2 className="text-sm font-medium text-neutral-300">Pick an app</h2>
          {windows.length === 0 ? (
            <p className="mt-2 text-sm text-neutral-500">No open windows were found.</p>
          ) : (
            <ul className="mt-3 grid grid-cols-3 gap-2 md:grid-cols-4 lg:grid-cols-5">
              {windows.map((source) => (
                <li key={source.id}>
                  <button
                    onClick={() => setPicked(source)}
                    className={`w-full overflow-hidden rounded-md border ${
                      picked?.id === source.id
                        ? 'border-neutral-100'
                        : 'border-neutral-800 hover:border-neutral-600'
                    }`}
                  >
                    <span className="flex aspect-video items-center justify-center bg-black">
                      <img
                        src={source.thumbnail}
                        alt=""
                        className="max-h-full max-w-full object-contain"
                      />
                    </span>
                    <span className="block truncate px-2 py-1.5 text-left text-xs text-neutral-300">
                      {source.name}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {region !== null && mode === 'region' && (
        <p className="mt-4 text-xs text-neutral-500">
          Region {region.width} by {region.height} at {region.x}, {region.y}
        </p>
      )}

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
        {picked !== null && (
          <span className="text-xs text-neutral-600">Recording {picked.name}</span>
        )}
      </div>
    </div>
  )
}

/** The REC badge is never optional and is never hidden. See library.md. */
function RecordingControls({
  source,
  region,
  recorderRef,
  folder,
  exporting,
  stopping,
  progress,
  onStop,
  onError,
}: {
  source: Source
  region: Region | null
  recorderRef: React.RefObject<Recorder | null>
  folder: string | null
  exporting: boolean
  stopping: boolean
  progress: number
  onStop: (seconds: number) => Promise<void>
  onError: (cause: unknown) => void
}) {
  const [elapsed, setElapsed] = useState(0)
  const [ready, setReady] = useState(false)
  const preview = useRef<HTMLVideoElement | null>(null)
  const clock = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const recorder = new Recorder()
    recorderRef.current = recorder
    let stopped = false

    void (async () => {
      try {
        const { relativePath } = await withTimeout(
          window.lumen.nextSegmentPath(),
          'Reserving a file name',
        )
        await withTimeout(
          recorder.beginSegment(
            region === null ? { source } : { source, region },
            async (chunk) => {
              if (stopped) return
              await window.lumen.writeChunk(relativePath, await chunk.arrayBuffer())
            },
            SEGMENT_TIMESLICE_MS,
            preview.current ?? undefined,
          ),
          'Starting the capture',
        )
        if (stopped) return
        if (region === null && preview.current !== null && recorder.previewStream !== null) {
          preview.current.srcObject = recorder.previewStream
        }
        setReady(true)
      } catch (cause) {
        if (stopped) return
        recorder.dispose()
        onError(cause)
      }
    })()

    clock.current = setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => {
      stopped = true
      if (clock.current !== null) clearInterval(clock.current)
      clock.current = null
      recorder.dispose()
    }
  }, [source, region, recorderRef, onError])

  // The REC clock belonged to the effect above, which only cleaned up when this
  // screen unmounted. Unmounting waits for Export, so the timer kept counting
  // through the whole encode and the badge looked like it was still recording.
  // Stop clears it the moment it is pressed. The number is left alone, because
  // it is the real length of the Recording and Export still needs it.
  useEffect(() => {
    if (!stopping) return
    if (clock.current !== null) clearInterval(clock.current)
    clock.current = null
  }, [stopping])

  return (
    <div className="p-8">
      <div className="flex items-center gap-3">
        <span
          className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium text-white ${
            stopping ? 'bg-neutral-700' : 'bg-red-600'
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full bg-white ${stopping ? '' : 'animate-pulse'}`}
          />
          REC {String(Math.floor(elapsed / 60)).padStart(2, '0')}:
          {String(elapsed % 60).padStart(2, '0')}
        </span>
        <button
          onClick={() => void onStop(elapsed)}
          disabled={exporting}
          className="rounded-md bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-900 disabled:bg-neutral-800 disabled:text-neutral-500"
        >
          {exporting ? 'Saving...' : 'Stop'}
        </button>
        {exporting && (
          <span className="flex items-center gap-2 text-sm text-neutral-400">
            <span className="h-1.5 w-32 overflow-hidden rounded-full bg-neutral-800">
              <span
                className="block h-full bg-neutral-200"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </span>
            {Math.round(progress * 100)}%
          </span>
        )}
        <span className="text-sm text-neutral-500">
          {ready ? 'Capturing' : 'Starting capture...'}
        </span>
        <span className="text-sm text-neutral-500">
          {region === null ? source.name : 'Region'}
        </span>
      </div>

      <div className="mt-6 max-w-3xl overflow-hidden rounded-lg border border-neutral-800 bg-black">
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