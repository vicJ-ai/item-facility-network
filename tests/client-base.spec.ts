import { expect, test, type Locator, type Page } from '@playwright/test'
import { clientLogoByCustomerName } from '../src/data/client-logos'
import { facilityTopCustomers } from '../src/data/facility-customers'

const valleyViewAddress = '6800 Valley View St., Buena Park, CA 90620'
const riversideAddress = '2677 East Alessandro Blvd., Riverside, CA 92508'
const buenaParkCustomers = [
  'GURUNANDA, LLC', 'Euromarket Designs, Inc.', 'ORGAIN, LLC.', 'LENNOX INDUSTRIES INC.', 'ALL MARKET INC / VITA COCO',
  'EMBER TECHNOLOGIES, INC.', 'KARAKA, LLC', 'SIMPLE MODERN', 'TORQUAY ETRADING LLC', 'FLAG & ANTHEM',
  'DRUPLEY INC / DBA GRAZA', 'NZXT', 'AS EVER ENTERPRISES, LLC', 'COME READY FOODS LLC', 'MAMMA CHIA',
  'THE OUAI', "KING'S HAWAIIAN", 'ROAR BEVERAGES INC', 'DELTA ELECTRONICS (AMERICAS) LTD - NEW', 'DUPRAY USA LLC',
] as const

async function useFlatMap(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('locations-theme', 'light')
    localStorage.setItem('dashboard-projection-v1', 'map')
  })
}

async function openFacility(page: Page, address: string) {
  await page.getByRole('button', { name: 'Facilities', exact: true }).click()
  await page.getByRole('button', { name: `Select ${address}` }).click()
  await expect(page.getByTestId('selected-showcase')).toContainText(address)
}

async function signIn(page: Page) {
  await page.getByRole('button', { name: 'WISE sign in' }).click()
  const dialog = page.getByRole('dialog', { name: 'Administrator sign in' })
  await dialog.getByLabel('WISE username').fill('lmadala')
  await dialog.getByLabel('Password').fill('test-password')
  await dialog.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(dialog).toBeHidden()
}

async function expectContained(locator: Locator) {
  await locator.scrollIntoViewIfNeeded()
  expect(await locator.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true)
}

test.beforeEach(async ({ page }) => {
  await useFlatMap(page)
})

test('client source mapping remains complete for all 29 facilities and 234 ranked entries', () => {
  expect(Object.keys(facilityTopCustomers)).toHaveLength(29)
  expect(Object.values(facilityTopCustomers).reduce((count, record) => count + (record?.customers.length ?? 0), 0)).toBe(234)
})

test('public Client Base preserves Buena Park ranking, serves 17 reviewed marks, and leaves unresolved slots blank', async ({ page }, testInfo) => {
  test.setTimeout(60_000)
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  await page.goto('/')
  await openFacility(page, valleyViewAddress)

  const tabs = page.getByRole('tablist', { name: 'Facility details' })
  await expect(tabs.getByRole('tab')).toHaveText(['Overview', 'Site Plan', 'Photos', 'Documents', 'Operations', 'Client Base'])
  await tabs.getByRole('tab', { name: 'Operations' }).click()
  await expect(page.getByRole('region', { name: `Operations contacts for ${valleyViewAddress}` }).getByTestId('client-base')).toHaveCount(0)
  await tabs.getByRole('tab', { name: 'Client Base' }).click()

  const clientBase = page.getByTestId('client-base')
  const rows = clientBase.locator('li')
  await expect(rows).toHaveCount(20)
  await expect(rows.locator('strong')).toHaveText(buenaParkCustomers)
  await expect(rows.locator('.client-rank')).toHaveText(buenaParkCustomers.map((_, index) => String(index + 1)))
  await expect(clientBase).not.toContainText(/confirm|awaiting|source|uncertain|provided/i)

  const logos = rows.locator('.client-logo img')
  await expect(logos).toHaveCount(17)
  for (const logo of await logos.all()) {
    await logo.scrollIntoViewIfNeeded()
    await expect.poll(() => logo.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0 && image.naturalHeight > 0)).toBe(true)
    const source = await logo.getAttribute('src')
    expect(source).toBeTruthy()
    const response = await page.request.get(source!)
    expect(response.ok(), source!).toBe(true)
    expect(response.headers()['content-type']).toContain('image/png')
  }
  expect(new Set(await logos.evaluateAll((images) => images.map((image) => image.getAttribute('src'))))).toEqual(new Set(Object.values(clientLogoByCustomerName)))

  for (const unresolved of ['Euromarket Designs, Inc.', 'KARAKA, LLC', 'TORQUAY ETRADING LLC']) {
    const row = rows.filter({ hasText: unresolved })
    await expect(row.locator('.client-logo')).toBeVisible()
    await expect(row.locator('img')).toHaveCount(0)
  }
  await expect(rows.filter({ hasText: 'ROAR BEVERAGES INC' }).locator('.client-logo')).toHaveCSS('background-color', 'rgb(32, 32, 39)')
  const nzxtRow = rows.nth(11)
  await nzxtRow.scrollIntoViewIfNeeded()
  await expect(nzxtRow.locator('strong')).toHaveText('NZXT')
  const nzxtLogo = nzxtRow.locator('.client-logo')
  await expect(nzxtLogo).toHaveCSS('background-color', 'rgb(32, 32, 39)')
  await expect.poll(() => nzxtLogo.locator('img').evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0 && image.naturalHeight > 0)).toBe(true)
  const nzxtContrast = await nzxtLogo.evaluate((element) => {
    const channels = getComputedStyle(element).backgroundColor.match(/\d+/g)?.slice(0, 3).map(Number) ?? []
    const luminance = channels.reduce((sum, channel, index) => {
      const value = channel / 255
      const linear = value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
      return sum + linear * [0.2126, 0.7152, 0.0722][index]
    }, 0)
    return 1.05 / (luminance + 0.05)
  })
  expect(nzxtContrast).toBeGreaterThan(7)
  const nzxtScreenshot = testInfo.outputPath('client-base-nzxt-row.png')
  await nzxtRow.screenshot({ path: nzxtScreenshot })
  await testInfo.attach('client-base-nzxt-row', { path: nzxtScreenshot, contentType: 'image/png' })

  const firstLogo = rows.first().locator('.client-logo img')
  await firstLogo.evaluate((image: HTMLImageElement) => { image.src = '/media/client-logos/not-curated.png' })
  await expect(rows.first().locator('.client-logo img')).toHaveCount(0)
  await expect(rows.first().locator('.client-logo')).toBeVisible()

  const screenshot = testInfo.outputPath('client-base-desktop.png')
  await page.screenshot({ path: screenshot, fullPage: true })
  await testInfo.attach('client-base-desktop', { path: screenshot, contentType: 'image/png' })
  expect(pageErrors).toEqual([])
})

