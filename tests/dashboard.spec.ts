import { expect, test, type Locator, type Page } from '@playwright/test'
import { facilities } from '../src/data/facilities'
import { facilityMedia } from '../src/data/facility-media'

const suppliedAddresses = [
  '6800 Valley View St., Buena Park, CA 90620',
  '2677 East Alessandro Blvd., Riverside, CA 92508',
  '16850 Heacock St., Moreno Valley, CA 92551',
  '8833 Citypark Loop, Houston, TX 77013',
  '1230 Highway 114, Roanoke, TX',
  '335 Morgan Lakes Industrial Blvd., Pooler, GA',
  '300 Seabrook Pkwy., Building 2, Pooler, GA',
  '369 N Cypress (410 Tradeport Dr.), Summerville, SC',
  '4550 Quality Drive, TN',
  '3320 Lincoln Ave., Tacoma, WA 98421',
  '12005 Steele St. S., Tacoma, WA 98444',
  '2619 Ignition Dr., Jacksonville, FL 32218',
  '2861 N. Marion Dr., Building 5, Las Vegas, NV 89115',
  '12100 Emerald Pass Ave., El Paso, TX 79928',
  '2131 West Willow St., Long Beach, CA 90810',
  '3901 Brandon Rd., Joliet, IL 60436',
  '12102 Emerald Pass Ave., Building 5, El Paso, TX 79928',
]

const expectedOfficialThumbnails = {
  'buena-park-valley-view': ['/media/thumbnails/buena-park-valley-view.webp', 'https://cdn.unisco.com/api/media/file/buenapark-ca-500x500.webp'],
  'riverside-alessandro': ['/media/thumbnails/riverside-alessandro.webp', 'https://cdn.unisco.com/api/media/file/alessandro-riverside-ca-500x500.webp'],
  'roanoke-highway-114': ['/media/thumbnails/roanoke-highway-114.webp', 'https://cdn.unisco.com/api/media/file/roanoke-tx-500x500.webp'],
  'tacoma-lincoln': ['/media/thumbnails/tacoma-lincoln.webp', 'https://cdn.unisco.com/api/media/file/unis-tacmoa-500x500.webp'],
  'tacoma-steele': ['/media/thumbnails/tacoma-steele.webp', 'https://cdn.unisco.com/api/media/file/tacoma-steele-500x500.webp'],
  'long-beach-willow': ['/media/thumbnails/long-beach-willow.png', 'https://cdn.unisco.com/api/media/file/unis-long-beach-500x500.png'],
  'joliet-brandon': ['/media/thumbnails/joliet-brandon.webp', 'https://cdn.unisco.com/api/media/file/joliet-il-500x500.webp'],
  'summerville-cypress-tradeport': ['/media/thumbnails/summerville-cypress-tradeport.png', 'https://cdn.unisco.com/api/media/file/unis-summerville-500x500.png'],
} as const

function boxesOverlap(a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
}

function mapsHref(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
}

async function expectMapActionLayout(page: Page) {
  const map = page.getByLabel('Facility network map')
  const action = page.getByTestId('map-open-in-maps')
  const [mapBox, actionBox, attributionBox, legendBox] = await Promise.all([
    map.boundingBox(),
    action.boundingBox(),
    map.locator('.leaflet-control-attribution').boundingBox(),
    map.locator('.map-legend').boundingBox(),
  ])

  expect(mapBox).not.toBeNull()
  expect(actionBox).not.toBeNull()
  expect(actionBox!.width).toBeGreaterThanOrEqual(44)
  expect(actionBox!.height).toBeGreaterThanOrEqual(44)
  expect(actionBox!.x).toBeGreaterThanOrEqual(mapBox!.x)
  expect(actionBox!.y).toBeGreaterThanOrEqual(mapBox!.y)
  expect(actionBox!.x + actionBox!.width).toBeLessThanOrEqual(mapBox!.x + mapBox!.width)
  expect(actionBox!.y + actionBox!.height).toBeLessThanOrEqual(mapBox!.y + mapBox!.height)
  expect(attributionBox ? boxesOverlap(actionBox!, attributionBox) : true).toBe(false)
  expect(legendBox ? boxesOverlap(actionBox!, legendBox) : true).toBe(false)
}

async function expectMapActionBrand(page: Page) {
  const styles = await page.getByTestId('map-open-in-maps').evaluate((element) => {
    const actionStyles = window.getComputedStyle(element)
    const probe = document.createElement('span')
    probe.style.backgroundColor = window.getComputedStyle(document.documentElement).getPropertyValue('--primary')
    document.body.append(probe)
    const primary = window.getComputedStyle(probe).backgroundColor
    probe.remove()
    return {
      backgroundColor: actionStyles.backgroundColor,
      borderColor: actionStyles.borderColor,
      color: actionStyles.color,
      primary,
    }
  })

  expect(styles.backgroundColor).toBe(styles.primary)
  expect(styles.borderColor).toBe(styles.primary)
  expect(styles.color).toBe('rgb(255, 255, 255)')
}

async function chooseFromDirectory(page: Page, address: string) {
  await page.getByRole('button', { name: `Select ${address}` }).click()
  await expect(page.getByTestId('selected-showcase')).toContainText(address)
}

async function returnToDirectory(page: Page) {
  await page.getByRole('button', { name: 'All facilities' }).click()
  await expect(page.getByRole('heading', { name: 'Facility directory' })).toBeVisible()
}

async function expectMapFocusedOn(map: Locator, coordinates: readonly [number, number]) {
  await expect.poll(async () => {
    const center = (await map.getAttribute('data-center'))?.split(',').map(Number) ?? []
    return center.length === 2 ? Math.hypot(center[0] - coordinates[0], center[1] - coordinates[1]) : Number.POSITIVE_INFINITY
  }).toBeLessThan(0.002)
  await expect.poll(async () => Number(await map.getAttribute('data-zoom'))).toBeGreaterThanOrEqual(15.5)
}

async function expectAllFacilitiesInMapBounds(map: Locator) {
  await expect.poll(async () => {
    const bounds = (await map.getAttribute('data-bounds'))?.split(',').map(Number) ?? []
    if (bounds.length !== 4) return false
    const [south, west, north, east] = bounds
    return facilities.every(({ coordinates: [latitude, longitude] }) =>
      latitude > south && latitude < north && longitude > west && longitude < east,
    )
  }).toBe(true)
  await expect.poll(async () => Number(await map.getAttribute('data-zoom'))).toBeLessThanOrEqual(6)
}

