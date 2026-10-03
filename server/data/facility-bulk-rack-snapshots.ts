export type FacilityBulkRackSnapshot = {
  bulkSquareFeet?: number
  bulkUpToSquareFeet?: number
  rackPalletPositions?: number
  asOf: string
}

// Keep this server projection aligned with src/data/facility-space.ts. These values are
// read-only fallbacks, never database seeds; administrator values override each field.
export const facilityBulkRackSnapshots: Partial<Record<string, FacilityBulkRackSnapshot>> = {
  'joliet-brandon': { bulkSquareFeet: 110_000, bulkUpToSquareFeet: 150_000, rackPalletPositions: 3_000, asOf: '2026-10' },
  'houston-navigation': { bulkSquareFeet: 5_000, rackPalletPositions: 0, asOf: '2026-10' },
  'houston-citypark': { bulkSquareFeet: 5_000, rackPalletPositions: 0, asOf: '2026-10' },
  'plano-10th-f-avenue': { bulkSquareFeet: 62_000, rackPalletPositions: 0, asOf: '2026-10' },
  'jacksonville-ignition': { bulkSquareFeet: 24_000, rackPalletPositions: 2_000, asOf: '2026-10' },
  'pooler-morgan-lakes': { bulkSquareFeet: 200_000, rackPalletPositions: 0, asOf: '2026-10' },
  'el-paso-emerald-12100': { bulkSquareFeet: 0, rackPalletPositions: 0, asOf: '2026-10' },
  'el-paso-emerald-12102-building-5': { bulkSquareFeet: 0, rackPalletPositions: 0, asOf: '2026-10' },
  'summerville-cypress-tradeport': { bulkSquareFeet: 70_000, rackPalletPositions: 0, asOf: '2026-10' },
  'pooler-seabrook-building-2': { bulkSquareFeet: 100_000, rackPalletPositions: 0, asOf: '2026-10' },
  'buena-park-valley-view': { bulkSquareFeet: 116_048, rackPalletPositions: 16_783, asOf: '2026-10' },
  ...Object.fromEntries([
    'riverside-alessandro', 'moreno-valley-heacock', 'roanoke-highway-114',
    'tennessee-quality-drive', 'tacoma-lincoln', 'tacoma-steele', 'las-vegas-marion-building-5', 'long-beach-willow',
    'waddell-cotton', 'ontario-airport', 'kent-85th-avenue-range', 'west-sacramento-overland', 'sparks-vista',
    'memphis-delp', 'salt-lake-city-jimmy-doolittle', 'somerset-cottontail', 'garden-city-prosperity', 'university-park-central',
  ].map((facilityId) => [facilityId, { bulkSquareFeet: 0, rackPalletPositions: 0, asOf: '2026-10' }])),
}
