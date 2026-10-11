/**
 * The Frame processor interface. This is the seam the Week 3 spike plugs into.
 *
 * Two candidates were considered:
 *
 *   macOS Vision  VNGeneratePersonSegmentationRequest. Runs on the local M1,
 *                 no model download, no API cost, best edge quality. Reached
 *                 from Electron through a Swift native addon, because Node
 *                 cannot load Swift directly and needs an Objective-C bridge.
 *                 Reports of real-time lag exist.
 *
 *   MediaPipe     Pure JavaScript, no native build, works on Windows. Blurrier
 *                 edges and a large dependency.
 *
 * Whichever wins, or if neither does, it lives behind FrameProcessor and
 * nothing outside this module learns which one it is.
 *
 * This is the only effect in Lumen that runs during capture rather than at
 * Export, because segmentation cannot be applied to a 90 minute file
 * afterwards in reasonable time. ADR 0004.
 */

import type { FrameBackground } from './types.js'

/** One frame from the camera, as a browser ImageBitmap or similar. */
export type FrameBitmapSource = unknown

export interface FrameProcessor {
  /** Whether this processor can run on the current platform and hardware. */
  isAvailable(): Promise<boolean>

  /**
   * Produce the composited Frame: the person sharp, the background treated per
   * `background`. Runs per frame while recording.
   */
  process(source: FrameBitmapSource, background: FrameBackground): Promise<FrameBitmapSource>

  /** Release native resources. Called on Stop and on every failure path. */
  dispose(): Promise<void>
}

/**
 * No camera processing at all. Used when the Frame is enabled with a sharp
 * background, and on platforms where no implementation is available.
 */
export class PassthroughProcessor implements FrameProcessor {
  async isAvailable(): Promise<boolean> {
    return true
  }

  async process(source: FrameBitmapSource): Promise<FrameBitmapSource> {
    return source
  }

  async dispose(): Promise<void> {}
}

/**
 * Selects a processor for this platform. Not implemented until the spike
 * decides between Vision and MediaPipe.
 */
export async function selectProcessor(): Promise<FrameProcessor> {
  throw new Error('Frame processor selection is not implemented yet.')
}