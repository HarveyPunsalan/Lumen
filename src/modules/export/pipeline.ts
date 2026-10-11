/**
 * Builds the Export pipeline: concat, crop, overlay, trim, encode.
 *
 * Each step is optional. An Isolate Window with no Frame has neither a crop
 * nor an overlay, and a Recording with no Trim skips that stage.
 *
 * Nothing here runs during capture. See ADR 0004.
 */

import type { ExportRequest } from './types.js'

/** Run the whole pipeline and write one MP4. */
export async function exportSession(_request: ExportRequest): Promise<string> {
  throw new Error('exportSession is not implemented yet.')
}

/**
 * Compose the ffmpeg argument array for a request.
 *
 * Trim uses input options (-ss and -to before -i) rather than output options,
 * because on a long Session that difference is minutes.
 */
export function buildArgs(_request: ExportRequest, _concatListPath: string): string[] {
  throw new Error('buildArgs is not implemented yet.')
}

/**
 * Map a dragged Region onto the Source's real pixel dimensions.
 *
 * A Retina display reports twice the pixel size, so a Region dragged in
 * logical coordinates lands in the wrong place without this. This is the most
 * likely bug in the pipeline. See system-design.md, Known constraints.
 */
export function mapRegionToPixels(
  region: { x: number; y: number; width: number; height: number },
  sourceWidth: number,
  sourceHeight: number,
  logicalWidth: number,
  logicalHeight: number,
): { x: number; y: number; width: number; height: number } {
  const scaleX = sourceWidth / logicalWidth
  const scaleY = sourceHeight / logicalHeight
  return {
    x: Math.round(region.x * scaleX),
    y: Math.round(region.y * scaleY),
    width: Math.round(region.width * scaleX),
    height: Math.round(region.height * scaleY),
  }
}