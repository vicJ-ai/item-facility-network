import { useCallback, useEffect, useMemo, useState } from 'react'
import { facilities, networkFacilities } from '../data/facilities'
import { getFacilityOperatingHours } from '../data/facility-hours'
import { getFacilityOpenState, type FacilityOpenState } from '../lib/facility-open'

const CLOCK_TICK_MS = 30_000

/** The time the map shows: the live clock, or a time picked in the day/night control. */
export function useMapClock() {
  const [now, setNow] = useState(() => Date.now())
  const [customTime, setCustomTime] = useState<number | null>(null)

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), CLOCK_TICK_MS)
    return () => window.clearInterval(timer)
  }, [])

  const returnToNow = useCallback(() => {
    setNow(Date.now())
    setCustomTime(null)
  }, [])

  return { mapTime: customTime ?? now, live: customTime === null, setCustomTime, returnToNow }
}

/** Each facility's open or closed state at `time`, with the network's open-now counts. */
export function useFacilityOpenStates(time: number) {
  return useMemo(() => {
    const at = new Date(time)
    const openStates = Object.fromEntries(facilities.map((facility) => [facility.id, getFacilityOpenState(facility, getFacilityOperatingHours(facility.id), at)])) as Record<string, FacilityOpenState>
    return {
      openStates,
      openCount: networkFacilities.filter((facility) => openStates[facility.id].isOpen).length,
      withHoursCount: networkFacilities.filter((facility) => openStates[facility.id].hoursKnown).length,
    }
  }, [time])
}
