import { getFacilitySitePlan } from './facility-site-plans'

// asOf is the 'YYYY-MM' month the warehouse reported the figure. squareFeet 0 means the site reported no open space.
// An 'unconfirmed' figure was reported but is still pending confirmation; note carries any context supplied with it.
export type FacilityAvailableSpace = { squareFeet: number; asOf: string; status?: 'unconfirmed'; note?: string }

// Warehouse-reported available square footage, refreshed monthly and keyed by facility id.
// Sites without an entry show Pending; Moreno Valley was reported as pending on 2026-10-01.
export const facilityAvailableSpace: Partial<Record<string, FacilityAvailableSpace>> = {
  // User-provided on 2026-10-01.
  'roanoke-highway-114': { squareFeet: 4_000, asOf: '2026-10' },
  'houston-citypark': { squareFeet: 5_000, asOf: '2026-10' },
  'tacoma-lincoln': { squareFeet: 80_000, asOf: '2026-10' },
  'tacoma-steele': { squareFeet: 0, asOf: '2026-10' },
  'kent-85th-avenue-range': { squareFeet: 0, asOf: '2026-10', note: 'No UF customer on this site' },
  'sparks-vista': { squareFeet: 8_500, asOf: '2026-10' },
  'waddell-cotton': { squareFeet: 40_000, asOf: '2026-10' },
  'west-sacramento-overland': { squareFeet: 0, asOf: '2026-10', note: 'Cubework facility (1 UF customer)' },
  'salt-lake-city-jimmy-doolittle': { squareFeet: 0, asOf: '2026-10', note: 'Cubework facility (1 UF customer)' },
  'riverside-alessandro': { squareFeet: 120_000, asOf: '2026-10', status: 'unconfirmed' },
  'somerset-cottontail': { squareFeet: 0, asOf: '2026-10' },
  'las-vegas-marion-building-5': { squareFeet: 0, asOf: '2026-10' },
  'long-beach-willow': { squareFeet: 10_000, asOf: '2026-10' },
  'joliet-brandon': { squareFeet: 110_000, asOf: '2026-10', note: 'Bulk; up to 150,000 SF with increased utilization · Rack: 3,000 pallet positions' },
}

// Warehouse-reported bulk floor space (SF) and rack capacity (pallet positions), keyed by facility id.
// bulkUpToSquareFeet is how far bulk can stretch with increased utilization, when a site reports it.
export type FacilityBulkRack = { bulkSquareFeet?: number; bulkUpToSquareFeet?: number; rackPalletPositions?: number; asOf: string }

export const facilityBulkRack: Partial<Record<string, FacilityBulkRack>> = {
  // User-provided on 2026-10-01 (Javier Gonzalez Montane).
  'joliet-brandon': { bulkSquareFeet: 110_000, bulkUpToSquareFeet: 150_000, rackPalletPositions: 3_000, asOf: '2026-10' },
}

export const getFacilityBulkRack = (facilityId: string) => facilityBulkRack[facilityId]

export function formatBulk(bulkRack?: FacilityBulkRack) {
  if (bulkRack?.bulkSquareFeet === undefined) return 'Not provided'
  const bulk = `${bulkRack.bulkSquareFeet.toLocaleString('en-US')} SF`
  return bulkRack.bulkUpToSquareFeet ? `${bulk} · up to ${bulkRack.bulkUpToSquareFeet.toLocaleString('en-US')} SF` : bulk
}

export function formatRack(bulkRack?: FacilityBulkRack) {
  if (bulkRack?.rackPalletPositions === undefined) return 'Not provided'
  return `${bulkRack.rackPalletPositions.toLocaleString('en-US')} pallet positions`
}

export type FacilitySquareFootage = { totalSquareFeet?: number; available?: FacilityAvailableSpace }

// Total square footage is the first numeric SF fact on the supplied site plan (the building or facility area).
export function getFacilitySquareFootage(facilityId: string): FacilitySquareFootage {
  const areaFact = getFacilitySitePlan(facilityId)?.facts.find((fact) => fact.unit === 'SF' && typeof fact.value === 'number')
  return {
    totalSquareFeet: typeof areaFact?.value === 'number' ? areaFact.value : undefined,
    available: facilityAvailableSpace[facilityId],
  }
}

/** Short available-space wording shared by the map preview and the Preview tour: "80,000 SQF", "None", or "Pending". */
export function formatAvailableSpace(available?: FacilityAvailableSpace) {
  if (!available) return 'Pending'
  const amount = available.squareFeet === 0 ? 'None' : `${available.squareFeet.toLocaleString('en-US')} SQF`
  return available.status === 'unconfirmed' ? `${amount} (not confirmed)` : amount
}

export function formatAvailableSpaceMonth(asOf: string) {
  const [year, month] = asOf.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })
}
