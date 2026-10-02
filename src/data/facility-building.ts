// Office area, clear ceiling height, lease expiration, and loading-dock count from the user's "important info" sheet,
// supplied on 2026-10-02 and matched to roster facilities by address. Blank cells on the sheet stay undefined and display
// as "Not provided". The sheet's separate Moreno Valley parking-lot row (lease only, same 11/30/2031 date) is not recorded.
export type FacilityBuildingDetails = {
  officeSquareFeet?: number
  /** Clear ceiling height in feet; a pair is a range, such as 25–29 ft. */
  ceilingFeet?: number | readonly [number, number]
  /** ISO date (YYYY-MM-DD). */
  leaseExpiration?: string
  loadingDocks?: number
}

export const FACILITY_BUILDING_SOURCE_NOTE = 'From the building and lease sheet supplied by the user on 2026-10-02.'

export const facilityBuildingDetails: Partial<Record<string, FacilityBuildingDetails>> = {
  'buena-park-valley-view': { officeSquareFeet: 15_700, ceilingFeet: [25, 29], leaseExpiration: '2027-05-31', loadingDocks: 180 },
  'riverside-alessandro': { officeSquareFeet: 6_915, ceilingFeet: 36, leaseExpiration: '2028-08-31', loadingDocks: 109 },
  'moreno-valley-heacock': { officeSquareFeet: 4_978, ceilingFeet: 30, leaseExpiration: '2031-11-30', loadingDocks: 106 },
  'houston-citypark': { officeSquareFeet: 962, ceilingFeet: 22, leaseExpiration: '2030-09-30', loadingDocks: 20 },
  'roanoke-highway-114': { officeSquareFeet: 18_632, ceilingFeet: 36, leaseExpiration: '2030-10-31', loadingDocks: 34 },
  'pooler-morgan-lakes': { officeSquareFeet: 2_525, ceilingFeet: 32, leaseExpiration: '2027-08-31', loadingDocks: 122 },
  'pooler-seabrook-building-2': { officeSquareFeet: 2_700, ceilingFeet: 36, leaseExpiration: '2032-06-30', loadingDocks: 269 },
  'summerville-cypress-tradeport': { officeSquareFeet: 5_372, ceilingFeet: 40, leaseExpiration: '2028-12-31', loadingDocks: 60 },
  'tennessee-quality-drive': { officeSquareFeet: 5_882, ceilingFeet: 28, leaseExpiration: '2027-02-28', loadingDocks: 28 },
  'tacoma-lincoln': { officeSquareFeet: 7_500, ceilingFeet: 36, leaseExpiration: '2029-12-31', loadingDocks: 52 },
  'tacoma-steele': { officeSquareFeet: 2_300, ceilingFeet: 36, leaseExpiration: '2029-03-31', loadingDocks: 60 },
  'jacksonville-ignition': { officeSquareFeet: 2_800, ceilingFeet: 36, leaseExpiration: '2029-04-30', loadingDocks: 17 },
  'las-vegas-marion-building-5': { officeSquareFeet: 4_320, ceilingFeet: 30, leaseExpiration: '2028-12-31', loadingDocks: 25 },
  'el-paso-emerald-12100': { officeSquareFeet: 2_749, ceilingFeet: 36, leaseExpiration: '2027-12-31', loadingDocks: 43 },
  // The sheet leaves Long Beach's office area blank.
  'long-beach-willow': { ceilingFeet: 24, leaseExpiration: '2028-02-29', loadingDocks: 52 },
  'joliet-brandon': { officeSquareFeet: 3_000, ceilingFeet: 36, leaseExpiration: '2027-08-31', loadingDocks: 82 },
  // The sheet leaves Building 5's ceiling height and loading docks blank.
  'el-paso-emerald-12102-building-5': { officeSquareFeet: 2_758, leaseExpiration: '2028-12-31' },
}

export const getFacilityBuildingDetails = (facilityId: string) => facilityBuildingDetails[facilityId]

// Each formatter takes the wording for a missing value: the Overview says "Not provided", the Preview tour says "Pending".
export function formatOfficeArea(details?: FacilityBuildingDetails, missing = 'Not provided') {
  return details?.officeSquareFeet === undefined ? missing : `${details.officeSquareFeet.toLocaleString('en-US')} SQF`
}

export function formatCeilingHeight(details?: FacilityBuildingDetails, missing = 'Not provided') {
  const ceiling = details?.ceilingFeet
  if (ceiling === undefined) return missing
  return typeof ceiling === 'number' ? `${ceiling} ft` : `${ceiling[0]}–${ceiling[1]} ft`
}

export function formatLoadingDocks(details?: FacilityBuildingDetails, missing = 'Not provided') {
  return details?.loadingDocks === undefined ? missing : details.loadingDocks.toLocaleString('en-US')
}

export function formatLeaseExpiration(details?: FacilityBuildingDetails, missing = 'Not provided') {
  if (!details?.leaseExpiration) return missing
  const [year, month, day] = details.leaseExpiration.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}