async function expectAllFacilitiesActive(page: Page) {
  await expect(page.locator('.location-pin')).toHaveCount(17)
  const pinColors = await page.locator('.location-pin').evaluateAll((pins) =>
    [...new Set(pins.map((pin) => window.getComputedStyle(pin).backgroundColor))],
  )
  expect(pinColors).toEqual(['rgb(19, 166, 99)'])
  await expect(page.locator('.status-pill.active')).toHaveCount(17)
  await expect(page.locator('.status-pill.unassigned')).toHaveCount(0)
  const overviewMetrics = page.locator('.overview-metrics > div')
  await expect(overviewMetrics.filter({ hasText: 'Active' }).locator('b')).toHaveText('17')
  await expect(overviewMetrics.filter({ hasText: 'Unassigned' }).locator('b')).toHaveText('0')
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem('locations-theme')) localStorage.setItem('locations-theme', 'light')
  })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Facility directory' })).toBeVisible()
  await expect(page.getByLabel('Facility network map')).toBeVisible()
  await expect(page.getByTestId('selected-showcase')).toHaveCount(0)
})

test('opens with the exact 17-address directory beside the map and no selected profile', async ({ page }) => {
  await expect(page.locator('tbody tr')).toHaveCount(17)
  const table = page.getByRole('table')
  for (const address of suppliedAddresses) await expect(table).toContainText(address)
  expect(facilities).toHaveLength(17)
  expect(facilities.every((facility) => facility.status === 'Active')).toBe(true)
  await expect(page.getByRole('heading', { name: 'Facility 01', exact: true })).toHaveCount(0)
  await expect(page.getByTestId('map-open-in-maps')).toHaveCount(0)
  await expectAllFacilitiesActive(page)

  const [directoryBox, mapBox] = await Promise.all([
    page.getByRole('region', { name: 'Facility directory', exact: true }).boundingBox(),
    page.getByLabel('Facility network map').boundingBox(),
  ])
  expect(directoryBox?.width).toBeGreaterThan(450)
  expect(mapBox?.width).toBeGreaterThan(600)
  expect(directoryBox && mapBox ? boxesOverlap(directoryBox, mapBox) : true).toBe(false)
})

test('stale v1 status storage cannot override the intrinsic Active status', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.removeItem('facility-status-assignments-v3')
    localStorage.setItem('facility-status-assignments-v1', JSON.stringify({
      'buena-park-valley-view': 'Planned',
    }))
  })
  await page.reload()

  await expectAllFacilitiesActive(page)
  await expect.poll(async () => page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('facility-status-assignments-v3') ?? '{}') as Record<string, string>
    return Object.keys(saved).length
  })).toBe(0)
})

test('stale v2 non-Active statuses cannot override the intrinsic Active status', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.removeItem('facility-status-assignments-v3')
    localStorage.setItem('facility-status-assignments-v2', JSON.stringify({
      'buena-park-valley-view': 'Unassigned',
      'riverside-alessandro': 'Planned',
    }))
  })
  await page.reload()

  await expectAllFacilitiesActive(page)
  await expect.poll(async () => page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('facility-status-assignments-v3') ?? '{}') as Record<string, string>
    return Object.keys(saved).length
  })).toBe(0)
})

test('Dashboard navigation shows an all-facility map without Locations-only UI or visible labels', async ({ page }) => {
  await page.evaluate(() => localStorage.setItem('facility-status-assignments-v3', JSON.stringify({
    'buena-park-valley-view': 'Active',
    'riverside-alessandro': 'Planned',
  })))
  await page.reload()
  await page.getByPlaceholder('Search address, city, state, ZIP...').fill('Jacksonville')
  await page.getByLabel('Filter by status').selectOption('Planned')
  await expect(page.locator('tbody tr')).toHaveCount(0)

  const dashboardNav = page.getByRole('button', { name: 'Dashboard', exact: true })
  const locationsNav = page.getByRole('button', { name: 'Locations', exact: true })
  await dashboardNav.click()

  await expect(dashboardNav).toHaveAttribute('aria-current', 'page')
  await expect(locationsNav).not.toHaveAttribute('aria-current')
  await expect(page.getByLabel('Facility network map')).toHaveAttribute('data-view', 'dashboard')
  await expect(page.locator('.location-marker-wrap')).toHaveCount(17)
  await expect(page.locator('.location-marker-wrap').first()).toHaveAttribute('aria-label', 'Open facility 01 in Locations')
  await expect(page.locator('.location-marker-wrap[title]')).toHaveCount(0)
  await expect(page.locator('.leaflet-tooltip')).toHaveCount(0)
  await expect(page.getByText('Buena Park, CA', { exact: true })).toHaveCount(0)

  await expect(page.getByRole('table')).toHaveCount(0)
  await expect(page.getByTestId('selected-showcase')).toHaveCount(0)
  await expect(page.getByPlaceholder('Search address, city, state, ZIP...')).toHaveCount(0)
  await expect(page.getByRole('group', { name: 'Explorer view' })).toHaveCount(0)
  await expect(page.getByRole('separator', { name: 'Resize facility directory and map' })).toHaveCount(0)
  await expect(page.locator('.overview-panel')).toHaveCount(0)
  await expect(page.locator('.map-legend')).toHaveCount(0)

  await expect(page.locator('.location-pin.is-dashboard-pin')).toHaveCount(0)
  await expect(page.locator('.location-pin')).toHaveCount(17)
  const focusedMarker = page.getByRole('button', { name: 'Open facility 01 in Locations' })
  await focusedMarker.focus()
  await expect(focusedMarker).toBeFocused()

  for (const control of [
    page.getByRole('button', { name: 'Street' }),
    page.getByRole('button', { name: 'Satellite' }),
    page.getByRole('button', { name: 'Zoom in' }),
    page.getByRole('button', { name: 'Zoom out' }),
    page.getByRole('button', { name: 'Recenter map' }),
  ]) {
    await expect(control).toBeVisible()
    await expect(control).toBeEnabled()
  }

  const map = page.getByLabel('Facility network map')
  await expectAllFacilitiesInMapBounds(map)
  const [mapBox, dashboardBox] = await Promise.all([map.boundingBox(), page.locator('.dashboard').boundingBox()])
  expect(mapBox?.width).toBeCloseTo(dashboardBox!.width, 0)
  expect(mapBox?.height).toBeCloseTo(dashboardBox!.height, 0)
})

