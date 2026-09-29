import { expect, test, type Locator, type Page } from '@playwright/test'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { inflateSync } from 'node:zlib'
import { PDFDocument } from 'pdf-lib'
import { facilities } from '../src/data/facilities'
import { CONFIRMED_OPERATING_HOURS_SOURCE, facilityOperatingHours, formatOperatingHours, OPERATING_HOURS_SOURCE } from '../src/data/facility-hours'
import { facilityMedia } from '../src/data/facility-media'
import { facilitiesNeedingOperationsContactReview, facilityOperations } from '../src/data/facility-operations'
import { facilitySitePlans } from '../src/data/facility-site-plans'
import { facilityAvailableSpace, formatAvailableSpaceMonth, getFacilitySquareFootage } from '../src/data/facility-space'
import { userProvidedFacilityPhotos } from '../src/data/facility-user-photos'

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
  '6801 N Cotton Ln, Waddell, AZ 85355',
  '3950 E Airport Dr, Ontario, CA 91761',
  '19801-19821 85th Ave, Kent, WA 98031',
  '1500 Overland Ct, West Sacramento, CA 95691',
  '250 Vista Blvd, Sparks, NV 89434',
  '3401 Navigation Blvd, Houston, TX 77003',
  '4444 Delp St, Memphis, TN 38118',
  '485 N Jimmy Doolittle Rd, Salt Lake City, UT 84116',
  '101 Cottontail Ln, Somerset, NJ 08873',
  '910 10th Street / 880 F Ave., Plano, TX',
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
  'west-sacramento-overland': ['/media/thumbnails/west-sacramento-overland.webp', 'https://cdn.unisco.com/api/media/file/sacramento-ca-500x500.webp'],
  'sparks-vista': ['/media/thumbnails/sparks-vista.webp', 'https://cdn.unisco.com/api/media/file/sparks-500x500.webp'],
  'houston-navigation': ['/media/thumbnails/houston-navigation.webp', 'https://cdn.unisco.com/api/media/file/houston-tx-500x500.webp'],
  'memphis-delp': ['/media/thumbnails/memphis-delp.webp', 'https://cdn.unisco.com/api/media/file/memphis-tn-500x500.webp'],
} as const

const expectedProvidedHours = {
  'riverside-alessandro': 'PST',
  'buena-park-valley-view': 'PST',
  'long-beach-willow': 'PST',
  'moreno-valley-heacock': 'PST',
  'jacksonville-ignition': 'EST',
  'pooler-morgan-lakes': 'EST',
  'pooler-seabrook-building-2': 'EST',
  'summerville-cypress-tradeport': 'EST',
  'joliet-brandon': 'CST',
  'houston-citypark': 'CST',
  'roanoke-highway-114': 'CST',
  'tacoma-lincoln': 'PST',
  'tacoma-steele': 'PST',
} as const

const expectedConfirmedHours = {
  'tennessee-quality-drive': 'CST',
  'las-vegas-marion-building-5': 'PST',
  'el-paso-emerald-12100': 'MST',
  'el-paso-emerald-12102-building-5': 'MST',
} as const

const expectedOperationsRows = {
  'buena-park-valley-view': { row: 5, columns: ['D', 'E', 'F', 'G', 'H'] },
  'riverside-alessandro': { row: 4, columns: ['D', 'E', 'F', 'H', 'J'] },
  'moreno-valley-heacock': { row: 8, columns: ['D', 'E', 'F', 'H', 'J'] },
  'houston-citypark': { row: 20, columns: ['D', 'E', 'H'] },
  'roanoke-highway-114': { row: 23, columns: ['D', 'E', 'F', 'H'] },
  'tennessee-quality-drive': { row: 19, columns: ['D', 'E', 'F', 'H'] },
  'tacoma-lincoln': { row: 25, columns: ['D', 'E', 'H', 'I', 'J'] },
  'tacoma-steele': { row: 26, columns: ['D', 'E', 'H', 'I', 'J'] },
  'jacksonville-ignition': { row: 9, columns: ['D', 'E', 'F', 'G', 'H'] },
  'las-vegas-marion-building-5': { row: 16, columns: ['D', 'E', 'F', 'I', 'J'] },
  'long-beach-willow': { row: 6, columns: ['D', 'E', 'F', 'H'] },
  'joliet-brandon': { row: 13, columns: ['D', 'E', 'F', 'G', 'H'] },
  'el-paso-emerald-12102-building-5': { row: 22, columns: ['D', 'E'] },
  'waddell-cotton': { row: 3, columns: ['D', 'E', 'H', 'J'] },
  'ontario-airport': { row: 7, columns: ['D', 'E', 'F', 'H', 'J'] },
  'sparks-vista': { row: 15, columns: ['D', 'E', 'F', 'H', 'I', 'J'] },
  'memphis-delp': { row: 18, columns: ['D', 'E', 'F', 'H'] },
  'plano-10th-f-avenue': { row: 24, columns: ['D', 'E', 'H'] },
} as const

const expectedOperationsReviewIds = [
  'pooler-morgan-lakes',
  'pooler-seabrook-building-2',
  'summerville-cypress-tradeport',
  'el-paso-emerald-12100',
  'kent-85th-avenue-range',
  'west-sacramento-overland',
  'houston-navigation',
  'salt-lake-city-jimmy-doolittle',
  'somerset-cottontail',
] as const

const expectedExpansionHours = {
  'waddell-cotton': 'MST',
  'ontario-airport': 'PST',
  'kent-85th-avenue-range': 'PST',
  'west-sacramento-overland': 'PST',
  'sparks-vista': 'PST',
  'houston-navigation': 'CST',
  'memphis-delp': 'CST',
  'salt-lake-city-jimmy-doolittle': 'MST',
  'somerset-cottontail': 'EST',
  'plano-10th-f-avenue': 'CST',
} as const

function boxesOverlap(a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
}

function mapsHref(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
}

function mapsEmbedHref(address: string) {
  return `https://www.google.com/maps?q=${encodeURIComponent(address)}&z=15&output=embed`
}

async function expectOverviewMapLayout(page: Page, mobile = false) {
  const preview = page.getByTestId('overview-map-preview')
  const canvas = preview.locator('.overview-map-canvas')
  const embed = preview.getByTestId('overview-map-embed')
  const link = preview.getByTestId('overview-map-link')
  const detailContent = page.locator('.detail-content')
  const [previewBox, canvasBox, embedBox, linkBox, detailBox] = await Promise.all([
    preview.boundingBox(),
    canvas.boundingBox(),
    embed.boundingBox(),
    link.boundingBox(),
    detailContent.boundingBox(),
  ])

  expect(previewBox).not.toBeNull()
  expect(canvasBox).not.toBeNull()
  expect(embedBox).not.toBeNull()
  expect(linkBox).not.toBeNull()
  expect(detailBox).not.toBeNull()
  expect(previewBox!.height).toBeGreaterThanOrEqual(mobile ? 175 : 215)
  expect(previewBox!.height).toBeLessThanOrEqual(mobile ? 235 : 265)
  expect(previewBox!.x).toBeGreaterThanOrEqual(detailBox!.x)
  expect(previewBox!.x + previewBox!.width).toBeLessThanOrEqual(detailBox!.x + detailBox!.width)
  expect(embedBox).toEqual(canvasBox)
  expect(linkBox!.width).toBeGreaterThanOrEqual(44)
  expect(linkBox!.height).toBeGreaterThanOrEqual(44)
  expect(linkBox!.x).toBeGreaterThanOrEqual(canvasBox!.x)
  expect(linkBox!.y).toBeGreaterThanOrEqual(canvasBox!.y)
  expect(linkBox!.x + linkBox!.width).toBeLessThanOrEqual(canvasBox!.x + canvasBox!.width)
  expect(linkBox!.y + linkBox!.height).toBeLessThanOrEqual(canvasBox!.y + canvasBox!.height)
  await expect(embed).toHaveCSS('pointer-events', mobile ? 'none' : 'auto')
}

async function expectDashboardPreviewLayout(page: Page, map: Locator, facility: (typeof facilities)[number], mobile = false) {
  const preview = page.locator(`[data-testid="dashboard-pin-preview"][data-facility-id="${facility.id}"]`)
  const tooltip = preview.locator('..')
  const photo = preview.locator('.facility-photo-thumbnail')
  const image = photo.locator('img')
  const title = preview.locator(':scope > span > strong')
  const address = preview.locator('.dashboard-pin-preview-address')
  const operatingHours = preview.getByTestId('operating-hours-preview')
  const hoursRecord = facilityOperatingHours[facility.id]
  await expect(preview).toBeVisible()
  await expect(preview).toContainText(facility.city ? `${facility.city}, ${facility.state}` : `${facility.street}, ${facility.state}`)
  await expect(address).toHaveText(facility.fullAddress)
  await expect(operatingHours).toContainText(formatOperatingHours(hoursRecord))
  await expect(operatingHours).toHaveAttribute('data-hours-status', hoursRecord.status)
  await expect(operatingHours).not.toContainText('Assumed')
  const { totalSquareFeet } = getFacilitySquareFootage(facility.id)
  const squareFootageTotal = preview.getByTestId('square-footage-total')
  if (totalSquareFeet === undefined) await expect(squareFootageTotal).toHaveCount(0)
  else await expect(squareFootageTotal).toHaveText(`Total ${totalSquareFeet.toLocaleString('en-US')} SQF`)
  const squareFootageAvailable = preview.getByTestId('square-footage-available')
  await expect(squareFootageAvailable).toHaveAttribute('data-available-status', 'pending')
  await expect(squareFootageAvailable).toHaveText('Available Pending')
  await expect(image).toHaveAttribute('src', facilityMedia[facility.id].thumbnail.assetUrl)
  await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0 && element.naturalHeight > 0)).toBe(true)

  const [mapBox, tooltipBox, contentBox, photoBox, controlsBox, titleRendering, addressRendering, hoursRendering] = await Promise.all([
    map.boundingBox(),
    tooltip.boundingBox(),
    preview.boundingBox(),
    photo.boundingBox(),
    page.locator('.map-tools').boundingBox(),
    title.evaluate((element) => ({
      fontSize: Number.parseFloat(window.getComputedStyle(element).fontSize),
      horizontalClipping: element.scrollWidth > element.clientWidth + 1,
    })),
    address.evaluate((element) => ({
      fontSize: Number.parseFloat(window.getComputedStyle(element).fontSize),
      whiteSpace: window.getComputedStyle(element).whiteSpace,
      horizontalClipping: element.scrollWidth > element.clientWidth + 1,
      verticalClipping: element.scrollHeight > element.clientHeight + 1,
    })),
    operatingHours.evaluate((element) => ({
      horizontalClipping: element.scrollWidth > element.clientWidth + 1,
      verticalClipping: element.scrollHeight > element.clientHeight + 1,
    })),
  ])
  expect(mapBox).not.toBeNull()
  expect(tooltipBox).not.toBeNull()
  expect(contentBox).not.toBeNull()
  expect(photoBox).not.toBeNull()
  expect(tooltipBox!.width).toBeGreaterThanOrEqual(mobile ? 250 : 330)
  expect(tooltipBox!.width).toBeLessThanOrEqual(mobile ? 285 : 360)
  expect(photoBox!.width).toBeGreaterThanOrEqual(mobile ? 90 : 128)
  expect(photoBox!.width).toBeLessThanOrEqual(mobile ? 105 : 140)
  expect(photoBox!.height).toBeCloseTo(photoBox!.width, 0)
  expect(titleRendering.fontSize).toBeGreaterThanOrEqual(mobile ? 14 : 17)
  expect(titleRendering.horizontalClipping).toBe(false)
  expect(addressRendering.fontSize).toBeGreaterThanOrEqual(mobile ? 10 : 11)
  expect(addressRendering.whiteSpace).toBe('normal')
  expect(addressRendering.horizontalClipping).toBe(false)
  expect(addressRendering.verticalClipping).toBe(false)
  expect(hoursRendering).toEqual({ horizontalClipping: false, verticalClipping: false })
  expect(contentBox!.x).toBeGreaterThanOrEqual(tooltipBox!.x)
  expect(contentBox!.y).toBeGreaterThanOrEqual(tooltipBox!.y)
  expect(contentBox!.x + contentBox!.width).toBeLessThanOrEqual(tooltipBox!.x + tooltipBox!.width)
  expect(contentBox!.y + contentBox!.height).toBeLessThanOrEqual(tooltipBox!.y + tooltipBox!.height)
  expect(tooltipBox!.x).toBeGreaterThanOrEqual(mapBox!.x)
  expect(tooltipBox!.y).toBeGreaterThanOrEqual(mapBox!.y)
  expect(tooltipBox!.x + tooltipBox!.width).toBeLessThanOrEqual(mapBox!.x + mapBox!.width)
  expect(tooltipBox!.y + tooltipBox!.height).toBeLessThanOrEqual(mapBox!.y + mapBox!.height)
  expect(controlsBox ? boxesOverlap(tooltipBox!, controlsBox) : true).toBe(false)
  return preview
}

