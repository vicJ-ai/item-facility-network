import { expect, test, type Locator, type Page } from '@playwright/test'
import { facilities } from '../src/data/facilities'
import { facilityOperatingHours } from '../src/data/facility-hours'
import { getFacilityOpenState, getFacilityTimeZone, parseClockTime } from '../src/lib/facility-open'
import { getNightDarkness, getSolarAltitude, getSubsolarPoint } from '../src/lib/solar'

// Wednesday 2026-06-17 at 4:00 PM PDT: Pacific sites and Arizona (no DST) are open,
// while Mountain (DST), Central, and Eastern sites have closed for the day.
const WEDNESDAY_4PM_PACIFIC = new Date('2026-06-17T23:00:00Z')
const NIGHT_MAX_ALPHA = 0.6

test.use({ timezoneId: 'America/Los_Angeles' })

function boxesOverlap(a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
}

async function openAt(page: Page, time: Date, viewport = { width: 1536, height: 1024 }) {
  await page.setViewportSize(viewport)
  await page.addInitScript(() => {
    if (!localStorage.getItem('locations-theme')) localStorage.setItem('locations-theme', 'light')
    // These suites cover the flat Dashboard map; tests/globe.spec.ts covers the 3D globe.
    if (!localStorage.getItem('dashboard-projection-v1')) localStorage.setItem('dashboard-projection-v1', 'map')
  })
  // A running fake clock (not a fixed one) keeps Leaflet's tile fade animations working.
  await page.clock.install({ time })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Facility directory' })).toBeVisible()
}

/** Reads the night-shade alpha (0–255) painted under a facility's map pin. */
async function shadeAlphaAtPin(page: Page, facility: (typeof facilities)[number]) {
  const marker = page.locator(`.location-marker-wrap[title="${facility.fullAddress}"]`)
  await expect(marker).toHaveCount(1)
  return marker.evaluate((element) => {
    const rect = element.getBoundingClientRect()
    const x = rect.left + 15
    const y = rect.top + 36
    for (const canvas of document.querySelectorAll<HTMLCanvasElement>('.daynight-pane canvas')) {
      const tile = canvas.getBoundingClientRect()
      if (x < tile.left || x >= tile.right || y < tile.top || y >= tile.bottom) continue
      const column = Math.floor(((x - tile.left) / tile.width) * canvas.width)
      const row = Math.floor(((y - tile.top) / tile.height) * canvas.height)
      return canvas.getContext('2d')!.getImageData(column, row, 1, 1).data[3]
    }
    return null
  })
}

function expectedShadeAlpha(facility: (typeof facilities)[number], time: Date) {
  const [latitude, longitude] = facility.coordinates!
  return getNightDarkness(getSolarAltitude(getSubsolarPoint(time), latitude, longitude)) * NIGHT_MAX_ALPHA * 255
}

async function box(locator: Locator) {
  const result = await locator.boundingBox()
  expect(result).not.toBeNull()
  return result!
}

test('subsolar point matches the 2026 equinox and solstices', () => {
  const equinox = getSubsolarPoint(new Date('2026-03-20T14:46:00Z'))
  expect(Math.abs(equinox.latitude)).toBeLessThan(0.05)
  const juneSolstice = getSubsolarPoint(new Date('2026-06-21T12:00:00Z'))
  expect(juneSolstice.latitude).toBeCloseTo(23.44, 1)
  expect(Math.abs(juneSolstice.longitude)).toBeLessThan(1)
  const decemberSolstice = getSubsolarPoint(new Date('2026-12-21T12:00:00Z'))
  expect(decemberSolstice.latitude).toBeCloseTo(-23.44, 1)
  expect(Math.abs(decemberSolstice.longitude)).toBeLessThan(1)
  // Solar noon moves west 15° per hour.
  expect(getSubsolarPoint(new Date('2026-06-21T18:00:00Z')).longitude).toBeCloseTo(juneSolstice.longitude - 90, 0)
})

