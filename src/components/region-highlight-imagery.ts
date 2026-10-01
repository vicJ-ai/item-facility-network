import { Event, GeographicTilingScheme, ImageryLayer, type ImageryProvider } from 'cesium'
import type { RegionBoundary } from '../data/region-boundaries'

const TILE_SIZE = 256
const MASK_FILL = 'rgba(18, 15, 36, 0.5)'
const AREA_FILL = 'rgba(107, 70, 193, 0.1)'
const OUTLINE = 'rgba(107, 70, 193, 0.95)'
const GLOW = 'rgba(167, 139, 250, 0.28)'
const DEG = 180 / Math.PI

type Bounds = { west: number; south: number; east: number; north: number }

function boundsOf(ring: readonly (readonly [number, number])[]): Bounds {
  const longitudes = ring.map(([longitude]) => longitude)
  const latitudes = ring.map(([, latitude]) => latitude)
  return { west: Math.min(...longitudes), south: Math.min(...latitudes), east: Math.max(...longitudes), north: Math.max(...latitudes) }
}

function overlaps(bounds: Bounds, west: number, south: number, east: number, north: number, margin: number) {
  return !(east + margin < bounds.west || west - margin > bounds.east || north + margin < bounds.south || south - margin > bounds.north)
}

let dimmedTile: HTMLCanvasElement | null = null

/** Every tile outside the region looks the same, so they all share one pre-filled canvas. */
function sharedDimmedTile() {
  if (!dimmedTile) {
    dimmedTile = document.createElement('canvas')
    dimmedTile.width = TILE_SIZE
    dimmedTile.height = TILE_SIZE
    const context = dimmedTile.getContext('2d')
    if (context) {
      context.fillStyle = MASK_FILL
      context.fillRect(0, 0, TILE_SIZE, TILE_SIZE)
    }
  }
  return dimmedTile
}

/**
 * Paints the region highlight into globe imagery tiles: everything outside the region is dimmed,
 * the region gets a light tint and an outline. Tiles are drawn in geographic coordinates, so the
 * edge stays sharp at every zoom and follows globe lighting like the base imagery.
 */
class RegionHighlightImageryProvider {
  readonly tilingScheme = new GeographicTilingScheme()
  readonly rectangle = this.tilingScheme.rectangle
  readonly tileWidth = TILE_SIZE
  readonly tileHeight = TILE_SIZE
  readonly maximumLevel = undefined
  readonly minimumLevel = undefined
  readonly tileDiscardPolicy = undefined
  readonly errorEvent = new Event()
  readonly credit = undefined
  readonly proxy = undefined
  readonly hasAlphaChannel = true
  private readonly polygons: { polygon: RegionBoundary[number]; bounds: Bounds }[]
  private readonly outline: boolean

  constructor(boundary: RegionBoundary, outline: boolean) {
    this.polygons = boundary.map((polygon) => ({ polygon, bounds: boundsOf(polygon[0]) }))
    this.outline = outline
  }

  getTileCredits() {
    return []
  }

  pickFeatures() {
    return undefined
  }

  requestImage(x: number, y: number, level: number) {
    const tile = this.tilingScheme.tileXYToRectangle(x, y, level)
    const west = tile.west * DEG
    const east = tile.east * DEG
    const south = tile.south * DEG
    const north = tile.north * DEG
    // Most tiles lie wholly outside the region; they only need the shared dimming.
    const margin = (east - west) * 0.05
    const nearby = this.polygons.filter(({ bounds }) => overlaps(bounds, west, south, east, north, margin))
    if (nearby.length === 0) return Promise.resolve(sharedDimmedTile())

    const canvas = document.createElement('canvas')
    canvas.width = TILE_SIZE
    canvas.height = TILE_SIZE
    const context = canvas.getContext('2d')
    if (!context) return Promise.resolve(canvas)
    context.fillStyle = MASK_FILL
    context.fillRect(0, 0, TILE_SIZE, TILE_SIZE)

    const scaleX = TILE_SIZE / (east - west)
    const scaleY = TILE_SIZE / (north - south)
    const path = new Path2D()
    for (const { polygon } of nearby) {
      for (const ring of polygon) {
        ring.forEach(([longitude, latitude], index) => {
          const px = (longitude - west) * scaleX
          const py = (north - latitude) * scaleY
          if (index === 0) path.moveTo(px, py)
          else path.lineTo(px, py)
        })
        path.closePath()
      }
    }
    // An opaque fill cuts the region out of the dimming completely.
    context.globalCompositeOperation = 'destination-out'
    context.fillStyle = '#000'
    context.fill(path, 'evenodd')
    context.globalCompositeOperation = 'source-over'
    context.fillStyle = AREA_FILL
    context.fill(path, 'evenodd')
    if (!this.outline) return Promise.resolve(canvas)
    context.lineJoin = 'round'
    context.strokeStyle = GLOW
    context.lineWidth = 5
    context.stroke(path)
    context.strokeStyle = OUTLINE
    context.lineWidth = 2.5
    context.stroke(path)
    return Promise.resolve(canvas)
  }
}

/** `outline: false` leaves the edge undrawn, for callers that animate their own outline. */
export function regionHighlightLayer(boundary: RegionBoundary, { outline = true }: { outline?: boolean } = {}) {
  return new ImageryLayer(new RegionHighlightImageryProvider(boundary, outline) as unknown as ImageryProvider, { alpha: 0 })
}
