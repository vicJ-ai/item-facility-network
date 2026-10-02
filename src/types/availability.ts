export type PublicAvailability = { facilityId: string; squareFeet: number }
export type AdminAvailability = {
  facilityId: string
  squareFeet: number | null
  version: number
  updatedAt: string | null
  valueSource: 'administrator' | 'source-snapshot' | 'pending'
  snapshotAsOf: string | null
  snapshotStatus: 'unconfirmed' | null
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