test('solar altitude and night darkness follow the twilight bands', () => {
  const sun = getSubsolarPoint(new Date('2026-06-17T19:00:00Z'))
  expect(getSolarAltitude(sun, 34.05, -118.24)).toBeGreaterThan(60)
  expect(getSolarAltitude(getSubsolarPoint(new Date('2026-06-17T08:00:00Z')), 34.05, -118.24)).toBeLessThan(-18)
  expect(getNightDarkness(10)).toBe(0)
  expect(getNightDarkness(-0.833)).toBe(0)
  expect(getNightDarkness(-18)).toBe(1)
  expect(getNightDarkness(-30)).toBe(1)
  let previous = 0
  for (let altitude = 0; altitude >= -18; altitude -= 0.5) {
    const darkness = getNightDarkness(altitude)
    expect(darkness).toBeGreaterThanOrEqual(previous)
    previous = darkness
  }
  expect(getNightDarkness(-6)).toBeGreaterThan(0.4)
  expect(getNightDarkness(-6)).toBeLessThan(0.6)
})

test('open state uses facility-local time zones, daylight saving time, and weekdays', () => {
  const hours = (timezone: 'PST' | 'MST' | 'CST' | 'EST') => ({ ...facilityOperatingHours['buena-park-valley-view'], timezone }) as (typeof facilityOperatingHours)[string]
  expect(parseClockTime('8:00 AM')).toBe(480)
  expect(parseClockTime('4:30 PM')).toBe(990)
  expect(parseClockTime('12:15 AM')).toBe(15)
  expect(parseClockTime('12:15 PM')).toBe(735)

  expect(getFacilityOpenState({ state: 'AZ' }, hours('MST'), WEDNESDAY_4PM_PACIFIC)).toMatchObject({ isOpen: true, timeZone: 'America/Phoenix', localTime: '4:00 PM MST' })
  expect(getFacilityOpenState({ state: 'UT' }, hours('MST'), WEDNESDAY_4PM_PACIFIC)).toMatchObject({ isOpen: false, timeZone: 'America/Denver', localTime: '5:00 PM MDT', summary: 'Closed · opens tomorrow 8:00 AM' })
  expect(getFacilityOpenState({ state: 'CA' }, hours('PST'), new Date('2026-06-17T14:59:00Z'))).toMatchObject({ isOpen: false, summary: 'Closed · opens 8:00 AM' })
  expect(getFacilityOpenState({ state: 'CA' }, hours('PST'), new Date('2026-06-17T15:00:00Z'))).toMatchObject({ isOpen: true, summary: 'Open · closes 4:30 PM' })
  expect(getFacilityOpenState({ state: 'CA' }, hours('PST'), new Date('2026-06-17T23:29:00Z')).isOpen).toBe(true)
  expect(getFacilityOpenState({ state: 'CA' }, hours('PST'), new Date('2026-06-17T23:30:00Z')).isOpen).toBe(false)
  // Standard time in January shifts the same local hours by one UTC hour.
  expect(getFacilityOpenState({ state: 'CA' }, hours('PST'), new Date('2026-01-14T16:00:00Z'))).toMatchObject({ isOpen: true, localTime: '8:00 AM PST' })
  expect(getFacilityOpenState({ state: 'NJ' }, hours('EST'), new Date('2026-06-20T15:00:00Z'))).toMatchObject({ isOpen: false, summary: 'Closed · opens Mon 8:00 AM' })

  // Garden City has no supplied hours, so it has no hours-derived time zone and is never shown as open.
  expect(getFacilityOpenState({ state: 'GA' }, undefined, WEDNESDAY_4PM_PACIFIC)).toEqual({ isOpen: false, hoursKnown: false, localTime: '', summary: 'Hours not provided' })
  for (const facility of facilities) {
    const hours = facilityOperatingHours[facility.id]
    if (!hours) continue
    const zone = getFacilityTimeZone(facility, hours)
    expect(zone).toMatch(/^America\//)
    if (facility.state === 'AZ') expect(zone).toBe('America/Phoenix')
  }
})

test('pins, roster, and the time control show which facilities are open at the map time', async ({ page }) => {
  await openAt(page, WEDNESDAY_4PM_PACIFIC)
  const control = page.getByTestId('daynight-control')
  await expect(control).toHaveAttribute('data-live', 'true')
  await expect(control).toContainText('4:00 PM PDT')
  await expect(control).toContainText('23:00 UTC')

  const expectedOpen = facilities.filter((facility) => getFacilityOpenState(facility, facilityOperatingHours[facility.id], WEDNESDAY_4PM_PACIFIC).isOpen)
  expect(expectedOpen).toHaveLength(12)
  await expect(page.getByTestId('daynight-open-count')).toHaveText('12/29 open')

  const waddell = facilities.find((facility) => facility.id === 'waddell-cotton')!
  const saltLake = facilities.find((facility) => facility.id === 'salt-lake-city-jimmy-doolittle')!
  await expect(page.locator(`.location-marker-wrap[title="${waddell.fullAddress}"]`)).toHaveClass(/is-open/)
  await expect(page.locator(`.location-marker-wrap[title="${saltLake.fullAddress}"]`)).toHaveClass(/is-closed/)
  await expect(page.locator('.location-marker-wrap.is-open')).toHaveCount(12)
  await expect(page.locator('.location-pin').first()).toHaveCSS('background-color', 'rgb(19, 166, 99)')

  const buenaParkRow = page.getByRole('button', { name: `Select ${facilities[0].fullAddress}` }).locator('xpath=ancestor::tr')
  await expect(buenaParkRow.getByTestId('open-state')).toHaveText('Open')
  const houstonRow = page.getByRole('button', { name: `Select ${facilities[3].fullAddress}` }).locator('xpath=ancestor::tr')
  await expect(houstonRow.getByTestId('open-state')).toHaveText('Closed')

  await page.getByRole('button', { name: `Select ${waddell.fullAddress}` }).click()
  const overviewState = page.locator('.known-details').getByTestId('open-state')
  await expect(overviewState).toContainText('Open · closes 4:30 PM')
  await expect(overviewState).toContainText('4:00 PM MST at facility')

  await page.getByRole('button', { name: 'Dashboard', exact: true }).click()
  await page.getByRole('button', { name: 'Open facility 25 in Facilities' }).hover()
  const preview = page.locator('[data-testid="dashboard-pin-preview"][data-facility-id="salt-lake-city-jimmy-doolittle"]')
  await expect(preview.getByTestId('open-state')).toContainText('Closed · opens tomorrow 8:00 AM')
  await expect(preview.getByTestId('open-state')).toContainText('5:00 PM MDT at facility')
})

test('night shading is painted where the sun is down and clear where it is up', async ({ page }) => {
  // 7:30 PM PDT / 10:30 PM EDT: Southern California is still in daylight, Florida is in night.
  const evening = new Date('2026-06-17T02:30:00Z')
  await openAt(page, evening)
  await expect.poll(() => page.locator('.daynight-pane canvas').count()).toBeGreaterThan(0)
  await expect(page.locator('.daynight-sun')).toHaveCount(3)
  await expect(page.locator('.leaflet-daynight-shade-pane')).toHaveCSS('pointer-events', 'none')

  const buenaPark = facilities[0]
  const jacksonville = facilities.find((facility) => facility.id === 'jacksonville-ignition')!
  expect(expectedShadeAlpha(buenaPark, evening)).toBe(0)
  expect(expectedShadeAlpha(jacksonville, evening)).toBeGreaterThan(120)
  await expect.poll(() => shadeAlphaAtPin(page, buenaPark)).toBe(0)
  const nightAlpha = await shadeAlphaAtPin(page, jacksonville)
  expect(nightAlpha).not.toBeNull()
  expect(Math.abs(nightAlpha! - expectedShadeAlpha(jacksonville, evening))).toBeLessThan(20)

  // Scrubbing to 9:00 AM Pacific puts the whole continental network in daylight and opens every site.
  await page.getByLabel('Time of day').fill('540')
  await expect(page.getByTestId('daynight-control')).toHaveAttribute('data-live', 'false')
  await expect(page.getByTestId('daynight-control')).toContainText('9:00 AM PDT')
  await expect.poll(() => shadeAlphaAtPin(page, jacksonville)).toBe(0)
  await expect(page.getByTestId('daynight-open-count')).toHaveText('29/29 open')

  await page.getByRole('button', { name: 'Back to now' }).click()
  await expect(page.getByTestId('daynight-control')).toHaveAttribute('data-live', 'true')
  await expect(page.getByRole('button', { name: 'Live' })).toBeDisabled()
  await expect.poll(async () => Math.abs((await shadeAlphaAtPin(page, jacksonville))! - expectedShadeAlpha(jacksonville, evening))).toBeLessThan(20)
})

test('a typed date and time moves the terminator with the seasons', async ({ page }) => {
  await openAt(page, WEDNESDAY_4PM_PACIFIC)
  const dateTime = page.getByLabel('Date and time')
  await expect(dateTime).toHaveValue('2026-06-17T16:00')
  await dateTime.fill('2026-12-16T16:00')
  const control = page.getByTestId('daynight-control')
  await expect(control).toHaveAttribute('data-live', 'false')
  await expect(control).toContainText('Wed, Dec 16')
  // Standard time applies in December, so the same local time is 00:00 UTC.
  await expect(control).toContainText('4:00 PM PST')
  await expect(control).toContainText('00:00 UTC')
  await expect(page.getByLabel('Time of day')).toHaveValue('960')
  const winter = new Date(await control.getAttribute('data-time') as string)
  const jacksonville = facilities.find((facility) => facility.id === 'jacksonville-ignition')!
  // 7:00 PM EST in December is after dark; the same local time in June was daylight.
  expect(expectedShadeAlpha(jacksonville, WEDNESDAY_4PM_PACIFIC)).toBe(0)
  expect(expectedShadeAlpha(jacksonville, winter)).toBeGreaterThan(60)
  await expect.poll(async () => Math.abs((await shadeAlphaAtPin(page, jacksonville))! - expectedShadeAlpha(jacksonville, winter))).toBeLessThan(20)

  // Dates outside the solar model's 1950–2050 range are ignored rather than applied.
  await dateTime.fill('2099-01-01T12:00')
  await expect(control).toContainText('Wed, Dec 16')
})

test('a chosen time zone drives the clock, date field, and slider, and persists', async ({ page }) => {
  await openAt(page, WEDNESDAY_4PM_PACIFIC)
  const control = page.getByTestId('daynight-control')
  const zone = page.getByLabel('Time zone')
  const dateTime = page.getByLabel('Date and time')
  const slider = page.getByLabel('Time of day')
  await expect(zone).toHaveValue('')
  await expect(control).toHaveAttribute('data-time-zone', 'America/Los_Angeles')

  // Switching zones relabels the same instant; it does not move the map time.
  await zone.selectOption('America/New_York')
  await expect(control).toContainText('7:00 PM EDT')
  await expect(control).toContainText('23:00 UTC')
  await expect(dateTime).toHaveValue('2026-06-17T19:00')
  await expect(slider).toHaveValue('1140')
  await expect(control).toHaveAttribute('data-live', 'true')

  // Typed dates and the slider are read as wall-clock time in the chosen zone.
  await dateTime.fill('2026-12-16T09:00')
  await expect(control).toHaveAttribute('data-time', '2026-12-16T14:00:00.000Z')
  await expect(control).toContainText('9:00 AM EST')
  await slider.fill('780')
  await expect(control).toHaveAttribute('data-time', '2026-12-16T18:00:00.000Z')
  await expect(control).toContainText('Wed, Dec 16')

  // Asia/Tokyo is already on Thursday, and UTC hides the redundant UTC suffix.
  await zone.selectOption('Asia/Tokyo')
  await expect(control).toContainText('Thu, Dec 17')
  await expect(dateTime).toHaveValue('2026-12-17T03:00')
  await zone.selectOption('UTC')
  await expect(control.locator('.daynight-clock > span')).toHaveText('Wed, Dec 16')

  await page.reload()
  await expect(page.getByLabel('Time zone')).toHaveValue('UTC')
  await expect(page.getByTestId('daynight-control')).toHaveAttribute('data-time-zone', 'UTC')
  await page.getByLabel('Time zone').selectOption('')
  await expect(page.getByTestId('daynight-control')).toHaveAttribute('data-time-zone', 'America/Los_Angeles')
})

test('shading toggle and panel state persist, and pins stay interactive under the shade', async ({ page }) => {
  await openAt(page, new Date('2026-06-17T06:00:00Z'))
  const toggle = page.getByRole('button', { name: 'Day and night shading' })
  await expect(toggle).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByLabel('Time of day')).toBeVisible()

  const somerset = facilities.find((facility) => facility.id === 'somerset-cottontail')!
  await page.locator(`.location-marker-wrap[title="${somerset.fullAddress}"]`).click()
  await expect(page.getByTestId('selected-showcase')).toContainText(somerset.fullAddress)

  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-pressed', 'false')
  await expect(page.locator('.daynight-pane canvas')).toHaveCount(0)
  await expect(page.locator('.daynight-sun')).toHaveCount(0)
  await page.getByRole('button', { name: 'Hide time controls' }).click()
  await expect(page.getByLabel('Time of day')).toHaveCount(0)
  await expect(page.getByTestId('daynight-open-count')).toHaveText('0/29 open')

  await page.reload()
  await expect(page.getByRole('button', { name: 'Day and night shading' })).toHaveAttribute('aria-pressed', 'false')
  await expect(page.getByRole('button', { name: 'Show time controls' })).toHaveAttribute('aria-expanded', 'false')
  await expect(page.locator('.daynight-pane canvas')).toHaveCount(0)
  await page.getByRole('button', { name: 'Day and night shading' }).click()
  await expect.poll(() => page.locator('.daynight-pane canvas').count()).toBeGreaterThan(0)
})

