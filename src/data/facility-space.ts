import { getFacilitySitePlan } from './facility-site-plans'

// asOf is the 'YYYY-MM' month the warehouse reported the figure. squareFeet 0 means the site reported no open space.
// An 'unconfirmed' figure was reported but is still pending confirmation; note carries any context supplied with it.
export type FacilityAvailableSpace = { squareFeet: number; asOf: string; status?: 'unconfirmed'; note?: string }

// Warehouse-reported available square footage, refreshed monthly and keyed by facility id.
// Sites without an entry show Pending; Moreno Valley was reported as pending on 2026-10-01.
export const facilityAvailableSpace: Partial<Record<string, FacilityAvailableSpace>> = {
  // User-provided on 2026-10-01.
  'roanoke-highway-114': { squareFeet: 4_000, asOf: '2026-10' },
  // Was 5,000 SQF (2026-10-01); updated on 2026-10-02 to the same figures as Houston Navigation, per the user.
  'houston-citypark': { squareFeet: 86_000, asOf: '2026-10' },
  'tacoma-lincoln': { squareFeet: 80_000, asOf: '2026-10' },
  'tacoma-steele': { squareFeet: 0, asOf: '2026-10' },
  'kent-85th-avenue-range': { squareFeet: 0, asOf: '2026-10', note: 'No UF customer on this site' },
  'sparks-vista': { squareFeet: 8_500, asOf: '2026-10' },
  'waddell-cotton': { squareFeet: 40_000, asOf: '2026-10' },
  'west-sacramento-overland': { squareFeet: 0, asOf: '2026-10', note: 'Cubework facility (1 UF customer)' },
  'salt-lake-city-jimmy-doolittle': { squareFeet: 0, asOf: '2026-10', note: 'Cubework facility (1 UF customer)' },
  // Reported on 2026-10-01 as unconfirmed; the user confirmed it on 2026-10-02.
  'riverside-alessandro': { squareFeet: 120_000, asOf: '2026-10' },
  'somerset-cottontail': { squareFeet: 0, asOf: '2026-10' },
  'las-vegas-marion-building-5': { squareFeet: 0, asOf: '2026-10' },
  'long-beach-willow': { squareFeet: 10_000, asOf: '2026-10' },
  'joliet-brandon': { squareFeet: 110_000, asOf: '2026-10', note: 'Bulk; up to 150,000 SF with increased utilization · Rack: 3,000 pallet positions' },
  'garden-city-prosperity': { squareFeet: 0, asOf: '2026-10' },
  'university-park-central': { squareFeet: 0, asOf: '2026-10' },
  // User-provided on 2026-10-02 (first given on 2026-10-01 and mistakenly recorded as Ontario's total).
  'ontario-airport': { squareFeet: 140_000, asOf: '2026-10' },
  // User-provided on 2026-10-02 (labelled "Houston Navigation, TX (Citypark)"); the user confirmed it applies to both
  // Houston Navigation and Houston Citypark.
  'houston-navigation': { squareFeet: 86_000, asOf: '2026-10' },
  'plano-10th-f-avenue': { squareFeet: 0, asOf: '2026-10' },
}

// User-provided total square footage. It wins over a site plan's area, so it also covers plans that are missing,
// state no area, or are awaiting correction.
export const facilityTotalSquareFeet: Partial<Record<string, number>> = {
  // User-provided on 2026-10-02.
  'ontario-airport': 414_962,
  'tacoma-lincoln': 416_492,
  'tacoma-steele': 273_816,
  'waddell-cotton': 915_160,
  'kent-85th-avenue-range': 300_000,
  'west-sacramento-overland': 105_493,
  'sparks-vista': 50_000,
  'salt-lake-city-jimmy-doolittle': 89_296,
  'somerset-cottontail': 98_153,
  'university-park-central': 1_552_475,
  'houston-navigation': 238_011,
  'memphis-delp': 94_500,
  'plano-10th-f-avenue': 328_704,
  // "Total Building Area" sheet (sqf.pdf) supplied by the user on 2026-10-02; the user chose it over earlier figures for
  // these eight sites. It replaces the site-plan area for Buena Park, Quality Drive, Las Vegas, and El Paso 12100, the
  // official City Park sheet's 119,700, and the user's earlier totals for both Pooler sites and Jacksonville.
  'buena-park-valley-view': 1_075_347,
  'houston-citypark': 115_514,
  'pooler-morgan-lakes': 499_500,
  'pooler-seabrook-building-2': 1_193_920,
  'tennessee-quality-drive': 100_050,
  'jacksonville-ignition': 174_157,
  'las-vegas-marion-building-5': 169_760,
  // The sheet lists 209,153 for both El Paso sites; #14's own site plan states 93,760.
  'el-paso-emerald-12100': 209_153,
}

// Warehouse-reported bulk floor space (SF) and rack capacity (pallet positions), keyed by facility id.
// bulkUpToSquareFeet is how far bulk can stretch with increased utilization, when a site reports it.
export type FacilityBulkRack = { bulkSquareFeet?: number; bulkUpToSquareFeet?: number; rackPalletPositions?: number; asOf: string }