async function chooseFromDirectory(page: Page, address: string) {
  await page.getByRole('button', { name: `Select ${address}` }).click()
  await expect(page.getByTestId('selected-showcase')).toContainText(address)
}

async function returnToDirectory(page: Page) {
  await page.getByRole('button', { name: 'All facilities' }).click()
  await expect(page.getByRole('heading', { name: 'Facility directory' })).toBeVisible()
}

function extractVisiblePdfText(bytes: Buffer) {
  const source = bytes.toString('latin1')
  const text: string[] = []
  const streamStart = /<<(.*?)>>\s*stream\r?\n/gs
  for (const match of source.matchAll(streamStart)) {
    if (!match[1].includes('/FlateDecode') || match.index === undefined) continue
    const start = match.index + match[0].length
    const end = source.indexOf('\nendstream', start)
    if (end < 0) continue
    try {
      const content = inflateSync(bytes.subarray(start, end)).toString('latin1')
      for (const textMatch of content.matchAll(/<([0-9A-Fa-f]+)>\s*Tj/g)) {
        text.push(Buffer.from(textMatch[1], 'hex').toString('latin1'))
      }
      for (const textMatch of content.matchAll(/\(([^()]*)\)\s*Tj/g)) text.push(textMatch[1])
    } catch {
      // Non-content Flate streams are irrelevant to visible text assertions.
    }
  }
  return text.join('\n')
}

function expectVisiblePdfContacts(visibleText: string, facilityId: string) {
  const operations = facilityOperations[facilityId]
  expect(operations, facilityId).toBeDefined()
  expect(visibleText).toContain(operations!.source)
  for (const contact of operations!.contacts) {
    expect(visibleText, `${facilityId}: ${contact.role}`).toContain(contact.role)
    expect(visibleText, `${facilityId}: ${contact.name}`).toContain(contact.name)
    expect(visibleText, `${facilityId}: ${contact.email}`).toContain(contact.email)
    if (contact.phones?.length) {
      for (const phone of contact.phones) expect(visibleText, `${facilityId}: ${phone.label}`).toContain(`${phone.label}: ${phone.display}`)
    } else if (contact.phone) {
      expect(visibleText, `${facilityId}: Phone`).toContain(`Phone: ${contact.phone}`)
    }
  }
}

async function downloadFacilityProfile(page: Page, address: string, expectedFilename: string, options: { assertLoading?: boolean } = {}) {
  await chooseFromDirectory(page, address)
  await page.getByRole('tab', { name: 'Documents' }).click()
  const panel = page.locator('.facility-documents')
  await expect(panel.getByRole('heading', { name: 'Facility profile PDF' })).toBeVisible()
  await expect(panel).toContainText('generated from the current portal data')
  await expect(panel).not.toContainText('Documents not provided')

  if (options.assertLoading) {
    await page.evaluate(() => {
      const originalFetch = window.fetch.bind(window)
      window.fetch = async (...args) => {
        const input = args[0]
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
        if (url.includes('/media/buena-park/building-exterior.jpg')) {
          await new Promise((resolve) => window.setTimeout(resolve, 600))
        }
        return originalFetch(...args)
      }
    })
  }

  const assetRequests: string[] = []
  const recordFetch = (request: { resourceType: () => string; url: () => string }) => {
    if (request.resourceType() === 'fetch') assetRequests.push(request.url())
  }
  page.on('request', recordFetch)
  const button = panel.getByRole('button', { name: 'Download facility profile PDF' })
  if (options.assertLoading) {
    await button.evaluate((element: HTMLButtonElement) => {
      const state = window as Window & { __pdfLoadingObserved?: boolean }
      state.__pdfLoadingObserved = false
      const observer = new MutationObserver(() => {
        if (element.disabled && element.textContent?.includes('Generating PDF')) {
          state.__pdfLoadingObserved = true
          observer.disconnect()
        }
      })
      observer.observe(element, { attributes: true, childList: true, subtree: true })
    })
  }
  const downloadPromise = page.waitForEvent('download')
  await button.evaluate((element: HTMLButtonElement) => element.click())
  const download = await downloadPromise
  page.off('request', recordFetch)

  expect(download.suggestedFilename()).toBe(expectedFilename)
  if (options.assertLoading) expect(await page.evaluate(() => (window as Window & { __pdfLoadingObserved?: boolean }).__pdfLoadingObserved)).toBe(true)
  await expect(panel).toContainText('PDF download ready')
  for (const url of assetRequests) expect(new URL(url).origin).toBe('http://127.0.0.1:4191')

  const path = await download.path()
  expect(path).not.toBeNull()
  const bytes = await readFile(path!)
  expect(bytes.subarray(0, 4).toString('ascii')).toBe('%PDF')
  const visibleText = extractVisiblePdfText(bytes)
  const pdf = await PDFDocument.load(bytes)
  expect(pdf.getPageCount()).toBe(4)
  for (const pdfPage of pdf.getPages()) {
    expect(pdfPage.getWidth()).toBe(612)
    expect(pdfPage.getHeight()).toBe(792)
  }
  expect(pdf.getSubject()).toBe(address)
  return {
    title: pdf.getTitle() ?? '',
    keywords: pdf.getKeywords() ?? '',
    visibleText,
    assetPaths: assetRequests.map((url) => new URL(url).pathname),
  }
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
    return facilities.every((facility) => {
      if (!facility.coordinates) return true
      const [latitude, longitude] = facility.coordinates
      return latitude > south && latitude < north && longitude > west && longitude < east
    })
  }).toBe(true)
  await expect.poll(async () => Number(await map.getAttribute('data-zoom'))).toBeLessThanOrEqual(6)
}

async function expectFacilitiesInMapBounds(map: Locator, expectedFacilities: readonly (typeof facilities)[number][]) {
  await expect.poll(async () => {
    const bounds = (await map.getAttribute('data-bounds'))?.split(',').map(Number) ?? []
    if (bounds.length !== 4) return false
    const [south, west, north, east] = bounds
    return expectedFacilities.every((facility) => {
      if (!facility.coordinates) return true
      const [latitude, longitude] = facility.coordinates
      return latitude > south && latitude < north && longitude > west && longitude < east
    })
  }).toBe(true)
}

async function expectDefaultFacilityStatuses(page: Page) {
  await expect(page.locator('.location-pin')).toHaveCount(27)
  const pinColors = await page.locator('.location-pin').evaluateAll((pins) =>
    [...new Set(pins.map((pin) => window.getComputedStyle(pin).backgroundColor))],
  )
  expect(pinColors).toEqual(['rgb(19, 166, 99)'])
  await expect(page.locator('.status-pill.active')).toHaveCount(27)
  await expect(page.locator('.status-pill.unassigned')).toHaveCount(0)
  await expectFacilitySummary(page)
}

async function expectFacilitySummary(page: Page) {
  const summary = page.locator('.overview-panel')
  const overviewMetrics = page.locator('.overview-metrics > div')
  await expect(summary).toBeVisible()
  await expect(overviewMetrics).toHaveCount(3)
  await expect(overviewMetrics.locator('span')).toHaveText(['Facilities', 'Active', 'Coming Soon'])
  await expect(overviewMetrics.locator('b')).toHaveText(['27', '27', '0'])
  await expect(summary.getByText('Planned', { exact: true })).toHaveCount(0)
  await expect(summary.getByText('Unassigned', { exact: true })).toHaveCount(0)
}

async function expectFacilityTypeLayout(page: Page) {
  const showcase = page.getByTestId('selected-showcase')
  const identity = showcase.locator('.facility-identity')
  const copy = identity.locator(':scope > div')
  const subtitle = copy.getByText('Logistics network location', { exact: true })
  const facilityType = copy.getByTestId('facility-network-type')
  const photo = identity.getByTestId('facility-photo')
  const precision = identity.locator(':scope > .precision-chip')
  const address = showcase.locator('.address-line')
  const tabs = showcase.getByRole('tablist', { name: 'Facility details' })

  await expect(copy.locator(':scope > small')).toHaveText(['Logistics network location', 'UF ONLY'])
  await expect(facilityType).toHaveText('UF ONLY')
  await expect(showcase.getByText('UF/CUBEWORKS', { exact: true })).toHaveCount(0)

  const [identityBox, copyBox, subtitleBox, typeBox, photoBox, precisionBox, addressBox, tabsBox, rendering] = await Promise.all([
    identity.boundingBox(),
    copy.boundingBox(),
    subtitle.boundingBox(),
    facilityType.boundingBox(),
    photo.boundingBox(),
    precision.boundingBox(),
    address.boundingBox(),
    tabs.boundingBox(),
    facilityType.evaluate((element) => ({
      horizontalClipping: element.scrollWidth > element.clientWidth + 1,
      verticalClipping: element.scrollHeight > element.clientHeight + 1,
    })),
  ])
  expect(identityBox).not.toBeNull()
  expect(copyBox).not.toBeNull()
  expect(subtitleBox).not.toBeNull()
  expect(typeBox).not.toBeNull()
  expect(typeBox!.y).toBeGreaterThanOrEqual(subtitleBox!.y + subtitleBox!.height)
  expect(typeBox!.x).toBeGreaterThanOrEqual(copyBox!.x)
  expect(typeBox!.x + typeBox!.width).toBeLessThanOrEqual(copyBox!.x + copyBox!.width)
  expect(typeBox!.y + typeBox!.height).toBeLessThanOrEqual(identityBox!.y + identityBox!.height)
  expect(rendering).toEqual({ horizontalClipping: false, verticalClipping: false })
  expect(photoBox && typeBox ? boxesOverlap(photoBox, typeBox) : true).toBe(false)
  expect(precisionBox && typeBox ? boxesOverlap(precisionBox, typeBox) : true).toBe(false)
  expect(addressBox && typeBox ? boxesOverlap(addressBox, typeBox) : true).toBe(false)
  expect(tabsBox && typeBox ? boxesOverlap(tabsBox, typeBox) : true).toBe(false)
}

async function expectLocationFilterLayout(page: Page, mobile = false) {
  const filters = page.locator('.list-filters')
  const search = page.getByPlaceholder('Search street, city, state, ZIP...').locator('..')
  const status = page.getByLabel('Filter by status')
  const facilityType = page.getByLabel('Filter by facility type')
  const [filtersBox, searchBox, statusBox, typeBox] = await Promise.all([
    filters.boundingBox(),
    search.boundingBox(),
    status.boundingBox(),
    facilityType.boundingBox(),
  ])

  for (const box of [filtersBox, searchBox, statusBox, typeBox]) expect(box).not.toBeNull()
  for (const box of [searchBox!, statusBox!, typeBox!]) {
    expect(box.x).toBeGreaterThanOrEqual(filtersBox!.x)
    expect(box.x + box.width).toBeLessThanOrEqual(filtersBox!.x + filtersBox!.width)
    expect(box.height).toBeGreaterThanOrEqual(mobile ? 40 : 31)
  }
  expect(boxesOverlap(statusBox!, typeBox!)).toBe(false)
  if (mobile) {
    expect(searchBox!.y + searchBox!.height).toBeLessThanOrEqual(statusBox!.y)
    expect(searchBox!.y + searchBox!.height).toBeLessThanOrEqual(typeBox!.y)
  } else {
    expect(boxesOverlap(searchBox!, statusBox!)).toBe(false)
    expect(boxesOverlap(searchBox!, typeBox!)).toBe(false)
  }

  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }))
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport)
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem('locations-theme')) localStorage.setItem('locations-theme', 'light')
    // These suites cover the flat Dashboard map; tests/globe.spec.ts covers the 3D globe.
    if (!localStorage.getItem('dashboard-projection-v1')) localStorage.setItem('dashboard-projection-v1', 'map')
  })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Facility directory' })).toBeVisible()
  await expect(page.getByLabel('Facility network map')).toBeVisible()
  await expect(page.getByTestId('selected-showcase')).toHaveCount(0)
})

