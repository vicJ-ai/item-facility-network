import { useCallback } from 'react'
import { isValidTimeZone } from '../lib/time-zone'
import { usePersistentState } from './usePersistentState'

type DayNightPreferences = { shading: boolean; expanded: boolean; timeZone: string | null }

function loadDayNight(stored: string | null): DayNightPreferences {
  const defaults = { shading: true, expanded: window.innerWidth > 820, timeZone: null }
  try {
    const saved = JSON.parse(stored ?? 'null') as Partial<DayNightPreferences> | null
    return {
      shading: typeof saved?.shading === 'boolean' ? saved.shading : defaults.shading,
      expanded: typeof saved?.expanded === 'boolean' ? saved.expanded : defaults.expanded,
      timeZone: typeof saved?.timeZone === 'string' && isValidTimeZone(saved.timeZone) ? saved.timeZone : defaults.timeZone,
    }
  } catch {
    return defaults
  }
}

const saveDayNight = (preferences: DayNightPreferences) => JSON.stringify(preferences)

/** Night shading, the time control's collapsed state, and its chosen time zone. */
export function useDayNightPreferences() {
  const [preferences, setPreferences] = usePersistentState('map-day-night-v1', loadDayNight, saveDayNight)
  const setShading = useCallback((shading: boolean) => setPreferences((current) => ({ ...current, shading })), [setPreferences])
  const setExpanded = useCallback((expanded: boolean) => setPreferences((current) => ({ ...current, expanded })), [setPreferences])
  const setTimeZone = useCallback((timeZone: string | null) => setPreferences((current) => ({ ...current, timeZone })), [setPreferences])
  return { ...preferences, setShading, setExpanded, setTimeZone }
}