export const facilityBulkRack: Partial<Record<string, FacilityBulkRack>> = {
  // User-provided on 2026-10-01 (Javier Gonzalez Montane).
  'joliet-brandon': { bulkSquareFeet: 110_000, bulkUpToSquareFeet: 150_000, rackPalletPositions: 3_000, asOf: '2026-10' },
  // User-provided on 2026-10-02; "24K" and "2K" are recorded as 24,000 SF and 2,000 pallet positions.
  'houston-navigation': { bulkSquareFeet: 5_000, rackPalletPositions: 0, asOf: '2026-10' },
  'houston-citypark': { bulkSquareFeet: 5_000, rackPalletPositions: 0, asOf: '2026-10' },
  'plano-10th-f-avenue': { bulkSquareFeet: 62_000, rackPalletPositions: 0, asOf: '2026-10' },
  'jacksonville-ignition': { bulkSquareFeet: 24_000, rackPalletPositions: 2_000, asOf: '2026-10' },
  'pooler-morgan-lakes': { bulkSquareFeet: 200_000, rackPalletPositions: 0, asOf: '2026-10' },
  'el-paso-emerald-12100': { bulkSquareFeet: 0, rackPalletPositions: 0, asOf: '2026-10' },
  'el-paso-emerald-12102-building-5': { bulkSquareFeet: 0, rackPalletPositions: 0, asOf: '2026-10' },
  'summerville-cypress-tradeport': { bulkSquareFeet: 70_000, rackPalletPositions: 0, asOf: '2026-10' },
  // User-provided on 2026-10-02 (bulk only; rack stays 0 from the zero-fill below).
  'pooler-seabrook-building-2': { bulkSquareFeet: 100_000, rackPalletPositions: 0, asOf: '2026-10' },
  // User-provided on 2026-10-02.
  'buena-park-valley-view': { bulkSquareFeet: 116_048, rackPalletPositions: 16_783, asOf: '2026-10' },
  // The user asked on 2026-10-02 to record 0 bulk and 0 rack for every site still without figures.
  ...Object.fromEntries([
    'riverside-alessandro', 'moreno-valley-heacock', 'roanoke-highway-114',
    'tennessee-quality-drive', 'tacoma-lincoln', 'tacoma-steele', 'las-vegas-marion-building-5', 'long-beach-willow',
    'waddell-cotton', 'ontario-airport', 'kent-85th-avenue-range', 'west-sacramento-overland', 'sparks-vista',
    'memphis-delp', 'salt-lake-city-jimmy-doolittle', 'somerset-cottontail', 'garden-city-prosperity', 'university-park-central',
  ].map((facilityId) => [facilityId, { bulkSquareFeet: 0, rackPalletPositions: 0, asOf: '2026-10' }])),
}

export const getFacilityBulkRack = (facilityId: string) => facilityBulkRack[facilityId]

// Shared display wording, so the Overview, Dashboard previews, Preview tour, and PDF all read the same values the same way.
// A value nobody has reported yet reads "Pending" everywhere.

/** Bulk floor space alone ("110,000 SQF"), for compact cards. */
export function formatBulkSquareFeet(bulkRack?: FacilityBulkRack) {
  return bulkRack?.bulkSquareFeet === undefined ? 'Pending' : `${bulkRack.bulkSquareFeet.toLocaleString('en-US')} SQF`
}

/** Bulk floor space with any "up to" stretch ("110,000 SQF · up to 150,000 SQF"), for the Overview. */
export function formatBulk(bulkRack?: FacilityBulkRack) {
  const bulk = formatBulkSquareFeet(bulkRack)
  return bulkRack?.bulkSquareFeet !== undefined && bulkRack.bulkUpToSquareFeet ? `${bulk} · up to ${bulkRack.bulkUpToSquareFeet.toLocaleString('en-US')} SQF` : bulk
}

export function formatRack(bulkRack?: FacilityBulkRack) {
  if (bulkRack?.rackPalletPositions === undefined) return 'Pending'
  return `${bulkRack.rackPalletPositions.toLocaleString('en-US')} pallet positions`
}

export function formatTotalSquareFeet(totalSquareFeet?: number) {
  return totalSquareFeet === undefined ? 'Pending' : `${totalSquareFeet.toLocaleString('en-US')} SQF`
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

/** Reported available space: "80,000 SQF" or "0 SQF". Surfaces leave Available out entirely while it is unreported. */
export function formatAvailableSpace(available?: FacilityAvailableSpace) {
  if (!available) return 'Pending'
  const amount = `${available.squareFeet.toLocaleString('en-US')} SQF`
  return available.status === 'unconfirmed' ? `${amount} (not confirmed)` : amount
}

/** True when a site has reported an available figure that can be shown (not missing and not awaiting confirmation). */
export const hasReportedAvailableSpace = (available?: FacilityAvailableSpace): available is FacilityAvailableSpace =>
  available !== undefined && available.status !== 'unconfirmed'

export function formatAvailableSpaceMonth(asOf: string) {
  const [year, month] = asOf.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })
}
