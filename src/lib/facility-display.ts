import { isArchived, type DisplayStatus, type Facility } from '../data/facilities'
import { isOfficialFacilitySheetMedia, type FacilityMedia } from '../data/facility-media'
import { displayFactUnit, type FacilitySitePlanFact } from '../data/facility-site-plans'

/** Local status choices saved per facility in this browser; Archived is set only in the data. */
export type StatusAssignments = Record<string, DisplayStatus>
export type MappableFacility = Facility & { coordinates: [number, number] }

export const assignableStatuses: DisplayStatus[] = ['Unassigned', 'Active', 'Coming Soon', 'Planned']
export const statusColor: Record<DisplayStatus, string> = {
  Active: '#13a663',
  'Coming Soon': '#f4b71b',
  Planned: '#6b46c1',
  Unassigned: '#7a8798',
  Archived: '#4b5563',
}

export function resolveFacilityStatus(facility: Facility, overrides: StatusAssignments): DisplayStatus {
  if (isArchived(facility)) return 'Archived'
  return overrides[facility.id] ?? facility.status
}

export function getFacilityTitle(facility: Facility) {
  return facility.city ? `${facility.city}, ${facility.state}` : `${facility.street}, ${facility.state}`
}

/** The two-digit roster number, as in "Facility 07". */
export function formatFacilityNumber(facility: Facility) {
  return String(facility.number).padStart(2, '0')
}

export function statusClass(status: DisplayStatus) {
  return status.toLowerCase().replaceAll(' ', '-')
}

export function precisionChipClass(facility: Facility) {
  if (facility.coordinatePrecision === 'Approximate') return 'approximate'
  if (facility.coordinatePrecision === 'Unavailable') return 'unavailable'
  return ''
}

export function hasUsableCoordinates(facility: Facility | null): facility is MappableFacility {
  if (!facility) return false
  if (!facility.coordinates) return false
  const [latitude, longitude] = facility.coordinates
  return Number.isFinite(latitude) && Number.isFinite(longitude) && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180
}

export function isUserProvidedMedia(media: FacilityMedia) {
  return media.verification.startsWith('user-provided')
}

export function mediaCategory(media: FacilityMedia) {
  if (isOfficialFacilitySheetMedia(media)) return 'Official facility sheet photo'
  return isUserProvidedMedia(media) ? 'User-provided photo' : 'Official listing media'
}

export function formatSitePlanFact(fact: FacilitySitePlanFact) {
  const value = typeof fact.value === 'number' ? fact.value.toLocaleString('en-US') : fact.value
  return `${value}${fact.unit ? ` ${displayFactUnit(fact.unit)}` : ''}`
}
