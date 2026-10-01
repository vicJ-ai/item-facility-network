import { getFacilitySitePlan } from './facility-site-plans'

// asOf is the 'YYYY-MM' month the warehouse reported the figure.
export type FacilityAvailableSpace = { squareFeet: number; asOf: string }

// Warehouse-reported available square footage, refreshed monthly and keyed by facility id.
// Empty until warehouses supply figures, e.g. 'buena-park-valley-view': { squareFeet: 120_000, asOf: '2026-10' }.
export const facilityAvailableSpace: Partial<Record<string, FacilityAvailableSpace>> = {}

export type FacilitySquareFootage = { totalSquareFeet?: number; available?: FacilityAvailableSpace }

// Total square footage is the first numeric SF fact on the supplied site plan (the building or facility area).
export function getFacilitySquareFootage(facilityId: string): FacilitySquareFootage {
  const areaFact = getFacilitySitePlan(facilityId)?.facts.find((fact) => fact.unit === 'SF' && typeof fact.value === 'number')
  return {
    totalSquareFeet: typeof areaFact?.value === 'number' ? areaFact.value : undefined,
    available: facilityAvailableSpace[facilityId],
  }
}

export function formatAvailableSpaceMonth(asOf: string) {
  const [year, month] = asOf.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })
}
