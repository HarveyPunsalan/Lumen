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

/**
 * Grip shapes, sized to what can actually be grabbed.
 *
 * macOS draws window grips as short bars rather than dots, and the orientation
 * tells you which way the edge moves before you touch it. Squaring them all up
 * made a corner and an edge indistinguishable, which is the thing this replaces.
 *
 * The lengths are not a matter of taste. handleAt() grabs anything within
 * GRAB_RADIUS of the handle point, so the grabbable box is 2 * GRAB_RADIUS
 * square. An edge grip is that wide, and a corner's arms reach half of it, so
 * no visible part of a grip sits outside the area that responds to a click. A
 * grip drawn larger than its hit area is a lie the user discovers by reaching
 * for a corner and getting nothing.
 */
const EDGE_GRIP = GRAB_RADIUS * 2
const CORNER_ARM = GRAB_RADIUS
const GRIP_THICKNESS = 2

/** One dash, then a gap, repeated. Reads as stitching rather than a solid bar. */
const DASH = 3
const GAP = 2

/** Perimeter dashes. Larger than a grip, because they cross the whole Region. */
const EDGE_DASH = 6
const EDGE_GAP = 4
const EDGE_THICKNESS = 2

interface GripRect {
  readonly key: string
  readonly left: number
  readonly top: number
  readonly width: number
  readonly height: number
}

/**
 * Dash offsets along one edge of the Region.
 *
 * The count is derived from the edge length rather than fixed, so a long edge
 * gets more dashes and a short one fewer, and nothing is tied to the size of
 * any particular display. The spacing absorbs whatever is left over and the run
 * is centred, so the end gap equals the middle gap and each edge finishes
 * exactly on its corner. That is what makes the four edges meet instead of
 * stopping a few pixels short or overshooting.
 */
function edgeDashOffsets(length: number): number[] {
  if (length <= 0) return []

  const count = Math.max(1, Math.round((length + EDGE_GAP) / (EDGE_DASH + EDGE_GAP)))
  if (count === 1) return [(length - EDGE_DASH) / 2]

  const step = (length - EDGE_DASH) / (count - 1)
  const start = (length - (EDGE_DASH + (count - 1) * step)) / 2

  const offsets: number[] = []
  for (let i = 0; i < count; i += 1) offsets.push(start + i * step)
  return offsets
}

/** Every dash around the Region perimeter, in preview coordinates. */
function perimeterDashes(region: Region): GripRect[] {
  const { x, y, width, height } = region
  const rects: GripRect[] = []

  const push = (
    key: string,
    left: number,
    top: number,
    w: number,
    h: number,
  ): void => {
    rects.push({ key, left, top, width: w, height: h })
  }

  // Top and bottom run left to right, sitting on the edge line.
  for (const offset of edgeDashOffsets(width)) {
    push(`t-${String(offset)}`, x + offset, y - EDGE_THICKNESS / 2, EDGE_DASH, EDGE_THICKNESS)
    push(
      `b-${String(offset)}`,
      x + offset,
      y + height - EDGE_THICKNESS / 2,
      EDGE_DASH,
      EDGE_THICKNESS,
    )
  }

  // Left and right run top to bottom, inset from the corners so the horizontal
  // edges own the corner and the shape closes rather than double-drawing it.
  for (const offset of edgeDashOffsets(height - EDGE_DASH)) {
    const top = y + EDGE_DASH + offset
    // On a small Region the inset leaves too little room for a full dash, and
    // an unclamped dash would run past the corner the top edge already drew.
    const length = Math.max(0, Math.min(EDGE_DASH, y + height - top))
    if (length === 0) continue

    push(`l-${String(offset)}`, x - EDGE_THICKNESS / 2, top, EDGE_THICKNESS, length)
    push(
      `r-${String(offset)}`,
      x + width - EDGE_THICKNESS / 2,
      top,
      EDGE_THICKNESS,
      length,
    )
  }

  return rects
}

/**
 * Split a span into centred dashes, so a grip reads as a row of stitches
 * instead of one solid bar.
 *
 * The run is centred on the span, so a 13px stitch inside a 16px grip leaves
 * the same margin on both sides. When the span is too short for the dash and
 * gap to repeat, it falls back to a single dash rather than drawing nothing,
 * because an edge with no grip is worse than a plain one.
 */
function stitch(span: number): number[] {
  const period = DASH + GAP
  const count = Math.max(1, Math.floor((span + GAP) / period))
  const used = count * DASH + (count - 1) * GAP
  const start = (span - used) / 2

  const offsets: number[] = []
  for (let i = 0; i < count; i += 1) offsets.push(start + i * period)
  return offsets
}

/**
 * The grips for one handle, in preview coordinates.
 *
 * A corner is two stitched arms meeting at the handle point and opening inward,
 * toward the Region, which is how a macOS corner grip reads. An edge is one
 * stitched run centred on the handle point, along the edge it moves.
 */
function gripRects(entry: (typeof HANDLES)[number], region: Region): GripRect[] {
  const cx = region.x + region.width * entry.x
  const cy = region.y + region.height * entry.y
  const isCorner = entry.x !== 0.5 && entry.y !== 0.5

  // A stitched run along the horizontal axis, spanning span and starting at from.
  const horizontal = (from: number, span: number, tag: string): GripRect[] =>
    stitch(span).map((offset, index) => ({
      key: `${entry.id}-${tag}${String(index)}`,
      left: from + offset,
      top: cy - GRIP_THICKNESS / 2,
      width: DASH,
      height: GRIP_THICKNESS,
    }))

  // A stitched run along the vertical axis, spanning span and starting at from.
  const vertical = (from: number, span: number, tag: string): GripRect[] =>
    stitch(span).map((offset, index) => ({
      key: `${entry.id}-${tag}${String(index)}`,
      left: cx - GRIP_THICKNESS / 2,
      top: from + offset,
      width: GRIP_THICKNESS,
      height: DASH,
    }))

  if (!isCorner) {
    if (entry.x === 0.5) return horizontal(cx - EDGE_GRIP / 2, EDGE_GRIP, 'bar')
    return vertical(cy - EDGE_GRIP / 2, EDGE_GRIP, 'bar')
  }

  // Both arms start at the corner and reach inward, so the grip opens into the
  // Region rather than out past the preview.
  const hFrom = entry.x === 0 ? cx : cx - CORNER_ARM
  const vFrom = entry.y === 0 ? cy : cy - CORNER_ARM

  return [...horizontal(hFrom, CORNER_ARM, 'h'), ...vertical(vFrom, CORNER_ARM, 'v')]
}

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
            {perimeterDashes(region).map((dash) => (
              <span
                key={dash.key}
                className="pointer-events-none absolute rounded-full bg-red-500"
                style={{
                  left: dash.left,
                  top: dash.top,
                  width: dash.width,
                  height: dash.height,
                }}
              />
            ))}
            {HANDLES.flatMap((entry) =>
              gripRects(entry, region).map((grip) => (
                <span
                  key={grip.key}
                  className="absolute rounded-full bg-white ring-1 ring-neutral-900/70 transition-colors duration-100 hover:bg-red-500"
                  style={{
                    left: grip.left,
                    top: grip.top,
                    width: grip.width,
                    height: grip.height,
                    cursor: entry.cursor,
                  }}
                />
              )),
            )}
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