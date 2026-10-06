export type PublicArchive = { facilityId: string; archivedOn: string; archivedBy: string }
export type AdminArchive = {
  facilityId: string
  archived: boolean
  archivedAt: string | null
  archivedBy: string | null
  version: number
  updatedAt: string | null
}
export type ArchiveHistoryEntry = {
  id: string
  facilityId: string
  action: 'archive' | 'restore'
  version: number
  actorIamUserId: string
  actorUsername: string
  actorDisplayName: string
  createdAt: string
}
export type ArchiveHistoryPage = { entries: ArchiveHistoryEntry[]; page: number; pageSize: number; total: number; totalPages: number }