test('Dashboard marker opens Locations showcase and returning clears detail and refits all pins', async ({ page }) => {
  const map = page.getByLabel('Facility network map')
  const dashboardNav = page.getByRole('button', { name: 'Dashboard', exact: true })
  const locationsNav = page.getByRole('button', { name: 'Locations', exact: true })
  const facility = facilities[11]

  await dashboardNav.click()
  await expectAllFacilitiesInMapBounds(map)
  await expect(page.getByTestId('map-open-in-maps')).toHaveCount(0)
  await page.getByRole('button', { name: 'Open facility 12 in Locations' }).focus()
  await page.keyboard.press('Enter')

  await expect(locationsNav).toHaveAttribute('aria-current', 'page')
  await expect(dashboardNav).not.toHaveAttribute('aria-current')
  await expect(page.getByTestId('selected-showcase')).toContainText(facility.fullAddress)
  await expectMapFocusedOn(map, facility.coordinates)
  await expect(page.getByTestId('map-open-in-maps')).toBeVisible()
  await expect(page.getByTestId('map-open-in-maps')).toHaveAttribute('href', mapsHref(facility.fullAddress))

  await dashboardNav.click()
  await expect(dashboardNav).toHaveAttribute('aria-current', 'page')
  await expect(page.getByTestId('selected-showcase')).toHaveCount(0)
  await expect(page.getByTestId('map-open-in-maps')).toHaveCount(0)
  await expect(page.locator('.location-pin.is-selected')).toHaveCount(0)
  await expect(page.locator('.location-marker-wrap')).toHaveCount(17)
  await expectAllFacilitiesInMapBounds(map)
})

test('mobile Dashboard is map-only and its marker opens the Locations detail flow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.reload()
  await page.getByRole('button', { name: 'Open navigation' }).click()
  await page.getByRole('button', { name: 'Dashboard', exact: true }).click()

  const map = page.getByLabel('Facility network map')
  await expect(map).toBeVisible()
  await expect(page.locator('.location-marker-wrap')).toHaveCount(17)
  await expect(page.getByRole('group', { name: 'Explorer view' })).toHaveCount(0)
  await expect(page.getByPlaceholder('Search address, city, state, ZIP...')).toHaveCount(0)
  await expect(page.locator('.leaflet-tooltip')).toHaveCount(0)
  await expectAllFacilitiesInMapBounds(map)

  const mapBox = await map.boundingBox()
  expect(mapBox?.width).toBeCloseTo(390, 0)
  expect(mapBox?.height).toBeGreaterThan(700)
  const dimensions = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }))
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport)

  await page.getByRole('button', { name: 'Open facility 01 in Locations' }).focus()
  await page.keyboard.press('Enter')
  await page.getByRole('button', { name: 'Open navigation' }).click()
  await expect(page.getByRole('button', { name: 'Locations', exact: true })).toHaveAttribute('aria-current', 'page')
  await expect(page.getByRole('group', { name: 'Explorer view' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'List' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByTestId('selected-showcase')).toContainText(facilities[0].fullAddress)
  await expect(map).toBeHidden()
})

test('desktop divider supports bounded pointer and keyboard resizing and persists the width', async ({ page }) => {
  const dashboard = page.locator('.dashboard')
  const directory = page.getByRole('region', { name: 'Facility directory', exact: true })
  const map = page.getByLabel('Facility network map')
  const separator = page.getByRole('separator', { name: 'Resize facility directory and map' })
  const [dashboardBox, initialDirectoryBox, initialMapBox, separatorBox] = await Promise.all([
    dashboard.boundingBox(),
    directory.boundingBox(),
    map.boundingBox(),
    separator.boundingBox(),
  ])
  expect(dashboardBox).not.toBeNull()
  expect(initialDirectoryBox).not.toBeNull()
  expect(initialMapBox).not.toBeNull()
  expect(separatorBox).not.toBeNull()
  expect(initialDirectoryBox!.width / dashboardBox!.width).toBeGreaterThan(0.3)
  expect(initialDirectoryBox!.width / dashboardBox!.width).toBeLessThan(0.4)

  await page.mouse.move(separatorBox!.x + separatorBox!.width / 2, separatorBox!.y + separatorBox!.height / 2)
  await page.mouse.down()
  await page.mouse.move(separatorBox!.x + separatorBox!.width / 2 + 110, separatorBox!.y + separatorBox!.height / 2, { steps: 6 })
  await page.mouse.up()

  await expect.poll(async () => (await directory.boundingBox())?.width ?? 0).toBeGreaterThan(initialDirectoryBox!.width + 80)
  const draggedDirectoryWidth = (await directory.boundingBox())!.width
  const draggedMapWidth = (await map.boundingBox())!.width
  expect(draggedMapWidth).toBeLessThan(initialMapBox!.width - 80)
  expect(Number(await separator.getAttribute('aria-valuenow'))).toBeCloseTo(draggedDirectoryWidth, 0)

  await separator.focus()
  await page.keyboard.press('ArrowLeft')
  await expect.poll(async () => (await directory.boundingBox())?.width ?? 0).toBeLessThan(draggedDirectoryWidth - 15)
  await page.keyboard.press('Home')
  const minimum = Number(await separator.getAttribute('aria-valuemin'))
  await expect.poll(async () => (await directory.boundingBox())?.width ?? 0).toBeCloseTo(minimum, 0)
  await page.keyboard.press('End')
  const maximum = Number(await separator.getAttribute('aria-valuemax'))
  await expect.poll(async () => (await directory.boundingBox())?.width ?? 0).toBeCloseTo(maximum, 0)

  await page.keyboard.press('Home')
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowRight')
  const persistedWidth = (await directory.boundingBox())!.width
  await expect.poll(() => page.evaluate(() => Number(localStorage.getItem('facility-directory-width-v1')))).toBeCloseTo(persistedWidth, 0)

  await page.reload()
  await expect(page.getByRole('heading', { name: 'Facility directory' })).toBeVisible()
  await expect.poll(async () => (await page.getByRole('region', { name: 'Facility directory', exact: true }).boundingBox())?.width ?? 0).toBeCloseTo(persistedWidth, 0)
})

