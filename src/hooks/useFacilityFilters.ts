import { useCallback, useMemo, useState } from 'react'
import { facilities as rosterFacilities, searchableFacilityText, type DisplayStatus, type Facility, type FacilityType } from '../data/facilities'
import { hasUsableCoordinates } from '../lib/facility-display'
import { useFacilityNetwork } from '../network/facility-network-context'

export type StatusFilter = 'All' | DisplayStatus
export type FacilityTypeFilter = 'All' | FacilityType

const stateAbbreviations = new Set(rosterFacilities.map((facility) => facility.state.toLowerCase()))

/** The directory's search text and status and type filters, and the facilities they leave. */
export function useFacilityFilters(resolveStatus: (facility: Facility) => DisplayStatus) {
  const { facilities } = useFacilityNetwork()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All')
  const [typeFilter, setTypeFilter] = useState<FacilityTypeFilter>('All')

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    const isStateAbbreviation = query.length === 2 && stateAbbreviations.has(query)
    return facilities.filter((facility) => {
      const matchesText = !query || (isStateAbbreviation ? facility.state.toLowerCase() === query : searchableFacilityText(facility).includes(query))
      const matchesFacilityType = typeFilter === 'All' || facility.facilityType === typeFilter
      const currentStatus = resolveStatus(facility)
      // Archived facilities stay out of the list unless the Archived filter is chosen.
      const matchesStatus = statusFilter === 'Archived' ? currentStatus === 'Archived' : currentStatus !== 'Archived' && (statusFilter === 'All' || currentStatus === statusFilter)
      return matchesText && matchesFacilityType && matchesStatus
    })
  }, [facilities, resolveStatus, search, statusFilter, typeFilter])

  const mappable = useMemo(() => filtered.filter(hasUsableCoordinates), [filtered])

  const clearFilters = useCallback(() => {
    setSearch('')
    setStatusFilter('All')
    setTypeFilter('All')
  }, [])

  return { search, setSearch, statusFilter, setStatusFilter, typeFilter, setTypeFilter, filtered, mappable, clearFilters }
}
