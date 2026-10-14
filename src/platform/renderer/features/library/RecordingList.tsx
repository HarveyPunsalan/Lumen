/**
 * The Library: every exported Recording, newest first, with playback.
 *
 * Delete means delete. There is no trash folder inside the Library, because on
 * a small disk that is a directory that grows forever. See library.md.
 */

import { useCallback, useEffect, useState } from 'react'

export interface RecordingEntry {
  readonly name: string
  readonly folder: string
  readonly startedAt: number
  readonly sizeBytes: number
}

function message(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause)
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatWhen(millis: number): string {
  if (millis === 0) return 'Unknown date'
  return new Date(millis).toLocaleString()
}

export function RecordingList({ onBack }: { onBack: () => void }) {
  const [entries, setEntries] = useState<RecordingEntry[] | null>(null)
  const [playing, setPlaying] = useState<string | null>(null)
  const [playbackUrls, setPlaybackUrls] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    void window.lumen
      .listRecordings()
      .then(setEntries)
      .catch((cause: unknown) => {
        setError(message(cause))
        setEntries([])
      })
  }, [])

  useEffect(load, [load])

  async function remove(folder: string) {
    try {
      await window.lumen.deleteRecording(folder)
      if (playing === folder) setPlaying(null)
      load()
    } catch (cause) {
      setError(message(cause))
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-medium">Library</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {entries === null ? 'Loading...' : `${entries.length} saved`}
          </p>
        </div>
        <button
          onClick={onBack}
          className="rounded-md bg-neutral-100 px-3 py-1.5 text-sm font-medium text-neutral-900"
        >
          New recording
        </button>
      </div>

      {error !== null && (
        <p className="mt-4 rounded-md border border-red-900 bg-red-950/40 p-3 text-sm text-red-200">
          {error}
        </p>
      )}

      {entries !== null && entries.length === 0 && (
        <p className="mt-8 text-sm text-neutral-500">
          Nothing saved yet. Record something and it will show up here.
        </p>
      )}

      <ul className="mt-6 space-y-3">
        {(entries ?? []).map((entry) => (
          <li
            key={entry.folder}
            className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-3"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="truncate text-sm text-neutral-200">
                  {formatWhen(entry.startedAt)}
                </p>
                <p className="mt-0.5 text-xs text-neutral-500">
                  {formatSize(entry.sizeBytes)}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  onClick={() => {
                    if (playing === entry.folder) {
                      setPlaying(null)
                      return
                    }
                    void window.lumen
                      .playbackUrl(entry.folder)
                      .then((url: string) => {
                        setPlaybackUrls((all) => ({ ...all, [entry.folder]: url }))
                        setPlaying(entry.folder)
                      })
                      .catch((cause: unknown) => setError(message(cause)))
                  }}
                  className="rounded-md bg-neutral-100 px-3 py-1.5 text-sm font-medium text-neutral-900"
                >
                  {playing === entry.folder ? 'Close' : 'Play'}
                </button>
                <button
                  onClick={() => void remove(entry.folder)}
                  className="rounded-md border border-neutral-700 px-3 py-1.5 text-sm text-neutral-400 hover:border-red-900 hover:text-red-300"
                >
                  Delete
                </button>
              </div>
            </div>

            {playing === entry.folder && (
              <video
                src={playbackUrls[entry.folder] ?? ''}
                controls
                autoPlay
                className="mt-3 w-full rounded-md bg-black"
              />
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}