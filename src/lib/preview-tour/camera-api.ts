import type { RegionBoundary } from '../../data/region-boundaries'
import type { CameraPose } from './flight'

/** What the Preview tour needs from a map: the 3D globe implements all of it, the flat map a subset. */
export type TourCameraApi = {
  lookAt: (pose: CameraPose) => void
  /** Hands the camera back to the user's mouse and touch controls. */
  release: () => void
  saveView: () => unknown
  restoreView: (view: unknown) => void
  /** Renders every frame while `on`, optionally capped at `maxFps`. */
  setContinuousRender: (on: boolean, maxFps?: number) => void
  /** Resolves once the visible imagery has loaded, or after `maxMs`. */
  waitForTiles: (maxMs: number) => Promise<void>
  /** Draws `boundary` as an outline that reveals itself as `setOutlineProgress` goes from 0 to 1. */
  setOutline: (boundary: RegionBoundary | null) => void
  setOutlineProgress: (progress: number) => void
  /** Fades the region highlight and outline (0–1), e.g. out near the ground. */
  setHighlightOpacity: (opacity: number) => void
  /** Coarser imagery while the camera travels between stops; full detail again on arrival. */
  setFlightDetail: (coarse: boolean) => void
  pulsePin: (facilityId: string) => void
}
