import { dashboardRegions, type DashboardRegionId } from '../data/dashboard-regions'
import { networkFacilities, type Facility } from '../data/facilities'
import { hasUsableCoordinates } from './facility-display'

// Region membership is fixed by the data, so it is worked out once here rather than on every render.
// It stays out of src/data/dashboard-regions.ts, which the narration generator reads under Node.

/** Every live facility that can be pinned on the map. */
export const mappableNetworkFacilities = networkFacilities.filter(hasUsableCoordinates)

const facilitiesByRegion = new Map<DashboardRegionId, readonly Facility[]>(
  dashboardRegions.map((region) => {
    const numbers = new Set<number>(region.facilityNumbers)
    return [region.id, networkFacilities.filter((facility) => numbers.has(facility.number))]
  }),
)

/** A region's live facilities in roster order; empty when all of them are archived. */
export function getRegionFacilities(regionId: DashboardRegionId): readonly Facility[] {
  return facilitiesByRegion.get(regionId) ?? []
}
