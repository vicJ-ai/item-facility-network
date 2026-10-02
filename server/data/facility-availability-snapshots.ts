export type FacilityAvailabilitySnapshot = {
  squareFeet: number
  asOf: string
  status?: 'unconfirmed'
}

// Keep this server projection aligned with src/data/facility-space.ts. These are read-only
// user-supplied snapshots, never database seeds; persistent administrator values override them.
export const facilityAvailabilitySnapshots: Partial<Record<string, FacilityAvailabilitySnapshot>> = {
  'roanoke-highway-114': { squareFeet: 4_000, asOf: '2026-10' },
  'houston-citypark': { squareFeet: 5_000, asOf: '2026-10' },
  'tacoma-lincoln': { squareFeet: 80_000, asOf: '2026-10' },
  'tacoma-steele': { squareFeet: 0, asOf: '2026-10' },
  'kent-85th-avenue-range': { squareFeet: 0, asOf: '2026-10' },
  'sparks-vista': { squareFeet: 8_500, asOf: '2026-10' },
  'waddell-cotton': { squareFeet: 40_000, asOf: '2026-10' },
  'west-sacramento-overland': { squareFeet: 0, asOf: '2026-10' },
  'salt-lake-city-jimmy-doolittle': { squareFeet: 0, asOf: '2026-10' },
  'riverside-alessandro': { squareFeet: 120_000, asOf: '2026-10', status: 'unconfirmed' },
  'somerset-cottontail': { squareFeet: 0, asOf: '2026-10' },
  'las-vegas-marion-building-5': { squareFeet: 0, asOf: '2026-10' },
  'long-beach-willow': { squareFeet: 10_000, asOf: '2026-10' },
  'joliet-brandon': { squareFeet: 110_000, asOf: '2026-10' },
  'garden-city-prosperity': { squareFeet: 0, asOf: '2026-10' },
  'university-park-central': { squareFeet: 0, asOf: '2026-10' },
}
