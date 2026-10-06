import { useEffect, useRef } from 'react'
import L from 'leaflet'
import { useMap, useMapEvents } from 'react-leaflet'
import type { Facility } from '../../data/facilities'
import type { RegionBoundary } from '../../data/region-boundaries'
import type { CameraMode } from '../../hooks/useFacilitySelection'
import { hasUsableCoordinates, type MappableFacility } from '../../lib/facility-display'
import type { TourCameraApi } from '../../lib/preview-tour/camera-api'
import { NETWORK_CENTER, NETWORK_ZOOM } from './map-view'

// Render-less children of the Leaflet map that move its camera in response to app state.

const SITE_FOCUS_ZOOM = 16

/** Receives the map after it moves, so the current view can be reported. */
export type ViewportListener = (map: L.Map) => void

function hasSize(map: L.Map) {
  const container = map.getContainer()
  return container.clientWidth > 0 && container.clientHeight > 0
}

function stopIfMounted(map: L.Map) {
  // React may dispose MapContainer before child effect cleanup runs. Leaflet's
  // stop() assumes its map pane still exists and throws after map.remove().
  if (map.getPane('mapPane')) map.stop()
}

function getDashboardRegionBounds(regionFacilities: readonly MappableFacility[], boundary: RegionBoundary | null) {
  const latitudes = regionFacilities.map((facility) => facility.coordinates[0])
  const longitudes = regionFacilities.map((facility) => facility.coordinates[1])
  const minLatitude = Math.min(...latitudes)
  const maxLatitude = Math.max(...latitudes)
  const minLongitude = Math.min(...longitudes)
  const maxLongitude = Math.max(...longitudes)
  const latitudePadding = Math.max((maxLatitude - minLatitude) * 0.18, 0.1)
  const longitudePadding = Math.max((maxLongitude - minLongitude) * 0.18, 0.12)
  const bounds = L.latLngBounds(
    [minLatitude - latitudePadding, minLongitude - longitudePadding],
    [maxLatitude + latitudePadding, maxLongitude + longitudePadding],
  )
  // Frame the whole highlighted region, not just its facilities.
  for (const polygon of boundary ?? []) for (const [longitude, latitude] of polygon[0]) bounds.extend([latitude, longitude])
  return bounds
}

