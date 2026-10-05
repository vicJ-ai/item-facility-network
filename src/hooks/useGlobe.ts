import { useCallback, useState } from 'react'
import { getInitialQualityChoice, probeGraphics, saveQualityChoice, type QualityChoice, type QualityTier } from '../lib/globe-quality'
import { usePersistentState } from './usePersistentState'

export type DashboardProjection = 'globe' | 'map'

const loadProjection = (stored: string | null): DashboardProjection => stored === 'map' ? 'map' : 'globe'
const saveProjection = (projection: DashboardProjection) => projection

/**
 * Whether the Dashboard shows the 3D globe or the flat map, and the globe's quality. The Preview tour
 * shows the globe without changing the saved projection.
 */
export function useGlobe({ dashboardShown, previewing }: { dashboardShown: boolean; previewing: boolean }) {
  const [projection, setProjection] = usePersistentState('dashboard-projection-v1', loadProjection, saveProjection)
  // One WebGL probe: whether the globe can run, and a starting quality tier for this device.
  const [graphics] = useState(probeGraphics)
  const [unavailable, setUnavailable] = useState(() => !graphics.webgl)
  const [quality, setQuality] = useState<QualityChoice>(getInitialQualityChoice)
  const [effectiveTier, setEffectiveTier] = useState<QualityTier>(graphics.tier)
  // Once shown, the globe stays loaded and is only hidden, so switching back is instant.
  const [mounted, setMounted] = useState(false)

  const active = dashboardShown && (projection === 'globe' || previewing) && !unavailable
  if (active && !mounted) setMounted(true)

  const toggleProjection = useCallback(() => setProjection((current) => current === 'globe' ? 'map' : 'globe'), [setProjection])
  const markUnavailable = useCallback(() => setUnavailable(true), [])
  const chooseQuality = useCallback((choice: QualityChoice) => {
    setQuality(choice)
    saveQualityChoice(choice)
  }, [])

  return { projection, toggleProjection, detectedTier: graphics.tier, unavailable, markUnavailable, quality, chooseQuality, effectiveTier, setEffectiveTier, active, mounted }
}

export type GlobeState = ReturnType<typeof useGlobe>
