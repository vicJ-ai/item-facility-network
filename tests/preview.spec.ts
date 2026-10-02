import { expect, test, type Page } from '@playwright/test'
import { facilities } from '../src/data/facilities'
import { userProvidedFacilityPhotos } from '../src/data/facility-user-photos'

// The tour renders the globe continuously; in software WebGL a smaller desktop viewport keeps that
// cheap enough to run alongside the other suites (it stays above the 1040px desktop-header breakpoint).
test.use({ timezoneId: 'America/Los_Angeles', viewport: { width: 1100, height: 640 } })
test.setTimeout(90_000)

const washington = [10, 11, 20]

async function openDashboard(page: Page, speed = 20) {
  await page.addInitScript(() => {
    if (!localStorage.getItem('locations-theme')) localStorage.setItem('locations-theme', 'light')
  })
  // A low frame-rate cap keeps the continuously rendered tour from starving parallel test workers.
  await page.goto(`/?previewSpeed=${speed}&previewFps=6`)
  await expect(page.getByRole('heading', { name: 'Facility directory' })).toBeVisible()
  await page.getByRole('button', { name: 'Dashboard', exact: true }).click()
  await expect(page.getByTestId('dashboard-globe')).toHaveAttribute('data-globe-ready', 'true', { timeout: 20_000 })
}

async function startPreview(page: Page) {
  await page.getByRole('button', { name: 'Preview' }).click()
  const tour = page.getByTestId('preview-tour')
  await expect(tour).toBeVisible()
  // The tour is running once it has reached its first facility.
  await expect.poll(() => tour.getAttribute('data-preview-stop'), { timeout: 30_000 }).toBeTruthy()
  return tour
}

async function cameraOf(page: Page) {
  const data = await page.getByTestId('dashboard-globe').evaluate((element) => ({ ...(element as HTMLElement).dataset }))
  return { height: Number(data.cameraHeight), latitude: Number(data.cameraLatitude), longitude: Number(data.cameraLongitude) }
}

const facilityId = (number: number) => facilities.find((facility) => facility.number === number)!.id

test('the Preview button appears only on the Dashboard', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Facility directory' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Preview' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Dashboard', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Preview' })).toBeVisible()
})

test('Preview plays a cinematic tour that starts in Washington and hides the regular map controls', async ({ page }) => {
  await openDashboard(page, 1)
  const tour = await startPreview(page)
  // Paused on the first facility, so the checks below all see the Washington chapter.
  await page.keyboard.press('Space')
  await expect(page.getByRole('button', { name: 'Play preview' })).toBeVisible()

  await expect(page.locator('.app-shell')).toHaveClass(/is-previewing/)
  for (const control of ['.dashboard-region-toggle', '.map-tools', '.recenter-control', '.daynight-control', '.dashboard-preview-toggle']) {
    await expect(page.locator(control)).toBeHidden()
  }
  await expect(page.locator('.globe-credits')).toBeVisible()
  await expect(tour.locator('.preview-segment')).toHaveCount(13)
  // University Park joins the tour once it has more information; until then it is not in a Dashboard region.
  await expect(tour.locator('.preview-tick')).toHaveCount(facilities.filter((facility) => facility.id !== 'university-park-central').length)
  await expect(tour.locator('[data-chapter-label="0"]')).toContainText('Washington')

  const firstStop = await tour.getAttribute('data-preview-stop')
  expect(washington.map(facilityId)).toContain(firstStop)
  await expect(tour.locator('.preview-tick.is-current')).toHaveCount(1)
  // Pins outside the current region are faded, and the region is highlighted.
  await expect(page.getByTestId('dashboard-globe')).toHaveAttribute('data-region-highlight', 'true')
  await expect(page.locator('.globe-pin.is-out-of-region')).toHaveCount(facilities.length - washington.length)
})

