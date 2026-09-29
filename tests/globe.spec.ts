import { expect, test, type Page } from '@playwright/test'
import { facilities } from '../src/data/facilities'

// Reduced motion makes camera flights instant, and a smaller viewport keeps software WebGL fast.
test.use({ timezoneId: 'America/Los_Angeles', reducedMotion: 'reduce', viewport: { width: 1280, height: 800 } })
// Software WebGL is slow; globe flights and imagery need more time than the flat-map suites.
test.setTimeout(60_000)

async function openDashboardGlobe(page: Page) {
  await page.addInitScript(() => {
    if (!localStorage.getItem('locations-theme')) localStorage.setItem('locations-theme', 'light')
  })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Facility directory' })).toBeVisible()
  await page.getByRole('button', { name: 'Dashboard', exact: true }).click()
  const globe = page.getByTestId('dashboard-globe')
  await expect(globe).toHaveAttribute('data-globe-ready', 'true', { timeout: 20_000 })
  return globe
}

async function cameraOf(page: Page) {
  const data = await page.getByTestId('dashboard-globe').evaluate((element) => ({ ...(element as HTMLElement).dataset }))
  return { height: Number(data.cameraHeight), latitude: Number(data.cameraLatitude), longitude: Number(data.cameraLongitude) }
}

test('Dashboard opens on the 3D globe with day imagery, night lights, and every facility pin', async ({ page }) => {
  const imageryRequests: string[] = []
  page.on('request', (request) => {
    const url = request.url()
    if (url.includes('World_Imagery') || url.includes('VIIRS_Black_Marble')) imageryRequests.push(url)
  })
  const globe = await openDashboardGlobe(page)
  const stage = page.getByLabel('Facility network map')
  await expect(stage).toHaveAttribute('data-projection', 'globe')
  await expect(globe.locator('canvas')).toHaveCount(1)
  await expect(globe).toHaveAttribute('data-lighting', 'true')
  await expect(page.getByRole('button', { name: 'Satellite' })).toHaveAttribute('aria-pressed', 'true')

  const pins = globe.locator('.globe-pin')
  await expect(pins).toHaveCount(facilities.length)
  for (const facility of facilities) {
    await expect(globe.getByRole('button', { name: `Open facility ${String(facility.number).padStart(2, '0')} in Locations` })).toHaveCount(1)
  }
  // The flat map is kept but hidden, and renders no duplicate Dashboard pins.
  await expect(page.locator('.leaflet-marker-pane .location-marker-wrap')).toHaveCount(0)
  await expect(page.locator('.map')).toBeHidden()

  // The home view faces North America, so every pin is on the visible hemisphere.
  await expect.poll(() => pins.evaluateAll((elements) => elements.filter((element) => (element as HTMLElement).style.visibility === 'visible').length)).toBe(facilities.length)
  await expect.poll(() => imageryRequests.some((url) => url.includes('World_Imagery'))).toBe(true)
  await expect.poll(() => imageryRequests.some((url) => url.includes('VIIRS_Black_Marble'))).toBe(true)
  await expect(globe.locator('.globe-credits')).toContainText('Esri')
  await expect(globe.locator('.globe-credits')).toContainText('NASA Black Marble')
})

test('globe pins preview on hover and open the facility in Locations', async ({ page }) => {
  const globe = await openDashboardGlobe(page)
  const somerset = facilities.find((facility) => facility.id === 'somerset-cottontail')!
  const pin = globe.getByRole('button', { name: 'Open facility 26 in Locations' })
  await expect(pin).toHaveCSS('visibility', 'visible')
  await pin.hover()
  const preview = globe.locator('.globe-preview [data-testid="dashboard-pin-preview"]')
  await expect(preview).toHaveAttribute('data-facility-id', somerset.id)
  await expect(preview).toContainText(somerset.fullAddress)
  await expect(preview.getByTestId('open-state')).toBeVisible()
  const [previewBox, stageBox] = await Promise.all([globe.locator('.globe-preview').boundingBox(), globe.boundingBox()])
  expect(previewBox!.x).toBeGreaterThanOrEqual(stageBox!.x)
  expect(previewBox!.x + previewBox!.width).toBeLessThanOrEqual(stageBox!.x + stageBox!.width)

  await pin.click()
  await expect(page.getByRole('button', { name: 'Locations', exact: true })).toHaveAttribute('aria-current', 'page')
  await expect(page.getByTestId('selected-showcase')).toContainText(somerset.fullAddress)
})

