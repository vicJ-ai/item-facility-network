import { useEffect, useState } from 'react'
import type { OperationsResponse } from '../types/operations'

export function useFacilityOperations(facilityId: string | undefined) {
  const [result, setResult] = useState<{ facilityId?: string; data?: OperationsResponse; error?: string }>({})

  useEffect(() => {
    if (!facilityId) return
    const controller = new AbortController()
    fetch(`/api/operations/${encodeURIComponent(facilityId)}`, {
      credentials: 'same-origin',
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('Operations contacts could not be loaded.')
        const data = await response.json() as OperationsResponse
        if (!controller.signal.aborted) setResult({ facilityId, data })
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || (error instanceof DOMException && error.name === 'AbortError')) return
        setResult({ facilityId, error: error instanceof Error ? error.message : 'Operations contacts could not be loaded.' })
      })
    return () => controller.abort()
  }, [facilityId])

  if (!facilityId || result.facilityId !== facilityId) return { loading: Boolean(facilityId), operations: undefined, reviewRequired: false, error: undefined }
  return { loading: false, operations: result.data?.operations ?? undefined, reviewRequired: result.data?.reviewRequired ?? false, error: result.error }
}
