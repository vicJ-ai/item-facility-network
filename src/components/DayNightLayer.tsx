import { useEffect, useRef } from 'react'
import L from 'leaflet'
import { useMap } from 'react-leaflet'
import { getNightDarkness, getSubsolarPoint, type SubsolarPoint } from '../lib/solar'

const SHADE_PANE = 'daynight-shade'
const SUN_PANE = 'daynight-sun'
// Each 256px tile is painted at 64×64 samples and upscaled by the browser. The twilight band
// spans ~18° of solar altitude, so bilinear upscaling keeps it smooth at every zoom level.
const TILE_SAMPLES = 64
const NIGHT_RGB = [14, 10, 44] as const
const NIGHT_MAX_ALPHA = 0.6
const DEG = Math.PI / 180

function ensurePane(map: L.Map, name: string, zIndex: number) {
  const pane = map.getPane(name) ?? map.createPane(name)
  pane.style.zIndex = String(zIndex)
  pane.style.pointerEvents = 'none'
  pane.classList.add('daynight-pane')
  return pane
}

function paintTile(canvas: HTMLCanvasElement, coords: L.Coords, sun: SubsolarPoint) {
  const context = canvas.getContext('2d')
  if (!context) return
  const size = canvas.width
  const image = context.createImageData(size, size)
  const worldTiles = 2 ** coords.z
  const sinDeclination = Math.sin(sun.latitude * DEG)
  const cosDeclination = Math.cos(sun.latitude * DEG)

  // Web Mercator keeps longitude a function of x and latitude a function of y, so the
  // hour-angle and latitude terms are computed once per column and once per row.
  const cosHourAngle = new Float64Array(size)
  for (let column = 0; column < size; column += 1) {
    const longitude = ((coords.x + (column + 0.5) / size) / worldTiles) * 360 - 180
    cosHourAngle[column] = Math.cos((longitude - sun.longitude) * DEG)
  }

  for (let row = 0; row < size; row += 1) {
    const mercator = Math.PI - (2 * Math.PI * (coords.y + (row + 0.5) / size)) / worldTiles
    const latitude = Math.atan(Math.sinh(mercator))
    const latitudeTerm = Math.sin(latitude) * sinDeclination
    const declinationTerm = Math.cos(latitude) * cosDeclination
    for (let column = 0; column < size; column += 1) {
      const altitude = Math.asin(Math.min(1, Math.max(-1, latitudeTerm + declinationTerm * cosHourAngle[column]))) / DEG
      const offset = (row * size + column) * 4
      image.data[offset] = NIGHT_RGB[0]
      image.data[offset + 1] = NIGHT_RGB[1]
      image.data[offset + 2] = NIGHT_RGB[2]
      image.data[offset + 3] = Math.round(getNightDarkness(altitude) * NIGHT_MAX_ALPHA * 255)
    }
  }
  context.putImageData(image, 0, 0)
}

class NightShadeLayer extends L.GridLayer {
  private readonly paint: (canvas: HTMLCanvasElement, coords: L.Coords) => void

  constructor(paint: (canvas: HTMLCanvasElement, coords: L.Coords) => void, options: L.GridLayerOptions) {
    super(options)
    this.paint = paint
  }

  // One argument keeps Leaflet on its synchronous tile path.
  protected createTile(coords: L.Coords) {
    const canvas = document.createElement('canvas')
    canvas.width = TILE_SAMPLES
    canvas.height = TILE_SAMPLES
    this.paint(canvas, coords)
    return canvas
  }
}

/** Shades the night side of the map for `time` and marks the subsolar point. */
export function DayNightLayer({ time, visible }: { time: number; visible: boolean }) {
  const map = useMap()
  const sunRef = useRef<SubsolarPoint>(getSubsolarPoint(new Date(time)))
  const tilesRef = useRef(new Map<HTMLCanvasElement, L.Coords>())
  const sunMarkersRef = useRef<L.Marker[]>([])

  useEffect(() => {
    if (!visible) return
    ensurePane(map, SHADE_PANE, 350)
    ensurePane(map, SUN_PANE, 360)
    const tiles = tilesRef.current
    const layer = new NightShadeLayer((canvas, coords) => {
      paintTile(canvas, coords, sunRef.current)
      tiles.set(canvas, coords)
    }, { pane: SHADE_PANE, className: 'daynight-tiles', updateWhenZooming: false, keepBuffer: 1 })
    layer.on('tileunload', (event: L.TileEvent) => tiles.delete(event.tile as unknown as HTMLCanvasElement))
    layer.addTo(map)

    const sunIcon = L.divIcon({ className: 'daynight-sun', html: '<span></span>', iconSize: [26, 26], iconAnchor: [13, 13] })
    // Three copies keep the sun visible when the map is panned across the antimeridian.
    sunMarkersRef.current = [-360, 0, 360].map((offset) => {
      const marker = L.marker([sunRef.current.latitude, sunRef.current.longitude + offset], { icon: sunIcon, pane: SUN_PANE, interactive: false, keyboard: false })
      marker.addTo(map)
      marker.getElement()?.setAttribute('aria-hidden', 'true')
      return marker
    })

    return () => {
      layer.remove()
      tiles.clear()
      for (const marker of sunMarkersRef.current) marker.remove()
      sunMarkersRef.current = []
    }
  }, [map, visible])

  useEffect(() => {
    const sun = getSubsolarPoint(new Date(time))
    sunRef.current = sun
    for (const [canvas, coords] of tilesRef.current) paintTile(canvas, coords, sun)
    sunMarkersRef.current.forEach((marker, index) => marker.setLatLng([sun.latitude, sun.longitude + (index - 1) * 360]))
  }, [time])

  return null
}
