// Camera paths for the Preview tour. A path is a pure function of progress, so the tour timeline can
// jump to any moment and get the same camera.

export type CameraPose = { longitude: number; latitude: number; range: number; heading: number; pitch: number }
type LonLat = { longitude: number; latitude: number }

const DEG = Math.PI / 180
const EARTH_RADIUS_M = 6_371_000
/** Curvature of the zoom-out; Leaflet's flyTo uses the same value. */
const RHO = 1.42
/** The visible ground width is roughly this multiple of the camera range. */
const VIEW_WIDTH_PER_RANGE = 1.2

const lerp = (from: number, to: number, t: number) => from + (to - from) * t

/** Interpolates headings the short way round, in degrees. */
export function lerpHeading(from: number, to: number, t: number) {
  const delta = ((((to - from) % 360) + 540) % 360) - 180
  return from + delta * t
}

function toVector({ longitude, latitude }: LonLat): [number, number, number] {
  const lat = latitude * DEG
  const lon = longitude * DEG
  return [Math.cos(lat) * Math.cos(lon), Math.cos(lat) * Math.sin(lon), Math.sin(lat)]
}

function angleBetween(from: LonLat, to: LonLat) {
  const a = toVector(from)
  const b = toVector(to)
  return Math.acos(Math.min(1, Math.max(-1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2])))
}

/** Point `fraction` of the way along the great circle from `from` to `to`. */
export function greatCircle(from: LonLat, to: LonLat, fraction: number): LonLat {
  const angle = angleBetween(from, to)
  if (angle < 1e-9) return { longitude: from.longitude, latitude: from.latitude }
  const a = toVector(from)
  const b = toVector(to)
  const weightA = Math.sin((1 - fraction) * angle) / Math.sin(angle)
  const weightB = Math.sin(fraction * angle) / Math.sin(angle)
  const [x, y, z] = [0, 1, 2].map((axis) => weightA * a[axis] + weightB * b[axis])
  return { longitude: Math.atan2(y, x) / DEG, latitude: Math.atan2(z, Math.hypot(x, y)) / DEG }
}

/** Initial compass bearing from `from` to `to`, in degrees. */
export function bearing(from: LonLat, to: LonLat) {
  const lat1 = from.latitude * DEG
  const lat2 = to.latitude * DEG
  const dLon = (to.longitude - from.longitude) * DEG
  const y = Math.sin(dLon) * Math.cos(lat2)
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon)
  return (Math.atan2(y, x) / DEG + 360) % 360
}

export function groundDistance(from: LonLat, to: LonLat) {
  return angleBetween(from, to) * EARTH_RADIUS_M
}

/**
 * Van Wijk & Nuij's smooth zoom-and-pan: the camera rises in proportion to the distance, crosses,
 * then descends, which keeps the perceived speed even.
 * Returns the path length `S` and the view width and distance travelled at `s`.
 */
function vanWijk(w0: number, w1: number, u1: number) {
  const rho2 = RHO * RHO
  if (u1 < 1) {
    const S = Math.abs(Math.log(w1 / w0)) / RHO
    const direction = w1 > w0 ? 1 : -1
    return { S, width: (s: number) => w0 * Math.exp(direction * RHO * s), travelled: () => 0 }
  }
  const r = (i: 0 | 1) => {
    const b = (w1 * w1 - w0 * w0 + (i ? -1 : 1) * rho2 * rho2 * u1 * u1) / (2 * (i ? w1 : w0) * rho2 * u1)
    const sq = Math.sqrt(b * b + 1) - b
    return sq < 1e-9 ? -18 : Math.log(sq)
  }
  const r0 = r(0)
  const S = (r(1) - r0) / RHO
  return {
    S,
    width: (s: number) => (w0 * Math.cosh(r0)) / Math.cosh(r0 + RHO * s),
    travelled: (s: number) => (w0 * (Math.cosh(r0) * Math.tanh(r0 + RHO * s) - Math.sinh(r0))) / rho2,
  }
}

export type Flight = { duration: number; at: (t: number) => CameraPose }

/**
 * A flight between two poses. The heading eases from `from.heading` to `to.heading` (callers set the
 * arrival heading to the direction of travel); the camera looks further down near the top of the arc.
 */
export function flight(from: CameraPose, to: CameraPose, { minDuration, maxDuration, apexPitch = -80 }: { minDuration: number; maxDuration: number; apexPitch?: number }): Flight {
  const distance = groundDistance(from, to)
  const path = vanWijk(from.range * VIEW_WIDTH_PER_RANGE, to.range * VIEW_WIDTH_PER_RANGE, distance)
  const duration = Math.min(maxDuration, Math.max(minDuration, path.S * 0.35))
  const lowest = Math.min(from.range, to.range)
  const highest = Math.max(lowest + 1, path.width(path.S / 2) / VIEW_WIDTH_PER_RANGE, from.range, to.range)
  return {
    duration,
    at: (t) => {
      const s = path.S * t
      const range = path.width(s) / VIEW_WIDTH_PER_RANGE
      const fraction = distance > 1 ? Math.min(1, Math.max(0, path.travelled(s) / distance)) : t
      const point = greatCircle(from, to, fraction)
      // Higher up, look further down; the ends keep their own pitch.
      const lift = Math.min(1, Math.max(0, (range - lowest) / (highest - lowest)))
      const basePitch = lerp(from.pitch, to.pitch, t)
      return { ...point, range, heading: lerpHeading(from.heading, to.heading, t), pitch: lerp(basePitch, apexPitch, lift) }
    },
  }
}

/** A short, low slide between nearby stops: no climb, just a slight rise mid-way. */
export function slide(from: CameraPose, to: CameraPose): (t: number) => CameraPose {
  return (t) => ({
    ...greatCircle(from, to, t),
    range: lerp(from.range, to.range, t) * (1 + 0.25 * Math.sin(Math.PI * t)),
    heading: lerpHeading(from.heading, to.heading, t),
    pitch: lerp(from.pitch, to.pitch, t),
  })
}

/** Slow orbit plus push-in while the camera stays on a stop. */
export function orbit(pose: CameraPose, degrees: number, pushIn = 0.9): (t: number) => CameraPose {
  return (t) => ({ ...pose, heading: pose.heading + degrees * t, range: pose.range * lerp(1, pushIn, t) })
}

export function lerpPose(from: CameraPose, to: CameraPose, t: number): CameraPose {
  return {
    longitude: lerp(from.longitude, to.longitude, t),
    latitude: lerp(from.latitude, to.latitude, t),
    range: from.range * (to.range / from.range) ** t,
    heading: lerpHeading(from.heading, to.heading, t),
    pitch: lerp(from.pitch, to.pitch, t),
  }
}

/** Centre and camera range that frame a region boundary, with a thin margin. */
export function frameBounds(rings: readonly (readonly (readonly [number, number])[])[]) {
  const points = rings.flat()
  const longitudes = points.map(([longitude]) => longitude)
  const latitudes = points.map(([, latitude]) => latitude)
  const [west, east, south, north] = [Math.min(...longitudes), Math.max(...longitudes), Math.min(...latitudes), Math.max(...latitudes)]
  const center = { longitude: (west + east) / 2, latitude: (south + north) / 2 }
  const width = groundDistance({ longitude: west, latitude: center.latitude }, { longitude: east, latitude: center.latitude })
  const height = groundDistance({ longitude: center.longitude, latitude: south }, { longitude: center.longitude, latitude: north })
  return { ...center, range: Math.max(width, height * 1.6, 120_000) * 1.25 }
}
