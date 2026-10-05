import { useCallback, useEffect, useRef, useState } from 'react'
import type { Facility } from '../data/facilities'

export type FacilityTab = 'Overview' | 'Site Plan' | 'Photos' | 'Documents' | 'Operations'
export type CameraMode = 'overview' | 'site'

/** The selected facility, its details panel and tab, and whether the map camera follows it. */
export function useFacilitySelection() {
  const [selected, setSelected] = useState<Facility | null>(null)
  const [showcaseOpen, setShowcaseOpen] = useState(false)
  const [tab, setTab] = useState<FacilityTab>('Overview')
  const [focusSignal, setFocusSignal] = useState(0)
  const [cameraMode, setCameraMode] = useState<CameraMode>('overview')
  const returnFocusPending = useRef(false)

  // Closing the details panel returns focus to the facility's row in the directory.
  useEffect(() => {
    if (showcaseOpen || !selected || !returnFocusPending.current) return
    returnFocusPending.current = false
    const frame = window.requestAnimationFrame(() => {
      document.querySelector<HTMLButtonElement>(`button[data-facility-id="${selected.id}"]`)?.focus()
    })
    return () => window.cancelAnimationFrame(frame)
  }, [selected, showcaseOpen])

  const choose = useCallback((facility: Facility) => {
    setSelected(facility)
    setCameraMode('site')
    setFocusSignal((value) => value + 1)
    setShowcaseOpen(true)
    setTab('Overview')
  }, [])

  const closeShowcase = useCallback(() => {
    returnFocusPending.current = true
    setShowcaseOpen(false)
  }, [])

  const clearSelection = useCallback(() => {
    setShowcaseOpen(false)
    setSelected(null)
    setCameraMode('overview')
  }, [])

  const releaseCamera = useCallback(() => setCameraMode('overview'), [])

  return { selected, showcaseOpen, tab, setTab, focusSignal, cameraMode, choose, closeShowcase, clearSelection, releaseCamera }
}