test('opens with the exact 27-address directory beside the 27-pin map and no selected profile', async ({ page }) => {
  await expect(page.locator('tbody tr')).toHaveCount(27)
  const table = page.getByRole('table')
  for (const address of suppliedAddresses) await expect(table).toContainText(address)
  expect(facilities).toHaveLength(27)
  expect(facilities.slice(0, 17).every((facility) => facility.status === 'Active' && facility.facilityType === 'UF ONLY')).toBe(true)
  expect(facilities.slice(17).every((facility) => facility.status === 'Active' && facility.facilityType === 'UF/CUBEWORKS')).toBe(true)
  expect(facilities.filter((facility) => facility.coordinates !== null)).toHaveLength(27)
  await expect(page.getByTestId('facility-network-type')).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Facility 01', exact: true })).toHaveCount(0)
  await expect(page.getByTestId('map-open-in-maps')).toHaveCount(0)
  await expect(page.getByTestId('overview-map-preview')).toHaveCount(0)
  await expectDefaultFacilityStatuses(page)
  await expect(page.getByLabel('Filter by status').locator('option')).toHaveText(['All statuses', 'Active', 'Coming Soon', 'Planned', 'Unassigned'])
  await expect(page.getByLabel('Filter by facility type')).toHaveValue('All')
  await expect(page.getByLabel('Filter by facility type').locator('option')).toHaveText(['All types', 'UF ONLY', 'UF/CUBEWORKS'])
  await expect(page.getByLabel('Local facility status legend')).toContainText('Planned')
  await expect(page.getByLabel('Local facility status legend')).toContainText('Unassigned')
  await expectLocationFilterLayout(page)

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

  await expectDefaultFacilityStatuses(page)
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

  await expectDefaultFacilityStatuses(page)
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
  await expect(page.locator('.location-marker-wrap')).toHaveCount(27)
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
  await expect(page.locator('.location-pin')).toHaveCount(27)
  const focusedMarker = page.getByRole('button', { name: 'Open facility 01 in Locations' })
  await focusedMarker.focus()
  await expect(focusedMarker).toBeFocused()

  for (const control of [
    page.getByRole('button', { name: 'Street', exact: true }),
    page.getByRole('button', { name: 'Satellite', exact: true }),
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
  await expect(page.getByTestId('map-open-in-maps')).toHaveCount(0)

  await dashboardNav.click()
  await expect(dashboardNav).toHaveAttribute('aria-current', 'page')
  await expect(page.getByTestId('selected-showcase')).toHaveCount(0)
  await expect(page.getByTestId('map-open-in-maps')).toHaveCount(0)
  await expect(page.locator('.location-pin.is-selected')).toHaveCount(0)
  await expect(page.locator('.location-marker-wrap')).toHaveCount(27)
  await expectAllFacilitiesInMapBounds(map)
})

test('every Dashboard region, including Arizona, focuses the map on its pinned facilities', async ({ page }) => {
  const map = page.getByLabel('Facility network map')
  const regions = [
    ['Southern California', [1, 2, 3, 15, 19]],
    ['Northern California', [21]],
    ['Texas', [4, 5, 14, 17, 23, 27]],
    ['Washington', [10, 11, 20]],
    ['Georgia', [6, 7]],
    ['South Carolina', [8]],
    ['Tennessee', [9, 24]],
    ['Florida', [12]],
    ['Nevada', [13, 22]],
    ['Illinois', [16]],
    ['Arizona', [18]],
    ['Utah', [25]],
    ['New Jersey', [26]],
  ] as const

  await page.getByRole('button', { name: 'Dashboard', exact: true }).click()
  await page.locator('.dashboard-region-toggle').click()
  const panel = page.getByRole('complementary', { name: 'Dashboard regions' })
  for (const [label, numbers] of regions) {
    const regionFacilities = facilities.filter((facility) => numbers.some((number) => number === facility.number))
    await panel.getByRole('button', { name: new RegExp(label) }).first().click()
    await expect(page.locator('.location-marker-wrap')).toHaveCount(regionFacilities.length)
    await expectFacilitiesInMapBounds(map, regionFacilities)
    for (const facility of regionFacilities) expect(facility.coordinates).not.toBeNull()
  }
})

test('Dashboard Regions softly highlights Southern California, retains a closed-panel selection, and clears cleanly', async ({ page }) => {
  const map = page.getByLabel('Facility network map')
  const regionsToggle = page.locator('.dashboard-region-toggle')
  const southernCalifornia = [facilities[0], facilities[1], facilities[2], facilities[14], facilities[18]]

  await page.getByRole('button', { name: 'Dashboard', exact: true }).click()
  await expect(regionsToggle).toBeVisible()
  await expect(regionsToggle).toHaveAttribute('aria-expanded', 'false')
  await expect(page.getByRole('complementary', { name: 'Dashboard regions' })).toHaveCount(0)
  await expect(page.locator('.dashboard-region-focus-area')).toHaveCount(0)
  await expect(page.locator('.dashboard-facility-highlight')).toHaveCount(0)
  await expect(page.locator('.location-marker-wrap')).toHaveCount(27)

  await regionsToggle.click()
  const panel = page.getByRole('complementary', { name: 'Dashboard regions' })
  await expect(panel).toBeVisible()
  await expect(regionsToggle).toHaveAttribute('aria-expanded', 'true')
  await expect(panel).toContainText('Northern California')
  await expect(panel).toContainText('Tennessee')
  const southernCaliforniaHeading = panel.getByRole('button', { name: /Southern California/ })
  await expect(southernCaliforniaHeading).toHaveAttribute('aria-expanded', 'false')
  await expect(southernCaliforniaHeading).toHaveAttribute('aria-pressed', 'false')

  await southernCaliforniaHeading.click()
  await expect(southernCaliforniaHeading).toHaveAttribute('aria-expanded', 'true')
  await expect(southernCaliforniaHeading).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.location-marker-wrap')).toHaveCount(5)
  await expectFacilitiesInMapBounds(map, southernCalifornia)

  const rows = panel.getByTestId('dashboard-region-facility')
  await expect(rows).toHaveCount(5)
  for (const facility of southernCalifornia) {
    const row = panel.locator(`[data-facility-id="${facility.id}"]`)
    await expect(row).toContainText(`Facility ${String(facility.number).padStart(2, '0')}`)
    await expect(row).toContainText(facility.fullAddress)
    const media = facilityMedia[facility.id]
    if (media) {
      const image = row.locator('img')
      await expect(image).toHaveAttribute('src', media.thumbnail.assetUrl)
      await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0)).toBe(true)
    } else {
      await expect(row.getByTestId('photo-fallback')).toBeVisible()
    }
  }

  await expect(page.locator('.dashboard-region-focus-area')).toHaveCount(0)
  const highlights = page.locator('.dashboard-facility-highlight')
  await expect(highlights).toHaveCount(10)
  await expect(page.locator('.dashboard-facility-highlight-outer')).toHaveCount(5)
  await expect(page.locator('.dashboard-facility-highlight-inner')).toHaveCount(5)
  expect(await highlights.evaluateAll((elements) => elements.every((element) => window.getComputedStyle(element).pointerEvents === 'none'))).toBe(true)
  await expect(panel).toContainText('Highlighted facilities')
  await expect(panel).toContainText('Illustrative')

  await expect.poll(async () => Number(await map.getAttribute('data-zoom'))).toBeGreaterThanOrEqual(7)
  const focusedCenter = await map.getAttribute('data-center')
  const focusedZoom = await map.getAttribute('data-zoom')
  await southernCaliforniaHeading.click()
  await expect(southernCaliforniaHeading).toHaveAttribute('aria-expanded', 'false')
  await expect(southernCaliforniaHeading).toHaveAttribute('aria-pressed', 'true')
  await expect(rows).toHaveCount(0)
  await expect(page.locator('.location-marker-wrap')).toHaveCount(5)
  await expect(highlights).toHaveCount(10)
  await expect(map).toHaveAttribute('data-center', focusedCenter!)
  await expect(map).toHaveAttribute('data-zoom', focusedZoom!)

  const firstMarker = page.getByRole('button', { name: 'Open facility 01 in Locations' })
  await firstMarker.hover()
  await expect(page.locator('[data-testid="dashboard-pin-preview"][data-facility-id="buena-park-valley-view"]')).toBeVisible()

  await panel.getByRole('button', { name: 'Close regions' }).click()
  await expect(panel).toHaveCount(0)
  await expect(page.locator('.location-marker-wrap')).toHaveCount(5)
  await expect(highlights).toHaveCount(10)
  await expect(regionsToggle).toContainText('Southern California')
  await expect(page.getByTestId('dashboard-focus-label')).toContainText('Illustrative')

  await regionsToggle.click()
  await expect(southernCaliforniaHeading).toHaveAttribute('aria-expanded', 'false')
  await expect(southernCaliforniaHeading).toHaveAttribute('aria-pressed', 'true')
  await expectFacilitiesInMapBounds(map, southernCalifornia)
  await page.waitForTimeout(800)
  const reopenedCenter = await map.getAttribute('data-center')
  const reopenedZoom = await map.getAttribute('data-zoom')
  await southernCaliforniaHeading.focus()
  await page.keyboard.press('Enter')
  await expect(southernCaliforniaHeading).toHaveAttribute('aria-expanded', 'true')
  await expect(rows).toHaveCount(5)
  await page.keyboard.press('Space')
  await expect(southernCaliforniaHeading).toHaveAttribute('aria-expanded', 'false')
  await expect(rows).toHaveCount(0)
  await page.keyboard.press('Space')
  await expect(southernCaliforniaHeading).toHaveAttribute('aria-expanded', 'true')
  await expect(rows).toHaveCount(5)
  await expect(map).toHaveAttribute('data-center', reopenedCenter!)
  await expect(map).toHaveAttribute('data-zoom', reopenedZoom!)

  await panel.getByRole('button', { name: /All facilities/ }).click()
  await expect(page.locator('.location-marker-wrap')).toHaveCount(27)
  await expect(page.locator('.dashboard-region-focus-area')).toHaveCount(0)
  await expect(highlights).toHaveCount(0)
  await expect(page.getByTestId('dashboard-focus-label')).toHaveCount(0)
  await expect(southernCaliforniaHeading).toHaveAttribute('aria-expanded', 'false')
  await expect(southernCaliforniaHeading).toHaveAttribute('aria-pressed', 'false')
  await expect(rows).toHaveCount(0)
  await expectAllFacilitiesInMapBounds(map)

  await southernCaliforniaHeading.click()
  await panel.locator('[data-facility-id="buena-park-valley-view"]').click()
  await expect(page.getByTestId('selected-showcase')).toContainText(facilities[0].fullAddress)
  await page.getByRole('button', { name: 'Dashboard', exact: true }).click()
  await expect(page.locator('.location-marker-wrap')).toHaveCount(27)
  await expect(page.locator('.dashboard-region-focus-area')).toHaveCount(0)
  await expect(highlights).toHaveCount(0)
  await expect(regionsToggle).toHaveAttribute('aria-expanded', 'false')
  await expectAllFacilitiesInMapBounds(map)

  await regionsToggle.click()
  await expect(southernCaliforniaHeading).toHaveAttribute('aria-expanded', 'false')
  await expect(southernCaliforniaHeading).toHaveAttribute('aria-pressed', 'false')
})

test('mobile Dashboard Regions sheet stays in bounds and leaves map controls usable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.reload()
  await page.getByRole('button', { name: 'Open navigation' }).click()
  await page.getByRole('button', { name: 'Dashboard', exact: true }).click()

  const map = page.getByLabel('Facility network map')
  const regionsToggle = page.locator('.dashboard-region-toggle')
  await regionsToggle.click()
  const panel = page.getByRole('complementary', { name: 'Dashboard regions' })
  const mapTools = page.locator('.map-tools')
  const attribution = page.locator('.leaflet-control-attribution')
  await expect(panel).toBeVisible()
  await expect(page.getByRole('button', { name: 'Recenter map' })).toBeVisible()

  const [mapBox, panelBox, toggleBox, toolsBox, attributionBox] = await Promise.all([
    map.boundingBox(),
    panel.boundingBox(),
    regionsToggle.boundingBox(),
    mapTools.boundingBox(),
    attribution.boundingBox(),
  ])
  expect(mapBox).not.toBeNull()
  expect(panelBox).not.toBeNull()
  expect(panelBox!.x).toBeGreaterThanOrEqual(mapBox!.x)
  expect(panelBox!.y).toBeGreaterThanOrEqual(mapBox!.y)
  expect(panelBox!.x + panelBox!.width).toBeLessThanOrEqual(mapBox!.x + mapBox!.width)
  expect(panelBox!.y + panelBox!.height).toBeLessThanOrEqual(mapBox!.y + mapBox!.height)
  expect(toolsBox ? boxesOverlap(panelBox!, toolsBox) : true).toBe(false)
  expect(toggleBox && toolsBox ? boxesOverlap(toggleBox, toolsBox) : true).toBe(false)
  expect(attributionBox ? boxesOverlap(panelBox!, attributionBox) : true).toBe(false)

  const southernCaliforniaHeading = panel.getByRole('button', { name: /Southern California/ })
  await southernCaliforniaHeading.click()
  await expect(page.locator('.location-marker-wrap')).toHaveCount(5)
  await expect(page.locator('.dashboard-region-focus-area')).toHaveCount(0)
  await expect(page.locator('.dashboard-facility-highlight')).toHaveCount(10)
  await expectFacilitiesInMapBounds(map, [facilities[0], facilities[1], facilities[2], facilities[14], facilities[18]])

  await southernCaliforniaHeading.focus()
  await page.keyboard.press('Space')
  await expect(southernCaliforniaHeading).toHaveAttribute('aria-expanded', 'false')
  await expect(southernCaliforniaHeading).toHaveAttribute('aria-pressed', 'true')
  await expect(panel.getByTestId('dashboard-region-facility')).toHaveCount(0)
  await expect(page.locator('.location-marker-wrap')).toHaveCount(5)
  await expect(page.locator('.dashboard-facility-highlight')).toHaveCount(10)
  await page.keyboard.press('Enter')
  await expect(southernCaliforniaHeading).toHaveAttribute('aria-expanded', 'true')
  await expect(panel.getByTestId('dashboard-region-facility')).toHaveCount(5)

  await page.getByRole('button', { name: 'Satellite', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Satellite', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect.poll(() => page.locator('.leaflet-tile-pane img[src*="/World_Imagery/"]').count()).toBeGreaterThan(0)
  await page.getByRole('button', { name: 'Street', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Street', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect.poll(() => page.locator('.leaflet-tile-pane img[src*="/World_Street_Map/"]').count()).toBeGreaterThan(0)

  await page.keyboard.press('Escape')
  await expect(panel).toHaveCount(0)
  await expect(page.locator('.location-marker-wrap')).toHaveCount(5)
  await expect(regionsToggle).toBeFocused()
  const dimensions = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }))
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport)
})

