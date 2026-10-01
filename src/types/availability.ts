export type PublicAvailability = { facilityId: string; squareFeet: number }
export type AdminAvailability = PublicAvailability & { version: number; updatedAt: string } | { facilityId: string; squareFeet: null; version: 0; updatedAt: null }
export type AvailabilityHistoryEntry = {
  id: string
  facilityId: string
  oldSquareFeet: number | null
  newSquareFeet: number
  version: number
  actorIamUserId: string
  actorUsername: string
  createdAt: string
}
export type AvailabilityHistoryPage = { entries: AvailabilityHistoryEntry[]; page: number; pageSize: number; total: number; totalPages: number }
