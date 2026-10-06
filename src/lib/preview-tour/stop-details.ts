import type { Facility } from '../../data/facilities'
import { formatCeilingHeight, formatLoadingDocks, getFacilityBuildingDetails } from '../../data/facility-building'
import { getFacilityMedia } from '../../data/facility-media'
import { formatAvailableSpace, formatBulkSquareFeet, formatRack, getFacilitySquareFootage, hasReportedAvailableSpace } from '../../data/facility-space'
import { getUserProvidedFacilityPhotos } from '../../data/facility-user-photos'
import { effectiveAvailability, effectiveBulkRack, type BulkRackOverride } from '../effective-facility-space'
import type { TourStopDetails } from './script'

/** The photo and warehouse figures shown on a Preview tour stop card. */
export function tourStopDetails(facility: Facility, administratorValue?: number, bulkRackOverride?: BulkRackOverride): TourStopDetails {
  const gallery = getUserProvidedFacilityPhotos(facility.id)
  const cover = gallery?.photos.find((photo) => photo.id === gallery.coverPhotoId) ?? gallery?.photos[0]
  const media = getFacilityMedia(facility.id)
  const photo = cover ? { src: cover.assetUrl, alt: cover.alt } : media ? { src: media.detail.assetUrl, alt: media.detail.alt } : undefined
  const { totalSquareFeet } = getFacilitySquareFootage(facility.id)
  const available = effectiveAvailability(facility.id, administratorValue)
  const bulkRack = effectiveBulkRack(facility.id, bulkRackOverride)
  const building = getFacilityBuildingDetails(facility.id)
  // Every stop shows the same four warehouse facts, holding a Pending placeholder until a site reports them.
  const facts = [
    { label: 'Bulk', value: formatBulkSquareFeet(bulkRack) },
    { label: 'Rack', value: formatRack(bulkRack) },
    { label: 'Ceiling height', value: formatCeilingHeight(building, 'Pending') },
    { label: 'Loading docks', value: formatLoadingDocks(building, 'Pending') },
  ]
  return { photo, totalSquareFeet, available: hasReportedAvailableSpace(available) ? formatAvailableSpace(available) : undefined, facts }
}
