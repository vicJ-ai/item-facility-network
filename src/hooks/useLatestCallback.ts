import { useCallback, useLayoutEffect, useRef } from 'react'

/**
 * A function whose identity never changes but which always runs the latest `callback`. Use it for
 * event handlers passed to memoized views, so a new closure does not re-render them. Never call the
 * result during render: it would run the previous render's closure.
 */
export function useLatestCallback<Args extends unknown[], Result>(callback: (...args: Args) => Result) {
  const latest = useRef(callback)
  useLayoutEffect(() => {
    latest.current = callback
  })
  return useCallback((...args: Args) => latest.current(...args), [])
}
