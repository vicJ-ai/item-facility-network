import type { PublicBulkRack } from '../types/availability'
import {
  facilityAvailableSpace,
  getFacilityBulkRack,
  type FacilityAvailableSpace,
  type FacilityBulkRack,
} from '../data/facility-space'

export type BulkRackOverride = Omit<PublicBulkRack, 'facilityId'>
export type EffectiveAvailability = FacilityAvailableSpace & { valueSource: 'administrator' | 'source-snapshot' }
export type EffectiveBulkRack = FacilityBulkRack & {
  bulkValueSource: 'administrator' | 'source-snapshot' | 'pending'
  rackValueSource: 'administrator' | 'source-snapshot' | 'pending'
}

export function effectiveAvailability(facilityId: string, administratorValue?: number): EffectiveAvailability | undefined {
  if (administratorValue !== undefined) return { squareFeet: administratorValue, asOf: '', valueSource: 'administrator' }
  const snapshot = facilityAvailableSpace[facilityId]
  return snapshot ? { ...snapshot, valueSource: 'source-snapshot' } : undefined
}

export function effectiveBulkRack(facilityId: string, override?: BulkRackOverride): EffectiveBulkRack {
  const snapshot = getFacilityBulkRack(facilityId)
  const bulkIsAdministrator = override?.bulkSquareFeet !== undefined
  const rackIsAdministrator = override?.rackPalletPositions !== undefined
  return {
    ...(bulkIsAdministrator ? { bulkSquareFeet: override.bulkSquareFeet } : snapshot?.bulkSquareFeet === undefined ? {} : { bulkSquareFeet: snapshot.bulkSquareFeet }),
    ...(!bulkIsAdministrator && snapshot?.bulkUpToSquareFeet !== undefined ? { bulkUpToSquareFeet: snapshot.bulkUpToSquareFeet } : {}),
    ...(rackIsAdministrator ? { rackPalletPositions: override.rackPalletPositions } : snapshot?.rackPalletPositions === undefined ? {} : { rackPalletPositions: snapshot.rackPalletPositions }),
    asOf: snapshot?.asOf ?? '',
    bulkValueSource: bulkIsAdministrator ? 'administrator' : snapshot?.bulkSquareFeet !== undefined ? 'source-snapshot' : 'pending',
    rackValueSource: rackIsAdministrator ? 'administrator' : snapshot?.rackPalletPositions !== undefined ? 'source-snapshot' : 'pending',
  }
}
