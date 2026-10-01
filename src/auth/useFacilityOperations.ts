import { useEffect, useState } from 'react'
import type { OperationsResponse } from '../types/operations'
import { useAccess } from './access-context'

export function useFacilityOperations(facilityId: string | undefined) {
  const { user, authorizedFetch } = useAccess()
  const [result, setResult] = useState<{ userId?: string; facilityId?: string; data?: OperationsResponse; error?: string }>({})

  useEffect(() => {
    if (!user || !facilityId) return
    let active = true
    authorizedFetch(`/api/operations/${encodeURIComponent(facilityId)}`)
      .then(async (response) => {
        if (!response.ok) throw new Error(response.status === 401 ? 'Session expired.' : 'Operations contacts could not be loaded.')
        const data = await response.json() as OperationsResponse
        if (active) setResult({ userId: user.id, facilityId, data })
      })
      .catch((error) => { if (active) setResult({ userId: user.id, facilityId, error: error instanceof Error ? error.message : 'Operations contacts could not be loaded.' }) })
    return () => { active = false }
  }, [authorizedFetch, facilityId, user])

  if (!user || !facilityId || result.userId !== user.id || result.facilityId !== facilityId) return { loading: Boolean(user && facilityId), operations: undefined, reviewRequired: false, error: undefined }
  return { loading: false, operations: result.data?.operations ?? undefined, reviewRequired: result.data?.reviewRequired ?? false, error: result.error }
}
