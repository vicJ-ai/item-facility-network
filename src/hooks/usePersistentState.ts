import { useEffect, useState } from 'react'

/**
 * State saved to localStorage under `key`. `load` turns the stored string (or `null`) into a valid
 * value, and `save` turns a value back into a string; pass module-level functions so `save` is stable.
 * Storage is an optional convenience: blocked or full storage leaves the state working for the session.
 */
export function usePersistentState<T>(key: string, load: (stored: string | null) => T, save: (value: T) => string) {
  const [value, setValue] = useState(() => {
    let stored: string | null = null
    try {
      stored = window.localStorage.getItem(key)
    } catch {
      // Unreadable storage is treated as nothing saved.
    }
    return load(stored)
  })

  useEffect(() => {
    try {
      window.localStorage.setItem(key, save(value))
    } catch {
      // Persistence is optional; the value still applies for this session.
    }
  }, [key, save, value])

  return [value, setValue] as const
}
