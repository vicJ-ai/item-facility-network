import type { Facility } from '../data/facilities'
import { hasUsableCoordinates } from './facility-display'

export function googleMapsUrl(facility: Facility) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(facility.fullAddress)}`
}

export function googleMapsEmbedUrl(facility: Facility) {
  return `https://www.google.com/maps?q=${encodeURIComponent(facility.fullAddress)}&z=15&output=embed`
}

export function streetViewUrl(facility: Facility) {
  if (!hasUsableCoordinates(facility)) return null
  const [latitude, longitude] = facility.coordinates
  return `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${latitude},${longitude}`
}

export function googleMapsPhotoLookupUrl(facility: Facility) {
  if (!hasUsableCoordinates(facility)) return googleMapsUrl(facility)
  const [latitude, longitude] = facility.coordinates
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
}
