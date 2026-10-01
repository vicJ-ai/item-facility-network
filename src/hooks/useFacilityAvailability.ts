import { useCallback, useEffect, useState } from 'react'
import type { PublicAvailability } from '../types/availability'

export function useFacilityAvailability() {
  const [availability, setAvailability] = useState<Record<string, number>>({})
  const [error, setError] = useState(false)

  const refresh = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch('/api/availability', { credentials: 'same-origin', cache: 'no-store', signal })
      if (!response.ok) throw new Error('availability_unavailable')
      const body = await response.json() as { availability: PublicAvailability[] }
      if (!signal?.aborted) {
        setAvailability(Object.fromEntries(body.availability.map((entry) => [entry.facilityId, entry.squareFeet])))
        setError(false)
      }
    } catch {
      if (!signal?.aborted) setError(true)
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

  const apply = useCallback((entry: PublicAvailability) => {
    setAvailability((current) => ({ ...current, [entry.facilityId]: entry.squareFeet }))
    setError(false)
  }, [])

  return { availability, availabilityError: error, applyAvailability: apply, refreshAvailability: refresh }
}
