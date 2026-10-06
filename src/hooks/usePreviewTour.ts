import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { dashboardRegions } from '../data/dashboard-regions'
import { getRegionBoundary } from '../data/region-boundaries'
import type { TourCameraApi } from '../lib/preview-tour/camera-api'
import { buildTour } from '../lib/preview-tour/script'
import { useFacilityNetwork } from '../network/facility-network-context'

/**
 * The Dashboard's Preview tour. It never writes region, panel, or projection state; it only borrows
 * the camera, through `tourApi`, and reports which regions it is showing through `focus`.
 */
export function usePreviewTour(dashboardShown: boolean) {
  const { networkFacilities, mappableNetworkFacilities } = useFacilityNetwork()
  const [active, setActive] = useState(false)
  const [tourApi, setTourApi] = useState<TourCameraApi | null>(null)
  const [focus, setFocus] = useState<readonly string[] | null>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const returnFocus = useRef(false)
  const previewing = active && dashboardShown

  // After the tour ends, focus returns to the Preview button once the regular chrome is visible again.
  useEffect(() => {
    if (active || !returnFocus.current) return
    returnFocus.current = false
    toggleRef.current?.focus()
  }, [active])

  const chapters = useMemo(() => buildTour(networkFacilities, dashboardRegions), [networkFacilities])
  const boundary = useMemo(() => focus ? focus.flatMap((regionId) => getRegionBoundary(regionId) ?? []) : null, [focus])
  const targets = useMemo(() => {
    if (!focus) return mappableNetworkFacilities
    const numbers = new Set<number>(dashboardRegions.filter((region) => focus.includes(region.id)).flatMap((region) => region.facilityNumbers))
    return mappableNetworkFacilities.filter((facility) => numbers.has(facility.number))
  }, [focus, mappableNetworkFacilities])
  const targetIds = useMemo(() => new Set(targets.map((facility) => facility.id)), [targets])

  const start = useCallback(() => {
    setFocus(null)
    setActive(true)
  }, [])

  /** Ends the tour from its own controls, returning focus to the Preview button. */
  const exit = useCallback(() => {
    returnFocus.current = true
    setActive(false)
    setFocus(null)
  }, [])

  /** Ends the tour because the viewer chose a facility, which takes focus elsewhere. */
  const cancel = useCallback(() => {
    setActive(false)
    setFocus(null)
  }, [])

  return { previewing, chapters, tourApi, setTourApi, focus, setFocus, boundary, targets, targetIds, toggleRef, start, exit, cancel }
}

export type PreviewTourState = ReturnType<typeof usePreviewTour>
