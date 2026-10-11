/**
 * Frame vocabulary. See CONTEXT.md.
 *
 * The Frame is the camera image placed over the Recording. It can be turned
 * off entirely, placed in any of four corners, and its background can be
 * blurred or sharp.
 */

export type FrameCorner = 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right'

export type FrameBackground = 'blurred' | 'sharp'

export interface FrameSettings {
  readonly enabled: boolean
  readonly corner: FrameCorner
  readonly background: FrameBackground
}

export const DEFAULT_FRAME_SETTINGS: FrameSettings = {
  enabled: false,
  corner: 'bottom-right',
  background: 'blurred',
}

export const FRAME_CORNERS: readonly FrameCorner[] = [
  'bottom-left',
  'bottom-right',
  'top-left',
  'top-right',
]