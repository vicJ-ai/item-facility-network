import type { Facility } from '../../data/facilities'
import { getRegionBoundary, type RegionBoundary } from '../../data/region-boundaries'

export type TourFacility = Facility & { coordinates: [number, number] }
export type TourRegion = { id: string; label: string; facilityNumbers: readonly number[] }

/** `hop` stops are close to the previous stop, so the camera slides over instead of flying. */
export type TourStop = { facility: TourFacility; kind: 'flight' | 'hop'; index: number }
export type TourChapter = { regionId: string; label: string; number: number; boundary: RegionBoundary | null; stops: TourStop[] }

/** West to east. This list is the only thing that decides the chapter order. */
export const CHAPTER_ORDER = [
  'washington',
  'northern-california',
  'southern-california',
  'nevada',
  'utah',
  'arizona',
  'texas',
  'illinois',
  'tennessee',
  'florida',
  'georgia',
  'south-carolina',
  'new-jersey',
] as const

/** Stops within this distance of the previous stop slide over rather than fly. */
export const HOP_DISTANCE_KM = 80

/** Showcase pace, in seconds: about four and a half minutes per loop. */
export const TIMING = {
  opening: 6,
  chapterIntro: 2.5,
  /** The hold on the region after its last facility, before the tour moves on. */
  regionOutro: 1.5,
  liftOff: 0.4,
  travelMin: 1.5,
  travelMax: 3.5,
  arrive: 0.8,
  /** Every facility is held this long, whether the camera flew or hopped there. */
  stay: 4.5,
  hopSlide: 1.2,
  finale: 8,
  /** Reduced motion replaces every move with a cut and holds each stop this long. */
  reducedStay: 5,
} as const

const EARTH_RADIUS_KM = 6371
const DEG = Math.PI / 180

export function distanceKm([latitudeA, longitudeA]: [number, number], [latitudeB, longitudeB]: [number, number]) {
  const dLatitude = (latitudeB - latitudeA) * DEG
  const dLongitude = (longitudeB - longitudeA) * DEG
  const a = Math.sin(dLatitude / 2) ** 2 + Math.cos(latitudeA * DEG) * Math.cos(latitudeB * DEG) * Math.sin(dLongitude / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)))
}

/** Nearest-neighbour order, starting from the facility closest to `from` (or the westernmost one). */
function orderStops(facilities: TourFacility[], from: [number, number] | null) {
  const remaining = [...facilities]
  const ordered: TourFacility[] = []
  let current = from
  while (remaining.length > 0) {
    let best = 0
    for (let index = 1; index < remaining.length; index += 1) {
      const candidate = remaining[index]
      const incumbent = remaining[best]
      const closer = current
        ? distanceKm(current, candidate.coordinates) < distanceKm(current, incumbent.coordinates)
        : candidate.coordinates[1] < incumbent.coordinates[1]
      if (closer) best = index
    }
    const [next] = remaining.splice(best, 1)
    ordered.push(next)
    current = next.coordinates
  }
  return ordered
}

export function buildTour(facilities: readonly Facility[], regions: readonly TourRegion[]): TourChapter[] {
  const chapters: TourChapter[] = []
  let previous: [number, number] | null = null
  let index = 0
  for (const regionId of CHAPTER_ORDER) {
    const region = regions.find((candidate) => candidate.id === regionId)
    if (!region) continue
    const members = facilities.filter((facility): facility is TourFacility => facility.coordinates !== null && region.facilityNumbers.includes(facility.number))
    if (members.length === 0) continue
    const stops = orderStops(members, previous).map((facility) => {
      const kind: TourStop['kind'] = previous && distanceKm(previous, facility.coordinates) <= HOP_DISTANCE_KM ? 'hop' : 'flight'
      previous = facility.coordinates
      return { facility, kind, index: index++ }
    })
    chapters.push({ regionId, label: region.label, number: chapters.length + 1, boundary: getRegionBoundary(regionId), stops })
  }
  return chapters
}
