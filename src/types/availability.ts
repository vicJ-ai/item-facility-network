export type PublicAvailability = { facilityId: string; squareFeet: number }
export type PublicBulkRack = { facilityId: string; bulkSquareFeet?: number; rackPalletPositions?: number }
export type AdminAvailability = {
  facilityId: string
  squareFeet: number | null
  version: number
  updatedAt: string | null
  valueSource: 'administrator' | 'source-snapshot' | 'pending'
  snapshotAsOf: string | null
  snapshotStatus: 'unconfirmed' | null
}
export type AdminFacilitySpace = AdminAvailability & {
  bulkSquareFeet: number | null
  bulkUpToSquareFeet: number | null
  bulkValueSource: 'administrator' | 'source-snapshot' | 'pending'
  rackPalletPositions: number | null
  rackValueSource: 'administrator' | 'source-snapshot' | 'pending'
  bulkRackVersion: number
  bulkRackUpdatedAt: string | null
  bulkRackSnapshotAsOf: string | null
}
export type AvailabilityHistoryEntry = {
  id: string
  facilityId: string
  oldSquareFeet: number | null
  newSquareFeet: number
  version: number
  actorIamUserId: string
  actorUsername: string
  oldValueSource: 'administrator' | 'source-snapshot' | 'pending'
  createdAt: string
}
export type AvailabilityHistoryPage = { entries: AvailabilityHistoryEntry[]; page: number; pageSize: number; total: number; totalPages: number }
export type FacilitySpaceHistoryEntry = {
  id: string
  facilityId: string
  recordType: 'combined' | 'legacy-available' | 'legacy-bulk' | 'legacy-rack'
  oldAvailableSquareFeet: number | null
  newAvailableSquareFeet: number | null
  oldAvailableValueSource: 'administrator' | 'source-snapshot' | 'pending' | null
  oldBulkSquareFeet: number | null
  newBulkSquareFeet: number | null
  oldBulkValueSource: 'administrator' | 'source-snapshot' | 'pending' | null
  oldRackPalletPositions: number | null
  newRackPalletPositions: number | null
  oldRackValueSource: 'administrator' | 'source-snapshot' | 'pending' | null
  availabilityVersion: number | null
  bulkRackVersion: number | null
  actorIamUserId: string
  actorUsername: string
  createdAt: string
}
export type FacilitySpaceHistoryPage = { entries: FacilitySpaceHistoryEntry[]; page: number; pageSize: number; total: number; totalPages: number }
