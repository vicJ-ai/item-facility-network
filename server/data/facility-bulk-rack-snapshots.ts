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
}
