import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { Minus, Plus } from 'lucide-react'
import {
  Cartesian2,
  Cartesian3,
  Color,
  Credit,
  ImageryLayer,
  JulianDate,
  Rectangle,
  UrlTemplateImageryProvider,
  Viewer,
  WebMercatorTilingScheme,
} from 'cesium'
import 'cesium/Build/Cesium/Widgets/widgets.css'
import type { Facility } from '../data/facilities'

declare const CESIUM_BASE_URL: string
;(window as Window & { CESIUM_BASE_URL?: string }).CESIUM_BASE_URL = CESIUM_BASE_URL

type MappableFacility = Facility & { coordinates: [number, number] }
type GlobeLayer = 'street' | 'satellite'

const ESRI_ATTRIBUTIONS: Record<GlobeLayer, string> = {
  street: 'Map © Esri, TomTom, Garmin, FAO, NOAA, USGS, OpenStreetMap contributors',
  satellite: 'Imagery © Esri, Maxar, Earthstar Geographics',
}
const ESRI_TILE_URLS: Record<GlobeLayer, string> = {
  street: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
  satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
}
// NASA GIBS serves VIIRS "Black Marble" night lights without an API key and with CORS enabled.
const NIGHT_LIGHTS_URL = 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_Black_Marble/default/2016-01-01/GoogleMapsCompatible_Level8/{z}/{y}/{x}.png'
const NIGHT_LIGHTS_ATTRIBUTION = 'Night lights © NASA Black Marble (GIBS)'
const NIGHT_LIGHTS_BRIGHTNESS = 2.4
const HOME_VIEW = { longitude: -96, latitude: 37, height: 15_000_000 }
const PIN_ANCHOR = { x: 15, y: 36 }
const PREVIEW_GAP = 14

function esriLayer(layer: GlobeLayer) {
  return new ImageryLayer(new UrlTemplateImageryProvider({ url: ESRI_TILE_URLS[layer], tilingScheme: new WebMercatorTilingScheme(), maximumLevel: 19, credit: new Credit(ESRI_ATTRIBUTIONS[layer], true) }))
}

function nightLightsLayer() {
  // Shown only on the night side; Cesium blends it using the real sun position at the clock time.
  // Globe lighting later dims the night side to about 30%, so the lights are brightened to compensate.
  return new ImageryLayer(new UrlTemplateImageryProvider({ url: NIGHT_LIGHTS_URL, tilingScheme: new WebMercatorTilingScheme(), maximumLevel: 8, credit: new Credit(NIGHT_LIGHTS_ATTRIBUTION, true) }), { dayAlpha: 0, nightAlpha: 1, brightness: NIGHT_LIGHTS_BRIGHTNESS })
}

/**
 * Padded bounds for a region flight; small regions keep enough context to read as a place on the
 * planet. `coveredLeft` is the fraction of the view hidden by the Regions panel, so the bounds are
 * widened westward and the region lands in the visible part of the globe.
 */
