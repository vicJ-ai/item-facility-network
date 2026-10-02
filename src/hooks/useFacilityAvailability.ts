import { useCallback, useEffect, useRef, useState } from 'react'
import type { PublicAvailability, PublicBulkRack } from '../types/availability'

export function useFacilityAvailability() {
  const [availability, setAvailability] = useState<Record<string, number>>({})
  const [bulkRack, setBulkRack] = useState<Record<string, Omit<PublicBulkRack, 'facilityId'>>>({})
  const [error, setError] = useState(false)
  const revision = useRef(0)

  const refresh = useCallback(async (signal?: AbortSignal) => {
    const requestRevision = ++revision.current
    try {
      const [availabilityResponse, bulkRackResponse] = await Promise.all([
        fetch('/api/availability', { credentials: 'same-origin', cache: 'no-store', signal }),
        fetch('/api/bulk-rack', { credentials: 'same-origin', cache: 'no-store', signal }),
      ])
      if (!availabilityResponse.ok || !bulkRackResponse.ok) throw new Error('facility_space_unavailable')
      const body = await availabilityResponse.json() as { availability: PublicAvailability[] }
      const bulkRackBody = await bulkRackResponse.json() as { bulkRack: PublicBulkRack[] }
      if (!signal?.aborted && requestRevision === revision.current) {
        setAvailability(Object.fromEntries(body.availability.map((entry) => [entry.facilityId, entry.squareFeet])))
        setBulkRack(Object.fromEntries(bulkRackBody.bulkRack.map(({ facilityId, ...entry }) => [facilityId, entry])))
        setError(false)
      }
    } catch {
      if (!signal?.aborted && requestRevision === revision.current) setError(true)
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
    revision.current += 1
    setAvailability((current) => ({ ...current, [entry.facilityId]: entry.squareFeet }))
    setError(false)
  }, [])

  const applyBulkRack = useCallback((entry: PublicBulkRack) => {
    revision.current += 1
    const { facilityId, ...values } = entry
    setBulkRack((current) => ({ ...current, [facilityId]: { ...current[facilityId], ...values } }))
    setError(false)
  }, [])

  return { availability, bulkRack, availabilityError: error, applyAvailability: apply, applyBulkRack, refreshAvailability: refresh }
}