test('Next, Previous, and the progress ticks move between facilities', async ({ page }) => {
  await openDashboard(page)
  const tour = await startPreview(page)
  await page.getByRole('button', { name: 'Pause preview' }).click()
  await expect(page.getByRole('button', { name: 'Play preview' })).toBeVisible()

  // Under load the pause can land between stops; step onto a facility so Previous has one to return to.
  if (!(await tour.getAttribute('data-preview-stop'))) {
    await page.getByRole('button', { name: 'Next facility' }).click()
    await expect.poll(() => tour.getAttribute('data-preview-stop')).toBeTruthy()
  }
  const before = await tour.getAttribute('data-preview-stop')
  await page.getByRole('button', { name: 'Next facility' }).click()
  await expect(tour).not.toHaveAttribute('data-preview-stop', before!)
  await page.getByRole('button', { name: 'Previous facility' }).click()
  await expect(tour).toHaveAttribute('data-preview-stop', before!)

  // Buena Park is a short hop from Long Beach, starting exactly where Long Beach ends; Next and
  // Previous must still cross that boundary.
  await tour.getByRole('button', { name: 'Jump to facility 15, Long Beach' }).click()
  await expect(tour).toHaveAttribute('data-preview-stop', facilityId(15))
  await page.getByRole('button', { name: 'Next facility' }).click()
  await expect(tour).toHaveAttribute('data-preview-stop', facilityId(1))
  await page.getByRole('button', { name: 'Previous facility' }).click()
  await expect(tour).toHaveAttribute('data-preview-stop', facilityId(15))

  await tour.getByRole('button', { name: 'Jump to facility 26, Somerset' }).click()
  await expect(tour).toHaveAttribute('data-preview-stop', facilityId(26))

  // The Tennessee roster address has no city, so its title shows the state rather than an invented city.
  const tennesseeTick = tour.getByRole('button', { name: 'Jump to facility 09, Tennessee' })
  await tennesseeTick.click()
  await expect(tour).toHaveAttribute('data-preview-stop', facilityId(9))
  const index = await tennesseeTick.getAttribute('data-tick')
  await expect(tour.locator(`.preview-stop[data-stop="${index}"] h2`)).toHaveText('TENNESSEE')
  // Each stop shows its cover photo, square footage, and the next site-plan facts.
  const tennesseeCard = tour.locator(`.preview-stop[data-stop="${index}"] [data-testid="preview-stop-card"]`)
  await expect(tennesseeCard.locator('img')).toHaveAttribute('src', userProvidedFacilityPhotos['tennessee-quality-drive']!.photos.find((photo) => photo.id === 'oblique-aerial-exterior')!.assetUrl)
  await expect(tennesseeCard).toContainText('Total220,100 SF')
  await expect(tennesseeCard.getByTestId('preview-stop-available')).toHaveText('AvailablePending')
  await expect(tennesseeCard).toContainText('Auto parking122')

  const roanokeTick = tour.getByRole('button', { name: 'Jump to facility 05, Roanoke' })
  await roanokeTick.click()
  const roanokeCard = tour.locator(`.preview-stop[data-stop="${await roanokeTick.getAttribute('data-tick')}"] [data-testid="preview-stop-card"]`)
  await expect(roanokeCard.getByTestId('preview-stop-available')).toHaveText('Available4,000 SQFT')
  await expect(roanokeCard).toContainText('Dock positions127')

  for (let step = 0; step < facilities.length; step += 1) await page.keyboard.press('ArrowRight')
  await expect(tour.locator('[data-finale]')).toContainText('28 FACILITIES · 13 REGIONS')
})

// The tour's chapters west to east, each with its facilities in visiting order.
const TOUR_ORDER: [string, number[]][] = [
  ['washington', [11, 10, 20]],
  ['northern-california', [21]],
  ['southern-california', [15, 1, 19, 2, 3]],
  ['nevada', [13, 22]],
  ['utah', [25]],
  ['arizona', [18]],
  ['texas', [14, 17, 5, 27, 4, 23]],
  ['illinois', [16]],
  ['tennessee', [9, 24]],
  ['florida', [12]],
  ['georgia', [28, 7, 6]],
  ['south-carolina', [8]],
  ['new-jersey', [26]],
]

