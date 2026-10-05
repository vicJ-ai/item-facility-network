import type L from 'leaflet'

export const NETWORK_CENTER: L.LatLngTuple = [37.8, -96.2]
export const NETWORK_ZOOM = 4

type Viewport = { lat: number; lng: number; zoom: number; south: number; west: number; north: number; east: number }

const INITIAL_VIEWPORT: Viewport = { lat: NETWORK_CENTER[0], lng: NETWORK_CENTER[1], zoom: NETWORK_ZOOM, south: 23.4, west: -127.4, north: 49.8, east: -65 }

/**
 * Writes the flat map's current view onto the map stage as `data-center`, `data-zoom`, and
 * `data-bounds`, which the Playwright suites read. They are written directly rather than held in
 * React state, so panning and zooming re-render nothing. Without a map, the starting view is written.
 */
export function writeViewportAttributes(stage: HTMLElement, map?: L.Map) {
  const view = map ? viewportOf(map) : INITIAL_VIEWPORT
  stage.dataset.center = `${view.lat.toFixed(6)},${view.lng.toFixed(6)}`
  stage.dataset.zoom = view.zoom.toFixed(2)
  stage.dataset.bounds = `${view.south.toFixed(6)},${view.west.toFixed(6)},${view.north.toFixed(6)},${view.east.toFixed(6)}`
}

function viewportOf(map: L.Map): Viewport {
  const center = map.getCenter()
  const bounds = map.getBounds()
  return { lat: center.lat, lng: center.lng, zoom: map.getZoom(), south: bounds.getSouth(), west: bounds.getWest(), north: bounds.getNorth(), east: bounds.getEast() }
}