test('regions fly the globe camera to their facilities and back home', async ({ page }) => {
  const globe = await openDashboardGlobe(page)
  const home = await cameraOf(page)
  expect(home.height).toBeGreaterThan(10_000_000)

  await page.locator('.dashboard-region-toggle').click()
  await page.getByRole('complementary', { name: 'Dashboard regions' }).getByRole('button', { name: /Arizona/ }).click()
  // Other regions' pins stay on the globe, faded, while Arizona is outlined and everything around it dimmed.
  await expect(globe.locator('.globe-pin')).toHaveCount(facilities.length)
  await expect(globe.locator('.globe-pin.is-out-of-region')).toHaveCount(facilities.length - 1)
  await expect(globe.getByRole('button', { name: 'Open facility 18 in Locations' })).toHaveClass(/is-highlighted/)
  await expect(globe).toHaveAttribute('data-region-highlight', 'true')
  const waddell = facilities.find((facility) => facility.id === 'waddell-cotton')!
  await expect.poll(async () => (await cameraOf(page)).height, { timeout: 15_000 }).toBeLessThan(3_000_000)
  const regional = await cameraOf(page)
  // The flight is widened west to clear the Regions panel, so the camera sits a little west of the site.
  expect(Math.abs(regional.latitude - waddell.coordinates![0])).toBeLessThan(6)
  expect(Math.abs(regional.longitude - waddell.coordinates![1])).toBeLessThan(10)

  await page.getByRole('button', { name: 'All facilities' }).click()
  await expect(globe.locator('.globe-pin')).toHaveCount(facilities.length)
  await expect(globe.locator('.globe-pin.is-out-of-region')).toHaveCount(0)
  await expect(globe).toHaveAttribute('data-region-highlight', 'false')
  await expect.poll(async () => (await cameraOf(page)).height, { timeout: 15_000 }).toBeGreaterThan(10_000_000)

  const before = (await cameraOf(page)).height
  await globe.getByRole('button', { name: 'Zoom in' }).click()
  await expect.poll(async () => (await cameraOf(page)).height).toBeLessThan(before * 0.8)
  await page.getByRole('button', { name: 'Recenter map' }).click()
  await expect.poll(async () => (await cameraOf(page)).height, { timeout: 15_000 }).toBeGreaterThan(before * 0.95)
})

test('day and night controls drive globe lighting, and the flat map toggle persists', async ({ page }) => {
  const globe = await openDashboardGlobe(page)
  await page.getByRole('button', { name: 'Day and night shading' }).click()
  await expect(globe).toHaveAttribute('data-lighting', 'false')
  await page.getByRole('button', { name: 'Day and night shading' }).click()
  await expect(globe).toHaveAttribute('data-lighting', 'true')

  await page.getByRole('button', { name: 'Street' }).click()
  await expect(page.getByRole('button', { name: 'Street' })).toHaveAttribute('aria-pressed', 'true')

  await page.getByRole('button', { name: 'Show flat map' }).click()
  const stage = page.getByLabel('Facility network map')
  await expect(stage).toHaveAttribute('data-projection', 'map')
  await expect(page.getByTestId('dashboard-globe')).toHaveCount(0)
  await expect(page.locator('.location-marker-wrap')).toHaveCount(facilities.length)
  // The flat map keeps its own layer choice (Street by default).
  await expect(page.getByRole('button', { name: 'Street' })).toHaveAttribute('aria-pressed', 'true')

  await page.reload()
  await page.getByRole('button', { name: 'Dashboard', exact: true }).click()
  await expect(page.getByLabel('Facility network map')).toHaveAttribute('data-projection', 'map')
  await page.getByRole('button', { name: 'Show globe' }).click()
  await expect(page.getByTestId('dashboard-globe')).toHaveAttribute('data-globe-ready', 'true', { timeout: 20_000 })
})

test('without WebGL the Dashboard falls back to the flat map', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
      if (type.startsWith('webgl')) return null
      return (original as (...args: unknown[]) => RenderingContext | null).call(this, type, ...rest)
    } as typeof HTMLCanvasElement.prototype.getContext
    localStorage.setItem('locations-theme', 'light')
  })
  await page.goto('/')
  await page.getByRole('button', { name: 'Dashboard', exact: true }).click()
  await expect(page.getByLabel('Facility network map')).toHaveAttribute('data-projection', 'map')
  await expect(page.getByTestId('dashboard-globe')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Show globe' })).toHaveCount(0)
  await expect(page.locator('.location-marker-wrap')).toHaveCount(facilities.length)
})