test('media sidecar distinguishes eight official records from nine user-provided photos', () => {
  expect(Object.keys(facilityMedia).sort()).toEqual([...Object.keys(expectedOfficialThumbnails), 'moreno-valley-heacock', 'houston-citypark', 'pooler-morgan-lakes', 'pooler-seabrook-building-2', 'jacksonville-ignition', 'tennessee-quality-drive', 'las-vegas-marion-building-5', 'el-paso-emerald-12100', 'el-paso-emerald-12102-building-5'].sort())
  for (const [facilityId, [assetUrl, sourceUrl]] of Object.entries(expectedOfficialThumbnails)) {
    const media = facilityMedia[facilityId]
    expect(media.thumbnail.assetUrl).toBe(assetUrl)
    expect(media.thumbnail.sourceUrl).toBe(sourceUrl)
    expect(media.thumbnail.width).toBe(500)
    expect(media.thumbnail.height).toBe(500)
    expect(media.thumbnail.alt.length).toBeGreaterThan(20)
    expect(media.detail.assetUrl).toMatch(/^\/media\//)
    expect(media.detail.sourceUrl).toMatch(/^https:\/\/cdn\.unisco\.com\/api\/media\/file\//)
    expect(media.verification.startsWith('user-provided')).toBe(false)
  }

  const addressMatched = facilityMedia['moreno-valley-heacock']
  expect(addressMatched).toMatchObject({
    verification: 'user-provided-address-matched',
    retrievedDate: '2026-09-27',
    sourcePage: 'https://www.google.com/maps/place/Cubework/@33.8769096,-117.2418954,15z',
    thumbnail: {
      assetUrl: '/media/thumbnails/moreno-valley-heacock.webp',
      width: 500,
      height: 500,
    },
    detail: {
      assetUrl: '/media/moreno-valley-heacock.jpg',
      width: 1600,
      height: 907,
    },
  })
  expect(addressMatched.thumbnail.alt.length).toBeGreaterThan(20)
  expect(addressMatched.detail.assetUrl).toMatch(/^\/media\//)
  expect(addressMatched.thumbnail.sourceUrl).not.toContain('cdn.unisco.com')
  expect(addressMatched.detail.sourceUrl).not.toContain('cdn.unisco.com')
  expect(addressMatched.matchNote).toContain('not official UNIS listing media')

  const addressUnconfirmed = facilityMedia['houston-citypark']
  expect(addressUnconfirmed).toMatchObject({
    verification: 'user-provided-address-unconfirmed',
    retrievedDate: '2026-09-27',
    sourcePage: 'user-provided screenshot (no public source URL)',
    thumbnail: {
      assetUrl: '/media/thumbnails/houston-citypark.webp',
      sourceUrl: 'user-provided screenshot (no public source URL)',
      width: 500,
      height: 500,
    },
    detail: {
      assetUrl: '/media/houston-citypark.jpg',
      sourceUrl: 'user-provided screenshot (no public source URL)',
      width: 1600,
      height: 745,
    },
  })
  expect(addressUnconfirmed.thumbnail.alt.length).toBeGreaterThan(20)
  expect(addressUnconfirmed.thumbnail.sourceUrl).not.toContain('cdn.unisco.com')
  expect(addressUnconfirmed.detail.sourceUrl).not.toContain('cdn.unisco.com')
  expect(addressUnconfirmed.matchNote).toContain('not official UNIS listing media')
  expect(addressUnconfirmed.matchNote).toContain('building identity is not independently confirmed')

  const userVerified = facilityMedia['pooler-morgan-lakes']
  expect(userVerified).toMatchObject({
    verification: 'user-provided-address-user-verified',
    retrievedDate: '2026-09-27',
    sourcePage: 'user-provided screenshot (no public source URL)',
    thumbnail: {
      assetUrl: '/media/thumbnails/pooler-morgan-lakes.webp',
      sourceUrl: 'user-provided screenshot (no public source URL)',
      width: 500,
      height: 500,
    },
    detail: {
      assetUrl: '/media/pooler-morgan-lakes.jpg',
      sourceUrl: 'user-provided screenshot (no public source URL)',
      width: 1600,
      height: 924,
    },
  })
  expect(userVerified.thumbnail.alt.length).toBeGreaterThan(20)
  expect(userVerified.thumbnail.sourceUrl).not.toContain('cdn.unisco.com')
  expect(userVerified.detail.sourceUrl).not.toContain('cdn.unisco.com')
  expect(userVerified.matchNote).toContain('not official UNIS listing media')
  expect(userVerified.matchNote).toContain('verified by the user who supplied it')
  expect(userVerified.matchNote).toContain('not independently verified by this prototype')

  for (const [facilityId, detailAsset, detailWidth, detailHeight] of [
    ['pooler-seabrook-building-2', '/media/pooler-seabrook-building-2.jpg', 1402, 1204],
    ['jacksonville-ignition', '/media/jacksonville-ignition.jpg', 1600, 1070],
    ['tennessee-quality-drive', '/media/tennessee-quality-drive.jpg', 1600, 981],
    ['las-vegas-marion-building-5', '/media/las-vegas-marion-building-5.jpg', 1600, 955],
    ['el-paso-emerald-12100', '/media/el-paso-emerald-12100.jpg', 1600, 955],
    ['el-paso-emerald-12102-building-5', '/media/el-paso-emerald-12102-building-5.jpg', 1600, 955],
  ] as const) {
    const media = facilityMedia[facilityId]
    expect(media).toMatchObject({
      verification: 'user-provided-address-user-verified',
      retrievedDate: '2026-09-27',
      sourcePage: 'user-provided screenshot (no public source URL)',
      thumbnail: {
        assetUrl: `/media/thumbnails/${facilityId}.webp`,
        sourceUrl: 'user-provided screenshot (no public source URL)',
        width: 500,
        height: 500,
      },
      detail: {
        assetUrl: detailAsset,
        sourceUrl: 'user-provided screenshot (no public source URL)',
        width: detailWidth,
        height: detailHeight,
      },
    })
    expect(media.thumbnail.alt.length).toBeGreaterThan(20)
    expect(media.thumbnail.sourceUrl).not.toContain('cdn.unisco.com')
    expect(media.detail.sourceUrl).not.toContain('cdn.unisco.com')
    expect(media.matchNote).toContain('not official UNIS listing media')
    expect(media.matchNote).toContain('verified by the user who supplied it')
    expect(media.matchNote).toContain('not independently verified by this prototype')
  }
  expect(facilityMedia['tennessee-quality-drive'].matchNote).toContain('© 2025 Google')
  expect(facilityMedia['tennessee-quality-drive'].matchNote).toContain('retained in the uncropped detail asset')
  for (const facilityId of ['las-vegas-marion-building-5', 'el-paso-emerald-12100', 'el-paso-emerald-12102-building-5']) {
    expect(facilityMedia[facilityId].matchNote).toContain('visible Google copyright/attribution notice')
    expect(facilityMedia[facilityId].matchNote).toContain('retained in the uncropped detail asset')
  }

  expect(facilityMedia['summerville-cypress-tradeport']).toMatchObject({
    verification: 'official-listing-address-candidate',
    thumbnail: {
      assetUrl: '/media/thumbnails/summerville-cypress-tradeport.png',
      sourceUrl: 'https://cdn.unisco.com/api/media/file/unis-summerville-500x500.png',
    },
    detail: { sourceUrl: 'https://cdn.unisco.com/api/media/file/unis-summerville.png' },
  })
  expect(facilityMedia['summerville-cypress-tradeport'].matchNote).toContain('does not verify building or coordinate identity')
  expect(facilityMedia['long-beach-willow'].thumbnail.alt).toContain('Port of Long Beach')
  expect(facilityMedia['long-beach-willow'].matchNote).toContain('not a verified exterior')
})

test('shows media previews for all seventeen facilities with no roster fallbacks', async ({ page }) => {
  const rows = page.locator('tbody')
  await expect(rows.getByTestId('facility-photo')).toHaveCount(17)
  await expect(rows.getByTestId('photo-fallback')).toHaveCount(0)

  for (const address of suppliedAddresses) {
    await expect(page.getByRole('button', { name: `Select ${address}` }).getByTestId('facility-photo')).toHaveCount(1)
  }
  await expect(rows.getByText('Photo not available')).toHaveCount(0)
  await expect(page.getByRole('button', { name: `Select ${suppliedAddresses[2]}` }).locator('img')).toHaveAttribute('src', '/media/thumbnails/moreno-valley-heacock.webp')
  await expect(page.getByRole('button', { name: `Select ${suppliedAddresses[3]}` }).locator('img')).toHaveAttribute('src', '/media/thumbnails/houston-citypark.webp')
  await expect(page.getByRole('button', { name: `Select ${suppliedAddresses[5]}` }).locator('img')).toHaveAttribute('src', '/media/thumbnails/pooler-morgan-lakes.webp')
  await expect(page.getByRole('button', { name: `Select ${suppliedAddresses[6]}` }).locator('img')).toHaveAttribute('src', '/media/thumbnails/pooler-seabrook-building-2.webp')
  await expect(page.getByRole('button', { name: `Select ${suppliedAddresses[8]}` }).locator('img')).toHaveAttribute('src', '/media/thumbnails/tennessee-quality-drive.webp')
  await expect(page.getByRole('button', { name: `Select ${suppliedAddresses[11]}` }).locator('img')).toHaveAttribute('src', '/media/thumbnails/jacksonville-ignition.webp')
  await expect(page.getByRole('button', { name: `Select ${suppliedAddresses[12]}` }).locator('img')).toHaveAttribute('src', '/media/thumbnails/las-vegas-marion-building-5.webp')
  await expect(page.getByRole('button', { name: `Select ${suppliedAddresses[13]}` }).locator('img')).toHaveAttribute('src', '/media/thumbnails/el-paso-emerald-12100.webp')
  await expect(page.getByRole('button', { name: `Select ${suppliedAddresses[7]}` }).locator('img')).toHaveAttribute('src', '/media/thumbnails/summerville-cypress-tradeport.png')
  await expect(page.getByRole('button', { name: `Select ${suppliedAddresses[16]}` }).locator('img')).toHaveAttribute('src', '/media/thumbnails/el-paso-emerald-12102-building-5.webp')
})

test('desktop roster uses square previews with readable copy and non-overlapping status', async ({ page }) => {
  const firstRow = page.locator('tbody tr').first()
  const thumbnail = firstRow.getByTestId('facility-photo')
  const copy = firstRow.locator('.roster-copy')
  const status = firstRow.locator('.status-pill')
  await expect(thumbnail).toBeVisible()
  await expect(firstRow.locator('.roster-title')).toHaveText('Buena Park, CA')
  await expect(firstRow.locator('.roster-address > span')).toHaveText(suppliedAddresses[0])
  await expect(status).toBeVisible()
  await expect(thumbnail.locator('img')).toHaveAttribute('src', '/media/thumbnails/buena-park-valley-view.webp')

  const [rowBox, thumbnailBox, copyBox, statusBox] = await Promise.all([firstRow.boundingBox(), thumbnail.boundingBox(), copy.boundingBox(), status.boundingBox()])
  expect(rowBox?.height).toBeGreaterThanOrEqual(125)
  expect(thumbnailBox?.width).toBeGreaterThanOrEqual(104)
  expect(thumbnailBox?.width).toBeLessThanOrEqual(112)
  expect(thumbnailBox?.height).toBe(thumbnailBox?.width)
  expect(thumbnailBox && copyBox ? boxesOverlap(thumbnailBox, copyBox) : true).toBe(false)
  expect(copyBox && statusBox ? boxesOverlap(copyBox, statusBox) : true).toBe(false)
})

test('global and list search match address, city, state name, abbreviation, and ZIP', async ({ page }) => {
  const globalSearch = page.getByPlaceholder('Search address, city, state, ZIP...')
  await globalSearch.fill('Jacksonville')
  await expect(page.locator('tbody tr')).toHaveCount(1)
  await expect(page.getByRole('table')).toContainText('2619 Ignition Dr.')

  await globalSearch.fill('California')
  await expect(page.locator('tbody tr')).toHaveCount(4)
  await globalSearch.fill('79928')
  await expect(page.locator('tbody tr')).toHaveCount(2)
  await globalSearch.fill('WA')
  await expect(page.locator('tbody tr')).toHaveCount(2)

  await globalSearch.fill('')
  const listSearch = page.getByPlaceholder('Search street, city, state, ZIP...')
  await listSearch.fill('Brandon Rd')
  await expect(page.locator('tbody tr')).toHaveCount(1)
  await expect(page.getByRole('table')).toContainText('3901 Brandon Rd., Joliet, IL 60436')
})

test('local status assignments drive all filters and persist across reload', async ({ page }) => {
  for (const [address, status] of [
    [suppliedAddresses[0], 'Active'],
    [suppliedAddresses[1], 'Coming Soon'],
    [suppliedAddresses[2], 'Planned'],
  ] as const) {
    await chooseFromDirectory(page, address)
    await page.getByLabel(`Set status for ${address}`).selectOption(status)
    await returnToDirectory(page)
  }

  const table = page.getByRole('table')
  const filter = page.getByLabel('Filter by status')
  await filter.selectOption('Active')
  await expect(page.locator('tbody tr')).toHaveCount(15)
  await expect(table).toContainText(suppliedAddresses[0])
  await filter.selectOption('Coming Soon')
  await expect(page.locator('tbody tr')).toHaveCount(1)
  await expect(table).toContainText(suppliedAddresses[1])
  await filter.selectOption('Planned')
  await expect(page.locator('tbody tr')).toHaveCount(1)
  await expect(table).toContainText(suppliedAddresses[2])
  await filter.selectOption('Unassigned')
  await expect(page.locator('tbody tr')).toHaveCount(0)
  await filter.selectOption('All')
  await expect(page.locator('tbody tr')).toHaveCount(17)

  await chooseFromDirectory(page, suppliedAddresses[3])
  await page.getByLabel(`Set status for ${suppliedAddresses[3]}`).selectOption('Unassigned')
  await returnToDirectory(page)
  await filter.selectOption('Unassigned')
  await expect(page.locator('tbody tr')).toHaveCount(1)
  await expect(table).toContainText(suppliedAddresses[3])

  await page.reload()
  await page.getByLabel('Filter by status').selectOption('Unassigned')
  await expect(page.locator('tbody tr')).toHaveCount(1)
  await expect(page.getByRole('table')).toContainText(suppliedAddresses[3])
  await page.getByLabel('Filter by status').selectOption('Active')
  await expect(page.locator('tbody tr')).toHaveCount(14)
  await expect(page.getByRole('table')).toContainText(suppliedAddresses[0])
})

test('row and map marker selection share the in-place showcase and focus the persistent map', async ({ page }) => {
  const map = page.getByLabel('Facility network map')
  const startingUrl = page.url()
  const firstFacility = facilities[0]

  await chooseFromDirectory(page, firstFacility.fullAddress)
  await expect(page.getByRole('heading', { name: 'Facility directory' })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Facility 01' })).toBeVisible()
  await expect(map).toBeVisible()
  await expectMapFocusedOn(map, firstFacility.coordinates)
  await expect(page).toHaveURL(startingUrl)

  const separator = page.getByRole('separator', { name: 'Resize facility directory and map' })
  const widthBeforeResize = (await page.getByTestId('selected-showcase').boundingBox())!.width
  await separator.focus()
  await page.keyboard.press('ArrowRight')
  await expect.poll(async () => (await page.getByTestId('selected-showcase').boundingBox())?.width ?? 0).toBeGreaterThan(widthBeforeResize + 15)
  await expectMapFocusedOn(map, firstFacility.coordinates)

  await returnToDirectory(page)
  await page.getByRole('button', { name: 'Recenter map' }).click()
  await expect.poll(async () => Number(await map.getAttribute('data-zoom'))).toBeLessThan(5)
  await expect.poll(async () => {
    const [latitude, longitude] = (await map.getAttribute('data-center'))!.split(',').map(Number)
    return Math.hypot(latitude - 37.8, longitude + 96.2)
  }).toBeLessThan(0.2)

  const markerFacility = facilities[11]
  await page.locator(`.location-marker-wrap[title="${markerFacility.fullAddress}"]`).click({ force: true })
  await expect(page.getByTestId('selected-showcase')).toContainText(markerFacility.fullAddress)
  await expect(page.getByRole('heading', { name: `Facility ${String(markerFacility.number).padStart(2, '0')}` })).toBeVisible()
  await expectMapFocusedOn(map, markerFacility.coordinates)
  await expect(page).toHaveURL(startingUrl)
})

test('map Open in Maps action follows selection and clears with Dashboard', async ({ page }) => {
  const action = page.getByTestId('map-open-in-maps')
  const dashboardNav = page.getByRole('button', { name: 'Dashboard', exact: true })
  const firstFacility = facilities[0]
  const nextFacility = facilities[9]

  await expect(action).toHaveCount(0)
  await chooseFromDirectory(page, firstFacility.fullAddress)
  await expect(action).toBeVisible()
  await expect(action).toHaveText('Open in Maps')
  await expect(action).toHaveAttribute('href', mapsHref(firstFacility.fullAddress))
  await expect(action).toHaveAttribute('target', '_blank')
  await expect(action).toHaveAttribute('rel', /noopener/)
  await expect(action).toHaveAttribute('rel', /noreferrer/)
  await expectMapActionBrand(page)
  await expectMapActionLayout(page)

  for (let attempt = 0; attempt < 50 && !(await action.evaluate((element) => element === document.activeElement)); attempt += 1) {
    await page.keyboard.press('Tab')
  }
  await expect(action).toBeFocused()
  await expect(action).toHaveCSS('outline-style', 'solid')
  await expect(action).toHaveCSS('outline-width', '3px')

  await returnToDirectory(page)
  await chooseFromDirectory(page, nextFacility.fullAddress)
  await expect(action).toHaveAttribute('href', mapsHref(nextFacility.fullAddress))

  await dashboardNav.click()
  await expect(action).toHaveCount(0)
})

test('map Open in Maps action stays inside the mobile map without covering map credits', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.reload()
  const facility = facilities[0]

  await expect(page.getByTestId('map-open-in-maps')).toHaveCount(0)
  await chooseFromDirectory(page, facility.fullAddress)
  await page.getByRole('button', { name: 'Map', exact: true }).click()

  const action = page.getByTestId('map-open-in-maps')
  await expect(action).toBeVisible()
  await expect(action).toHaveAttribute('href', mapsHref(facility.fullAddress))
  await expectMapActionLayout(page)
})

test('back and Escape restore the directory with search/filter state and selected pin intact', async ({ page }) => {
  const globalSearch = page.getByPlaceholder('Search address, city, state, ZIP...')
  await globalSearch.fill('Tacoma')
  await page.getByLabel('Filter by status').selectOption('Active')
  await expect(page.locator('tbody tr')).toHaveCount(2)

  const selectedButton = page.getByRole('button', { name: `Select ${suppliedAddresses[9]}` })
  await selectedButton.click()
  await returnToDirectory(page)
  await expect(globalSearch).toHaveValue('Tacoma')
  await expect(page.getByLabel('Filter by status')).toHaveValue('Active')
  await expect(page.locator('tbody tr')).toHaveCount(2)
  await expect(selectedButton).toBeFocused()
  await expect(page.locator('.location-pin.is-selected')).toHaveCount(1)

  await selectedButton.click()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('heading', { name: 'Facility directory' })).toBeVisible()
  await expect(selectedButton).toBeFocused()
  await expect(globalSearch).toHaveValue('Tacoma')
  await expect(page.getByLabel('Filter by status')).toHaveValue('Active')
})

test('selected Photos tab distinguishes official and user-provided media', async ({ page }) => {
  await chooseFromDirectory(page, suppliedAddresses[0])
  const detailImage = page.locator('.facility-photo-detail img')
  await expect(detailImage).toHaveAttribute('src', '/media/buena-park-valley-view.jpg')
  await expect(detailImage).toHaveCSS('object-fit', 'contain')

  await page.getByRole('tab', { name: 'Photos' }).click()
  await expect(page.locator('.photo-detail img')).toBeVisible()
  await expect(page.locator('.photo-detail img')).toHaveCSS('object-fit', 'contain')
  await expect(page.locator('.photo-detail').getByRole('link', { name: 'Official UNIS page' })).toHaveAttribute('href', 'https://www.unisco.com/locations/facility/buena-park-ca')
  await expect(page.locator('.photo-detail').getByRole('link', { name: 'Official image' })).toHaveAttribute('href', /cdn\.unisco\.com/)
  await expect(page.locator('.photo-detail').getByRole('link', { name: 'Directory preview' })).toHaveAttribute('href', 'https://cdn.unisco.com/api/media/file/buenapark-ca-500x500.webp')
  await expect(page.locator('.photo-detail')).toContainText('2026-09-25')

  await returnToDirectory(page)
  await chooseFromDirectory(page, suppliedAddresses[7])
  await page.getByRole('tab', { name: 'Photos' }).click()
  await expect(page.locator('.photo-detail')).toContainText('does not verify building or coordinate identity')

  await returnToDirectory(page)
  await chooseFromDirectory(page, suppliedAddresses[2])
  await expect(page.locator('.facility-photo-detail img')).toHaveAttribute('src', '/media/moreno-valley-heacock.jpg')
  await expect(page.locator('.facility-photo-detail img')).toHaveCSS('object-fit', 'contain')
  await page.getByRole('tab', { name: 'Photos' }).click()
  await expect(page.locator('.photo-detail img')).toHaveAttribute('src', '/media/moreno-valley-heacock.jpg')
  await expect(page.locator('.photo-detail')).toContainText('User-provided photo')
  await expect(page.locator('.photo-detail')).not.toContainText('Official listing media')
  await expect(page.locator('.photo-detail')).toContainText('not official UNIS listing media')
  await expect(page.locator('.photo-detail').getByRole('link', { name: 'Google Maps place' })).toHaveAttribute('href', facilityMedia['moreno-valley-heacock'].sourcePage)

  await returnToDirectory(page)
  await chooseFromDirectory(page, suppliedAddresses[3])
  await expect(page.locator('.facility-photo-detail img')).toHaveAttribute('src', '/media/houston-citypark.jpg')
  await expect(page.locator('.facility-photo-detail img')).toHaveCSS('object-fit', 'contain')
  await page.getByRole('tab', { name: 'Photos' }).click()
  await expect(page.locator('.photo-detail img')).toHaveAttribute('src', '/media/houston-citypark.jpg')
  await expect(page.locator('.photo-detail')).toContainText('User-provided photo')
  await expect(page.locator('.photo-detail')).not.toContainText('Official listing media')
  await expect(page.locator('.photo-detail')).toContainText('not official UNIS listing media')
  await expect(page.locator('.photo-detail')).toContainText('user-provided screenshot (no public source URL)')
  await expect(page.locator('.photo-caption dl a')).toHaveCount(0)

  await returnToDirectory(page)
  await chooseFromDirectory(page, suppliedAddresses[5])
  await expect(page.locator('.facility-photo-detail img')).toHaveAttribute('src', '/media/pooler-morgan-lakes.jpg')
  await expect(page.locator('.facility-photo-detail img')).toHaveCSS('object-fit', 'contain')
  await page.getByRole('tab', { name: 'Photos' }).click()
  await expect(page.locator('.photo-detail img')).toHaveAttribute('src', '/media/pooler-morgan-lakes.jpg')
  await expect(page.locator('.photo-detail')).toContainText('User-provided photo')
  await expect(page.locator('.photo-detail')).not.toContainText('Official listing media')
  await expect(page.locator('.photo-detail')).toContainText('not official UNIS listing media')
  await expect(page.locator('.photo-detail')).toContainText('user-provided screenshot (no public source URL)')
  await expect(page.locator('.photo-caption dl a')).toHaveCount(0)

  for (const [address, detailAsset] of [
    [suppliedAddresses[6], '/media/pooler-seabrook-building-2.jpg'],
    [suppliedAddresses[11], '/media/jacksonville-ignition.jpg'],
  ] as const) {
    await returnToDirectory(page)
    await chooseFromDirectory(page, address)
    await expect(page.locator('.facility-photo-detail img')).toHaveAttribute('src', detailAsset)
    await expect(page.locator('.facility-photo-detail img')).toHaveCSS('object-fit', 'contain')
    await page.getByRole('tab', { name: 'Photos' }).click()
    await expect(page.locator('.photo-detail img')).toHaveAttribute('src', detailAsset)
    await expect(page.locator('.photo-detail')).toContainText('User-provided photo')
    await expect(page.locator('.photo-detail')).not.toContainText('Official listing media')
    await expect(page.locator('.photo-detail')).toContainText('not official UNIS listing media')
    await expect(page.locator('.photo-detail')).toContainText('user-provided screenshot (no public source URL)')
    await expect(page.locator('.photo-caption dl a')).toHaveCount(0)
  }

  await returnToDirectory(page)
  await chooseFromDirectory(page, suppliedAddresses[8])
  await expect(page.locator('.facility-photo-detail img')).toHaveAttribute('src', '/media/tennessee-quality-drive.jpg')
  await expect(page.locator('.facility-photo-detail img')).toHaveCSS('object-fit', 'contain')
  await page.getByRole('tab', { name: 'Photos' }).click()
  await expect(page.locator('.photo-detail img')).toHaveAttribute('src', '/media/tennessee-quality-drive.jpg')
  await expect(page.locator('.photo-detail')).toContainText('User-provided photo')
  await expect(page.locator('.photo-detail')).not.toContainText('Official listing media')
  await expect(page.locator('.photo-detail')).toContainText('not official UNIS listing media')
  await expect(page.locator('.photo-detail')).toContainText('© 2025 Google')
  await expect(page.locator('.photo-detail')).toContainText('retained in the uncropped detail asset')
  await expect(page.locator('.photo-caption dl a')).toHaveCount(0)

  await returnToDirectory(page)
  await chooseFromDirectory(page, suppliedAddresses[12])
  await expect(page.locator('.facility-photo-detail img')).toHaveAttribute('src', '/media/las-vegas-marion-building-5.jpg')
  await expect(page.locator('.facility-photo-detail img')).toHaveCSS('object-fit', 'contain')
  await page.getByRole('tab', { name: 'Photos' }).click()
  await expect(page.locator('.photo-detail img')).toHaveAttribute('src', '/media/las-vegas-marion-building-5.jpg')
  await expect(page.locator('.photo-detail')).toContainText('User-provided photo')
  await expect(page.locator('.photo-detail')).not.toContainText('Official listing media')
  await expect(page.locator('.photo-detail')).toContainText('visible Google copyright/attribution notice')
  await expect(page.locator('.photo-caption dl a')).toHaveCount(0)
})

test('selected facility exposes inspectable Maps and Street View links on both detail surfaces', async ({ page }) => {
  const facility = facilities[2]
  await chooseFromDirectory(page, facility.fullAddress)
  const showcase = page.getByTestId('selected-showcase')
  const streetViewHref = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${facility.coordinates.join(',')}`

  const streetViewLink = showcase.getByRole('link', { name: 'Street View' })
  await expect(streetViewLink).toHaveAttribute('href', streetViewHref)
  await expect(streetViewLink).toHaveAttribute('target', '_blank')
  await expect(streetViewLink).toHaveAttribute('rel', /noopener/)
  await expect(showcase.getByRole('link', { name: 'Open in Maps' })).toHaveAttribute('target', '_blank')

  await showcase.getByRole('button', { name: 'View Full Details' }).click()
  const drawer = page.getByRole('dialog', { name: `${facility.city}, ${facility.state}` })
  await expect(drawer.getByRole('link', { name: 'Street View' })).toHaveAttribute('href', streetViewHref)
  await expect(drawer.getByRole('link', { name: 'Street View' })).toHaveAttribute('target', '_blank')
})

test('image load failures switch to the neutral fallback', async ({ page }) => {
  const firstRow = page.locator('tbody tr').first()
  const photo = firstRow.locator('.facility-photo-thumbnail img')
  await photo.evaluate((image: HTMLImageElement) => { image.src = '/media/not-found.jpg' })
  await expect(firstRow.getByTestId('photo-fallback')).toBeVisible()
  await expect(firstRow.getByText('Photo not available')).toBeVisible()
})

test('mobile List/Map flow keeps full addresses readable and selected details scrollable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.reload()

  const listSwitch = page.getByRole('button', { name: 'List' })
  const mapSwitch = page.getByRole('button', { name: 'Map', exact: true })
  const table = page.getByRole('table')
  const map = page.getByLabel('Facility network map')
  await expect(listSwitch).toHaveAttribute('aria-pressed', 'true')
  await expect(table).toBeVisible()
  await expect(map).toBeHidden()
  await expect(page.getByRole('separator', { name: 'Resize facility directory and map' })).toBeHidden()

  for (const address of [suppliedAddresses[0], suppliedAddresses[7]]) {
    const addressText = table.getByRole('button', { name: `Select ${address}` }).locator('.roster-address > span')
    await addressText.scrollIntoViewIfNeeded()
    const rendering = await addressText.evaluate((element) => {
      const style = window.getComputedStyle(element)
      return {
        whiteSpace: style.whiteSpace,
        textOverflow: style.textOverflow,
        horizontalClipping: element.scrollWidth > element.clientWidth + 1,
        verticalClipping: element.scrollHeight > element.clientHeight + 1,
      }
    })
    expect(rendering.whiteSpace).not.toBe('nowrap')
    expect(rendering.textOverflow).not.toBe('ellipsis')
    expect(rendering.horizontalClipping).toBe(false)
    expect(rendering.verticalClipping).toBe(false)
  }

  const firstRow = page.locator('tbody tr').first()
  const thumbnail = firstRow.getByTestId('facility-photo')
  const [thumbnailBox, copyBox, statusBox] = await Promise.all([
    thumbnail.boundingBox(),
    firstRow.locator('.roster-copy').boundingBox(),
    firstRow.locator('.status-pill').boundingBox(),
  ])
  expect(thumbnailBox?.width).toBeGreaterThanOrEqual(76)
  expect(thumbnailBox?.width).toBeLessThanOrEqual(84)
  expect(thumbnailBox?.height).toBe(thumbnailBox?.width)
  expect(thumbnailBox && copyBox ? boxesOverlap(thumbnailBox, copyBox) : true).toBe(false)
  expect(copyBox && statusBox ? boxesOverlap(copyBox, statusBox) : true).toBe(false)

  await firstRow.getByRole('button', { name: `Select ${suppliedAddresses[0]}` }).click()
  await expect(page.getByTestId('selected-showcase')).toBeVisible()
  await expect(page.getByTestId('selected-showcase')).toContainText(suppliedAddresses[0])
  await returnToDirectory(page)

  await mapSwitch.click()
  await expect(mapSwitch).toHaveAttribute('aria-pressed', 'true')
  await expect(map).toBeVisible()
  await expect(table).toBeHidden()

  const markerFacility = facilities[0]
  await expectMapFocusedOn(map, markerFacility.coordinates)
  await page.locator(`.location-marker-wrap[title="${markerFacility.fullAddress}"]`).click({ force: true })
  await expect(listSwitch).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByTestId('selected-showcase')).toBeVisible()
  await expect(page.getByTestId('selected-showcase')).toContainText(markerFacility.fullAddress)
  await expect(map).toBeHidden()

  const detailContent = page.locator('.detail-content')
  const scrollState = await detailContent.evaluate((element) => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
    overflowY: window.getComputedStyle(element).overflowY,
  }))
  expect(scrollState.overflowY).toBe('auto')
  expect(scrollState.scrollHeight).toBeGreaterThan(scrollState.clientHeight)
  await detailContent.evaluate((element) => { element.scrollTop = element.scrollHeight })
  await expect.poll(() => detailContent.evaluate((element) => element.scrollTop)).toBeGreaterThan(0)

  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }))
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport)

  await returnToDirectory(page)
  await expect(page.getByRole('table')).toBeVisible()
  await expect(page.locator('tbody tr')).toHaveCount(17)
})

test('property tabs show honest unavailable states and coordinate limitations', async ({ page }) => {
  await chooseFromDirectory(page, suppliedAddresses[0])
  await expect(page.getByTestId('selected-showcase').locator('.street-view-caveat')).toHaveCount(0)
  await page.getByRole('tab', { name: 'Site Plan' }).click()
  await expect(page.getByText('Site plan not provided')).toBeVisible()
  await page.getByRole('tab', { name: 'Documents' }).click()
  await expect(page.getByText('Documents not provided')).toBeVisible()
  await page.getByRole('tab', { name: 'Operations' }).click()
  await expect(page.getByText('Operations data unavailable')).toBeVisible()

  await returnToDirectory(page)
  await chooseFromDirectory(page, suppliedAddresses[15])
  await expect(page.getByText('Approximate').first()).toBeVisible()
  await expect(page.getByTestId('selected-showcase').locator('.street-view-caveat')).toContainText('Street-level imagery may be near, not exactly at, this facility.')
  await expect(page.getByTestId('selected-showcase')).toContainText('closest point-address match conflicts')
})

test('theme persistence and map basemap switching remain functional', async ({ page }) => {
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await page.getByTestId('theme-toggle').click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')

  const satellite = page.getByRole('button', { name: 'Satellite' })
  const street = page.getByRole('button', { name: 'Street' })
  await expect(satellite).toHaveAttribute('aria-pressed', 'true')
  await street.click()
  await expect(street).toHaveAttribute('aria-pressed', 'true')
  await expect(satellite).toHaveAttribute('aria-pressed', 'false')

  const streetTiles = page.locator('.leaflet-tile-pane img[src*="/World_Street_Map/"]')
  await expect.poll(() => streetTiles.count()).toBeGreaterThan(0)
  await expect.poll(() => streetTiles.evaluateAll((tiles) => tiles.some((tile) => {
    const image = tile as HTMLImageElement
    return image.complete && image.naturalWidth > 0 && image.naturalHeight > 0
  }))).toBe(true)
  const streetTileUrls = await page.locator('.leaflet-tile-pane img').evaluateAll((tiles) =>
    tiles.map((tile) => (tile as HTMLImageElement).src),
  )
  expect(streetTileUrls.some((url) => url.includes('server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/'))).toBe(true)
  expect(streetTileUrls.every((url) => !url.includes('cartocdn.com'))).toBe(true)

  await satellite.click()
  await expect(satellite).toHaveAttribute('aria-pressed', 'true')
  await expect(street).toHaveAttribute('aria-pressed', 'false')
  await expect.poll(() => page.locator('.leaflet-tile-pane img[src*="/World_Imagery/"]').count()).toBeGreaterThan(0)
})