/** Flies to the selected facility, and back to the whole network on a recenter request. */
export function MapFocus({ selected, focusSignal, recenterSignal, cameraMode, visibilityKey }: { selected: Facility | null; focusSignal: number; recenterSignal: number; cameraMode: CameraMode; visibilityKey: string }) {
  const map = useMap()

  useEffect(() => {
    if (cameraMode !== 'site' || focusSignal === 0 || !hasUsableCoordinates(selected)) return
    const coordinates = selected.coordinates
    let focusFrame = 0
    const resizeFrame = window.requestAnimationFrame(() => {
      if (!hasSize(map)) return
      map.invalidateSize()
      focusFrame = window.requestAnimationFrame(() => map.flyTo(coordinates, SITE_FOCUS_ZOOM, { duration: 0.8 }))
    })
    return () => {
      window.cancelAnimationFrame(resizeFrame)
      window.cancelAnimationFrame(focusFrame)
      stopIfMounted(map)
    }
  }, [cameraMode, focusSignal, map, selected, visibilityKey])

  useEffect(() => {
    if (recenterSignal === 0) return
    const frame = window.requestAnimationFrame(() => {
      if (!hasSize(map)) return
      map.invalidateSize()
      map.flyTo(NETWORK_CENTER, NETWORK_ZOOM, { duration: 0.7 })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [map, recenterSignal])

  return null
}

type DashboardOverviewProps = {
  active: boolean
  signal: number
  targets: readonly Facility[]
  regionActive: boolean
  regionBoundary: RegionBoundary | null
  panelOpen: boolean
  onViewChange: ViewportListener
}

/** Frames the Dashboard's facilities, or the active region, on the flat map whenever `signal` changes. */
export function DashboardOverview({ active, signal, targets, regionActive, regionBoundary, panelOpen, onViewChange }: DashboardOverviewProps) {
  const map = useMap()
  const cameraRequestRef = useRef(0)

  useEffect(() => {
    const cameraRequest = ++cameraRequestRef.current
    if (!active) {
      stopIfMounted(map)
      return
    }
    if (signal === 0) return
    stopIfMounted(map)
    let fitFrame = 0
    const resizeFrame = window.requestAnimationFrame(() => {
      if (cameraRequest !== cameraRequestRef.current) return
      const container = map.getContainer()
      if (!hasSize(map)) return
      map.invalidateSize({ pan: false })
      fitFrame = window.requestAnimationFrame(() => {
        if (cameraRequest !== cameraRequestRef.current) return
        const mappableTargets = targets.filter(hasUsableCoordinates)
        const coordinates = mappableTargets.map((facility) => facility.coordinates)
        if (coordinates.length === 0) return
        const mobile = container.clientWidth <= 720
        const basePadding = mobile ? 28 : Math.min(80, Math.round(container.clientWidth * 0.055))
        const paddingTopLeft: L.PointExpression = [!mobile && panelOpen ? 370 : basePadding, basePadding]
        const paddingBottomRight: L.PointExpression = [basePadding, mobile && panelOpen ? Math.min(390, Math.round(container.clientHeight * 0.5)) : basePadding]
        const bounds = regionActive ? getDashboardRegionBounds(mappableTargets, regionBoundary) : L.latLngBounds(coordinates)
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        map.fitBounds(bounds, {
          animate: regionActive && !reduceMotion,
          duration: 0.65,
          maxZoom: regionActive ? 9 : 6,
          paddingTopLeft,
          paddingBottomRight,
        })
        onViewChange(map)
      })
    })
    return () => {
      if (cameraRequest === cameraRequestRef.current) cameraRequestRef.current += 1
      window.cancelAnimationFrame(resizeFrame)
      window.cancelAnimationFrame(fitFrame)
      stopIfMounted(map)
    }
  }, [active, map, onViewChange, panelOpen, regionActive, regionBoundary, signal, targets])

  return null
}

/**
 * The Preview tour's camera on the flat map, for browsers without WebGL. It follows the same path as
 * the globe tour, without tilt, orbit, or the drawn outline.
 */
export function LeafletTourCamera({ active, onTourApi }: { active: boolean; onTourApi: (api: TourCameraApi | null) => void }) {
  const map = useMap()

  useEffect(() => {
    if (!active) return
    const zoomSnap = map.options.zoomSnap
    // Fractional zoom keeps the camera's continuous range changes smooth.
    L.Util.setOptions(map, { zoomSnap: 0 })
    const api: TourCameraApi = {
      lookAt: ({ longitude, latitude, range }) => {
        const metersPerPixel = (range * 1.2) / Math.max(1, map.getSize().x)
        const zoom = Math.log2((156_543.03 * Math.cos((latitude * Math.PI) / 180)) / metersPerPixel)
        map.setView([latitude, longitude], Math.min(map.getMaxZoom(), Math.max(map.getMinZoom(), zoom)), { animate: false })
      },
      release: () => {},
      saveView: () => ({ center: map.getCenter(), zoom: map.getZoom() }),
      restoreView: (view) => {
        const saved = view as { center: L.LatLng; zoom: number }
        map.setView(saved.center, saved.zoom, { animate: false })
      },
      setContinuousRender: () => {},
      waitForTiles: (maxMs) => new Promise((resolve) => window.setTimeout(resolve, Math.min(maxMs, 350))),
      setOutline: () => {},
      setOutlineProgress: () => {},
      setHighlightOpacity: () => {},
      setFlightDetail: () => {},
      pulsePin: () => {},
    }
    onTourApi(api)
    return () => {
      onTourApi(null)
      L.Util.setOptions(map, { zoomSnap })
    }
  }, [active, map, onTourApi])

  return null
}

/** Reports the view after every move, and resizes the map when the layout around it changes. */
export function MapLifecycle({ resizeKey, onViewChange }: { resizeKey: string; onViewChange: ViewportListener }) {
  const map = useMapEvents({
    moveend: () => onViewChange(map),
    zoomend: () => onViewChange(map),
  })

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      if (!hasSize(map)) return
      map.invalidateSize()
      onViewChange(map)
    })
    return () => window.cancelAnimationFrame(frame)
  }, [map, onViewChange, resizeKey])

  return null
}

/** Resizes the map as the directory beside it is resized, keeping a focused facility in the center. */
export function MapSplitResize({ resizeKey, selected, preserveSiteFocus, onViewChange }: { resizeKey: number; selected: Facility | null; preserveSiteFocus: boolean; onViewChange: ViewportListener }) {
  const map = useMap()
  const selectedRef = useRef(selected)
  const preserveSiteFocusRef = useRef(preserveSiteFocus)
  useEffect(() => {
    selectedRef.current = selected
    preserveSiteFocusRef.current = preserveSiteFocus
  })

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      if (!hasSize(map)) return
      map.invalidateSize({ pan: false, debounceMoveend: true })
      if (preserveSiteFocusRef.current && hasUsableCoordinates(selectedRef.current)) {
        map.setView(selectedRef.current.coordinates, map.getZoom(), { animate: false })
      }
      onViewChange(map)
    })
    return () => window.cancelAnimationFrame(frame)
  }, [map, onViewChange, resizeKey])

  return null
}
