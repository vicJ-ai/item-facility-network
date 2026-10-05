import { useCallback, useEffect } from 'react'
import { usePersistentState } from './usePersistentState'

export type Theme = 'light' | 'dark'

function loadTheme(stored: string | null): Theme {
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

const saveTheme = (theme: Theme) => theme

export function useTheme() {
  const [theme, setTheme] = usePersistentState('locations-theme', loadTheme, saveTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  const toggleTheme = useCallback(() => setTheme((current) => current === 'light' ? 'dark' : 'light'), [setTheme])
  return { theme, toggleTheme }
}
