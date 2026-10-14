/**
 * Drag a rectangle over a preview of the Display to choose a Region.
 *
 * The box only appears while the mouse is held, not when it merely moves over
 * the preview. Once it exists it can be resized from eight handles and moved
 * from the inside, so a slightly wrong box is adjusted rather than redrawn.
 * Any size is allowed. There is no snapping.
 *
 * Coordinates come back in the Source's own pixels, because a Retina display
 * reports twice the resolution and the crop would otherwise land in the wrong
 * place. See system-design.md, Known constraints.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Region, Source } from '@lumen/modules/capture/types'
import { mapRegionToPixels } from '@lumen/modules/capture/renderer/region-cropper'

interface Point {
  x: number
  y: number
}

type Handle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'move'

const HANDLES: ReadonlyArray<{ id: Handle; x: number; y: number; cursor: string }> = [
  { id: 'nw', x: 0, y: 0, cursor: 'nwse-resize' },
  { id: 'n', x: 0.5, y: 0, cursor: 'ns-resize' },
  { id: 'ne', x: 1, y: 0, cursor: 'nesw-resize' },
  { id: 'e', x: 1, y: 0.5, cursor: 'ew-resize' },
  { id: 'se', x: 1, y: 1, cursor: 'nwse-resize' },
  { id: 's', x: 0.5, y: 1, cursor: 'ns-resize' },
  { id: 'sw', x: 0, y: 1, cursor: 'nesw-resize' },
  { id: 'w', x: 0, y: 0.5, cursor: 'ew-resize' },
]

/** How close the pointer has to be to a handle to grab it, in CSS pixels. */
const GRAB_RADIUS = 8

function normalise(a: Point, b: Point): Region {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    width: Math.abs(b.x - a.x),
    height: Math.abs(b.y - a.y),
  }
}

function resize(region: Region, handle: Handle, to: Point, bounds: DOMRect): Region {
  // Only the edges this handle owns move. The others stay put, and every value
  // is clamped so a drag cannot invert or push the box off the preview.
  let { x, y, width, height } = region

  if (handle.includes('w')) {
    const next = Math.min(Math.max(to.x, 0), region.x + region.width - 8)
    width = region.x + region.width - next
    x = next
  } else if (handle.includes('e')) {
    width = Math.min(Math.max(to.x, region.x + 8), bounds.width) - region.x
  }

  if (handle.includes('n')) {
    const next = Math.min(Math.max(to.y, 0), region.y + region.height - 8)
    height = region.y + region.height - next
    y = next
  } else if (handle.includes('s')) {
    height = Math.min(Math.max(to.y, region.y + 8), bounds.height) - region.y
  }

  return { x, y, width, height }
}

