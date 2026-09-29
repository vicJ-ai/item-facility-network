import { Event, GeographicTilingScheme, ImageryLayer, type ImageryProvider } from 'cesium'
import type { RegionBoundary } from '../data/region-boundaries'

const TILE_SIZE = 256
const MASK_FILL = 'rgba(18, 15, 36, 0.5)'
const AREA_FILL = 'rgba(107, 70, 193, 0.1)'
const OUTLINE = 'rgba(107, 70, 193, 0.95)'
const GLOW = 'rgba(167, 139, 250, 0.28)'
const DEG = 180 / Math.PI

type Bounds = { west: number; south: number; east: number; north: number }

function boundsOf(boundary: RegionBoundary): Bounds {
  const points = boundary.flatMap((polygon) => polygon[0])
  const longitudes = points.map(([longitude]) => longitude)
  const latitudes = points.map(([, latitude]) => latitude)
  return { west: Math.min(...longitudes), south: Math.min(...latitudes), east: Math.max(...longitudes), north: Math.max(...latitudes) }
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
  private readonly boundary: RegionBoundary
  private readonly bounds: Bounds

  constructor(boundary: RegionBoundary) {
    this.boundary = boundary
    this.bounds = boundsOf(boundary)
  }

  getTileCredits() {
    return []
  }

  pickFeatures() {
    return undefined
  }

  requestImage(x: number, y: number, level: number) {
    const canvas = document.createElement('canvas')
    canvas.width = TILE_SIZE
    canvas.height = TILE_SIZE
    const context = canvas.getContext('2d')
    if (!context) return Promise.resolve(canvas)
    context.fillStyle = MASK_FILL
    context.fillRect(0, 0, TILE_SIZE, TILE_SIZE)

    const tile = this.tilingScheme.tileXYToRectangle(x, y, level)
    const west = tile.west * DEG
    const east = tile.east * DEG
    const south = tile.south * DEG
    const north = tile.north * DEG
    const { bounds } = this
    // Most tiles lie wholly outside the region; they only need the dimming.
    const margin = (east - west) * 0.05
    if (east + margin < bounds.west || west - margin > bounds.east || north + margin < bounds.south || south - margin > bounds.north) return Promise.resolve(canvas)

    const scaleX = TILE_SIZE / (east - west)
    const scaleY = TILE_SIZE / (north - south)
    const path = new Path2D()
    for (const polygon of this.boundary) {
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

export function regionHighlightLayer(boundary: RegionBoundary) {
  return new ImageryLayer(new RegionHighlightImageryProvider(boundary) as unknown as ImageryProvider, { alpha: 0 })
}
