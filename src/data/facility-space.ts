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
  'garden-city-prosperity': { squareFeet: 0, asOf: '2026-10' },
  'university-park-central': { squareFeet: 0, asOf: '2026-10' },
}

// User-provided total square footage. It wins over a site plan's area, so it also covers plans that are missing,
// state no area, or are awaiting correction.
export const facilityTotalSquareFeet: Partial<Record<string, number>> = {
  // User-provided on 2026-10-01.
  'ontario-airport': 140_000,
  // User-provided on 2026-10-02.
  'tacoma-lincoln': 416_492,
  'tacoma-steele': 273_816,
  'waddell-cotton': 915_160,
  'kent-85th-avenue-range': 300_000,
  'west-sacramento-overland': 105_493,
  'sparks-vista': 50_000,
  'salt-lake-city-jimmy-doolittle': 89_296,
  'somerset-cottontail': 98_153,
  'university-park-central': 1_552_475,
  // User-provided on 2026-10-02; the official Pooler Seabrook and Jacksonville sheets state no area.
  'pooler-seabrook-building-2': 499_500,
  'jacksonville-ignition': 556_924,
  'houston-navigation': 238_011,
  'memphis-delp': 94_500,
  'plano-10th-f-avenue': 328_704,
  // User-provided on 2026-10-02. Its site plan still states 499,500 SF; the user will replace the plan later.
  'pooler-morgan-lakes': 302_400,
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
  const bulk = `${bulkRack.bulkSquareFeet.toLocaleString('en-US')} SQF`
  return bulkRack.bulkUpToSquareFeet ? `${bulk} · up to ${bulkRack.bulkUpToSquareFeet.toLocaleString('en-US')} SQF` : bulk
}

export function formatRack(bulkRack?: FacilityBulkRack) {
  if (bulkRack?.rackPalletPositions === undefined) return 'Not provided'
  return `${bulkRack.rackPalletPositions.toLocaleString('en-US')} pallet positions`
}

export type FacilitySquareFootage = { totalSquareFeet?: number; available?: FacilityAvailableSpace }

/** The site plan's building or facility area: its first numeric SF fact. */
export const getSitePlanAreaFact = (facilityId: string) =>
  getFacilitySitePlan(facilityId)?.facts.find((fact) => fact.unit === 'SF' && typeof fact.value === 'number')

// Total square footage is the user-provided total when one exists, otherwise the site plan's area,
// so a newer figure replaces a plan awaiting correction.
export function getFacilitySquareFootage(facilityId: string): FacilitySquareFootage {
  const areaFact = getSitePlanAreaFact(facilityId)
  return {
    totalSquareFeet: facilityTotalSquareFeet[facilityId] ?? (typeof areaFact?.value === 'number' ? areaFact.value : undefined),
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
