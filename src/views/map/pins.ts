import L from 'leaflet'
import type { DisplayStatus, Facility } from '../../data/facilities'
import { formatFacilityNumber, statusColor, type MappableFacility } from '../../lib/facility-display'

/** The accessible name of a Dashboard pin, on the flat map and the globe. */
export function dashboardPinLabel(facility: Facility) {
  return `Open facility ${formatFacilityNumber(facility)} in Facilities`
}

/** Pin markup shared by the Leaflet map and the 3D globe, so both render identical pins. */
export function pinMarkup(facility: Facility, status: DisplayStatus, selected: boolean) {
  return `<span class="location-pin${selected ? ' is-selected' : ''}${facility.coordinatePrecision === 'Approximate' ? ' is-approximate' : ''}" style="--pin:${statusColor[status]}"><span></span></span><i class="pin-open-badge" aria-hidden="true"></i>`
}

// react-leaflet replaces a marker's icon, rewriting its HTML, whenever it receives a different icon
// object. Reusing one icon per pin state means a pin's DOM changes only when its state does.
const pinIcons = new Map<string, L.DivIcon>()

export function pinIcon(facility: Facility, status: DisplayStatus, selected: boolean, open: boolean, outOfRegion = false) {
  const key = `${facility.id}|${status}|${selected}|${open}|${outOfRegion}`
  let icon = pinIcons.get(key)
  if (!icon) {
    icon = L.divIcon({
      className: `location-marker-wrap ${open ? 'is-open' : 'is-closed'}${outOfRegion ? ' is-out-of-region' : ''}`,
      html: pinMarkup(facility, status, selected),
      iconSize: [30, 38],
      iconAnchor: [15, 36],
      tooltipAnchor: [14, -19],
    })
    pinIcons.set(key, icon)
  }
  return icon
}

/** Which side of a Dashboard pin its preview opens on, so it stays on screen. */
export function dashboardPreviewDirection(facility: MappableFacility): 'left' | 'right' | 'top' {
  const longitude = facility.coordinates[1]
  if (longitude <= -110) return 'right'
  if (longitude >= -90) return 'left'
  return 'top'
}