test('a full loop visits every region as intro, facilities, zoom-out, then the finale', async ({ page }) => {
  test.setTimeout(180_000)
  // Every change to the tour's phase, region, and stop is recorded as it happens, so no short phase is missed.
  await page.addInitScript(() => {
    const log: { phase?: string; chapter?: string; stop?: string; progress: number }[] = []
    ;(window as unknown as { tourLog: typeof log }).tourLog = log
    new MutationObserver(() => {
      const tour = document.querySelector<HTMLElement>('[data-testid="preview-tour"]')
      if (!tour) return
      const { previewPhase: phase, previewChapter: chapter, previewStop: stop, progress } = tour.dataset
      const last = log[log.length - 1]
      if (last && last.phase === phase && last.chapter === chapter && last.stop === stop && last.progress === Number(progress)) return
      log.push({ phase, chapter, stop, progress: Number(progress) })
    }).observe(document, { subtree: true, attributes: true, attributeFilter: ['data-preview-phase', 'data-preview-chapter', 'data-preview-stop', 'data-progress'] })
  })
  // At 6× every phase still lasts well over half a second, so a slow frame under load cannot skip one.
  await openDashboard(page, 6)
  await startPreview(page)
  type Entry = { phase?: string; chapter?: string; stop?: string; progress: number }
  const readLog = () => page.evaluate(() => (window as unknown as { tourLog: Entry[] }).tourLog)
  // The loop has come round when progress falls back from the finale to the start.
  const loopIndex = (log: Entry[]) => log.findIndex((entry, index) => index > 0 && entry.progress < log[index - 1].progress - 0.5)
  await expect.poll(async () => loopIndex(await readLog()), { timeout: 150_000, intervals: [1000] }).toBeGreaterThan(0)

  const log = await readLog()
  const firstLoop = log.slice(0, loopIndex(log))
  const collapse = (values: (string | undefined)[]) => values.filter((value, index) => value && value !== values[index - 1])

  // Regions come in west-to-east order, and each runs intro → its facilities → zoom-out.
  expect(collapse(firstLoop.map((entry) => entry.chapter))).toEqual(TOUR_ORDER.map(([regionId]) => regionId))
  for (const [regionId, numbers] of TOUR_ORDER) {
    const inRegion = firstLoop.filter((entry) => entry.chapter === regionId)
    expect(collapse(inRegion.map((entry) => entry.phase)), regionId).toEqual(['intro', 'stop', 'outro'])
    expect(collapse(inRegion.map((entry) => entry.stop)), regionId).toEqual(numbers.map(facilityId))
  }
  // Every facility is visited once per loop, and the finale follows the last region's zoom-out.
  expect(collapse(firstLoop.map((entry) => entry.stop))).toEqual(TOUR_ORDER.flatMap(([, numbers]) => numbers).map(facilityId))
  const phases = collapse(firstLoop.map((entry) => entry.phase))
  expect(phases[phases.length - 1]).toBe('finale')
  expect(phases[phases.length - 2]).toBe('outro')
})

test('the tour loops after the finale', async ({ page }) => {
  await openDashboard(page, 60)
  const tour = await startPreview(page)
  const progress = async () => Number(await tour.getAttribute('data-progress'))
  await expect.poll(progress, { timeout: 60_000 }).toBeGreaterThan(0.85)
  await expect.poll(progress, { timeout: 30_000 }).toBeLessThan(0.3)
  await expect(tour).toBeVisible()
})

