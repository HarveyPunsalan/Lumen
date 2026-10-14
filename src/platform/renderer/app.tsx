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

  const readPermissions = useCallback(() => {
    void window.lumen.getPermissions().then(setPermissions)
  }, [])

  useEffect(readPermissions, [readPermissions])

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
      </nav>
      {view === 'record' ? (
        <SourcePicker />
      ) : (
        <RecordingList onBack={() => setView('record')} />
      )}
    </>
  )
}