test('Dashboard pin previews show matching decoded photos on hover and focus, then dismiss cleanly', async ({ page }) => {
  await page.getByRole('button', { name: 'Dashboard', exact: true }).click()
  const map = page.getByLabel('Facility network map')
  const firstFacility = facilities[14]
  const centralFacility = facilities[22]
  const nextFacility = facilities[7]
  const tennesseeFacility = facilities[8]
  const firstMarker = page.getByRole('button', { name: 'Open facility 15 in Locations' })
  const centralMarker = page.getByRole('button', { name: 'Open facility 23 in Locations' })
  const nextMarker = page.getByRole('button', { name: 'Open facility 08 in Locations' })
  const tennesseeMarker = page.getByRole('button', { name: 'Open facility 09 in Locations' })

  await expect(page.getByTestId('dashboard-pin-preview')).toHaveCount(0)
  await expect(page.locator('.dashboard-pin-preview-address')).toHaveCount(0)
  await expect(page.getByTestId('operating-hours-preview')).toHaveCount(0)
  await expect(page.getByText(nextFacility.fullAddress, { exact: true })).toHaveCount(0)
  const restingTransform = await firstMarker.locator('.location-pin').evaluate((element) => window.getComputedStyle(element).transform)
  await firstMarker.hover()

  const firstPreview = await expectDashboardPreviewLayout(page, map, firstFacility)
  const centralPreview = page.locator(`[data-testid="dashboard-pin-preview"][data-facility-id="${centralFacility.id}"]`)
  const nextPreview = page.locator(`[data-testid="dashboard-pin-preview"][data-facility-id="${nextFacility.id}"]`)
  await expect(firstPreview).toContainText('Facility 15')
  await expect(firstPreview).toContainText('Long Beach, CA')
  const image = firstPreview.locator('img')
  await expect(image).toHaveAttribute('src', facilityMedia[firstFacility.id].thumbnail.assetUrl)
  await expect(image).toHaveAttribute('alt', facilityMedia[firstFacility.id].thumbnail.alt)
  const hoveredTransform = await firstMarker.locator('.location-pin').evaluate((element) => window.getComputedStyle(element).transform)
  expect(hoveredTransform).not.toBe(restingTransform)

  await centralMarker.hover()
  await expect(firstPreview).toBeHidden()
  await expectDashboardPreviewLayout(page, map, centralFacility)
  await expect(centralPreview).toContainText('Houston, TX')

  await nextMarker.hover()
  await expect(centralPreview).toBeHidden()
  await expectDashboardPreviewLayout(page, map, nextFacility)
  await expect(nextPreview).toContainText('Summerville, SC')
  await expect(nextPreview.locator('.dashboard-pin-preview-address')).toHaveText('369 N Cypress (410 Tradeport Dr.), Summerville, SC')

  await page.mouse.move(0, 0)
  await expect(nextPreview).toBeHidden()
  await tennesseeMarker.focus()
  await expect(tennesseeMarker).toBeFocused()
  const tennesseePreview = await expectDashboardPreviewLayout(page, map, tennesseeFacility)
  await expect(tennesseePreview.locator('.dashboard-pin-preview-address')).toHaveText('4550 Quality Drive, TN')
  await expect(tennesseePreview).not.toContainText('Memphis')

  await page.getByRole('button', { name: 'Satellite', exact: true }).focus()
  await expect(page.getByTestId('dashboard-pin-preview')).toHaveCount(0)

  await firstMarker.focus()
  await expect(firstMarker).toBeFocused()
  await expect(firstPreview).toBeVisible()
  await page.getByRole('button', { name: 'Recenter map' }).focus()
  await expect(page.getByTestId('dashboard-pin-preview')).toHaveCount(0)

  await nextMarker.focus()
  await expect(nextPreview).toBeVisible()
  await page.keyboard.press('Space')
  await expect(page.getByTestId('selected-showcase')).toContainText(nextFacility.fullAddress)
})

test('Dashboard pin preview disables motion and keeps token contrast when reduced motion is requested', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.getByTestId('theme-toggle').click()
  await page.getByRole('button', { name: 'Dashboard', exact: true }).click()

  const marker = page.getByRole('button', { name: 'Open facility 15 in Locations' })
  await marker.hover()
  await expect(marker.locator('.location-pin')).toHaveCSS('transition-duration', '0s')
  const preview = page.getByTestId('dashboard-pin-preview')
  await expect(preview).toBeVisible()
  await expect(preview).toHaveCSS('animation-name', 'none')
  const contrast = await page.locator('.leaflet-tooltip.dashboard-pin-preview').evaluate((element) => {
    const tooltipStyles = window.getComputedStyle(element)
    const titleStyles = window.getComputedStyle(element.querySelector('strong')!)
    return { background: tooltipStyles.backgroundColor, text: titleStyles.color }
  })
  expect(contrast.background).not.toBe(contrast.text)
})

