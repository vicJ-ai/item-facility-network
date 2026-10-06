import { useCallback, useEffect, useRef, useState } from 'react'
import type { ArchiveRecords } from '../lib/facility-network'
import type { AdminArchive, PublicArchive } from '../types/archive'

const sameRecords = (a: ArchiveRecords, b: ArchiveRecords) => JSON.stringify(a) === JSON.stringify(b)

/** Facilities archived by administrators, polled from the public projection so every viewer sees the same network. */
export function useFacilityArchive() {
  const [records, setRecords] = useState<ArchiveRecords>({})
  const revision = useRef(0)

  const refresh = useCallback(async (signal?: AbortSignal) => {
    const requestRevision = ++revision.current
    try {
      const response = await fetch('/api/archived', { credentials: 'same-origin', cache: 'no-store', signal })
      if (!response.ok) throw new Error('facility_archive_unavailable')
      const body = await response.json() as { archived: PublicArchive[] }
      const next: ArchiveRecords = Object.fromEntries(body.archived.map((entry) => [entry.facilityId, { date: entry.archivedOn, by: entry.archivedBy }]))
      // Keeping the same object when nothing changed stops a poll from rebuilding the network, and a running Preview tour.
      if (!signal?.aborted && requestRevision === revision.current) setRecords((current) => sameRecords(current, next) ? current : next)
    } catch {
      // On failure the last known archive stays in place; the static roster is the fallback.
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    // Polling synchronizes the public server projection with this browser view.
    // oxlint-disable-next-line react/set-state-in-effect
    void refresh(controller.signal)
    const timer = window.setInterval(() => void refresh(controller.signal), 30_000)
    return () => { controller.abort(); window.clearInterval(timer) }
  }, [refresh])

  const apply = useCallback((entry: AdminArchive) => {
    revision.current += 1
    setRecords((current) => {
      const next = { ...current }
      if (entry.archived && entry.archivedAt && entry.archivedBy) next[entry.facilityId] = { date: entry.archivedAt.slice(0, 10), by: entry.archivedBy }
      else delete next[entry.facilityId]
      return next
    })
  }, [])

  return { archiveRecords: records, applyArchive: apply }
}
