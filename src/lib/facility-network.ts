import { dashboardRegions, type DashboardRegionId } from '../data/dashboard-regions'
import { facilities as rosterFacilities, isArchived, type Facility } from '../data/facilities'
import { hasUsableCoordinates } from './facility-display'

/** Administrator archives from the server, keyed by facility id. */
export type ArchiveRecords = Record<string, { date: string; by: string }>

// Region membership is worked out here rather than in src/data/dashboard-regions.ts, which the narration generator
// reads under Node.

/**
 * The roster with administrator archives applied, and the live network that maps, regions, the Preview tour, and
 * totals use. A facility archived in src/data/facilities.ts stays archived whatever the server says. Facilities that
 * are not archived keep their roster object, so memoized views only re-render for the facilities that changed.
 */
export function buildFacilityNetwork(archive: ArchiveRecords) {
  const facilities = rosterFacilities.map((facility): Facility => {
    const record = archive[facility.id]
    return record && !isArchived(facility) ? { ...facility, status: 'Archived', archived: record } : facility
  })
  const networkFacilities = facilities.filter((facility) => !isArchived(facility))
  const facilitiesByRegion = new Map<DashboardRegionId, readonly Facility[]>(
    dashboardRegions.map((region) => {
      const numbers = new Set<number>(region.facilityNumbers)
      return [region.id, networkFacilities.filter((facility) => numbers.has(facility.number))]
    }),
  )
  return {
    facilities,
    networkFacilities,
    archivedFacilities: facilities.filter(isArchived),
    /** Every live facility that can be pinned on the map. */
    mappableNetworkFacilities: networkFacilities.filter(hasUsableCoordinates),
    /** A region's live facilities in roster order; empty when all of them are archived. */
    getRegionFacilities: (regionId: DashboardRegionId): readonly Facility[] => facilitiesByRegion.get(regionId) ?? [],
  }
}

export type FacilityNetwork = ReturnType<typeof buildFacilityNetwork>
