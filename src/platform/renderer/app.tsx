/**
 * The root screen: pick a source and record, or open the Library.
 *
 * How a screen looks is design.md. How the React works is react.md.
 */

import { useCallback, useEffect, useState } from 'react'
import type { PermissionReport } from '@lumen/modules/capture/types'
import { SourcePicker } from './features/capture/SourcePicker'
import { RecordingList } from './features/library/RecordingList'

type View = 'record' | 'library'

export function App() {
  const [permissions, setPermissions] = useState<PermissionReport | null>(null)
  const [view, setView] = useState<View>('record')
  // Bumped when a Save finishes, so the Library reloads even while it is open.
  const [libraryVersion, setLibraryVersion] = useState(0)
  // Owned here, not in SourcePicker. Switching screens must not hide a Save.
  const [exporting, setExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)

  const readPermissions = useCallback(() => {
    void window.lumen.getPermissions().then(setPermissions)
  }, [])

  const markSaved = useCallback(() => {
    setLibraryVersion((version) => version + 1)
  }, [])

  useEffect(readPermissions, [readPermissions])
  // The preload returns its unsubscribe, so the listener goes with the screen.
  useEffect(() => window.lumen.onExportProgress(setExportProgress), [])

  if (permissions === null) {
    return <p className="p-8 text-neutral-500">Checking permissions...</p>
  }

  if (permissions.screen !== 'granted') {
    return (
      <div className="p-8">
        <h1 className="text-lg font-medium">Screen recording access is required</h1>
        <p className="mt-2 max-w-prose text-neutral-400">
          macOS will not let Lumen capture anything without it. Enable Screen Recording for
          Lumen, then restart the app.
        </p>
        <button
          onClick={() => {
            void window.lumen.openScreenRecordingSettings()
            readPermissions()
          }}
          className="mt-4 rounded-md bg-neutral-100 px-3 py-1.5 text-sm font-medium text-neutral-900"
        >
          Open System Settings
        </button>
      </div>
    )
  }

  return (
    <>
      <nav className="flex gap-1 border-b border-neutral-800 px-8 py-2">
        <button
          onClick={() => setView('record')}
          className={`rounded-md px-3 py-1.5 text-sm ${
            view === 'record'
              ? 'bg-neutral-800 text-neutral-100'
              : 'text-neutral-500 hover:text-neutral-300'
          }`}
        >
          Record
        </button>
        <button
          onClick={() => setView('library')}
          className={`rounded-md px-3 py-1.5 text-sm ${
            view === 'library'
              ? 'bg-neutral-800 text-neutral-100'
              : 'text-neutral-500 hover:text-neutral-300'
          }`}
        >
          Library
        </button>
        {exporting && (
          <span className="ml-auto flex items-center gap-2 text-xs text-neutral-400">
            <span className="h-1.5 w-24 overflow-hidden rounded-full bg-neutral-800">
              <span
                className="block h-full bg-neutral-200"
                style={{ width: `${Math.round(exportProgress * 100)}%` }}
              />
            </span>
            Saving {Math.round(exportProgress * 100)}%
          </span>
        )}
      </nav>
      {/* Both screens stay mounted. A Save belongs to the app, not to the
          visible screen, so switching to the Library must not drop it. */}
      <div className={view === 'record' ? '' : 'hidden'}>
        <SourcePicker
          progress={exportProgress}
          onExportingChange={setExporting}
          onSaved={markSaved}
        />
      </div>
      <div className={view === 'library' ? '' : 'hidden'}>
        <RecordingList
          active={view === 'library'}
          refreshKey={libraryVersion}
          onBack={() => setView('record')}
        />
      </div>
    </>
  )
}