test('mobile Dashboard is map-only and its marker opens the Locations detail flow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.reload()
  await page.getByRole('button', { name: 'Open navigation' }).click()
  await page.getByRole('button', { name: 'Dashboard', exact: true }).click()

  const map = page.getByLabel('Facility network map')
  await expect(map).toBeVisible()
  await expect(page.locator('.location-marker-wrap')).toHaveCount(27)
  await expect(page.getByRole('group', { name: 'Explorer view' })).toHaveCount(0)
  await expect(page.getByPlaceholder('Search address, city, state, ZIP...')).toHaveCount(0)
  await expect(page.locator('.leaflet-tooltip')).toHaveCount(0)
  await expectAllFacilitiesInMapBounds(map)

  const mapBox = await map.boundingBox()
  expect(mapBox?.width).toBeCloseTo(390, 0)
  expect(mapBox?.height).toBeGreaterThan(700)
  const dimensions = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }))
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport)

  const tappedFacility = facilities[14]
  const firstMarker = page.getByRole('button', { name: 'Open facility 15 in Locations' })
  for (const [facility, markerName] of [
    [facilities[14], 'Open facility 15 in Locations'],
    [facilities[3], 'Open facility 04 in Locations'],
    [facilities[7], 'Open facility 08 in Locations'],
    [facilities[16], 'Open facility 17 in Locations'],
  ] as const) {
    await page.getByRole('button', { name: markerName }).focus()
    await expectDashboardPreviewLayout(page, map, facility, true)
  }
  await firstMarker.focus()
  await firstMarker.click()
  await page.getByRole('button', { name: 'Open navigation' }).click()
  await expect(page.getByRole('button', { name: 'Locations', exact: true })).toHaveAttribute('aria-current', 'page')
  await expect(page.getByRole('group', { name: 'Explorer view' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'List' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByTestId('selected-showcase')).toContainText(tappedFacility.fullAddress)
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

test('square footage uses each site plan building area and available space awaits monthly warehouse updates', () => {
  const totals = Object.fromEntries(facilities.map((facility) => [facility.id, getFacilitySquareFootage(facility.id).totalSquareFeet]))
  expect(Object.values(totals).filter((total) => total !== undefined)).toHaveLength(14)
  expect(Object.keys(facilitySitePlans).every((facilityId) => totals[facilityId] !== undefined)).toBe(true)
  expect(totals['buena-park-valley-view']).toBe(1_034_026)
  expect(totals['el-paso-emerald-12102-building-5']).toBe(209_153)
  expect(totals['moreno-valley-heacock']).toBe(756_340)
  expect(totals['waddell-cotton']).toBeUndefined()
  expect(facilityAvailableSpace).toEqual({})
  expect(facilities.every((facility) => getFacilitySquareFootage(facility.id).available === undefined)).toBe(true)
  expect(formatAvailableSpaceMonth('2026-10')).toBe('Oct 2026')
})

test('Dashboard preview without a site plan shows only the pending available-space line', async ({ page }) => {
  await page.getByRole('button', { name: 'Dashboard', exact: true }).click()
  const map = page.getByLabel('Facility network map')
  const waddell = facilities[17]
  await page.getByRole('button', { name: 'Open facility 18 in Locations' }).hover()
  const preview = await expectDashboardPreviewLayout(page, map, waddell)
  await expect(preview.getByTestId('square-footage-total')).toHaveCount(0)
  await expect(preview.getByTestId('square-footage-available')).toBeVisible()
})

test('ten UF/CUBEWORKS additions preserve supplied addresses, status, and confirmed coordinates', () => {
  const additions = facilities.slice(17)
  expect(additions.map((facility) => facility.fullAddress)).toEqual(suppliedAddresses.slice(17))
  expect(additions.map((facility) => facility.number)).toEqual([18, 19, 20, 21, 22, 23, 24, 25, 26, 27])
  expect(additions.every((facility) => facility.facilityType === 'UF/CUBEWORKS')).toBe(true)
  expect(additions.every((facility) => facility.status === 'Active')).toBe(true)

  const waddell = additions[0]
  expect(waddell.coordinates).toEqual([33.53433209636, -112.425402119954])
  expect(waddell.coordinatePrecision).toBe('Point address')
  expect(waddell.geocodeNote).toBeUndefined()

  const kent = additions[2]
  expect(kent.coordinates).toEqual([47.4235533, -122.2273279])
  expect(kent.coordinatePrecision).toBe('Point address')
  expect(kent.geocodeNote).toBeUndefined()
  expect(kent.fullAddress).toContain('19801-19821')

  const plano = additions[9]
  expect(plano.coordinates).toEqual([33.0123245, -96.7025856])
  expect(plano.zip).toBeUndefined()
  expect(plano.fullAddress).toBe('910 10th Street / 880 F Ave., Plano, TX')
  expect(plano.geocodeNote).toContain('primary 910 10th St')
  expect(plano.geocodeNote).toContain('alternate 880 F Ave.')
})

test('operating-hours sidecar maps all 27 original, follow-up, and expansion confirmations', () => {
  expect(facilities).toHaveLength(27)
  expect(Object.keys(facilityOperatingHours).sort()).toEqual(facilities.map((facility) => facility.id).sort())
  expect(Object.keys(expectedProvidedHours)).toHaveLength(13)
  expect(Object.keys(expectedConfirmedHours)).toHaveLength(4)
  expect(Object.keys(expectedExpansionHours)).toHaveLength(10)

  for (const [facilityId, timezone] of Object.entries(expectedProvidedHours)) {
    const hours = facilityOperatingHours[facilityId]
    expect(hours.status).toBe('provided')
    if (hours.status !== 'provided') throw new Error(`${facilityId} should have provided operating hours`)
    expect(hours).toMatchObject({
      facilityId,
      startTime: '8:00 AM',
      endTime: '4:30 PM',
      timezone,
      days: 'M-F',
      source: OPERATING_HOURS_SOURCE,
    })
    expect(formatOperatingHours(hours)).toBe(`8:00 AM–4:30 PM ${timezone} M-F`)
  }

  expect(facilityOperatingHours['long-beach-willow'].sourceRowLabel).toBe('CA Willlow')
  expect(facilityOperatingHours['pooler-morgan-lakes'].sourceRowLabel).toBe('GA Pooler')
  expect(facilityOperatingHours['pooler-seabrook-building-2'].sourceRowLabel).toBe('GA Seabrook')

  for (const [facilityId, timezone] of Object.entries(expectedConfirmedHours)) {
    const hours = facilityOperatingHours[facilityId]
    expect(hours.status).toBe('confirmed')
    if (hours.status !== 'confirmed') throw new Error(`${facilityId} should have follow-up-confirmed operating hours`)
    expect(hours).toMatchObject({
      facilityId,
      startTime: '8:00 AM',
      endTime: '4:30 PM',
      timezone,
      days: 'M-F',
      source: CONFIRMED_OPERATING_HOURS_SOURCE,
      sourceRowLabel: 'Follow-up confirmation',
    })
    expect(formatOperatingHours(hours)).toBe(`8:00 AM–4:30 PM ${timezone} M-F`)
    expect(hours.matchNote).toContain('Confirmed by the user in a follow-up')
    expect(hours.matchNote).toContain('separate from the original 26-row list')
  }

  for (const [facilityId, timezone] of Object.entries(expectedExpansionHours)) {
    const hours = facilityOperatingHours[facilityId]
    expect(hours.status).toBe('confirmed')
    expect(hours).toMatchObject({
      facilityId,
      startTime: '8:00 AM',
      endTime: '4:30 PM',
      timezone,
      days: 'M-F',
      source: CONFIRMED_OPERATING_HOURS_SOURCE,
    })
    expect(hours.sourceRowLabel).toContain(facilities.find((facility) => facility.id === facilityId)!.state)
    expect(hours.matchNote).toContain('ten-site roster expansion on 2026-09-28')
    expect(formatOperatingHours(hours)).toBe(`8:00 AM–4:30 PM ${timezone} M-F`)
  }

  expect(Object.values(facilityOperatingHours).every((hours) => ['provided', 'confirmed'].includes(hours.status))).toBe(true)
  expect(JSON.stringify(facilityOperatingHours)).not.toContain('assumed')
  expect(JSON.stringify(facilityOperatingHours)).not.toContain('Not provided')
  expect(JSON.stringify(facilityOperatingHours)).not.toContain('Needs confirmation')
})

test('media sidecar distinguishes twelve official records, fifteen user-provided photos, and no fallbacks', () => {
  expect(Object.keys(facilityMedia).sort()).toEqual([...Object.keys(expectedOfficialThumbnails), 'moreno-valley-heacock', 'houston-citypark', 'pooler-morgan-lakes', 'pooler-seabrook-building-2', 'jacksonville-ignition', 'tennessee-quality-drive', 'las-vegas-marion-building-5', 'el-paso-emerald-12100', 'el-paso-emerald-12102-building-5', 'waddell-cotton', 'ontario-airport', 'kent-85th-avenue-range', 'salt-lake-city-jimmy-doolittle', 'somerset-cottontail', 'plano-10th-f-avenue'].sort())
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
  for (const facilityId of ['west-sacramento-overland', 'sparks-vista', 'houston-navigation', 'memphis-delp']) {
    expect(facilityMedia[facilityId]).toMatchObject({
      retrievedDate: '2026-09-28',
      verification: 'official-source-address-correlated',
      sourcePage: 'https://www.unisco.com/locations',
    })
    expect(facilityMedia[facilityId].matchNote).toContain('exact supplied address matches')
    expect(facilityMedia[facilityId].matchNote).toContain('not independently established')
  }
  for (const [facilityId, detailWidth, detailHeight] of [
    ['waddell-cotton', 1323, 880],
    ['ontario-airport', 650, 433],
    ['kent-85th-avenue-range', 883, 588],
    ['salt-lake-city-jimmy-doolittle', 882, 588],
    ['somerset-cottontail', 1323, 876],
    ['plano-10th-f-avenue', 882, 588],
  ] as const) {
    expect(facilityMedia[facilityId]).toMatchObject({
      verification: 'user-provided-address-user-verified',
      retrievedDate: '2026-09-29',
      sourcePage: 'user-provided screenshot (no public source URL)',
      thumbnail: { assetUrl: `/media/thumbnails/${facilityId}.webp`, width: 500, height: 500 },
      detail: { assetUrl: `/media/${facilityId}.jpg`, width: detailWidth, height: detailHeight },
    })
    expect(facilityMedia[facilityId].matchNote).toContain('not official UNIS listing media')
  }
})

test('shows 27 address-sourced previews and no roster fallbacks', async ({ page }) => {
  const rows = page.locator('tbody')
  await expect(rows.getByTestId('facility-photo')).toHaveCount(27)
  await expect(rows.getByTestId('photo-fallback')).toHaveCount(0)

  for (const facility of facilities) {
    const row = page.getByRole('button', { name: `Select ${facility.fullAddress}` })
    if (facilityMedia[facility.id]) await expect(row.getByTestId('facility-photo')).toHaveCount(1)
    else await expect(row.getByTestId('photo-fallback')).toHaveCount(1)
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
  await expect(page.locator('tbody tr')).toHaveCount(6)
  await globalSearch.fill('79928')
  await expect(page.locator('tbody tr')).toHaveCount(2)
  await globalSearch.fill('WA')
  await expect(page.locator('tbody tr')).toHaveCount(3)

  await globalSearch.fill('')
  const listSearch = page.getByPlaceholder('Search street, city, state, ZIP...')
  await listSearch.fill('Brandon Rd')
  await expect(page.locator('tbody tr')).toHaveCount(1)
  await expect(page.getByRole('table')).toContainText('3901 Brandon Rd., Joliet, IL 60436')
})

test('facility type filter combines with search and status, clears fully, and stays independent from Dashboard', async ({ page }) => {
  const map = page.getByLabel('Facility network map')
  const rows = page.locator('tbody tr')
  const markers = map.locator('.location-marker-wrap')
  const search = page.getByPlaceholder('Search street, city, state, ZIP...')
  const status = page.getByLabel('Filter by status')
  const facilityType = page.getByLabel('Filter by facility type')

  await expect(facilityType).toHaveValue('All')
  await expect(facilityType.locator('option')).toHaveText(['All types', 'UF ONLY', 'UF/CUBEWORKS'])
  await expect(rows).toHaveCount(27)
  await expect(markers).toHaveCount(27)

  await facilityType.selectOption('UF ONLY')
  await expect(rows).toHaveCount(17)
  await expect(markers).toHaveCount(17)

  await facilityType.selectOption('UF/CUBEWORKS')
  await expect(rows).toHaveCount(10)
  await expect(markers).toHaveCount(10)
  await expect(page.getByRole('table')).toContainText(suppliedAddresses[17])
  await search.fill('Waddell')
  await expect(rows).toHaveCount(1)
  await expect(markers).toHaveCount(1)

  await search.fill('not-a-current-facility')
  await expect(page.getByText('No matching facilities')).toBeVisible()
  await expect(page.locator('.table-wrap .empty-state')).toContainText('facility type')
  await expect(page.locator('.no-map-results')).toContainText('No facilities found')

  await page.getByRole('button', { name: 'Clear filters' }).click()
  await expect(search).toHaveValue('')
  await expect(status).toHaveValue('All')
  await expect(facilityType).toHaveValue('All')
  await expect(rows).toHaveCount(27)
  await expect(markers).toHaveCount(27)

  await page.evaluate(() => localStorage.setItem('facility-status-assignments-v3', JSON.stringify({
    'buena-park-valley-view': 'Planned',
  })))
  await page.reload()
  await search.fill('California')
  await status.selectOption('Planned')
  await facilityType.selectOption('UF ONLY')
  await expect(rows).toHaveCount(1)
  await expect(markers).toHaveCount(1)
  await expect(page.getByRole('table')).toContainText(suppliedAddresses[0])

  await chooseFromDirectory(page, suppliedAddresses[0])
  await returnToDirectory(page)
  await expect(search).toHaveValue('California')
  await expect(status).toHaveValue('Planned')
  await expect(facilityType).toHaveValue('UF ONLY')
  await expect(rows).toHaveCount(1)

  await facilityType.selectOption('UF/CUBEWORKS')
  await expect(rows).toHaveCount(0)
  await page.getByRole('button', { name: 'Dashboard', exact: true }).click()
  await expect(map).toHaveAttribute('data-view', 'dashboard')
  await expect(markers).toHaveCount(27)
})

test('confirmed Waddell and Kent pins show no approximate caveats while the Plano dual-address caveat stays visible', async ({ page }) => {
  const waddell = facilities[17]
  const kent = facilities[19]
  const plano = facilities[26]
  const facilityType = page.getByLabel('Filter by facility type')

  await facilityType.selectOption('UF/CUBEWORKS')
  await chooseFromDirectory(page, waddell.fullAddress)
  const showcase = page.getByTestId('selected-showcase')
  await expect(showcase.getByTestId('facility-network-type')).toHaveText('UF/CUBEWORKS')
  await expect(showcase.locator('.status-pill')).toHaveText('Active')
  await expect(showcase.getByTestId('operating-hours-overview')).toContainText('8:00 AM–4:30 PM MST M-F')
  await expect(showcase.getByTestId('overview-map-embed')).toHaveAttribute('src', mapsEmbedHref(waddell.fullAddress))
  await expect(showcase.locator('.overview-map-note')).toHaveCount(0)
  await expect(showcase.locator('.coordinate-section')).toContainText('Point address')
  await expect(showcase.locator('.geocode-warning')).toHaveCount(0)
  await expect(page.getByLabel('Facility network map').locator(`.location-marker-wrap[title="${waddell.fullAddress}"]`)).toHaveCount(1)

  await showcase.getByRole('button', { name: 'View Full Details' }).click()
  let drawer = page.getByRole('dialog', { name: 'Waddell, AZ' })
  await expect(drawer.getByRole('link', { name: 'Open in Maps' })).toHaveAttribute('href', mapsHref(waddell.fullAddress))
  await expect(drawer.getByText('Coordinates', { exact: true }).locator('..')).toContainText('33.534332, -112.425402')
  await expect(drawer.locator('.geocode-warning')).toHaveCount(0)
  await drawer.getByRole('button', { name: 'Close details' }).click()

  await page.getByRole('tab', { name: 'Photos' }).click()
  await expect(showcase.locator('.photo-detail img')).toHaveAttribute('src', '/media/waddell-cotton.jpg')
  await returnToDirectory(page)
  await expect(facilityType).toHaveValue('UF/CUBEWORKS')

  await chooseFromDirectory(page, kent.fullAddress)
  await expect(page.getByTestId('selected-showcase').locator('.overview-map-note')).toHaveCount(0)
  await page.getByTestId('selected-showcase').getByRole('button', { name: 'View Full Details' }).click()
  drawer = page.getByRole('dialog', { name: 'Kent, WA' })
  await expect(drawer.locator('.geocode-warning')).toHaveCount(0)
  await drawer.getByRole('button', { name: 'Close details' }).click()
  await returnToDirectory(page)

  await chooseFromDirectory(page, plano.fullAddress)
  await page.getByTestId('selected-showcase').getByRole('button', { name: 'View Full Details' }).click()
  drawer = page.getByRole('dialog', { name: 'Plano, TX' })
  await expect(drawer).toContainText('primary 910 10th St')
  await expect(drawer).toContainText('alternate 880 F Ave.')
  await expect(drawer.getByText('ZIP', { exact: true }).locator('..')).toContainText('Not provided')
})

test('local status assignments drive all filters and persist across reload', async ({ page }) => {
  for (const [address, status] of [
    [suppliedAddresses[0], 'Active'],
    [suppliedAddresses[1], 'Coming Soon'],
    [suppliedAddresses[2], 'Planned'],
  ] as const) {
    await chooseFromDirectory(page, address)
    const editor = page.getByLabel(`Set status for ${address}`)
    await expect(editor.locator('option')).toHaveText(['Unassigned', 'Active', 'Coming Soon', 'Planned'])
    await editor.selectOption(status)
    await returnToDirectory(page)
  }

  const table = page.getByRole('table')
  const filter = page.getByLabel('Filter by status')
  await filter.selectOption('Active')
  await expect(page.locator('tbody tr')).toHaveCount(25)
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
  await expect(page.locator('tbody tr')).toHaveCount(27)

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
  await expect(page.locator('tbody tr')).toHaveCount(24)
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
  await expectFacilityTypeLayout(page)

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

test('main map and selected showcase omit the removed map and Street View actions', async ({ page }) => {
  const facility = facilities[15]
  await expect(page.getByTestId('map-open-in-maps')).toHaveCount(0)
  await chooseFromDirectory(page, facility.fullAddress)

  const showcase = page.getByTestId('selected-showcase')
  const addressLine = showcase.locator('.address-line')
  await expect(addressLine).toContainText(facility.fullAddress)
  await expect(showcase.locator('.address-actions')).toHaveCount(0)
  await expect(showcase.locator('.detail-header').getByRole('link', { name: 'Open in Maps' })).toHaveCount(0)
  await expect(showcase.locator('.detail-header').getByRole('link', { name: 'Street View' })).toHaveCount(0)
  await expect(showcase.locator('.detail-header .street-view-caveat')).toHaveCount(0)
  await expect(page.getByTestId('map-open-in-maps')).toHaveCount(0)

  const addressRendering = await addressLine.locator('> span').evaluate((element) => ({
    horizontalClipping: element.scrollWidth > element.clientWidth + 1,
    verticalClipping: element.scrollHeight > element.clientHeight + 1,
  }))
  expect(addressRendering.horizontalClipping).toBe(false)
  expect(addressRendering.verticalClipping).toBe(false)
})

test('selected Overview embeds a keyless Google map and follows facility and tab changes', async ({ page }) => {
  const firstFacility = facilities[0]
  const nextFacility = facilities[15]
  await chooseFromDirectory(page, firstFacility.fullAddress)

  const preview = page.getByTestId('overview-map-preview')
  const embed = preview.getByTestId('overview-map-embed')
  const link = preview.getByTestId('overview-map-link')
  await expect(preview).toBeVisible()
  await expect(preview).toHaveAttribute('data-facility-id', firstFacility.id)
  await expect(preview).toHaveAttribute('data-latitude', String(firstFacility.coordinates[0]))
  await expect(preview).toHaveAttribute('data-longitude', String(firstFacility.coordinates[1]))
  await expect(embed).toHaveCount(1)
  await expect(embed).toHaveAttribute('src', mapsEmbedHref(firstFacility.fullAddress))
  await expect(embed).toHaveAttribute('title', `Google Maps preview for ${firstFacility.fullAddress}`)
  await expect(embed).toHaveAttribute('referrerpolicy', 'strict-origin-when-cross-origin')
  await expect(embed).toHaveAttribute('allowfullscreen', '')
  await expect(embed).toHaveAttribute('src', /google\.com\/maps/)
  await expect(embed).not.toHaveAttribute('src', /[?&]key=/)
  await expect(link).toHaveAttribute('href', mapsHref(firstFacility.fullAddress))
  await expect(link).toHaveAttribute('target', '_blank')
  await expect(link).toHaveAttribute('rel', /noopener/)
  await expect(link).toHaveAttribute('rel', /noreferrer/)
  await expect(preview.locator('.overview-map-note')).toHaveCount(0)
  await expectOverviewMapLayout(page)

  const widthBeforeResize = (await preview.boundingBox())!.width
  await page.getByRole('separator', { name: 'Resize facility directory and map' }).focus()
  await page.keyboard.press('ArrowRight')
  await expect.poll(async () => (await preview.boundingBox())?.width ?? 0).toBeGreaterThan(widthBeforeResize + 15)
  await expect(embed).toHaveAttribute('src', mapsEmbedHref(firstFacility.fullAddress))

  await returnToDirectory(page)
  await chooseFromDirectory(page, nextFacility.fullAddress)
  await expect(preview).toHaveAttribute('data-facility-id', nextFacility.id)
  await expect(preview).toHaveAttribute('data-latitude', String(nextFacility.coordinates[0]))
  await expect(preview).toHaveAttribute('data-longitude', String(nextFacility.coordinates[1]))
  await expect(embed).toHaveAttribute('src', mapsEmbedHref(nextFacility.fullAddress))
  await expect(link).toHaveAttribute('href', mapsHref(nextFacility.fullAddress))
  await expect(preview.locator('.overview-map-note')).toHaveCount(0)

  await page.getByRole('tab', { name: 'Photos' }).click()
  await expect(preview).toHaveCount(0)
  await expect(page.getByTestId('overview-map-embed')).toHaveCount(0)
  await page.getByRole('tab', { name: 'Overview' }).click()
  await expect(preview).toBeVisible()
  await expect(embed).toHaveAttribute('src', mapsEmbedHref(nextFacility.fullAddress))
  await expect(link).toHaveAttribute('href', mapsHref(nextFacility.fullAddress))

  const mainMap = page.getByLabel('Facility network map')
  await expect(mainMap.locator('.location-marker-wrap')).toHaveCount(27)
  await expect(mainMap.locator('.leaflet-tile-pane img')).not.toHaveCount(0)
})

test('mobile Google map embed is compact and allows scrolling through facility details', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.reload()
  const facility = facilities[0]
  await chooseFromDirectory(page, facility.fullAddress)

  const preview = page.getByTestId('overview-map-preview')
  const detailContent = page.locator('.detail-content')
  await expect(preview).toBeVisible()
  await expect(preview.getByTestId('overview-map-embed')).toHaveAttribute('src', mapsEmbedHref(facility.fullAddress))
  await expectOverviewMapLayout(page, true)

  const canvasBox = await preview.locator('.overview-map-canvas').boundingBox()
  expect(canvasBox).not.toBeNull()
  await detailContent.evaluate((element) => { element.scrollTop = 0 })
  await page.mouse.move(canvasBox!.x + canvasBox!.width / 2, canvasBox!.y + canvasBox!.height / 2)
  await page.mouse.wheel(0, 420)
  await expect.poll(() => detailContent.evaluate((element) => element.scrollTop)).toBeGreaterThan(0)

  const dimensions = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }))
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport)
})

