/**
 * Pick what to record. The Week 1 gate: one Window in, one file on disk.
 *
 * How a screen looks is design.md. How the React works is react.md.
 */

import { useEffect, useState } from 'react'
import type { PermissionReport } from '@lumen/modules/capture/types'
import { SourcePicker } from './features/capture/SourcePicker'

export function App() {
  const [permissions, setPermissions] = useState<PermissionReport | null>(null)

  useEffect(() => {
    // Subscribes to the main process, so it returns a cleanup.
    void window.lumen.getPermissions().then(setPermissions)
  }, [])

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
          onClick={() => void window.lumen.openScreenRecordingSettings()}
          className="mt-4 rounded-md bg-neutral-100 px-3 py-1.5 text-sm font-medium text-neutral-900"
        >
          Open System Settings
        </button>
      </div>
    )
  }

  return <SourcePicker />
}