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

const expectedThumbnails = {
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

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem('locations-theme')) localStorage.setItem('locations-theme', 'light')
  })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Facility directory' })).toBeVisible()
  await expect(page.getByLabel('Facility network map')).toBeVisible()
  await expect(page.getByTestId('selected-showcase')).toHaveCount(0)
})

test('opens with the exact 17-address Active directory beside the map and no selected profile', async ({ page }) => {
  await expect(page.locator('tbody tr')).toHaveCount(17)
  const table = page.getByRole('table')
  for (const address of suppliedAddresses) await expect(table).toContainText(address)
  await expect(page.getByRole('heading', { name: 'Facility 01', exact: true })).toHaveCount(0)
  await expect(page.locator('.overview-panel')).toContainText('17')
  await expect(page.locator('.overview-panel')).toContainText('Active')
  await expect(page.locator('.status-pill.active')).toHaveCount(17)
  await expect(page.locator('.status-pill.unassigned')).toHaveCount(0)

  const [directoryBox, mapBox] = await Promise.all([
    page.getByRole('region', { name: 'Facility directory', exact: true }).boundingBox(),
    page.getByLabel('Facility network map').boundingBox(),
  ])
  expect(directoryBox?.width).toBeGreaterThan(450)
  expect(mapBox?.width).toBeGreaterThan(600)
  expect(directoryBox && mapBox ? boxesOverlap(directoryBox, mapBox) : true).toBe(false)
})

test('old browser assignments are reset to the requested Active baseline', async ({ page }) => {
  await page.evaluate(() => {
    localStorage.setItem('facility-status-assignments-v1', JSON.stringify({ 'buena-park-valley-view': 'Planned' }))
    localStorage.removeItem('facility-status-assignments-v2')
  })
  await page.reload()
  await expect(page.locator('.status-pill.active')).toHaveCount(17)
  await expect(page.locator('.status-pill.planned')).toHaveCount(0)
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

test('media sidecar has exactly eight source-backed square previews with explicit caveats', () => {
  expect(Object.keys(facilityMedia).sort()).toEqual(Object.keys(expectedThumbnails).sort())
  for (const [facilityId, [assetUrl, sourceUrl]] of Object.entries(expectedThumbnails)) {
    const media = facilityMedia[facilityId]
    expect(media.thumbnail.assetUrl).toBe(assetUrl)
    expect(media.thumbnail.sourceUrl).toBe(sourceUrl)
    expect(media.thumbnail.width).toBe(500)
    expect(media.thumbnail.height).toBe(500)
    expect(media.thumbnail.alt.length).toBeGreaterThan(20)
    expect(media.detail.assetUrl).toMatch(/^\/media\//)
    expect(media.detail.sourceUrl).toMatch(/^https:\/\/cdn\.unisco\.com\/api\/media\/file\//)
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

test('shows eight official directory previews and nine neutral fallbacks', async ({ page }) => {
  const rows = page.locator('tbody')
  await expect(rows.getByTestId('facility-photo')).toHaveCount(8)
  await expect(rows.getByTestId('photo-fallback')).toHaveCount(9)

  for (const address of [suppliedAddresses[0], suppliedAddresses[1], suppliedAddresses[4], suppliedAddresses[7], suppliedAddresses[9], suppliedAddresses[10], suppliedAddresses[14], suppliedAddresses[15]]) {
    await expect(page.getByRole('button', { name: `Select ${address}` }).getByTestId('facility-photo')).toHaveCount(1)
  }
  await expect(page.getByRole('button', { name: `Select ${suppliedAddresses[6]}` }).getByText('Photo not available')).toBeVisible()
  await expect(page.getByRole('button', { name: `Select ${suppliedAddresses[5]}` }).getByText('Photo not available')).toBeVisible()
  await expect(page.getByRole('button', { name: `Select ${suppliedAddresses[7]}` }).locator('img')).toHaveAttribute('src', '/media/thumbnails/summerville-cypress-tradeport.png')
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
    [suppliedAddresses[0], 'Unassigned'],
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
  await expect(page.locator('tbody tr')).toHaveCount(14)
  await filter.selectOption('Coming Soon')
  await expect(table).toContainText(suppliedAddresses[1])
  await filter.selectOption('Planned')
  await expect(table).toContainText(suppliedAddresses[2])
  await filter.selectOption('Unassigned')
  await expect(page.locator('tbody tr')).toHaveCount(1)
  await expect(table).toContainText(suppliedAddresses[0])
  await filter.selectOption('All')
  await expect(page.locator('tbody tr')).toHaveCount(17)

  await page.reload()
  await page.getByLabel('Filter by status').selectOption('Active')
  await expect(page.locator('tbody tr')).toHaveCount(14)
  await page.getByLabel('Filter by status').selectOption('Unassigned')
  await expect(page.locator('tbody tr')).toHaveCount(1)
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

test('selected Photos tab shows official media provenance and unmatched facilities stay honest', async ({ page }) => {
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
  await page.getByRole('tab', { name: 'Photos' }).click()
  await expect(page.getByText('Photo not available').last()).toBeVisible()
  await expect(page.locator('.photo-detail')).toHaveCount(0)
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
  await page.getByRole('tab', { name: 'Site Plan' }).click()
  await expect(page.getByText('Site plan not provided')).toBeVisible()
  await page.getByRole('tab', { name: 'Documents' }).click()
  await expect(page.getByText('Documents not provided')).toBeVisible()
  await page.getByRole('tab', { name: 'Operations' }).click()
  await expect(page.getByText('Operations data unavailable')).toBeVisible()

  await returnToDirectory(page)
  await chooseFromDirectory(page, suppliedAddresses[15])
  await expect(page.getByText('Approximate').first()).toBeVisible()
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
  await expect(page.locator('.leaflet-tile-pane img').first()).toHaveAttribute('src', /cartocdn/)
})
