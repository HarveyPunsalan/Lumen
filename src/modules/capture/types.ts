/**
 * Capture vocabulary. See CONTEXT.md.
 *
 * A Source is something Electron can capture. A Target is the Source currently
 * being captured. Isolate and Region are the two ways of narrowing what ends
 * up in the Recording.
 */

/** What Electron returned: a monitor or a single application window. */
export type SourceKind = 'screen' | 'window'

export interface Source {
  readonly id: string
  readonly name: string
  readonly kind: SourceKind
  /** Data URL for the picker thumbnail. */
  readonly thumbnail: string
  /** Present when kind is 'screen'. */
  readonly displayId?: string
  /** The Source's real pixel size. A Retina display reports 2x. */
  readonly pixelWidth?: number
  readonly pixelHeight?: number
}

/**
 * The Source currently being captured, plus how much of it is kept.
 *
 * Narrowing is only expressed with a Region. Isolate a Window is a Target with
 * no Region: the whole window is the Recording. Full Screen is a screen Source
 * with no Region. Nothing is ever blurred or dimmed, so the three cases are
 * just a Source and an optional rectangle.
 *
 * A Region is applied live, during capture, not at Export like the Frame. If it
 * were applied at Export, whatever happened to be inside the rectangle at any
 * moment during the Session would be in the Recording, and a Script parked in
 * that area would leak into the file. See architecture.md, Effects happen at
 * Export.
 */
export interface Target {
  readonly source: Source
  /** Crop rectangle in the Source's own pixel coordinates. Absent means all of it. */
  readonly region?: Region
}

/**
 * A rectangle inside a Display, defined by dragging.
 *
 * Coordinates are in the Source's own pixel dimensions, not CSS or logical
 * ones. A Retina display reports twice the pixel size, so a rectangle dragged
 * in logical units has to be scaled before use. See mapRegionToPixels.
 */
export interface Region {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

/** What the user chose before recording started. */
export type CaptureMode = 'whole-screen' | 'selected-window' | 'region'

/**
 * Permission state as macOS reports it. Windows has no equivalent gate, so
 * anything other than granted means capture cannot start.
 */
export type PermissionState = 'granted' | 'denied' | 'restricted' | 'not-determined'

export interface PermissionReport {
  readonly screen: PermissionState
  readonly microphone: PermissionState
}