// Builds src/data/region-boundaries.json from us-atlas (US Census cartographic boundaries, 1:10m).
// Run manually after changing the Dashboard regions: node scripts/build-region-boundaries.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { merge } from 'topojson-client'

const atlas = JSON.parse(readFileSync(new URL('../node_modules/us-atlas/counties-10m.json', import.meta.url), 'utf8'))
const { version } = JSON.parse(readFileSync(new URL('../node_modules/us-atlas/package.json', import.meta.url), 'utf8'))

// Southern California: the ten counties conventionally grouped as SoCal. Northern California is the rest of the state.
const SOUTHERN_CALIFORNIA_COUNTIES = ['06025', '06029', '06037', '06059', '06065', '06071', '06073', '06079', '06083', '06111']
const STATE_REGIONS = {
  texas: '48',
  washington: '53',
  georgia: '13',
  'south-carolina': '45',
  tennessee: '47',
  florida: '12',
  nevada: '32',
  illinois: '17',
  arizona: '04',
  utah: '49',
  'new-jersey': '34',
}
const TOLERANCE = 0.002 // degrees, about 200 m
const MIN_EXTENT = 0.03 // drop islets smaller than about 3 km across

const counties = atlas.objects.counties.geometries
const states = atlas.objects.states.geometries
const californiaCounties = counties.filter((county) => county.id.startsWith('06'))

function perpendicularDistance([x, y], [x1, y1], [x2, y2]) {
  const dx = x2 - x1
  const dy = y2 - y1
  const length = Math.hypot(dx, dy)
  if (length === 0) return Math.hypot(x - x1, y - y1)
  return Math.abs(dy * x - dx * y + x2 * y1 - y2 * x1) / length
}

function simplify(points) {
  if (points.length < 3) return points
  let index = 0
  let distance = 0
  for (let i = 1; i < points.length - 1; i += 1) {
    const d = perpendicularDistance(points[i], points[0], points[points.length - 1])
    if (d > distance) [index, distance] = [i, d]
  }
  if (distance <= TOLERANCE) return [points[0], points[points.length - 1]]
  return [...simplify(points.slice(0, index + 1)).slice(0, -1), ...simplify(points.slice(index))]
}

function simplifyRing(ring) {
  // Split closed rings in two so the endpoints of each half are distinct.
  const middle = Math.floor(ring.length / 2)
  const simplified = [...simplify(ring.slice(0, middle + 1)).slice(0, -1), ...simplify(ring.slice(middle))]
  return simplified.map(([x, y]) => [Math.round(x * 1000) / 1000, Math.round(y * 1000) / 1000])
}

function extent(ring) {
  const xs = ring.map(([x]) => x)
  const ys = ring.map(([, y]) => y)
  return Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys))
}

function region(id, geometries, source) {
  const multi = merge(atlas, geometries)
  const polygons = multi.coordinates
    .filter((polygon) => extent(polygon[0]) >= MIN_EXTENT)
    .map((polygon) => polygon.filter((ring) => extent(ring) >= MIN_EXTENT).map(simplifyRing).filter((ring) => ring.length >= 4))
  return { type: 'Feature', id, properties: { source }, geometry: { type: 'MultiPolygon', coordinates: polygons } }
}

const features = [
  region('southern-california', californiaCounties.filter((county) => SOUTHERN_CALIFORNIA_COUNTIES.includes(county.id)), 'Census counties 06025, 06029, 06037, 06059, 06065, 06071, 06073, 06079, 06083, 06111 merged'),
  region('northern-california', californiaCounties.filter((county) => !SOUTHERN_CALIFORNIA_COUNTIES.includes(county.id)), 'Remaining 48 California Census counties merged'),
  ...Object.entries(STATE_REGIONS).map(([id, fips]) => region(id, states.filter((state) => state.id === fips), `Census state ${fips}`)),
]

const collection = {
  type: 'FeatureCollection',
  source: `us-atlas ${version} counties-10m (US Census Bureau cartographic boundaries), simplified to ${TOLERANCE}° with islets under ${MIN_EXTENT}° removed`,
  features,
}
writeFileSync(new URL('../src/data/region-boundaries.json', import.meta.url), `${JSON.stringify(collection)}\n`)
for (const feature of features) {
  const points = feature.geometry.coordinates.flat(2).length
  console.log(`${feature.id}: ${feature.geometry.coordinates.length} polygons, ${points} points`)
}
