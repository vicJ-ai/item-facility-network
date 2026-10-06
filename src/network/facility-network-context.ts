import { createContext, useContext } from 'react'
import type { FacilityNetwork } from '../lib/facility-network'
import type { AdminArchive } from '../types/archive'

export type FacilityNetworkContextValue = FacilityNetwork & {
  /** Applies an administrator's archive or restore immediately, ahead of the next poll. */
  applyArchive: (entry: AdminArchive) => void
}

export const FacilityNetworkContext = createContext<FacilityNetworkContextValue | null>(null)

export function useFacilityNetwork() {
  const value = useContext(FacilityNetworkContext)
  if (!value) throw new Error('useFacilityNetwork requires FacilityNetworkProvider')
  return value
}