test('Esc ends the tour and restores the region, panel, and camera exactly as they were', async ({ page }) => {
  await openDashboard(page)
  const regionsToggle = page.locator('.dashboard-region-toggle')
  await regionsToggle.click()
  await page.getByRole('complementary', { name: 'Dashboard regions' }).getByRole('button', { name: /Texas/ }).click()
  await expect(page.getByTestId('dashboard-globe')).toHaveAttribute('data-region-highlight', 'true')
  await page.getByRole('button', { name: 'Close regions' }).click()
  await expect.poll(async () => (await cameraOf(page)).height, { timeout: 15_000 }).toBeLessThan(6_000_000)
  await page.waitForTimeout(2500)
  const camera = await cameraOf(page)

  const tour = await startPreview(page)
  await expect.poll(async () => Math.abs((await cameraOf(page)).longitude - camera.longitude)).toBeGreaterThan(0.5)
  await page.keyboard.press('Escape')
  await expect(tour).toHaveCount(0)
  await expect(page.locator('.app-shell')).not.toHaveClass(/is-previewing/)

  await expect(regionsToggle).toBeVisible()
  await expect(regionsToggle).toContainText('Texas')
  await expect(regionsToggle).toHaveAttribute('aria-expanded', 'false')
  await expect(page.getByTestId('dashboard-globe')).toHaveAttribute('data-region-highlight', 'true')
  await expect(page.locator('.globe-pin.is-out-of-region')).toHaveCount(facilities.length - 6)
  const restored = await cameraOf(page)
  expect(Math.abs(restored.latitude - camera.latitude)).toBeLessThan(0.05)
  expect(Math.abs(restored.longitude - camera.longitude)).toBeLessThan(0.05)
  expect(Math.abs(restored.height - camera.height) / camera.height).toBeLessThan(0.01)
  await expect(page.getByRole('button', { name: 'Preview' })).toBeFocused()
})

test('from the flat map, the tour borrows the globe without changing the saved projection', async ({ page }) => {
  await openDashboard(page)
  await page.getByRole('button', { name: 'Show flat map' }).click()
  const stage = page.getByLabel('Facility network map')
  await expect(stage).toHaveAttribute('data-projection', 'map')

  await page.getByRole('button', { name: 'Preview' }).click()
  await expect(stage).toHaveAttribute('data-projection', 'globe')
  await expect.poll(() => page.getByTestId('preview-tour').getAttribute('data-preview-stop'), { timeout: 30_000 }).toBeTruthy()
  await page.getByRole('button', { name: 'Stop preview' }).click()

  await expect(page.getByTestId('preview-tour')).toHaveCount(0)
  await expect(stage).toHaveAttribute('data-projection', 'map')
  expect(await page.evaluate(() => localStorage.getItem('dashboard-projection-v1'))).toBe('map')
})

test('dragging the map hands control back, and a pin click ends the tour and opens that facility', async ({ page }) => {
  await openDashboard(page)
  let tour = await startPreview(page)
  await page.mouse.move(800, 350)
  await page.mouse.down()
  await page.mouse.move(860, 380)
  await page.mouse.up()
  await expect(tour).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Preview' })).toBeVisible()

  tour = await startPreview(page)
  await page.getByRole('button', { name: 'Pause preview' }).click()
  // Jumping lands the camera over the facility, so its pin is on screen.
  await tour.getByRole('button', { name: 'Jump to facility 26, Somerset' }).click()
  const pinId = facilityId(26)
  const pin = page.locator(`.globe-pin[data-facility-id="${pinId}"]`)
  await expect(pin).toBeVisible()
  await pin.click()
  await expect(tour).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Facilities', exact: true })).toHaveAttribute('aria-current', 'page')
  await expect(page.getByTestId('selected-showcase')).toContainText(facilities.find((facility) => facility.id === pinId)!.fullAddress)
})

test.describe('with reduced motion', () => {
  test.use({ reducedMotion: 'reduce' })

  test('the tour cuts between facilities instead of flying', async ({ page }) => {
    await openDashboard(page)
    const tour = await startPreview(page)
    expect(await tour.locator('.preview-bar-top').evaluate((element) => getComputedStyle(element).animationName)).toBe('none')
    await page.getByRole('button', { name: 'Pause preview' }).click()
    await tour.getByRole('button', { name: 'Jump to facility 26, Somerset' }).click()
    // A cut lands on the facility at once: the camera is already close to it.
    const somerset = facilities.find((facility) => facility.number === 26)!.coordinates!
    await expect.poll(async () => {
      const camera = await cameraOf(page)
      return Math.abs(camera.latitude - somerset[0]) + Math.abs(camera.longitude - somerset[1])
    }).toBeLessThan(0.3)
  })
})
