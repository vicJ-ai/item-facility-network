import { useCallback, useMemo } from 'react'
import { facilities, type DisplayStatus, type Facility } from '../data/facilities'
import { resolveFacilityStatus, type StatusAssignments } from '../lib/facility-display'
import { useFacilityNetwork } from '../network/facility-network-context'
import { usePersistentState } from './usePersistentState'

const STATUS_STORAGE_KEY = 'facility-status-assignments-v3'
const knownFacilityIds = new Set(facilities.map((facility) => facility.id))
const storableStatuses = new Set<unknown>(['Active', 'Coming Soon', 'Planned', 'Unassigned'])

function loadStatuses(stored: string | null): StatusAssignments {
  if (stored === null) return {}
  try {
    const saved = JSON.parse(stored) as Record<string, unknown>
    return Object.fromEntries(Object.entries(saved).filter(([id, value]) => knownFacilityIds.has(id) && storableStatuses.has(value))) as StatusAssignments
  } catch {
    return {}
  }
}

const saveStatuses = (assignments: StatusAssignments) => JSON.stringify(assignments)

/** Local status choices, saved only in this browser, layered over each facility's supplied status. */
export function useStatusOverrides() {
  const { networkFacilities } = useFacilityNetwork()
  const [assignments, setAssignments] = usePersistentState(STATUS_STORAGE_KEY, loadStatuses, saveStatuses)

  // Its identity changes only when an assignment does, so memoized views can depend on it.
  const resolveStatus = useCallback((facility: Facility) => resolveFacilityStatus(facility, assignments), [assignments])

  const assignStatus = useCallback((facility: Facility, status: DisplayStatus) => {
    setAssignments((current) => ({ ...current, [facility.id]: status }))
  }, [setAssignments])

  const counts = useMemo(() => {
    const statuses = networkFacilities.map(resolveStatus)
    return {
      total: networkFacilities.length,
      active: statuses.filter((item) => item === 'Active').length,
      coming: statuses.filter((item) => item === 'Coming Soon').length,
    }
  }, [networkFacilities, resolveStatus])

  return { resolveStatus, assignStatus, counts }
}