test('Overview map exposes an external fallback when the iframe reports a load failure', async ({ page }) => {
  const facility = facilities[0]
  await chooseFromDirectory(page, facility.fullAddress)
  const preview = page.getByTestId('overview-map-preview')
  await preview.getByTestId('overview-map-embed').dispatchEvent('error')

  const fallback = preview.getByTestId('overview-map-fallback')
  await expect(fallback).toBeVisible()
  await expect(fallback).toContainText('Map preview unavailable')
  const fallbackLink = fallback.getByRole('link', { name: 'Open in Maps' })
  await expect(fallbackLink).toHaveAttribute('href', mapsHref(facility.fullAddress))
  await expect(fallbackLink).toHaveAttribute('target', '_blank')
  await expect(fallbackLink).toHaveAttribute('rel', /noopener/)
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
  const buenaGallery = page.getByRole('region', { name: `User-provided photos for ${suppliedAddresses[0]}` })
  await expect(buenaGallery.locator('.user-photo-card')).toHaveCount(4)
  await expect(buenaGallery.locator('img').first()).toHaveAttribute('src', '/media/buena-park/building-exterior.jpg')
  await expect(buenaGallery.locator('img').first()).toHaveCSS('object-fit', 'contain')
  const buenaExisting = page.getByRole('region', { name: `Existing media record for ${suppliedAddresses[0]}` })
  await expect(buenaExisting).toContainText('Official listing media')
  await expect(buenaExisting.getByRole('link', { name: 'Official UNIS page' })).toHaveAttribute('href', 'https://www.unisco.com/locations/facility/buena-park-ca')
  await expect(buenaExisting.locator('img')).toHaveAttribute('src', '/media/buena-park-valley-view.jpg')
  await expect(buenaExisting).toContainText('2026-09-25')

  await returnToDirectory(page)
  await chooseFromDirectory(page, suppliedAddresses[7])
  await page.getByRole('tab', { name: 'Photos' }).click()
  await expect(page.getByRole('region', { name: `User-provided photos for ${suppliedAddresses[7]}` }).locator('.user-photo-card')).toHaveCount(3)
  await expect(page.getByRole('region', { name: `Existing media record for ${suppliedAddresses[7]}` })).toContainText('does not verify building or coordinate identity')

  for (const [address, detailAsset, galleryCount] of [
    [suppliedAddresses[2], '/media/moreno-valley-heacock.jpg', 3],
    [suppliedAddresses[3], '/media/houston-citypark.jpg', 1],
    [suppliedAddresses[5], '/media/pooler-morgan-lakes.jpg', 3],
    [suppliedAddresses[8], '/media/tennessee-quality-drive.jpg', 1],
    [suppliedAddresses[11], '/media/jacksonville-ignition.jpg', 5],
    [suppliedAddresses[12], '/media/las-vegas-marion-building-5.jpg', 1],
  ] as const) {
    await returnToDirectory(page)
    await chooseFromDirectory(page, address)
    await expect(page.locator('.facility-photo-detail img')).toHaveAttribute('src', detailAsset)
    await expect(page.locator('.facility-photo-detail img')).toHaveCSS('object-fit', 'contain')
    await page.getByRole('tab', { name: 'Photos' }).click()
    await expect(page.getByRole('region', { name: `User-provided photos for ${address}` }).locator('.user-photo-card')).toHaveCount(galleryCount)
    const existing = page.getByRole('region', { name: `Existing media record for ${address}` })
    await expect(existing.locator('img')).toHaveAttribute('src', detailAsset)
    await expect(existing).toContainText('User-provided photo')
    await expect(existing).not.toContainText('Official listing media')
    await expect(existing).toContainText('not official UNIS listing media')
  }

  await returnToDirectory(page)
  await chooseFromDirectory(page, suppliedAddresses[6])
  await page.getByRole('tab', { name: 'Photos' }).click()
  await expect(page.getByRole('region', { name: `User-provided photos for ${suppliedAddresses[6]}` })).toHaveCount(0)
  await expect(page.locator('.photo-detail img')).toHaveAttribute('src', '/media/pooler-seabrook-building-2.jpg')
  await expect(page.locator('.photo-detail')).toContainText('User-provided photo')
  await expect(page.locator('.photo-detail')).not.toContainText('Official listing media')
  await expect(page.locator('.photo-detail')).toContainText('not official UNIS listing media')
  await expect(page.locator('.photo-caption dl a')).toHaveCount(0)
})