function regionRectangle(facilities: readonly MappableFacility[], coveredLeft: number) {
  const latitudes = facilities.map((facility) => facility.coordinates[0])
  const longitudes = facilities.map((facility) => facility.coordinates[1])
  const [south, north] = [Math.min(...latitudes), Math.max(...latitudes)]
  const [west, east] = [Math.min(...longitudes), Math.max(...longitudes)]
  const latitudePadding = Math.max((north - south) * 0.35, 2.5)
  const longitudePadding = Math.max((east - west) * 0.35, 3.5)
  const paddedWest = west - longitudePadding
  const paddedEast = east + longitudePadding
  const panelAllowance = ((paddedEast - paddedWest) * coveredLeft) / (1 - coveredLeft)
  return Rectangle.fromDegrees(paddedWest - panelAllowance, south - latitudePadding, paddedEast, north + latitudePadding)
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

type DashboardGlobeProps = {
  facilities: readonly MappableFacility[]
  time: number
  shading: boolean
  layer: GlobeLayer
  flySignal: number
  regionActive: boolean
  panelOpen: boolean
  pinMarkup: (facility: MappableFacility) => string
  pinLabel: (facility: MappableFacility) => string
  isOpen: (facility: MappableFacility) => boolean
  renderPreview: (facility: MappableFacility) => ReactNode
  onChoose: (facility: MappableFacility) => void
  onUnavailable: () => void
}

type PinPoint = { x: number; y: number; visible: boolean }

export default function DashboardGlobe({ facilities, time, shading, layer, flySignal, regionActive, panelOpen, pinMarkup, pinLabel, isOpen, renderPreview, onChoose, onUnavailable }: DashboardGlobeProps) {
  const stageRef = useRef<HTMLDivElement>(null)
  const canvasHostRef = useRef<HTMLDivElement>(null)
  const creditsRef = useRef<HTMLDivElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<Viewer | null>(null)
  const baseLayerRef = useRef<ImageryLayer | null>(null)
  const nightLayerRef = useRef<ImageryLayer | null>(null)
  const pinElements = useRef(new Map<string, HTMLButtonElement>())
  const pinPoints = useRef(new Map<string, PinPoint>())
  const positions = useRef(new Map<string, Cartesian3>())
  const hoveredRef = useRef<string | null>(null)
  const initialProps = useRef({ time, shading, onUnavailable })
  const flightTarget = useRef({ facilities, regionActive, panelOpen })
  const currentLayer = useRef(layer)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  // Layout effects run before the passive effects below, so flights and previews read current props.
  useLayoutEffect(() => {
    flightTarget.current = { facilities, regionActive, panelOpen }
    hoveredRef.current = hoveredId
  })

  const placePreview = useCallback(() => {
    const preview = previewRef.current
    const stage = stageRef.current
    const id = hoveredRef.current
    const point = id ? pinPoints.current.get(id) : undefined
    if (!preview || !stage || !point) return
    preview.style.visibility = point.visible ? 'visible' : 'hidden'
    const onRight = point.x < stage.clientWidth * 0.55
    const x = onRight ? point.x + PREVIEW_GAP : point.x - PREVIEW_GAP - preview.offsetWidth
    const y = Math.min(Math.max(point.y - 18 - preview.offsetHeight / 2, 8), stage.clientHeight - preview.offsetHeight - 8)
    preview.style.transform = `translate3d(${Math.round(Math.max(8, x))}px, ${Math.round(y)}px, 0)`
  }, [])

  const updatePins = useCallback(() => {
    const viewer = viewerRef.current
    if (!viewer) return
    const { scene } = viewer
    const cameraPosition = scene.camera.positionWC
    const scratch = new Cartesian2()
    for (const [id, position] of positions.current) {
      const element = pinElements.current.get(id)
      if (!element) continue
      // A surface point faces the camera when the camera lies above its local horizon plane.
      const normal = Cartesian3.normalize(position, new Cartesian3())
      const toCamera = Cartesian3.subtract(cameraPosition, position, new Cartesian3())
      const facing = Cartesian3.dot(normal, toCamera) > 0
      const canvasPoint = facing ? scene.cartesianToCanvasCoordinates(position, scratch) : undefined
      const visible = Boolean(canvasPoint)
      const point = { x: canvasPoint?.x ?? -100, y: canvasPoint?.y ?? -100, visible }
      pinPoints.current.set(id, point)
      element.style.transform = `translate3d(${Math.round(point.x - PIN_ANCHOR.x)}px, ${Math.round(point.y - PIN_ANCHOR.y)}px, 0)`
      element.style.visibility = visible ? 'visible' : 'hidden'
      element.tabIndex = visible ? 0 : -1
    }
    const cartographic = scene.camera.positionCartographic
    const stage = stageRef.current
    if (stage) {
      stage.dataset.cameraHeight = String(Math.round(cartographic.height))
      stage.dataset.cameraLatitude = (cartographic.latitude * 180 / Math.PI).toFixed(3)
      stage.dataset.cameraLongitude = (cartographic.longitude * 180 / Math.PI).toFixed(3)
    }
    placePreview()
  }, [placePreview])

  useEffect(() => {
    const host = canvasHostRef.current
    if (!host || !creditsRef.current) return
    let viewer: Viewer
    try {
      viewer = new Viewer(host, {
        baseLayer: esriLayer(currentLayer.current),
        baseLayerPicker: false,
        geocoder: false,
        homeButton: false,
        sceneModePicker: false,
        navigationHelpButton: false,
        animation: false,
        timeline: false,
        fullscreenButton: false,
        infoBox: false,
        selectionIndicator: false,
        creditContainer: creditsRef.current,
        requestRenderMode: true,
        maximumRenderTimeChange: Number.POSITIVE_INFINITY,
      })
    } catch {
      initialProps.current.onUnavailable()
      return
    }
    viewerRef.current = viewer
    baseLayerRef.current = viewer.imageryLayers.get(0)
    const nightLayer = nightLightsLayer()
    viewer.imageryLayers.add(nightLayer)
    nightLayerRef.current = nightLayer

    const { scene } = viewer
    const { globe } = scene
    // Web Mercator imagery stops at ±85°, so the polar caps show this ice tone instead of a flat void.
    globe.baseColor = Color.fromCssColorString('#dfe6ee')
    globe.enableLighting = initialProps.current.shading
    globe.dynamicAtmosphereLighting = true
    globe.dynamicAtmosphereLightingFromSun = true
    // Keep day and night visible down to regional views; very close in, everything is lit for readability.
    // The night-side atmosphere fade keeps Cesium's defaults: shorter distances black out the city lights.
    globe.lightingFadeOutDistance = 350_000
    globe.lightingFadeInDistance = 1_200_000
    nightLayer.show = initialProps.current.shading
    scene.backgroundColor = Color.fromCssColorString('#05040d')
    scene.screenSpaceCameraController.minimumZoomDistance = 2_000
    scene.screenSpaceCameraController.maximumZoomDistance = 40_000_000
    viewer.clock.shouldAnimate = false
    viewer.clock.currentTime = JulianDate.fromDate(new Date(initialProps.current.time))
    scene.camera.setView({ destination: Cartesian3.fromDegrees(HOME_VIEW.longitude, HOME_VIEW.latitude, HOME_VIEW.height) })
    const removePostRender = scene.postRender.addEventListener(updatePins)
    scene.requestRender()
    const stage = stageRef.current
    if (stage) stage.dataset.globeReady = 'true'

    return () => {
      removePostRender()
      viewer.destroy()
      viewerRef.current = null
      baseLayerRef.current = null
      nightLayerRef.current = null
      if (stage) stage.dataset.globeReady = 'false'
    }
  }, [updatePins])

  useEffect(() => {
    positions.current = new Map(facilities.map((facility) => [facility.id, Cartesian3.fromDegrees(facility.coordinates[1], facility.coordinates[0])]))
    viewerRef.current?.scene.requestRender()
  }, [facilities])

  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer) return
    viewer.clock.currentTime = JulianDate.fromDate(new Date(time))
    viewer.scene.requestRender()
  }, [time])

  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer) return
    viewer.scene.globe.enableLighting = shading
    if (nightLayerRef.current) nightLayerRef.current.show = shading
    viewer.scene.requestRender()
  }, [shading])

  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer || !baseLayerRef.current || currentLayer.current === layer) return
    currentLayer.current = layer
    viewer.imageryLayers.remove(baseLayerRef.current, true)
    const next = esriLayer(layer)
    viewer.imageryLayers.add(next, 0)
    baseLayerRef.current = next
    viewer.scene.requestRender()
  }, [layer])

  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer || flySignal === 0) return
    // Each signal is one flight request, aimed at whatever region is active when it arrives.
    const { facilities: targets, regionActive: toRegion, panelOpen: panelShown } = flightTarget.current
    const duration = prefersReducedMotion() ? 0 : 1.6
    const width = stageRef.current?.clientWidth ?? 0
    // Matches the desktop Regions panel (18px inset + 334px wide); on mobile it is a bottom sheet instead.
    const coveredLeft = panelShown && width > 720 ? Math.min(0.45, 370 / width) : 0
    if (toRegion && targets.length > 0) viewer.camera.flyTo({ destination: regionRectangle(targets, coveredLeft), duration })
    else viewer.camera.flyTo({ destination: Cartesian3.fromDegrees(HOME_VIEW.longitude, HOME_VIEW.latitude, HOME_VIEW.height), duration })
  }, [flySignal])

  useLayoutEffect(() => {
    placePreview()
  }, [hoveredId, placePreview])

  const zoom = (direction: 1 | -1) => {
    const viewer = viewerRef.current
    if (!viewer) return
    const amount = viewer.camera.positionCartographic.height * 0.45
    if (direction > 0) viewer.camera.zoomIn(amount)
    else viewer.camera.zoomOut(amount)
    viewer.scene.requestRender()
  }

  const hovered = facilities.find((facility) => facility.id === hoveredId)

  return (
    <div ref={stageRef} className="globe-stage" data-testid="dashboard-globe" data-lighting={shading}>
      <div ref={canvasHostRef} className="globe-canvas" />
      <div className="globe-pins">
        {facilities.map((facility) => (
          <button
            key={facility.id}
            ref={(element) => {
              if (element) pinElements.current.set(facility.id, element)
              else pinElements.current.delete(facility.id)
            }}
            type="button"
            className={`location-marker-wrap globe-pin ${isOpen(facility) ? 'is-open' : 'is-closed'}${regionActive ? ' is-highlighted' : ''}`}
            data-facility-id={facility.id}
            aria-label={pinLabel(facility)}
            style={{ visibility: 'hidden' }}
            onClick={() => onChoose(facility)}
            onMouseEnter={() => setHoveredId(facility.id)}
            onMouseLeave={() => setHoveredId((current) => current === facility.id ? null : current)}
            onFocus={() => setHoveredId(facility.id)}
            onBlur={() => setHoveredId((current) => current === facility.id ? null : current)}
            dangerouslySetInnerHTML={{ __html: pinMarkup(facility) }}
          />
        ))}
      </div>
      {hovered && (
        <div ref={previewRef} className="globe-preview dashboard-pin-preview" role="tooltip">
          {renderPreview(hovered)}
        </div>
      )}
      <div className="globe-zoom" role="group" aria-label="Globe zoom">
        <button type="button" aria-label="Zoom in" onClick={() => zoom(1)}><Plus size={17} /></button>
        <button type="button" aria-label="Zoom out" onClick={() => zoom(-1)}><Minus size={17} /></button>
      </div>
      <div ref={creditsRef} className="globe-credits" />
    </div>
  )
}
