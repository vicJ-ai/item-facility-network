import { useEffect } from 'react'
import { useLatestCallback } from './useLatestCallback'

/** Runs `onEscape` whenever Escape is pressed anywhere in the window. */
export function useEscapeKey(onEscape: () => void) {
  const handleEscape = useLatestCallback(onEscape)

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if (event.key === 'Escape') handleEscape()
    }
    window.addEventListener('keydown', listener)
    return () => window.removeEventListener('keydown', listener)
  }, [handleEscape])
}
