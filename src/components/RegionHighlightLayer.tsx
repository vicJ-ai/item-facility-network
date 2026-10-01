import { useEffect } from 'react'
import L from 'leaflet'
import { useMap } from 'react-leaflet'
import type { RegionBoundary } from '../data/region-boundaries'

const PANE = 'region-highlight'
// A ring three worlds wide keeps the dimming continuous when the map is panned across the antimeridian.
const WORLD_RING: L.LatLngTuple[] = [[-85, -540], [-85, 540], [85, 540], [85, -540]]

function toLatLngs(ring: RegionBoundary[number][number]): L.LatLngTuple[] {
  return ring.map(([longitude, latitude]) => [latitude, longitude])
}

/** Dims the map outside the active region and outlines the region itself. */
export function RegionHighlightLayer({ regionId, boundary }: { regionId: string | null; boundary: RegionBoundary | null }) {
  const map = useMap()

  useEffect(() => {
    if (!regionId || !boundary) return
    const pane = map.getPane(PANE) ?? map.createPane(PANE)
    // Above the tiles and day/night shade (350–360), below the pin halos (overlay pane, 400).
    pane.style.zIndex = '380'
    pane.style.pointerEvents = 'none'
    const renderer = L.svg({ pane: PANE })
    const outerRings = boundary.map((polygon) => toLatLngs(polygon[0]))
    const mask = L.polygon([WORLD_RING, ...outerRings], { renderer, pane: PANE, className: 'region-highlight-mask', interactive: false, stroke: false, fillColor: '#120f24', fillOpacity: 0.36 })
    const area = L.polygon(boundary.map((polygon) => polygon.map(toLatLngs)), { renderer, pane: PANE, className: 'region-highlight-area', interactive: false, color: '#6b46c1', weight: 2.5, opacity: 0.95, fillColor: '#6b46c1', fillOpacity: 0.08, lineJoin: 'round' })
    mask.addTo(map)
    area.addTo(map)
    return () => {
      mask.remove()
      area.remove()
      renderer.remove()
    }
  }, [boundary, map, regionId])

  return null
}
