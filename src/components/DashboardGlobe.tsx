import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { Minus, Plus } from 'lucide-react'
import {
  Cartesian2,
  Cartesian3,
  Color,
  Credit,
  FrameRateMonitor,
  ImageryLayer,
  JulianDate,
  Rectangle,
  UrlTemplateImageryProvider,
  CesiumWidget,
  WebMercatorTilingScheme,
} from 'cesium'
import 'cesium/Build/Cesium/Widgets/CesiumWidget/CesiumWidget.css'
import type { Facility } from '../data/facilities'
import type { RegionBoundary } from '../data/region-boundaries'
import { lowerTier, QUALITY_TIERS, type QualityChoice, type QualityTier } from '../lib/globe-quality'
import type { TourCameraApi } from '../lib/preview-tour/camera-api'
import { createGlobeTourApi } from './globe-tour-api'
import { regionHighlightLayer } from './region-highlight-imagery'

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
const REGION_FADE_MS = 700
// City lights only matter above this camera height; below it, globe lighting has faded out anyway.
const NIGHT_LIGHTS_MIN_HEIGHT = 400_000
// Tiles are this much coarser while the Preview tour travels between stops.
const FLIGHT_DETAIL_FACTOR = 3
// Region highlight layers the Preview tour keeps ready, so returning to a region needs no redraw.
const TOUR_LAYER_CACHE = 4

function esriLayer(layer: GlobeLayer) {
  return new ImageryLayer(new UrlTemplateImageryProvider({ url: ESRI_TILE_URLS[layer], tilingScheme: new WebMercatorTilingScheme(), maximumLevel: 19, credit: new Credit(ESRI_ATTRIBUTIONS[layer], true) }))
}

function nightLightsLayer() {
  // Shown only on the night side; Cesium blends it using the real sun position at the clock time.
  // Globe lighting later dims the night side to about 30%, so the lights are brightened to compensate.
  return new ImageryLayer(new UrlTemplateImageryProvider({ url: NIGHT_LIGHTS_URL, tilingScheme: new WebMercatorTilingScheme(), maximumLevel: 8, credit: new Credit(NIGHT_LIGHTS_ATTRIBUTION, true) }), { dayAlpha: 0, nightAlpha: 1, brightness: NIGHT_LIGHTS_BRIGHTNESS })
}

/**
 * Padded bounds for a region flight, covering its facilities and its highlighted boundary; small
 * regions keep enough context to read as a place on the planet. `coveredLeft` is the fraction of the
 * view hidden by the Regions panel, so the bounds are widened westward and the region lands in the
 * visible part of the globe.
 */