test('selected showcase omits address actions while Full Details retains Maps and Street View links', async ({ page }) => {
  const facility = facilities[15]
  await chooseFromDirectory(page, facility.fullAddress)
  const showcase = page.getByTestId('selected-showcase')
  const streetViewHref = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${facility.coordinates.join(',')}`

  await expect(showcase.locator('.address-actions')).toHaveCount(0)
  await expect(showcase.locator('.detail-header .street-view-caveat')).toHaveCount(0)

  await showcase.getByRole('button', { name: 'View Full Details' }).click()
  const drawer = page.getByRole('dialog', { name: `${facility.city}, ${facility.state}` })
  const drawerMapsLink = drawer.getByRole('link', { name: 'Open in Maps' })
  const drawerStreetViewLink = drawer.getByRole('link', { name: 'Street View' })
  await expect(drawerMapsLink).toHaveAttribute('href', mapsHref(facility.fullAddress))
  await expect(drawerMapsLink).toHaveAttribute('target', '_blank')
  await expect(drawerMapsLink).toHaveAttribute('rel', /noopener/)
  await expect(drawerMapsLink).toHaveAttribute('rel', /noreferrer/)
  await expect(drawerStreetViewLink).toHaveAttribute('href', streetViewHref)
  await expect(drawerStreetViewLink).toHaveAttribute('target', '_blank')
  await expect(drawerStreetViewLink).toHaveAttribute('rel', /noopener/)
  await expect(drawerStreetViewLink).toHaveAttribute('rel', /noreferrer/)
  await expect(drawer.locator('.street-view-caveat')).toHaveCount(0)
})

test('operating hours distinguish original-list and follow-up-confirmed provenance', async ({ page }) => {
  const providedFacility = facilities[0]
  await chooseFromDirectory(page, providedFacility.fullAddress)
  let overviewHours = page.getByTestId('selected-showcase').getByTestId('operating-hours-overview')
  await expect(overviewHours).toHaveAttribute('data-hours-status', 'provided')
  await expect(overviewHours).toContainText('8:00 AM–4:30 PM PST M-F')
  await expect(overviewHours).toContainText('User-provided · As supplied · CA Buena Park (Valley View)')

  await page.getByTestId('selected-showcase').getByRole('button', { name: 'View Full Details' }).click()
  let drawer = page.getByRole('dialog')
  let drawerHours = drawer.getByTestId('operating-hours-drawer')
  await expect(drawerHours).toContainText('8:00 AM–4:30 PM PST M-F')
  await expect(drawerHours).toContainText('User-provided · As supplied · CA Buena Park (Valley View)')
  await drawer.getByRole('button', { name: 'Close details' }).click()
  await returnToDirectory(page)

  for (const [facility, timezone] of [
    [facilities[8], 'CST'],
    [facilities[12], 'PST'],
    [facilities[13], 'MST'],
    [facilities[16], 'MST'],
  ] as const) {
    await chooseFromDirectory(page, facility.fullAddress)
    overviewHours = page.getByTestId('selected-showcase').getByTestId('operating-hours-overview')
    await expect(overviewHours).toHaveAttribute('data-hours-status', 'confirmed')
    await expect(overviewHours.locator('strong')).toHaveText(`8:00 AM–4:30 PM ${timezone} M-F`)
    await expect(overviewHours).toContainText('User-confirmed · Follow-up confirmation')
    await expect(overviewHours).not.toContainText('Assumed')
    await expect(overviewHours).not.toContainText('Not provided')
    await expect(overviewHours).not.toContainText('Needs confirmation')

    await page.getByTestId('selected-showcase').getByRole('button', { name: 'View Full Details' }).click()
    drawer = page.getByRole('dialog')
    drawerHours = drawer.getByTestId('operating-hours-drawer')
    await expect(drawerHours.locator('strong')).toHaveText(`8:00 AM–4:30 PM ${timezone} M-F`)
    await expect(drawerHours).toContainText('User-confirmed · Follow-up confirmation')
    await expect(drawerHours).toContainText('Confirmed by the user in a follow-up')
    await expect(drawerHours).toContainText('separate from the original 26-row list')
    await expect(drawerHours).not.toContainText('Assumed')
    await drawer.getByRole('button', { name: 'Close details' }).click()
    await returnToDirectory(page)
  }
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
  await expect(page.getByLabel('Filter by facility type')).toHaveValue('All')
  await expectLocationFilterLayout(page, true)

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
  await expectFacilitySummary(page)

  const markerFacility = facilities[0]
  await expectMapFocusedOn(map, markerFacility.coordinates)
  await page.locator(`.location-marker-wrap[title="${markerFacility.fullAddress}"]`).click({ force: true })
  await expect(listSwitch).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByTestId('selected-showcase')).toBeVisible()
  await expect(page.getByTestId('selected-showcase')).toContainText(markerFacility.fullAddress)
  await expect(map).toBeHidden()
  await expectFacilityTypeLayout(page)

  const mobileHours = page.getByTestId('selected-showcase').getByTestId('operating-hours-overview')
  await expect(mobileHours).toContainText('8:00 AM–4:30 PM PST M-F')
  const hoursClipping = await mobileHours.evaluate((element) => ({
    horizontal: element.scrollWidth > element.clientWidth + 1,
    vertical: element.scrollHeight > element.clientHeight + 1,
  }))
  expect(hoursClipping).toEqual({ horizontal: false, vertical: false })

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
  await expect(page.locator('tbody tr')).toHaveCount(27)
})

test('property tabs show honest unavailable states and coordinate limitations', async ({ page }) => {
  await chooseFromDirectory(page, suppliedAddresses[6])
  await expect(page.getByTestId('selected-showcase').locator('.street-view-caveat')).toHaveCount(0)
  await page.getByRole('tab', { name: 'Site Plan' }).click()
  await expect(page.getByText('Site plan not provided')).toBeVisible()
  await page.getByRole('tab', { name: 'Documents' }).click()
  await expect(page.getByRole('heading', { name: 'Facility profile PDF' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Download facility profile PDF' })).toBeEnabled()
  await expect(page.locator('.facility-documents')).toContainText('Explicit site-plan unavailable state')
  await expect(page.locator('.facility-documents')).toContainText('Existing user-provided photo')
  await expect(page.locator('.facility-documents')).not.toContainText('Documents not provided')
  await page.getByRole('tab', { name: 'Operations' }).click()
  await expect(page.getByText('Contacts pending review')).toBeVisible()
  await expect(page.locator('.facility-operations')).toContainText('8:00 AM–4:30 PM EST M-F')

  await returnToDirectory(page)
  await chooseFromDirectory(page, suppliedAddresses[15])
  await expect(page.getByTestId('selected-showcase').locator('.coordinate-section')).toContainText('Point address')
  await expect(page.getByTestId('selected-showcase').locator('.street-view-caveat')).toHaveCount(0)
  await expect(page.getByTestId('selected-showcase').locator('.geocode-warning')).toHaveCount(0)
})

test('Operations sidecar maps 18 exact sheet rows, all 79 role entries, and only two portraits', () => {
  expect(Object.keys(facilityOperations)).toEqual(Object.keys(expectedOperationsRows))
  expect(Object.values(facilityOperations).reduce((count, record) => count + (record?.contacts.length ?? 0), 0)).toBe(79)
  expect(facilitiesNeedingOperationsContactReview).toEqual(expectedOperationsReviewIds)

  for (const [facilityId, expected] of Object.entries(expectedOperationsRows)) {
    const record = facilityOperations[facilityId]
    expect(record?.sourceRow, facilityId).toBe(expected.row)
    expect(record?.source, facilityId).toBe(`User-provided facility contact sheet, row ${expected.row}`)
    expect(new Set(record?.contacts.map((contact) => contact.id)).size, facilityId).toBe(record?.contacts.length)
    if (facilityId !== 'buena-park-valley-view') {
      expect(record?.contacts.map((contact) => contact.sourceColumn), facilityId).toEqual(expected.columns)
      expect(record?.contacts.every((contact) => !contact.photoUrl), facilityId).toBe(true)
    }
  }

  expect(facilityOperations['tacoma-lincoln']?.contacts.find((contact) => contact.sourceColumn === 'I')).toMatchObject({
    role: 'POC as requested by John Diaz', name: 'Juan Barragan', email: 'juan.barragan@unisco.com',
  })
  expect(facilityOperations['tacoma-lincoln']?.contacts.find((contact) => contact.sourceColumn === 'J')).toMatchObject({
    role: 'Regional Director of Field Operations', name: 'Harold Cuarezma',
    phones: [
      { label: 'Cell', display: '909-753-6346', href: '+19097536346' },
      { label: 'Mobile', display: '626-362-9596', href: '+16263629596' },
    ],
  })
  expect(facilityOperations['tennessee-quality-drive']?.contacts.find((contact) => contact.sourceColumn === 'F')?.phones).toEqual([
    { label: 'Office', display: '901-560-9291', href: '+19015609291' },
    { label: 'Mobile', display: '662-408-2279', href: '+16624082279' },
  ])
  expect(facilityOperations['joliet-brandon']?.contacts.filter((contact) => contact.name === 'Javier Montane').map((contact) => [contact.sourceColumn, contact.role, contact.id])).toEqual([
    ['G', 'Director of Operations', 'g-javier-montane'],
    ['H', 'VP of Operations', 'h-javier-montane'],
  ])
  expect(facilityOperations['el-paso-emerald-12102-building-5']?.contacts.map((contact) => contact.phones?.[0].display)).toEqual(['626.829.3161', '626-899-2364'])

  const portraits = Object.values(facilityOperations).flatMap((record) => record?.contacts.filter((contact) => contact.photoUrl).map((contact) => `${record.facilityId}:${contact.id}`) ?? [])
  expect(portraits).toEqual(['buena-park-valley-view:ruben-jauregui', 'buena-park-valley-view:mark-tuttle'])
  for (const facilityId of expectedOperationsReviewIds) expect(facilityOperations[facilityId]).toBeUndefined()
})

test('Valley View Operations preserves five contacts and its two supplied portraits', async ({ page }) => {
  const record = facilityOperations['buena-park-valley-view']
  expect(record?.source).toBe('User-provided facility contact sheet, row 5')
  expect(record?.contacts).toEqual([
    expect.objectContaining({ group: 'account-management', role: 'Manager of Account Management & Client Onboarding', name: 'Michelle Topete', email: 'michelle.topete@unisco.com', phone: '626.829.3160' }),
    expect.objectContaining({ group: 'account-management', role: 'Sr Director of Account Management & Client Onboarding', name: 'Mary Smothers', email: 'mary.smothers@unisco.com', phone: '626-899-2363' }),
    expect.objectContaining({ group: 'operations', role: 'General Manager', name: 'Ruben Jauregui', email: 'ruben.jauregui@unisco.com', phone: '562-644-4594', photoUrl: '/media/operations/buena-park-valley-view/ruben-jauregui.png' }),
    expect.objectContaining({ group: 'operations', role: 'Director of Operations', name: 'Mark Tuttle', email: 'mark.tuttle@unisco.com', phone: '657-689-6951', photoUrl: '/media/operations/buena-park-valley-view/mark-tuttle.png' }),
    expect.objectContaining({ group: 'operations', role: 'VP of Operations', name: 'John Diaz', email: 'john.diaz@unisco.com' }),
  ])
  const johnRecord = record?.contacts.find((contact) => contact.id === 'john-diaz')
  expect(johnRecord).not.toHaveProperty('phone')
  expect(johnRecord).not.toHaveProperty('phoneHref')
  expect(record?.contacts.filter((contact) => contact.photoUrl).map((contact) => contact.id)).toEqual(['ruben-jauregui', 'mark-tuttle'])

  await chooseFromDirectory(page, suppliedAddresses[0])
  await page.getByRole('tab', { name: 'Operations' }).click()
  const panel = page.getByRole('region', { name: `Operations contacts for ${suppliedAddresses[0]}` })
  await expect(panel).toContainText('8:00 AM–4:30 PM PST M-F')
  await expect(panel).toContainText('User-provided · As supplied · CA Buena Park (Valley View)')
  await expect(panel).toContainText('User-provided facility contact sheet, row 5')
  await expect(panel.getByRole('heading', { name: 'Account management' })).toBeVisible()
  await expect(panel.getByRole('heading', { name: 'Operations leaders' })).toBeVisible()
  await expect(panel.locator('.operations-contact-card')).toHaveCount(5)
  await expect(panel.locator('.operations-contact-photo.is-blank')).toHaveCount(3)
  await expect(panel.locator('.operations-contact-card img')).toHaveCount(2)

  for (const [name, assetUrl, sourcePath] of [
    ['Ruben Jauregui', '/media/operations/buena-park-valley-view/ruben-jauregui.png', '/home/user/workspace/ruben.png'],
    ['Mark Tuttle', '/media/operations/buena-park-valley-view/mark-tuttle.png', '/home/user/workspace/mark.png'],
  ] as const) {
    const card = panel.locator('.operations-contact-card').filter({ hasText: name })
    const portrait = card.getByRole('img', { name: `Portrait of ${name}` })
    await expect(portrait).toHaveAttribute('src', assetUrl)
    await expect(portrait).toHaveCSS('object-fit', 'contain')
    await expect.poll(() => portrait.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth === 1254 && image.naturalHeight === 1254)).toBe(true)
    const [response, sourceBytes] = await Promise.all([page.request.get(assetUrl), readFile(sourcePath)])
    expect(response.ok(), assetUrl).toBe(true)
    expect(response.headers()['content-type']).toContain('image/png')
    expect(createHash('sha256').update(await response.body()).digest('hex'))
      .toBe(createHash('sha256').update(sourceBytes).digest('hex'))
  }

  for (const name of ['Michelle Topete', 'Mary Smothers', 'John Diaz']) {
    const card = panel.locator('.operations-contact-card').filter({ hasText: name })
    await expect(card.locator('img')).toHaveCount(0)
    await expect(card.getByRole('img', { name: `Portrait not provided for ${name}` })).toBeVisible()
  }

  const expectedContacts = [
    ['Michelle Topete', 'Manager of Account Management & Client Onboarding', 'michelle.topete@unisco.com', 'mailto:michelle.topete@unisco.com', '626.829.3160', 'tel:+16268293160'],
    ['Mary Smothers', 'Sr Director of Account Management & Client Onboarding', 'mary.smothers@unisco.com', 'mailto:mary.smothers@unisco.com', '626-899-2363', 'tel:+16268992363'],
    ['Ruben Jauregui', 'General Manager', 'ruben.jauregui@unisco.com', 'mailto:ruben.jauregui@unisco.com', '562-644-4594', 'tel:+15626444594'],
    ['Mark Tuttle', 'Director of Operations', 'mark.tuttle@unisco.com', 'mailto:mark.tuttle@unisco.com', '657-689-6951', 'tel:+16576896951'],
  ] as const
  for (const [name, role, email, emailHref, phone, phoneHref] of expectedContacts) {
    const card = panel.locator('.operations-contact-card').filter({ hasText: name })
    await expect(card).toContainText(role)
    await expect(card.getByRole('link', { name: email })).toHaveAttribute('href', emailHref)
    await expect(card.getByRole('link', { name: phone })).toHaveAttribute('href', phoneHref)
  }

  const john = panel.locator('.operations-contact-card').filter({ hasText: 'John Diaz' })
  await expect(john).toContainText('VP of Operations')
  await expect(john.getByRole('link', { name: 'john.diaz@unisco.com' })).toHaveAttribute('href', 'mailto:john.diaz@unisco.com')
  await expect(john).toContainText('Phone not provided')
  await expect(john.locator('a[href^="tel:"]')).toHaveCount(0)
})

test('matched Operations contacts retain representative roles, links, multiple phones, and facility boundaries', async ({ page }) => {
  const riverside = facilities.find((facility) => facility.id === 'riverside-alessandro')!
  await chooseFromDirectory(page, riverside.fullAddress)
  await page.getByRole('tab', { name: 'Operations' }).click()
  const riversidePanel = page.getByRole('region', { name: `Operations contacts for ${riverside.fullAddress}` })
  await expect(riversidePanel).toContainText('User-provided facility contact sheet, row 4')
  await expect(riversidePanel).toContainText('8:00 AM–4:30 PM PST M-F')
  await expect(riversidePanel.locator('.operations-contact-card')).toHaveCount(5)
  await expect(riversidePanel.locator('.operations-contact-card img')).toHaveCount(0)
  await expect(riversidePanel.locator('.operations-contact-photo.is-blank')).toHaveCount(5)
  const harold = riversidePanel.locator('.operations-contact-card').filter({ hasText: 'Harold Cuarezma' })
  await expect(harold).toContainText('Regional Director of Field Operations')
  await expect(harold.getByRole('link', { name: 'Cell 909-753-6346' })).toHaveAttribute('href', 'tel:+19097536346')
  await expect(harold.getByRole('link', { name: 'Mobile 626-362-9596' })).toHaveAttribute('href', 'tel:+16263629596')

  await returnToDirectory(page)
  const tennessee = facilities.find((facility) => facility.id === 'tennessee-quality-drive')!
  await chooseFromDirectory(page, tennessee.fullAddress)
  await page.getByRole('tab', { name: 'Operations' }).click()
  const tennesseePanel = page.getByRole('region', { name: `Operations contacts for ${tennessee.fullAddress}` })
  const jane = tennesseePanel.locator('.operations-contact-card').filter({ hasText: 'Jane Sanchez' })
  await expect(jane.getByRole('link', { name: 'Office 901-560-9291' })).toHaveAttribute('href', 'tel:+19015609291')
  await expect(jane.getByRole('link', { name: 'Mobile 662-408-2279' })).toHaveAttribute('href', 'tel:+16624082279')
  await expect(tennesseePanel).not.toContainText('Harold Cuarezma')

  await returnToDirectory(page)
  const tacoma = facilities.find((facility) => facility.id === 'tacoma-lincoln')!
  await chooseFromDirectory(page, tacoma.fullAddress)
  await page.getByRole('tab', { name: 'Operations' }).click()
  const tacomaPanel = page.getByRole('region', { name: `Operations contacts for ${tacoma.fullAddress}` })
  const juan = tacomaPanel.locator('.operations-contact-card').filter({ hasText: 'Juan Barragan' })
  await expect(juan).toContainText('POC as requested by John Diaz')
  await expect(juan.getByRole('link', { name: 'juan.barragan@unisco.com' })).toHaveAttribute('href', 'mailto:juan.barragan@unisco.com')
  await expect(tacomaPanel).not.toContainText('Jane Sanchez')
})

test('all nine review-required facilities show sourced hours without contact leakage', async ({ page }) => {
  for (const facilityId of expectedOperationsReviewIds) {
    const facility = facilities.find((candidate) => candidate.id === facilityId)!
    await chooseFromDirectory(page, facility.fullAddress)
    await page.getByRole('tab', { name: 'Operations' }).click()
    const panel = page.getByRole('region', { name: `Operations contacts for ${facility.fullAddress}` })
    await expect(panel).toContainText(formatOperatingHours(facilityOperatingHours[facilityId]))
    await expect(panel).toContainText('Contact match pending review')
    await expect(panel.getByText('Contacts pending review')).toBeVisible()
    await expect(panel).toContainText('No staff contacts were confidently matched to this facility.')
    await expect(panel.locator('.operations-contact-card')).toHaveCount(0)
    await expect(panel.locator('a[href^="mailto:"]')).toHaveCount(0)
    await expect(panel.locator('a[href^="tel:"]')).toHaveCount(0)
    await expect(panel).not.toContainText('Michelle Topete')
    await returnToDirectory(page)
  }
})

test('facility gallery and site-plan sidecars retain all integrated records and serve exact local bytes', async ({ page }) => {
  expect(Object.keys(userProvidedFacilityPhotos)).toHaveLength(13)
  expect(Object.values(userProvidedFacilityPhotos).reduce((count, gallery) => count + gallery.photos.length, 0)).toBe(40)
  expect(Object.keys(facilitySitePlans)).toHaveLength(14)
  expect(userProvidedFacilityPhotos['pooler-seabrook-building-2']).toBeUndefined()
  expect(facilitySitePlans['pooler-seabrook-building-2']).toBeUndefined()
  expect(facilityMedia['pooler-seabrook-building-2'].verification).toBe('user-provided-address-user-verified')
  expect(facilitySitePlans['roanoke-highway-114']?.facts[0]).toMatchObject({ value: 568_632, unit: 'SF', note: 'Provided by user' })
  expect(facilitySitePlans['riverside-alessandro']?.sourceNote).toContain('not to scale')
  expect(facilitySitePlans['pooler-morgan-lakes']?.sourceNote).toContain('not to scale')

  const assetUrls = [
    ...Object.values(userProvidedFacilityPhotos).flatMap((gallery) => gallery.photos.map((photo) => photo.assetUrl)),
    ...Object.values(facilitySitePlans).map((plan) => plan.assetUrl),
  ]
  expect(assetUrls).toHaveLength(54)
  expect(new Set(assetUrls).size).toBe(54)

  for (const assetUrl of assetUrls) {
    const [response, localBytes] = await Promise.all([
      page.request.get(assetUrl),
      readFile(`public${assetUrl}`),
    ])
    expect(response.ok(), assetUrl).toBe(true)
    const responseBytes = await response.body()
    expect(createHash('sha256').update(responseBytes).digest('hex'), assetUrl)
      .toBe(createHash('sha256').update(localBytes).digest('hex'))
  }
})

test('site-plan tabs show sourced facts, redraw notes, and the unaffected Seabrook empty state', async ({ page }) => {
  for (const [address, imagePath, expectedText] of [
    [suppliedAddresses[0], '/media/site-plans/buena-park-valley-view.png', '1,034,026 SF'],
    [suppliedAddresses[1], '/media/site-plans/riverside-alessandro-redraw.png', 'Supplied redraw; not to scale and not an original official plan.'],
    [suppliedAddresses[4], '/media/site-plans/roanoke-highway-114.png', 'Provided by user'],
  ] as const) {
    await chooseFromDirectory(page, address)
    await page.getByRole('tab', { name: 'Site Plan' }).click()
    const panel = page.getByRole('region', { name: `Site plan for ${address}` })
    await expect(panel.locator('img')).toHaveAttribute('src', imagePath)
    await expect(panel.locator('img')).toHaveCSS('object-fit', 'contain')
    await expect(panel.getByRole('link', { name: 'Open full-size site plan in a new tab' })).toHaveAttribute('href', imagePath)
    await expect(panel).toContainText(expectedText)
    await expect(panel).not.toContainText(/currently available|currently occupied/i)
    await returnToDirectory(page)
  }

  await chooseFromDirectory(page, suppliedAddresses[6])
  await page.getByRole('tab', { name: 'Site Plan' }).click()
  await expect(page.getByText('Site plan not provided')).toBeVisible()
})

test('facility profile downloads are four-page selected-facility PDFs with hours and media provenance', async ({ page }) => {
  test.setTimeout(120_000)

  const buenaPark = await downloadFacilityProfile(page, suppliedAddresses[0], 'facility-01-buena-park-valley-view-profile.pdf', { assertLoading: true })
  expect(buenaPark.title).toContain('Facility 01')
  expect(buenaPark.keywords).toContain(suppliedAddresses[0])
  expect(buenaPark.keywords).toContain('1,034,026 SF')
  expect(buenaPark.keywords).toContain('Building exterior')
  expect(buenaPark.keywords).toContain('User-provided media')
  expect(buenaPark.keywords).toContain('8:00 AM–4:30 PM PST M-F')
  expect(buenaPark.keywords).toContain('User-provided · As supplied')
  expectVisiblePdfContacts(buenaPark.visibleText, 'buena-park-valley-view')
  expect(buenaPark.visibleText).not.toContain('Contact information coming soon')
  expect(buenaPark.assetPaths.some((path) => path.startsWith('/media/operations/'))).toBe(false)
  expect(buenaPark.keywords).not.toContain('709,081 SF')
  expect(buenaPark.assetPaths.every((path) => path.startsWith('/media/buena-park/') || path === '/media/site-plans/buena-park-valley-view.png')).toBe(true)

  await returnToDirectory(page)
  const riverside = await downloadFacilityProfile(page, suppliedAddresses[1], 'facility-02-riverside-alessandro-profile.pdf')
  expect(riverside.keywords).toContain(suppliedAddresses[1])
  expect(riverside.keywords).toContain('709,081 SF')
  expect(riverside.keywords).toContain('Supplied redraw; not to scale and not an original official plan.')
  expect(riverside.keywords).toContain('Official UNIS directory listing media')
  expect(riverside.keywords).not.toContain('1,034,026 SF')
  expect(riverside.assetPaths.every((path) => path === '/media/riverside-alessandro.jpg' || path === '/media/site-plans/riverside-alessandro-redraw.png')).toBe(true)

  await returnToDirectory(page)
  const roanoke = await downloadFacilityProfile(page, suppliedAddresses[4], 'facility-05-roanoke-highway-114-profile.pdf')
  expect(roanoke.keywords).toContain(suppliedAddresses[4])
  expect(roanoke.keywords).toContain('568,632 SF')
  expect(roanoke.keywords).toContain('Provided by user')
  expect(roanoke.keywords).toContain('8:00 AM–4:30 PM CST M-F')
  expect(roanoke.keywords).not.toMatch(/airport distance|port distance|currently available/i)
  expect(roanoke.assetPaths.every((path) => path.startsWith('/media/roanoke/') || path === '/media/site-plans/roanoke-highway-114.png')).toBe(true)

  await returnToDirectory(page)
  const seabrook = await downloadFacilityProfile(page, suppliedAddresses[6], 'facility-07-pooler-seabrook-building-2-profile.pdf')
  expect(seabrook.keywords).toContain(suppliedAddresses[6])
  expect(seabrook.keywords).toContain('Site plan not provided')
  expect(seabrook.keywords).toContain('Specific advantages not supplied')
  expect(seabrook.keywords).toContain('User-provided screenshot media')
  expect(seabrook.visibleText).toContain('Contacts pending review')
  expect(seabrook.visibleText).toContain('No staff contacts were confidently matched to this facility.')
  expect(seabrook.visibleText).not.toContain('Michelle Topete')
  expect(seabrook.assetPaths.some((path) => path.startsWith('/media/operations/'))).toBe(false)
  expect(seabrook.keywords).not.toContain('499,500 SF')
  expect(seabrook.assetPaths).toEqual(['/media/pooler-seabrook-building-2.jpg'])
})

test('facility profile Page 1 prints selected contacts, every phone, and no staff portraits', async ({ page }) => {
  test.setTimeout(120_000)

  const sparksFacility = facilities.find((facility) => facility.id === 'sparks-vista')!
  const sparks = await downloadFacilityProfile(page, sparksFacility.fullAddress, 'facility-22-sparks-vista-profile.pdf')
  expectVisiblePdfContacts(sparks.visibleText, 'sparks-vista')
  expect(sparks.visibleText).not.toContain('Ruben Jauregui')
  expect(sparks.visibleText).not.toContain('Mark Tuttle')
  expect(sparks.assetPaths.some((path) => path.startsWith('/media/operations/'))).toBe(false)

  await returnToDirectory(page)
  const tennesseeFacility = facilities.find((facility) => facility.id === 'tennessee-quality-drive')!
  const tennessee = await downloadFacilityProfile(page, tennesseeFacility.fullAddress, 'facility-09-tennessee-quality-drive-profile.pdf')
  expectVisiblePdfContacts(tennessee.visibleText, 'tennessee-quality-drive')
  expect(tennessee.visibleText).not.toContain('Harold Cuarezma')
  expect(tennessee.assetPaths.some((path) => path.startsWith('/media/operations/'))).toBe(false)

  await returnToDirectory(page)
  const poolerFacility = facilities.find((facility) => facility.id === 'pooler-morgan-lakes')!
  const pooler = await downloadFacilityProfile(page, poolerFacility.fullAddress, 'facility-06-pooler-morgan-lakes-profile.pdf')
  expect(pooler.visibleText).toContain('Contacts pending review')
  expect(pooler.visibleText).toContain('No staff contacts were confidently matched to this facility.')
  expect(pooler.visibleText).not.toContain('Jane Sanchez')
  expect(pooler.visibleText).not.toContain('Michelle Topete')
  expect(pooler.assetPaths.some((path) => path.startsWith('/media/operations/'))).toBe(false)
})

test('theme persistence remains functional', async ({ page }) => {
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await page.getByTestId('theme-toggle').click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
})

test('Street basemap is the initial default and manual layer selection persists across navigation', async ({ page }) => {
  const satellite = page.getByRole('button', { name: 'Satellite', exact: true })
  const street = page.getByRole('button', { name: 'Street', exact: true })
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

  await page.getByRole('button', { name: 'Dashboard', exact: true }).click()
  await expect(page.getByLabel('Facility network map')).toHaveAttribute('data-view', 'dashboard')
  await expect(street).toHaveAttribute('aria-pressed', 'true')
  await expect(satellite).toHaveAttribute('aria-pressed', 'false')
  await expect.poll(() => streetTiles.count()).toBeGreaterThan(0)

  await satellite.click()
  await expect(satellite).toHaveAttribute('aria-pressed', 'true')
  await expect(street).toHaveAttribute('aria-pressed', 'false')
  const satelliteTiles = page.locator('.leaflet-tile-pane img[src*="/World_Imagery/"]')
  await expect.poll(() => satelliteTiles.count()).toBeGreaterThan(0)

  await page.getByRole('button', { name: 'Locations', exact: true }).click()
  await expect(page.getByLabel('Facility network map')).toHaveAttribute('data-view', 'locations')
  await expect(satellite).toHaveAttribute('aria-pressed', 'true')
  await expect(street).toHaveAttribute('aria-pressed', 'false')
  await expect.poll(() => satelliteTiles.count()).toBeGreaterThan(0)
})