test('the time control never overlaps map controls on desktop layouts', async ({ page }) => {
  await openAt(page, WEDNESDAY_4PM_PACIFIC)
  const control = page.getByTestId('daynight-control')
  const neighbours = ['.map-tools', '.leaflet-control-zoom', '.recenter-control', '.map-legend', '.overview-panel', '.leaflet-control-attribution']
  const expectClear = async (selectors: string[]) => {
    const controlBox = await box(control)
    const mapBox = await box(page.getByLabel('Facility network map'))
    expect(controlBox.x).toBeGreaterThanOrEqual(mapBox.x)
    expect(controlBox.x + controlBox.width).toBeLessThanOrEqual(mapBox.x + mapBox.width)
    expect(controlBox.y + controlBox.height).toBeLessThanOrEqual(mapBox.y + mapBox.height)
    for (const selector of selectors) expect(boxesOverlap(controlBox, await box(page.locator(selector).first())), selector).toBe(false)
  }
  await expectClear(neighbours)

  // The widest directory leaves the narrowest map; the control moves above the legend.
  const separator = page.getByRole('separator', { name: 'Resize facility directory and map' })
  await separator.focus()
  await separator.press('End')
  await expectClear(neighbours)

  await page.getByRole('button', { name: 'Dashboard', exact: true }).click()
  await page.locator('.dashboard-region-toggle').click()
  await expect(page.getByRole('complementary', { name: 'Dashboard regions' })).toBeVisible()
  await expectClear(['.map-tools', '.leaflet-control-zoom', '.recenter-control', '.dashboard-region-panel', '.dashboard-region-toggle', '.leaflet-control-attribution'])
})

