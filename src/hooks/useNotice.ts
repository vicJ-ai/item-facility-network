import { useEffect, useState } from 'react'

const NOTICE_MS = 2600

/** A short status message that clears itself. */
export function useNotice() {
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(null), NOTICE_MS)
    return () => window.clearTimeout(timer)
  }, [notice])

  return [notice, setNotice] as const
}