function regionRectangle(facilities: readonly MappableFacility[], boundary: RegionBoundary | null, coveredLeft: number) {
  const outline = (boundary ?? []).flatMap((polygon) => polygon[0])
  const latitudes = [...facilities.map((facility) => facility.coordinates[0]), ...outline.map(([, latitude]) => latitude)]
  const longitudes = [...facilities.map((facility) => facility.coordinates[1]), ...outline.map(([longitude]) => longitude)]
  const [south, north] = [Math.min(...latitudes), Math.max(...latitudes)]
  const [west, east] = [Math.min(...longitudes), Math.max(...longitudes)]
  // A boundary already gives the region its size, so it needs only a thin margin.
  const latitudePadding = boundary ? Math.max((north - south) * 0.12, 0.8) : Math.max((north - south) * 0.35, 2.5)
  const longitudePadding = boundary ? Math.max((east - west) * 0.12, 1.2) : Math.max((east - west) * 0.35, 3.5)
  const paddedWest = west - longitudePadding
  const paddedEast = east + longitudePadding
  const panelAllowance = ((paddedEast - paddedWest) * coveredLeft) / (1 - coveredLeft)
  return Rectangle.fromDegrees(paddedWest - panelAllowance, south - latitudePadding, paddedEast, north + latitudePadding)
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

type DashboardGlobeProps = {
  /** False while another view is shown: the globe stays loaded but hidden, and stops rendering. */
  active: boolean
  /** Every pin shown on the globe. */
  facilities: readonly MappableFacility[]
  /** The active region's facilities: camera flights frame these, and pins outside the region are faded. */
  targets: readonly MappableFacility[]
  regionBoundary: RegionBoundary | null
  /** Whether the highlight draws the region's edge; the Preview tour animates its own outline. */
  regionOutline?: boolean
  /** Set during the Preview tour: highlight layers are kept per key instead of being redrawn. */
  regionKey?: string | null
  quality: QualityChoice
  /** The starting tier for the automatic setting, from the graphics hardware. */
  detectedTier: QualityTier
  onEffectiveTier: (tier: QualityTier) => void
  /** Shows Cesium's frame-rate readout (`?debug=perf`). */
  debugPerf?: boolean
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
  /** Receives the Preview tour's camera controls once the globe is ready, and `null` on teardown. */
  onTourApi?: (api: TourCameraApi | null) => void
}

type PinPoint = { x: number; y: number; visible: boolean }
type PinWrite = { transform: string; visible: boolean }

export default function DashboardGlobe({ active, facilities, targets, regionBoundary, regionOutline = true, regionKey = null, quality, detectedTier, onEffectiveTier, debugPerf = false, time, shading, layer, flySignal, regionActive, panelOpen, pinMarkup, pinLabel, isOpen, renderPreview, onChoose, onUnavailable, onTourApi }: DashboardGlobeProps) {
  const stageRef = useRef<HTMLDivElement>(null)
  const canvasHostRef = useRef<HTMLDivElement>(null)
  const creditsRef = useRef<HTMLDivElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<CesiumWidget | null>(null)
  const baseLayerRef = useRef<ImageryLayer | null>(null)
  const nightLayerRef = useRef<ImageryLayer | null>(null)
  const pinElements = useRef(new Map<string, HTMLButtonElement>())
  const pinPoints = useRef(new Map<string, PinPoint>())
  const positions = useRef(new Map<string, Cartesian3>())
  const hoveredRef = useRef<string | null>(null)
  const initialProps = useRef({ time, shading, onUnavailable, debugPerf })
  const flightTarget = useRef({ targets, regionBoundary, regionActive, panelOpen })
  const currentLayer = useRef(layer)
  const onTourApiRef = useRef(onTourApi)
  const onEffectiveTierRef = useRef(onEffectiveTier)
  // The Preview tour fades the region highlight near the ground; the fade-in multiplies with it.
  const regionOpacity = useRef(1)
  const regionFade = useRef<{ layer: ImageryLayer; eased: number } | null>(null)
  const tourLayers = useRef(new Map<string, ImageryLayer>())
  const monitorRef = useRef<FrameRateMonitor | null>(null)
  const shadingRef = useRef(shading)
  const flightCoarse = useRef(false)
  const pinWrites = useRef(new WeakMap<HTMLElement, PinWrite>())
  const previewSize = useRef({ width: 0, height: 0 })
  const stageSize = useRef({ width: 0, height: 0 })
  const [autoTier, setAutoTier] = useState<QualityTier>(detectedTier)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const effectiveTier: QualityTier = quality === 'auto' ? autoTier : quality
  const settingsRef = useRef(QUALITY_TIERS[effectiveTier])

  // Layout effects run before the passive effects below, so flights and previews read current props.
  useLayoutEffect(() => {
    flightTarget.current = { targets, regionBoundary, regionActive, panelOpen }
    hoveredRef.current = hoveredId
    onTourApiRef.current = onTourApi
    onEffectiveTierRef.current = onEffectiveTier
    shadingRef.current = shading
  })

  // Sizes are measured when they change, never inside the per-frame pin update.
  const placePreview = useCallback(() => {
    const preview = previewRef.current
    const id = hoveredRef.current
    const point = id ? pinPoints.current.get(id) : undefined
    if (!preview || !point) return
    const { width, height } = previewSize.current
    const stage = stageSize.current
    preview.style.visibility = point.visible ? 'visible' : 'hidden'
    const onRight = point.x < stage.width * 0.55
    const x = onRight ? point.x + PREVIEW_GAP : point.x - PREVIEW_GAP - width
    const y = Math.min(Math.max(point.y - 18 - height / 2, 8), stage.height - height - 8)
    preview.style.transform = `translate3d(${Math.round(Math.max(8, x))}px, ${Math.round(y)}px, 0)`
  }, [])

  const updatePins = useCallback(() => {
    const viewer = viewerRef.current
    if (!viewer) return
    const { scene } = viewer
    const cameraPosition = scene.camera.positionWC
    const canvasPoint = new Cartesian2()
    const normal = new Cartesian3()
    const toCamera = new Cartesian3()
    for (const [id, position] of positions.current) {
      const element = pinElements.current.get(id)
      if (!element) continue
      // A surface point faces the camera when the camera lies above its local horizon plane.
      Cartesian3.normalize(position, normal)
      Cartesian3.subtract(cameraPosition, position, toCamera)
      const facing = Cartesian3.dot(normal, toCamera) > 0
      const onCanvas = facing ? scene.cartesianToCanvasCoordinates(position, canvasPoint) : undefined
      const visible = Boolean(onCanvas)
      const point = { x: onCanvas?.x ?? -100, y: onCanvas?.y ?? -100, visible }
      pinPoints.current.set(id, point)
      // Only touch the DOM when a pin actually moved or changed visibility.
      const transform = `translate3d(${Math.round(point.x - PIN_ANCHOR.x)}px, ${Math.round(point.y - PIN_ANCHOR.y)}px, 0)`
      const last = pinWrites.current.get(element)
      if (last?.transform !== transform) element.style.transform = transform
      if (last?.visible !== visible) {
        element.style.visibility = visible ? 'visible' : 'hidden'
        element.tabIndex = visible ? 0 : -1
      }
      pinWrites.current.set(element, { transform, visible })
    }
    const cartographic = scene.camera.positionCartographic
    const stage = stageRef.current
    if (stage) {
      const height = String(Math.round(cartographic.height))
      const latitude = (cartographic.latitude * 180 / Math.PI).toFixed(3)
      const longitude = (cartographic.longitude * 180 / Math.PI).toFixed(3)
      if (stage.dataset.cameraHeight !== height) stage.dataset.cameraHeight = height
      if (stage.dataset.cameraLatitude !== latitude) stage.dataset.cameraLatitude = latitude
      if (stage.dataset.cameraLongitude !== longitude) stage.dataset.cameraLongitude = longitude
    }
    // City lights are only fetched at heights where they can be seen.
    const night = nightLayerRef.current
    const showNight = shadingRef.current && cartographic.height > NIGHT_LIGHTS_MIN_HEIGHT
    if (night && night.show !== showNight) {
      night.show = showNight
      scene.requestRender()
    }
    placePreview()
  }, [placePreview])

  // Applies a quality tier's settings; none of them needs the viewer to be rebuilt.
  const applySettings = useCallback(() => {
    const viewer = viewerRef.current
    if (!viewer) return
    const settings = settingsRef.current
    viewer.scene.msaaSamples = settings.msaaSamples
    viewer.resolutionScale = settings.resolutionScale
    viewer.scene.globe.maximumScreenSpaceError = settings.maximumScreenSpaceError * (flightCoarse.current ? FLIGHT_DETAIL_FACTOR : 1)
    viewer.scene.globe.tileCacheSize = settings.tileCacheSize
    viewer.scene.requestRender()
  }, [])

  useEffect(() => {
    const host = canvasHostRef.current
    if (!host || !creditsRef.current) return
    let viewer: CesiumWidget
    try {
      // The bare widget: the globe needs none of the Viewer's toolbar, timeline, or entity panels.
      viewer = new CesiumWidget(host, {
        baseLayer: esriLayer(currentLayer.current),
        creditContainer: creditsRef.current,
        requestRenderMode: true,
        maximumRenderTimeChange: Number.POSITIVE_INFINITY,
        // Lighter defaults on every tier: the star box sits behind a near-black background, only the
        // 3D view is used, and the tour's few translucent lines need no order-independent pass.
        skyBox: false,
        scene3DOnly: true,
        orderIndependentTranslucency: false,
        msaaSamples: settingsRef.current.msaaSamples,
      })
    } catch {
      initialProps.current.onUnavailable()
      return
    }
    viewerRef.current = viewer
    // Globe lighting follows the real sun position from the clock, so the sun and moon need not be drawn.
    viewer.scene.sun?.destroy()
    viewer.scene.sun = undefined as never
    viewer.scene.moon?.destroy()
    viewer.scene.moon = undefined as never
    viewer.scene.debugShowFramesPerSecond = initialProps.current.debugPerf
    applySettings()
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
    const tourApi = createGlobeTourApi(viewer, pinElements.current, {
      setRegionOpacity: (opacity) => {
        regionOpacity.current = opacity
        const fade = regionFade.current
        if (fade) fade.layer.alpha = fade.eased * opacity
      },
      setFlightDetail: (coarse) => {
        if (flightCoarse.current === coarse) return
        flightCoarse.current = coarse
        if (stage) stage.dataset.flightDetail = coarse ? 'coarse' : 'full'
        applySettings()
      },
      settings: () => settingsRef.current,
    })
    onTourApiRef.current?.(tourApi)

    // Automatic quality steps down one tier each time motion stays choppy; it never steps back up.
    const monitor = new FrameRateMonitor({ scene, samplingWindow: 3, quietPeriod: 2, warmupPeriod: 3, minimumFrameRateDuringWarmup: 12, minimumFrameRateAfterWarmup: 20 })
    monitorRef.current = monitor
    const removeLowFrameRate = monitor.lowFrameRate.addEventListener(() => setAutoTier((tier) => lowerTier(tier)))
    const tourLayerCache = tourLayers.current

    return () => {
      onTourApiRef.current?.(null)
      tourApi.destroy()
      removeLowFrameRate()
      monitor.destroy()
      monitorRef.current = null
      removePostRender()
      tourLayerCache.clear()
      viewer.destroy()
      viewerRef.current = null
      baseLayerRef.current = null
      nightLayerRef.current = null
      if (stage) stage.dataset.globeReady = 'false'
    }
  }, [applySettings, updatePins])

  useEffect(() => {
    settingsRef.current = QUALITY_TIERS[effectiveTier]
    applySettings()
    const stage = stageRef.current
    if (stage) {
      stage.dataset.quality = effectiveTier
      stage.dataset.qualityChoice = quality
    }
    onEffectiveTierRef.current(effectiveTier)
  }, [applySettings, effectiveTier, quality])

  // While hidden, the globe keeps its loaded imagery but runs no render loop and draws no pins.
  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer) return
    viewer.useDefaultRenderLoop = active
    const monitor = monitorRef.current
    if (!active) {
      monitor?.pause()
      return () => {
        if (monitor && !monitor.isDestroyed()) monitor.unpause()
      }
    }
    viewer.scene.requestRender()
  }, [active])

  // The stage size is read for hover-preview placement; measuring on resize keeps it out of frames.
  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const measure = () => { stageSize.current = { width: stage.clientWidth, height: stage.clientHeight } }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(stage)
    return () => observer.disconnect()
  }, [])

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
    if (nightLayerRef.current) nightLayerRef.current.show = shading && viewer.camera.positionCartographic.height > NIGHT_LIGHTS_MIN_HEIGHT
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

  // Outside the tour, its cached highlight layers are released.
  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer || regionKey) return
    for (const cached of tourLayers.current.values()) viewer.imageryLayers.remove(cached, true)
    tourLayers.current.clear()
  }, [regionKey])

  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer || !regionBoundary) return
    // Drawn above the base imagery and night lights, and faded in while the camera flies there.
    // During the tour a layer is kept per region, so a returning chapter shows it without redrawing.
    const cache = tourLayers.current
    let layer = regionKey ? cache.get(regionKey) : undefined
    if (layer) {
      viewer.imageryLayers.raiseToTop(layer)
      layer.show = true
    } else {
      layer = regionHighlightLayer(regionBoundary, { outline: regionOutline })
      viewer.imageryLayers.add(layer)
      if (regionKey) {
        cache.set(regionKey, layer)
        // Past the cache size, the least recently added region is released for good.
        for (const [key, cached] of cache) {
          if (cache.size <= TOUR_LAYER_CACHE) break
          if (cached === layer) continue
          viewer.imageryLayers.remove(cached, true)
          cache.delete(key)
        }
      }
    }
    layer.alpha = 0
    const stage = stageRef.current
    if (stage) stage.dataset.regionHighlight = 'true'
    const start = performance.now()
    const shown = layer
    const record = { layer: shown, eased: 0 }
    regionFade.current = record
    let frame = 0
    const fade = (now: number) => {
      const progress = prefersReducedMotion() ? 1 : Math.min(1, (now - start) / REGION_FADE_MS)
      record.eased = 1 - (1 - progress) ** 3
      shown.alpha = record.eased * regionOpacity.current
      viewer.scene.requestRender()
      if (progress < 1) frame = window.requestAnimationFrame(fade)
    }
    frame = window.requestAnimationFrame(fade)
    return () => {
      window.cancelAnimationFrame(frame)
      if (regionFade.current === record) regionFade.current = null
      if (stage) stage.dataset.regionHighlight = 'false'
      if (viewer.isDestroyed()) return
      // A cached tour layer is only hidden; it is released when it leaves the cache or the tour ends.
      if (regionKey !== null && cache.get(regionKey) === shown) shown.show = false
      else if (viewer.imageryLayers.contains(shown)) viewer.imageryLayers.remove(shown, true)
      viewer.scene.requestRender()
    }
  }, [regionBoundary, regionKey, regionOutline])

  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer || flySignal === 0) return
    // Each signal is one flight request, aimed at whatever region is active when it arrives.
    const { targets: flightTargets, regionBoundary: flightBoundary, regionActive: toRegion, panelOpen: panelShown } = flightTarget.current
    const duration = prefersReducedMotion() ? 0 : 1.6
    const width = stageRef.current?.clientWidth ?? 0
    // Matches the desktop Regions panel (18px inset + 334px wide); on mobile it is a bottom sheet instead.
    const coveredLeft = panelShown && width > 720 ? Math.min(0.45, 370 / width) : 0
    if (toRegion && flightTargets.length > 0) viewer.camera.flyTo({ destination: regionRectangle(flightTargets, flightBoundary, coveredLeft), duration })
    else viewer.camera.flyTo({ destination: Cartesian3.fromDegrees(HOME_VIEW.longitude, HOME_VIEW.latitude, HOME_VIEW.height), duration })
  }, [flySignal])

  // The hover preview is measured once when it appears, not on every frame it follows the pin.
  useLayoutEffect(() => {
    const preview = previewRef.current
    if (preview) previewSize.current = { width: preview.offsetWidth, height: preview.offsetHeight }
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
  const regionIds = new Set(targets.map((facility) => facility.id))

  return (
    <div ref={stageRef} className="globe-stage" data-testid="dashboard-globe" data-lighting={shading} data-active={active} hidden={!active}>
      <div ref={canvasHostRef} className="globe-canvas" />
      <div className="globe-pins">
        {active && facilities.map((facility) => (
          <button
            key={facility.id}
            ref={(element) => {
              if (element) pinElements.current.set(facility.id, element)
              else pinElements.current.delete(facility.id)
            }}
            type="button"
            className={`location-marker-wrap globe-pin ${isOpen(facility) ? 'is-open' : 'is-closed'}${regionActive ? (regionIds.has(facility.id) ? ' is-highlighted' : ' is-out-of-region') : ''}`}
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
      {active && hovered && (
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