test('the time control stays compact on mobile and yields to the Regions sheet', async ({ page }) => {
  await openAt(page, WEDNESDAY_4PM_PACIFIC, { width: 390, height: 844 })
  await page.getByRole('button', { name: 'Map', exact: true }).click()
  const control = page.getByTestId('daynight-control')
  await expect(control).toBeVisible()
  await expect(page.getByLabel('Time of day')).toHaveCount(0)
  const controlBox = await box(control)
  for (const selector of ['.map-legend', '.map-tools', '.leaflet-control-zoom', '.recenter-control', '.leaflet-control-attribution', '.overview-panel']) {
    expect(boxesOverlap(controlBox, await box(page.locator(selector).first())), selector).toBe(false)
  }

  await page.getByRole('button', { name: 'Show time controls' }).click()
  await expect(page.getByLabel('Time of day')).toBeVisible()
  const expandedBox = await box(control)
  for (const selector of ['.map-legend', '.leaflet-control-attribution', '.recenter-control']) {
    expect(boxesOverlap(expandedBox, await box(page.locator(selector).first())), selector).toBe(false)
  }

  await page.getByRole('button', { name: 'Open navigation' }).click()
  await page.getByRole('button', { name: 'Dashboard', exact: true }).click()
  await page.locator('.dashboard-region-toggle').click()
  await expect(page.getByRole('complementary', { name: 'Dashboard regions' })).toBeVisible()
  await expect(control).toBeHidden()
})