test('Client Base stays facility-specific and its six-tab mobile navigation remains reachable without page overflow', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.getByRole('button', { name: 'Open navigation' }).click()
  await openFacility(page, riversideAddress)
  const tabs = page.getByRole('tablist', { name: 'Facility details' })
  const clientTab = tabs.getByRole('tab', { name: 'Client Base' })
  await clientTab.scrollIntoViewIfNeeded()
  await clientTab.click()

  const clientBase = page.getByTestId('client-base')
  await expect(clientBase.locator('li')).toHaveCount(20)
  await expect(clientBase.locator('li').first()).toContainText('Midea America Corp')
  await expect(clientBase).not.toContainText('GURUNANDA, LLC')
  for (const row of await clientBase.locator('li').all()) await expectContained(row)
  const layout = await page.evaluate(() => ({ page: document.documentElement.scrollWidth, viewport: window.innerWidth }))
  expect(layout.page).toBeLessThanOrEqual(layout.viewport + 1)

  const screenshot = testInfo.outputPath('client-base-mobile.png')
  await page.screenshot({ path: screenshot, fullPage: true })
  await testInfo.attach('client-base-mobile', { path: screenshot, contentType: 'image/png' })
})

test('rapid map, facility, client, and admin Operations navigation never leaves a blank application root', async ({ page }, testInfo) => {
  test.setTimeout(75_000)
  const pageErrors: string[] = []
  const lifecycleErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error' && /removeChild|not a child|DOMException|react/i.test(message.text())) lifecycleErrors.push(message.text())
  })
  await page.goto('/')
  await signIn(page)
  const navigation = page.getByRole('navigation', { name: 'Primary navigation' })

  await navigation.getByRole('button', { name: 'Dashboard', exact: true }).click()
  const globeToggle = page.getByRole('button', { name: 'Show globe' })
  if (await globeToggle.isVisible()) {
    await globeToggle.click()
    await expect(page.locator('.map-stage')).toHaveAttribute('data-projection', 'globe')
    await page.getByRole('button', { name: 'Show flat map' }).click()
  }

  for (let index = 0; index < 3; index += 1) {
    await navigation.getByRole('button', { name: 'Facilities', exact: true }).click()
    await page.getByRole('button', { name: `Select ${index % 2 === 0 ? valleyViewAddress : riversideAddress}` }).click()
    await page.getByRole('tab', { name: 'Operations' }).click()
    await expect(page.locator('.operations-contact-card').first()).toBeVisible()
    await page.getByRole('tab', { name: 'Client Base' }).click()
    await expect(page.getByTestId('client-base').locator('li').first()).toBeVisible()
    await navigation.getByRole('button', { name: 'Operations', exact: true }).click()
    await expect(page.getByRole('region', { name: 'Operations facility space workbench' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Facility Network could not finish loading' })).toHaveCount(0)
    await expect(page.locator('#root')).not.toBeEmpty()
    if (index === 0) {
      const screenshot = testInfo.outputPath('navigation-stress-admin.png')
      await page.screenshot({ path: screenshot })
      await testInfo.attach('navigation-stress-admin', { path: screenshot, contentType: 'image/png' })
    }
  }

  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: 'Open navigation' }).click()
  await navigation.getByRole('button', { name: 'Facilities', exact: true }).click()
  await page.getByRole('button', { name: `Select ${valleyViewAddress}` }).click()
  await expect(page.getByTestId('selected-showcase')).toContainText(valleyViewAddress)
  await page.getByRole('tab', { name: 'Client Base' }).scrollIntoViewIfNeeded()
  await page.getByRole('tab', { name: 'Client Base' }).click()
  await expect(page.getByTestId('client-base')).toBeVisible()
  await page.getByTitle('Sign out').click()
  await expect(page.getByRole('button', { name: 'WISE sign in' })).toBeVisible()
  await expect(page.locator('#root')).not.toBeEmpty()
  const mobileScreenshot = testInfo.outputPath('navigation-stress-mobile.png')
  await page.screenshot({ path: mobileScreenshot })
  await testInfo.attach('navigation-stress-mobile', { path: mobileScreenshot, contentType: 'image/png' })
  const unexpectedPageErrors = pageErrors.filter((message) => !message.includes('WebAssembly.instantiate()') || !message.includes("script-src 'self'"))
  expect(unexpectedPageErrors).toEqual([])
  expect(lifecycleErrors).toEqual([])
})
