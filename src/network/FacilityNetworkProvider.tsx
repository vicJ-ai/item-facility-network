import { useMemo, type ReactNode } from 'react'
import { useFacilityArchive } from '../hooks/useFacilityArchive'
import { buildFacilityNetwork } from '../lib/facility-network'
import { FacilityNetworkContext } from './facility-network-context'

export function FacilityNetworkProvider({ children }: { children: ReactNode }) {
  const { archiveRecords, applyArchive } = useFacilityArchive()
  const value = useMemo(() => ({ ...buildFacilityNetwork(archiveRecords), applyArchive }), [archiveRecords, applyArchive])
  return <FacilityNetworkContext.Provider value={value}>{children}</FacilityNetworkContext.Provider>
}
