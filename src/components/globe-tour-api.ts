import { Cartesian3, Color, HeadingPitchRange, Material, Math as CesiumMath, Matrix4, PolylineCollection, type CesiumWidget, type Polyline } from 'cesium'
import type { RegionBoundary } from '../data/region-boundaries'
import type { QualitySettings } from '../lib/globe-quality'
import type { TourCameraApi } from '../lib/preview-tour/camera-api'

// Slightly above the surface, so the outline is never hidden by the globe it lies on.
const OUTLINE_HEIGHT = 40
// Rings are split into segments no longer than this, so straight chords stay above the surface.
const MAX_SEGMENT_DEGREES = 0.22
// The outline grows in this many steps, so its geometry is rebuilt at most this often per region.
const OUTLINE_STEPS = 40
const OUTLINE_COLOR = Color.fromCssColorString('#8b5cf6')
const BEACON_MS = 1400

type Ring = { positions: Cartesian3[]; distances: number[]; total: number }

function toRing(ring: readonly (readonly [number, number])[]): Ring {
  const positions: Cartesian3[] = []
  ring.forEach(([longitude, latitude], index) => {
    if (index > 0) {
      const [previousLongitude, previousLatitude] = ring[index - 1]
      const pieces = Math.ceil(Math.max(Math.abs(longitude - previousLongitude), Math.abs(latitude - previousLatitude)) / MAX_SEGMENT_DEGREES)
      for (let piece = 1; piece < pieces; piece += 1) {
        const t = piece / pieces
        positions.push(Cartesian3.fromDegrees(previousLongitude + (longitude - previousLongitude) * t, previousLatitude + (latitude - previousLatitude) * t, OUTLINE_HEIGHT))
      }
    }
    positions.push(Cartesian3.fromDegrees(longitude, latitude, OUTLINE_HEIGHT))
  })
  const distances = [0]
  for (let index = 1; index < positions.length; index += 1) distances.push(distances[index - 1] + Cartesian3.distance(positions[index - 1], positions[index]))
  return { positions, distances, total: distances[distances.length - 1] }
}

/** The part of `ring` drawn at `progress`, ending on an interpolated point so the line grows smoothly. */
function partialRing({ positions, distances, total }: Ring, progress: number) {
  if (progress >= 1) return positions
  const reached = total * Math.max(0, progress)
  let index = 1
  while (index < distances.length && distances[index] < reached) index += 1
  if (index >= positions.length) return positions
  const span = distances[index] - distances[index - 1]
  const end = Cartesian3.lerp(positions[index - 1], positions[index], span > 0 ? (reached - distances[index - 1]) / span : 0, new Cartesian3())
  return [...positions.slice(0, index), end]
}

type SavedView = { position: Cartesian3; direction: Cartesian3; up: Cartesian3 }

/** What the tour needs from the globe component that owns these pieces of the scene. */
export type GlobeTourHooks = {
  /** Fades the region highlight imagery layer. */
  setRegionOpacity: (opacity: number) => void
  /** Loads coarser imagery while the camera travels, and full detail again on arrival. */
  setFlightDetail: (coarse: boolean) => void
  settings: () => QualitySettings
}

/** The Preview tour's control over the 3D globe. */
export function createGlobeTourApi(viewer: CesiumWidget, pins: ReadonlyMap<string, HTMLElement>, hooks: GlobeTourHooks): TourCameraApi & { destroy: () => void } {
  const { scene, camera } = viewer
  const target = new Cartesian3()
  const offset = new HeadingPitchRange()
  // One primitive holds every outline ring; positions change only when the drawn length crosses a step.
  const outline = scene.primitives.add(new PolylineCollection()) as PolylineCollection
  let rings: { ring: Ring; line: Polyline }[] = []
  let step = -1
  let outlineShown = true

  const setOutline = (boundary: RegionBoundary | null) => {
    outline.removeAll()
    rings = []
    step = -1
    const glow = hooks.settings().outlineGlow
    for (const polygon of boundary ?? []) {
      const ring = toRing(polygon[0])
      // Each line owns its material: the collection destroys them one by one when lines are removed.
      const material = glow
        ? Material.fromType(Material.PolylineGlowType, { color: OUTLINE_COLOR, glowPower: 0.22 })
        : Material.fromType(Material.ColorType, { color: OUTLINE_COLOR })
      rings.push({ ring, line: outline.add({ positions: ring.positions.slice(0, 2), width: glow ? 7 : 2.5, material, show: false }) })
    }
    scene.requestRender()
  }

  return {
    lookAt: ({ longitude, latitude, range, heading, pitch }) => {
      Cartesian3.fromDegrees(longitude, latitude, 0, undefined, target)
      offset.heading = CesiumMath.toRadians(heading)
      offset.pitch = CesiumMath.toRadians(pitch)
      offset.range = range
      camera.lookAt(target, offset)
    },
    release: () => camera.lookAtTransform(Matrix4.IDENTITY),
    saveView: (): SavedView => ({ position: camera.positionWC.clone(), direction: camera.directionWC.clone(), up: camera.upWC.clone() }),
    restoreView: (view) => {
      const saved = view as SavedView
      camera.lookAtTransform(Matrix4.IDENTITY)
      camera.setView({ destination: saved.position, orientation: { direction: saved.direction, up: saved.up } })
      scene.requestRender()
    },
    setContinuousRender: (on, maxFps) => {
      scene.requestRenderMode = !on
      // Cesium treats an undefined target as uncapped, though its typings only allow numbers.
      viewer.targetFrameRate = (on ? maxFps : undefined) as number
      scene.requestRender()
    },
    waitForTiles: (maxMs) => new Promise<void>((resolve) => {
      let frames = 0
      let done = false
      const finish = () => {
        if (done) return
        done = true
        window.clearTimeout(timer)
        removeProgress()
        removeRender()
        resolve()
      }
      const timer = window.setTimeout(finish, maxMs)
      const removeProgress = scene.globe.tileLoadProgressEvent.addEventListener((queued: number) => {
        if (queued === 0 && frames > 1) finish()
      })
      // A couple of frames let the new view request its tiles before `tilesLoaded` is trusted.
      const removeRender = scene.postRender.addEventListener(() => {
        frames += 1
        if (frames > 2 && scene.globe.tilesLoaded) finish()
      })
      scene.requestRender()
    }),
    setOutline,
    setOutlineProgress: (progress) => {
      const next = Math.round(Math.min(1, Math.max(0, progress)) * OUTLINE_STEPS)
      if (next === step) return
      step = next
      for (const { ring, line } of rings) {
        const drawn = partialRing(ring, next / OUTLINE_STEPS)
        line.show = next > 0 && drawn.length >= 2
        if (line.show) line.positions = drawn
      }
      scene.requestRender()
    },
    setHighlightOpacity: (opacity) => {
      hooks.setRegionOpacity(opacity)
      // The glowing outline cannot fade by itself, so it hides once the highlight is mostly gone.
      const show = opacity > 0.35
      if (show !== outlineShown) {
        outlineShown = show
        outline.show = show
      }
    },
    setFlightDetail: hooks.setFlightDetail,
    pulsePin: (facilityId) => {
      const pin = pins.get(facilityId)
      if (!pin) return
      pin.classList.remove('is-beacon')
      void pin.offsetWidth
      pin.classList.add('is-beacon')
      window.setTimeout(() => pin.classList.remove('is-beacon'), BEACON_MS)
    },
    destroy: () => {
      hooks.setRegionOpacity(1)
      hooks.setFlightDetail(false)
      if (!outline.isDestroyed()) scene.primitives.remove(outline)
    },
  }
}
