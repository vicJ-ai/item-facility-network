import { useCallback, useMemo, useRef, useState } from 'react'
import { dashboardRegions, type DashboardRegionId } from '../data/dashboard-regions'
import { getRegionBoundary } from '../data/region-boundaries'
import { hasUsableCoordinates } from '../lib/facility-display'
import { useFacilityNetwork } from '../network/facility-network-context'

/**
 * The Dashboard's Regions panel and its active region. `overviewSignal` counts requests to frame the
 * current view; the flat map and the globe each fly when it changes.
 */
export function useDashboardRegions() {
  const { networkFacilities, getRegionFacilities } = useFacilityNetwork()
  const [panelOpen, setPanelOpen] = useState(false)
  const [activeRegionId, setActiveRegionId] = useState<DashboardRegionId | null>(null)
  const [expandedRegionId, setExpandedRegionId] = useState<DashboardRegionId | null>(null)
  const [overviewSignal, setOverviewSignal] = useState(0)
  const toggleRef = useRef<HTMLButtonElement>(null)

  const activeRegion = useMemo(() => dashboardRegions.find((region) => region.id === activeRegionId) ?? null, [activeRegionId])
  const facilities = activeRegion ? getRegionFacilities(activeRegion.id) : networkFacilities
  const mappableFacilities = useMemo(() => facilities.filter(hasUsableCoordinates), [facilities])
  const mappableIds = useMemo(() => new Set(mappableFacilities.map((facility) => facility.id)), [mappableFacilities])
  const boundary = useMemo(() => activeRegion ? getRegionBoundary(activeRegion.id) : null, [activeRegion])

  const requestOverview = useCallback(() => setOverviewSignal((value) => value + 1), [])
  const focusToggle = () => window.requestAnimationFrame(() => toggleRef.current?.focus())

  const togglePanel = useCallback(() => {
    setPanelOpen((current) => !current)
    requestOverview()
  }, [requestOverview])

  const closePanel = useCallback(() => {
    setPanelOpen(false)
    requestOverview()
    focusToggle()
  }, [requestOverview])

  /** Escape closes the panel without reframing the map, and returns focus only if it was open. */
  const dismissPanel = () => {
    if (!panelOpen) return
    setPanelOpen(false)
    focusToggle()
  }

  // Choosing the active region again only expands or collapses its list.
  const selectRegion = useCallback((regionId: DashboardRegionId) => {
    if (activeRegionId === regionId) {
      setExpandedRegionId((current) => current === regionId ? null : regionId)
      return
    }
    setActiveRegionId(regionId)
    setExpandedRegionId(regionId)
    requestOverview()
  }, [activeRegionId, requestOverview])

  const clearRegion = useCallback(() => {
    setActiveRegionId(null)
    setExpandedRegionId(null)
    requestOverview()
  }, [requestOverview])

  /** Opening the Dashboard starts from the whole network with the panel closed. */
  const reset = useCallback(() => {
    setPanelOpen(false)
    setActiveRegionId(null)
    setExpandedRegionId(null)
    requestOverview()
  }, [requestOverview])

  return {
    panelOpen, activeRegion, expandedRegionId, overviewSignal, toggleRef,
    facilities, mappableFacilities, mappableIds, boundary,
    requestOverview, togglePanel, closePanel, dismissPanel, selectRegion, clearRegion, reset,
  }
}

export type DashboardRegionsState = ReturnType<typeof useDashboardRegions>
