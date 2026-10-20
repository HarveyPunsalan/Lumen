/**
 * Enumerate Sources. Runs in the main process because desktopCapturer is not
 * available in the renderer.
 *
 * Permission is checked in permissions.ts before this is called. On macOS,
 * calling desktopCapturer without screen recording permission can leave the
 * promise pending forever rather than rejecting, which looks like a hang.
 */

import { desktopCapturer, screen } from 'electron'
import type { DesktopCapturerSource } from 'electron'
import type { Source } from '../types.js'
import { getPermissions } from './permissions.js'
import { ErrorCode, lumenError } from '../../../kernel/index.js'

/** How long an unseen window stays in the directory before list() drops it. */
const SOURCE_TTL_MS = 30_000

/**
 * Create the Source directory.
 *
 * Enumeration on macOS 26 is a race: getSources returns whichever windows
 * finished their thumbnail within Electron's three second budget, so each call
 * can return a different subset. Replacing the list meant a window present in
 * one call could vanish in the next.
 *
 * The directory merges sightings by window title (and screen id), so partial
 * results accumulate instead of replacing each other, and find() answers from
 * the list the user was actually shown rather than from a second race.
 *
 * The renderer asks repeatedly while the window picker is open. Each ask runs
 * one window enumeration; calls that arrive while one is still running share
 * it, so back-to-back asks cannot stack up. Screens are enumerated once: they
 * are reliable and the Region picker only needs their photo.
 */
export function createSourceDirectory() {
  const entries = new Map<string, { source: Source; seenAt: number }>()
  let screensLoaded = false
  let windowsInFlight: Promise<Source[]> | null = null

  const keyOf = (source: Source): string =>
    source.kind === 'screen'
      ? `screen:${source.displayId ?? source.id}`
      : `window:${source.name}`

  /** Merge one enumeration into the directory without losing good photos. */
  function remember(fresh: Source[], now: number): void {
    for (const source of fresh) {
      const key = keyOf(source)
      const previous = entries.get(key)?.source
      const thumbnail =
        source.thumbnail === '' && previous !== undefined ? previous.thumbnail : source.thumbnail
      entries.set(key, { source: { ...source, thumbnail }, seenAt: now })
    }
  }

  /** One window enumeration at a time, shared by every caller asking at once. */
  function listWindows(): Promise<Source[]> {
    if (windowsInFlight === null) {
      windowsInFlight = enumerateWindows().finally(() => {
        windowsInFlight = null
      })
    }
    return windowsInFlight
  }

  return {
    /** Merge fresh results into the directory, and return everything visible. */
    async list(): Promise<Source[]> {
      if (!screensLoaded) {
        remember(await enumerateScreens(), Date.now())
        screensLoaded = true
      }

      remember(await listWindows(), Date.now())

      // A window that closed disappears by expiry, not by a missing sighting:
      // one bad enumeration should not erase a window the user can still see.
      // Screens are not dropped; they are enumerated once and never re-asked.
      const now = Date.now()
      for (const [key, entry] of entries) {
        if (entry.source.kind === 'window' && now - entry.seenAt > SOURCE_TTL_MS) {
          entries.delete(key)
        }
      }

      return [...entries.values()].map((entry) => entry.source)
    },

    /**
     * Resolve a pick against what the user saw.
     *
     * The renderer only supplies lookup keys, an id and, for windows, a title.
     * The returned Source is always one this process enumerated, so a tampered
     * renderer cannot invent a Source or a name. See SECURITY.md, Do not trust
     * the renderer.
     *
     * macOS 26 can also renumber a window id between enumerations of the same
     * window (window:117435:0 becomes window:120113:0), so the exact title is
     * the fallback for windows only.
     */
    find(sourceId: unknown, sourceName?: unknown): Source {
      if (typeof sourceId !== 'string' || sourceId.length === 0) {
        throw lumenError(ErrorCode.PermissionDenied, 'No Source was picked.')
      }

      const all = [...entries.values()].map((entry) => entry.source)
      const byId = all.find((source) => source.id === sourceId)
      if (byId !== undefined) return byId

      if (typeof sourceName === 'string' && sourceName.length > 0) {
        const byName = all.find(
          (source) => source.kind === 'window' && source.name === sourceName,
        )
        if (byName !== undefined) return byName
      }

      throw lumenError(
        ErrorCode.PermissionDenied,
        'That Source is no longer available. Pick it again.',
      )
    },
  }
}

async function ensurePermission(): Promise<void> {
  const permissions = await getPermissions()
  if (permissions.screen !== 'granted') {
    throw lumenError(
      ErrorCode.PermissionDenied,
      'Screen recording permission is not granted. Enable it in System Settings, then restart Lumen.',
    )
  }
}

/**
 * Screens, with photos. A Region is drawn on one, and a Retina Display reports
 * 2x, so the photo size here is only for the picker; the display module has
 * the real pixels.
 */
async function enumerateScreens(): Promise<Source[]> {
  await ensurePermission()
  const displays = new Map(screen.getAllDisplays().map((display) => [display.id, display]))
  const found = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { width: 1280, height: 720 },
  })

  return found.map((source) => {
    const base: Source = {
      id: source.id,
      name: source.name,
      kind: 'screen',
      thumbnail: source.thumbnail.toDataURL(),
      displayId: source.display_id,
    }

    const display = displays.get(Number(source.display_id))
    if (display === undefined) return base

    return {
      ...base,
      pixelWidth: Math.round(display.bounds.width * display.scaleFactor),
      pixelHeight: Math.round(display.bounds.height * display.scaleFactor),
    }
  })
}

/**
 * Windows, with photos. The photos are what make the enumeration take long
 * enough to see more than one window, and the grid uses them when they arrive.
 * See electron/electron#51125 for the three second budget.
 */
async function enumerateWindows(): Promise<Source[]> {
  await ensurePermission()
  const found = await desktopCapturer.getSources({
    types: ['window'],
    thumbnailSize: { width: 1280, height: 720 },
  })

  return found
    // Lumen's own windows are not worth recording.
    .filter((source) => !source.name.startsWith('Lumen'))
    .map(toWindowSource)
}

function toWindowSource(source: DesktopCapturerSource): Source {
  // The id prefix is the documented discriminator between windows and screens
  // (window:XX:YY vs screen:ZZ:0). display_id is not: Electron documents it
  // only as empty "if not available", so a window can carry one. Classifying
  // by display_id put those windows in the screen list and left the window
  // picker empty.
  return {
    id: source.id,
    name: source.name,
    kind: 'window',
    thumbnail: source.thumbnail.toDataURL(),
  }
}