export function RegionSelector({
  screen,
  onCancel,
  onConfirm,
}: {
  screen: Source
  onCancel: () => void
  onConfirm: (region: Region) => void
}) {
  const container = useRef<HTMLDivElement | null>(null)
  const surface = useRef<HTMLDivElement | null>(null)
  const [region, setRegion] = useState<Region | null>(null)

  /**
   * The mouse button being held, kept separately from which handle it grabbed.
   * Conflating the two meant the move handler bailed out on the very first
   * drag, because no handle exists until a box does. A null `handle` with
   * `pressed` true means "drawing a brand new box".
   */
  const [pressed, setPressed] = useState(false)
  const [handle, setHandle] = useState<Handle | null>(null)
  const [origin, setOrigin] = useState<Point | null>(null)

  const pointOf = useCallback((clientX: number, clientY: number): Point => {
    const box = surface.current?.getBoundingClientRect()
    if (box === undefined || box === null) return { x: 0, y: 0 }
    return {
      x: Math.min(Math.max(clientX - box.left, 0), box.width),
      y: Math.min(Math.max(clientY - box.top, 0), box.height),
    }
  }, [])

  /** The handle under the pointer, if any. Wins over starting a new box. */
  function handleAt(point: Point): Handle | null {
    if (region === null) return null
    const box = surface.current?.getBoundingClientRect()
    if (box === undefined || box === null) return null

    for (const entry of HANDLES) {
      const cx = region.x + region.width * entry.x
      const cy = region.y + region.height * entry.y
      if (Math.abs(point.x - cx) <= GRAB_RADIUS && Math.abs(point.y - cy) <= GRAB_RADIUS) {
        return entry.id
      }
    }

    const inside =
      point.x > region.x && point.x < region.x + region.width &&
      point.y > region.y && point.y < region.y + region.height
    return inside ? 'move' : null
  }

  function onMouseDown(event: React.MouseEvent) {
    const point = pointOf(event.clientX, event.clientY)
    setPressed(true)
    setHandle(handleAt(point))
    setOrigin(point)
  }

  // Only follows the pointer while a button is held. That is what stops the box
  // drawing itself as the mouse merely moves across the preview.
  function onMouseMove(event: React.MouseEvent) {
    if (!pressed || origin === null) return
    const point = pointOf(event.clientX, event.clientY)
    const box = surface.current?.getBoundingClientRect()
    if (box === undefined || box === null) return

    if (handle === 'move' && region !== null) {
      setRegion({
        ...region,
        x: Math.min(Math.max(point.x - origin.x + region.x, 0), box.width - region.width),
        y: Math.min(Math.max(point.y - origin.y + region.y, 0), box.height - region.height),
      })
      return
    }

    if (handle !== null && region !== null) {
      setRegion(resize(region, handle, point, box))
      return
    }

    // No handle, so this press is drawing a new box from the press point.
    setRegion(normalise(origin, point))
  }

  function onMouseUp() {
    setPressed(false)
    setHandle(null)
    setOrigin(null)
  }

  /** Arrow keys nudge an edge by one pixel. Shift nudges ten. */
  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'Escape') {
      onCancel()
      return
    }
    if (event.key === 'Enter') {
      confirm()
      return
    }
    if (region === null) return

    const step = event.shiftKey ? 10 : 1
    let dx = 0
    let dy = 0
    if (event.key === 'ArrowLeft') dx = -step
    else if (event.key === 'ArrowRight') dx = step
    else if (event.key === 'ArrowUp') dy = -step
    else if (event.key === 'ArrowDown') dy = step
    else return

    event.preventDefault()
    const box = surface.current?.getBoundingClientRect()
    const limitX = (box?.width ?? 0) - region.width
    const limitY = (box?.height ?? 0) - region.height

    setRegion({
      ...region,
      x: Math.min(Math.max(region.x + dx, 0), Math.max(limitX, 0)),
      y: Math.min(Math.max(region.y + dy, 0), Math.max(limitY, 0)),
    })
  }

  function confirm() {
    const box = surface.current?.getBoundingClientRect()
    if (region === null || box === undefined || box === null) return
    if (region.width < 8 || region.height < 8) return

    // The Source reports real pixels, the drag is in CSS pixels.
    onConfirm(
      mapRegionToPixels(
        region,
        screen.pixelWidth ?? Math.round(box.width),
        screen.pixelHeight ?? Math.round(box.height),
        box.width,
        box.height,
      ),
    )
  }

  useEffect(() => {
    const up = () => onMouseUp()
    window.addEventListener('mouseup', up)
    // The panel owns the arrow keys, so it takes focus without an outline.
    container.current?.focus()
    return () => window.removeEventListener('mouseup', up)
  }, [])

  return (
    <div ref={container} className="p-8" tabIndex={-1} onKeyDown={onKeyDown}>
      <h1 className="text-lg font-medium">Drag a box</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Hold the mouse and drag to any size. Drag a corner to resize, drag inside
        to move, arrow keys to nudge. Enter to confirm, Escape to cancel.
      </p>

      <div
        ref={surface}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        className="relative mt-6 w-full max-w-3xl cursor-crosshair overflow-hidden rounded-lg border border-neutral-800 bg-black select-none"
      >
        <img src={screen.thumbnail} alt="" className="block w-full" draggable={false} />
        {region !== null && (
          <>
            <div className="pointer-events-none absolute border-2 border-red-500" style={region} />
            {HANDLES.map((entry) => (
              <span
                key={entry.id}
                className="absolute h-3 w-3 rounded-sm border border-neutral-900 bg-white"
                style={{
                  left: region.x + region.width * entry.x - 6,
                  top: region.y + region.height * entry.y - 6,
                  cursor: entry.cursor,
                }}
              />
            ))}
          </>
        )}
      </div>

      <div className="mt-6 flex items-center gap-4">
        <button
          onClick={confirm}
          disabled={region === null || region.width < 8 || region.height < 8}
          className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:bg-neutral-800 disabled:text-neutral-500"
        >
          Use this region
        </button>
        <button
          onClick={onCancel}
          className="rounded-md bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-900"
        >
          Cancel
        </button>
        {region !== null && (
          <span className="text-xs text-neutral-500">
            {Math.round(region.width)} by {Math.round(region.height)}
          </span>
        )}
      </div>
    </div>
  )
}