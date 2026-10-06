import { expect, test } from '@playwright/test'
import { PDFDocument } from 'pdf-lib'

const valleyViewAddress = '6800 Valley View St., Buena Park, CA 90620'
const roanokeAddress = '1230 W Highway 114, Roanoke, TX 76262'
const summervilleAddress = '369 N Cypress Dr, Summerville, SC'
const houstonNavigationAddress = '3401 Navigation Blvd, Houston, TX 77003'
const planoAddress = '910 10th Street / 880 F Ave., Plano, TX'

async function useFlatMap(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    localStorage.setItem('locations-theme', 'light')
    localStorage.setItem('dashboard-projection-v1', 'map')
  })
}

async function signIn(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: 'WISE sign in' }).click()
  const dialog = page.getByRole('dialog', { name: 'Administrator sign in' })
  await dialog.getByLabel('WISE username').fill('lmadala')
  await dialog.getByLabel('Password').fill('test-password')
  await dialog.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(dialog).toBeHidden()
}

async function openValleyView(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: 'Facilities', exact: true }).click()
  await page.getByRole('button', { name: `Select ${valleyViewAddress}` }).click()
  await expect(page.getByTestId('selected-showcase')).toContainText(valleyViewAddress)
}

test('new Houston and Plano snapshots render publicly while a saved Houston zero override wins everywhere', async ({ page }, testInfo) => {
  test.setTimeout(90_000)
  await useFlatMap(page)
  await page.goto('/')
  const navigation = page.getByRole('navigation', { name: 'Primary navigation' })
  await navigation.getByRole('button', { name: 'Facilities', exact: true }).click()
  await page.getByRole('button', { name: `Select ${houstonNavigationAddress}` }).click()
  await expect(page.getByTestId('overview-available-space')).toContainText('86,000 SQF')
  await expect(page.getByTestId('bulk-rack-bulk')).toHaveText('Bulk5,000 SQF')
  await expect(page.getByTestId('bulk-rack-rack')).toHaveText('Rack0 pallet positions')

  await page.getByRole('button', { name: 'All facilities' }).click()
  await page.getByRole('button', { name: `Select ${planoAddress}` }).click()
  await expect(page.getByTestId('overview-available-space')).toContainText('0 SQF')
  await expect(page.getByTestId('bulk-rack-bulk')).toHaveText('Bulk62,000 SQF')
  await expect(page.getByTestId('bulk-rack-rack')).toHaveText('Rack0 pallet positions')

  await signIn(page)
  await navigation.getByRole('button', { name: 'Operations', exact: true }).click()
  const workbench = page.getByRole('region', { name: 'Operations facility space workbench' })
  await workbench.getByRole('button', { name: /Facility 23[\s\S]*Houston, TX/ }).click()
  const editor = workbench.getByRole('form', { name: `Update facility space for ${houstonNavigationAddress}` })
  await expect(editor.getByLabel('Available space')).toHaveValue('86000')
  await expect(editor.getByLabel('Bulk')).toHaveValue('5000')
  await expect(editor.getByLabel('Rack')).toHaveValue('0')
  await expect(editor.getByText('User-supplied snapshot · Oct 2026')).toHaveCount(3)
  await editor.getByLabel('Available space').fill('0')
  await editor.getByLabel('Bulk').fill('0')
  await editor.getByLabel('Rack').fill('12')
  await editor.getByRole('button', { name: 'Save facility space' }).click()
  await expect(editor.getByRole('status')).toHaveText('Facility space saved.')
  const historyRow = workbench.getByRole('region', { name: 'Change history' }).locator('tbody tr')
  await expect(historyRow).toHaveCount(1)
  await expect(historyRow).toContainText('86,000 SQF')
  await expect(historyRow).toContainText('5,000 SQF')
  await expect(historyRow).toContainText('12 pallet positions')

  await navigation.getByRole('button', { name: 'Facilities', exact: true }).click()
  await page.getByRole('button', { name: `Select ${houstonNavigationAddress}` }).click()
  await expect(page.getByTestId('overview-available-space')).toContainText('0 SQF')
  await expect(page.getByTestId('bulk-rack-bulk')).toHaveText('Bulk0 SQF')
  await expect(page.getByTestId('bulk-rack-rack')).toHaveText('Rack12 pallet positions')
  await expect(page.getByTestId('bulk-rack')).toContainText('Administrator-maintained live portal values.')
  const screenshot = testInfo.outputPath('houston-snapshot-admin-override.png')
  await page.getByTestId('overview-square-footage').scrollIntoViewIfNeeded()
  await page.screenshot({ path: screenshot })
  await testInfo.attach('houston-snapshot-admin-override', { path: screenshot, contentType: 'image/png' })

  await navigation.getByRole('button', { name: 'Dashboard', exact: true }).click()
  await page.getByRole('button', { name: 'Open facility 23 in Facilities' }).focus()
  const preview = page.locator('[data-testid="dashboard-pin-preview"][data-facility-id="houston-navigation"]')
  await expect(preview.getByTestId('square-footage-available')).toHaveText('Available 0 SQF')
  await expect(preview.getByTestId('square-footage-bulk')).toHaveText('Bulk: 0 SQF')
  await expect(preview.getByTestId('square-footage-rack')).toHaveText('Rack: 12 pallet positions')
})

test('admin availability workflow updates both public surfaces while privileged navigation stays hidden publicly', async ({ browser, page }, testInfo) => {
  test.setTimeout(60_000)
  const consoleErrors: string[] = []
  let releaseStaleAvailability = () => {}
  let staleAvailabilityFulfilled = false
  let capturedInitialAvailability = false
  const staleAvailabilityGate = new Promise<void>((resolve) => { releaseStaleAvailability = resolve })
  await page.route('**/api/availability', async (route) => {
    if (route.request().method() !== 'GET' || capturedInitialAvailability) {
      await route.continue()
      return
    }
    capturedInitialAvailability = true
    const response = await route.fetch()
    await staleAvailabilityGate
    await route.fulfill({ response })
    staleAvailabilityFulfilled = true
  })
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()) })
  await useFlatMap(page)
  await page.goto('/')

  const publicNavigation = page.getByRole('navigation', { name: 'Primary navigation' })
  await expect(publicNavigation.getByRole('button')).toHaveText(['Dashboard', 'Facilities'])
  await expect(publicNavigation.getByRole('button', { name: 'Operations', exact: true })).toHaveCount(0)
  await expect(publicNavigation.getByRole('button', { name: 'Analytics', exact: true })).toHaveCount(0)
  await expect(publicNavigation.getByRole('button', { name: 'Reports', exact: true })).toHaveCount(0)

  await signIn(page)
  await expect(publicNavigation.getByRole('button')).toHaveText(['Dashboard', 'Facilities', 'Operations', 'Analytics', 'Reports'])
  await publicNavigation.getByRole('button', { name: 'Operations', exact: true }).click()
  const workbench = page.getByRole('region', { name: 'Operations facility space workbench' })
  await expect(workbench.getByRole('heading', { name: 'Facility space' })).toBeVisible()
  await expect(workbench.locator('.workbench-facilities > button')).toHaveCount(29)
  await expect(workbench.getByText('Pending', { exact: true }).first()).toBeVisible()

  const editor = workbench.getByRole('form', { name: `Update facility space for ${valleyViewAddress}` })
  await editor.getByLabel('Available space').fill('500000')
  await editor.getByLabel('Bulk').fill('25000')
  await editor.getByLabel('Rack').fill('700')
  await editor.getByRole('button', { name: 'Save facility space' }).click()
  await expect(editor.getByRole('status')).toHaveText('Facility space saved.')
  await expect(editor).toContainText('500,000 SQF')

  releaseStaleAvailability()
  await expect.poll(() => staleAvailabilityFulfilled).toBe(true)
  await expect(editor).toContainText('500,000 SQF')

  const history = workbench.getByRole('region', { name: 'Change history' })
  const savedRecord = history.locator('tbody tr')
  await expect(savedRecord).toHaveCount(1)
  await expect(savedRecord).toContainText('Pending → 500,000 SQF')
  await expect(savedRecord).toContainText(/116,048 SQFsource snapshot → 25,000 SQF/)
  await expect(savedRecord).toContainText(/16,783 pallet positionssource snapshot → 700 pallet positions/)
  await expect(savedRecord).toContainText('lmadala')
  await expect(savedRecord).toContainText('IAM ID 2084344241143070722')
  await expect(savedRecord.getByRole('time')).toContainText('UTC')
  await expect(history).toContainText('1 record')
  await expect(history.getByRole('button', { name: 'Previous history page' })).toBeDisabled()
  await expect(history.getByRole('button', { name: 'Next history page' })).toBeDisabled()
  await expect(history).toContainText('Page 1 of 1')

  const desktopScreenshot = testInfo.outputPath('availability-workbench-desktop.png')
  await page.screenshot({ path: desktopScreenshot, fullPage: true })
  await testInfo.attach('availability-workbench-desktop', { path: desktopScreenshot, contentType: 'image/png' })

  await page.setViewportSize({ width: 390, height: 844 })
  await expect(workbench).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true)
  const mobileScreenshot = testInfo.outputPath('availability-workbench-mobile.png')
  await page.screenshot({ path: mobileScreenshot, fullPage: true })
  await testInfo.attach('availability-workbench-mobile', { path: mobileScreenshot, contentType: 'image/png' })

  await page.setViewportSize({ width: 1536, height: 1024 })
  await openValleyView(page)
  const overviewAvailability = page.getByTestId('overview-available-space')
  await expect(overviewAvailability).toContainText('500,000 SQF')
  const availableLayout = await overviewAvailability.evaluate((element) => {
    const style = getComputedStyle(element)
    const box = element.getBoundingClientRect()
    const parent = element.parentElement!.getBoundingClientRect()
    return {
      borderWidth: style.borderWidth,
      padding: style.padding,
      backgroundColor: style.backgroundColor,
      contained: box.left >= parent.left && box.right <= parent.right && box.top >= parent.top && box.bottom <= parent.bottom,
    }
  })
  expect(availableLayout).toEqual({ borderWidth: '0px', padding: '0px', backgroundColor: 'rgba(0, 0, 0, 0)', contained: true })
  await expect(page.getByTestId('overview-square-footage')).toContainText('Administrator-maintained live portal value, separate from immutable building-capacity and site-plan facts.')

  await publicNavigation.getByRole('button', { name: 'Dashboard', exact: true }).click()
  await page.getByRole('button', { name: 'Open facility 01 in Facilities' }).dispatchEvent('mouseover')
  const preview = page.locator('[data-testid="dashboard-pin-preview"][data-facility-id="buena-park-valley-view"]')
  await expect(preview.getByTestId('square-footage-available')).toHaveText('Available 500,000 SQF')

  const publicPage = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  try {
    await useFlatMap(publicPage)
    await publicPage.goto('/')
    const refreshedPublicNavigation = publicPage.getByRole('navigation', { name: 'Primary navigation' })
    await expect(refreshedPublicNavigation.getByRole('button')).toHaveText(['Dashboard', 'Facilities'])
    await openValleyView(publicPage)
    await expect(publicPage.getByTestId('overview-available-space')).toContainText('500,000 SQF')
    await publicPage.setViewportSize({ width: 390, height: 844 })
    const mobileAvailable = publicPage.getByTestId('overview-available-space')
    await mobileAvailable.scrollIntoViewIfNeeded()
    expect(await mobileAvailable.evaluate((element) => {
      const style = getComputedStyle(element)
      return style.borderWidth === '0px' && style.padding === '0px' && style.backgroundColor === 'rgba(0, 0, 0, 0)'
    })).toBe(true)
    expect(await publicPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true)
    const mobileOverviewScreenshot = testInfo.outputPath('availability-overview-mobile.png')
    await publicPage.screenshot({ path: mobileOverviewScreenshot })
    await testInfo.attach('availability-overview-mobile', { path: mobileOverviewScreenshot, contentType: 'image/png' })
    await publicPage.setViewportSize({ width: 1280, height: 900 })
    await refreshedPublicNavigation.getByRole('button', { name: 'Dashboard', exact: true }).click()
    await publicPage.getByRole('button', { name: 'Open facility 01 in Facilities' }).dispatchEvent('mouseover')
    await expect(publicPage.locator('[data-testid="dashboard-pin-preview"][data-facility-id="buena-park-valley-view"]').getByTestId('square-footage-available')).toHaveText('Available 500,000 SQF')
  } finally {
    await publicPage.close()
  }

  expect(consoleErrors).toEqual([])
})

test('administrator zero replaces a source snapshot in Overview and the generated PDF', async ({ page }) => {
  test.setTimeout(60_000)
  await useFlatMap(page)
  await page.goto('/')
  await signIn(page)
  const navigation = page.getByRole('navigation', { name: 'Primary navigation' })
  await navigation.getByRole('button', { name: 'Operations', exact: true }).click()
  const workbench = page.getByRole('region', { name: 'Operations facility space workbench' })
  await workbench.getByRole('button', { name: /Facility 05[\s\S]*Roanoke, TX/ }).click()
  const editor = workbench.getByRole('form', { name: `Update facility space for ${roanokeAddress}` })
  await expect(editor).toContainText('4,000 SQF')
  await expect(editor).toContainText('User-supplied snapshot')
  await editor.getByLabel('Available space').fill('0')
  await editor.getByLabel('Bulk').fill('1000')
  await editor.getByLabel('Rack').fill('10')
  await editor.getByRole('button', { name: 'Save facility space' }).click()
  await expect(editor.getByRole('status')).toHaveText('Facility space saved.')

  await navigation.getByRole('button', { name: 'Facilities', exact: true }).click()
  await page.getByRole('button', { name: `Select ${roanokeAddress}` }).click()
  await expect(page.getByTestId('overview-available-space')).toContainText('0 SQF')
  await expect(page.getByTestId('overview-square-footage')).toContainText('Administrator-maintained live portal value')
  await page.getByRole('tab', { name: 'Documents' }).click()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download facility profile PDF' }).click()
  const download = await downloadPromise
  const pdf = await PDFDocument.load(await download.createReadStream().then(async (stream) => {
    const chunks: Buffer[] = []
    for await (const chunk of stream) chunks.push(Buffer.from(chunk))
    return Buffer.concat(chunks)
  }))
  expect(pdf.getKeywords()).toContain('0 SQF')
  expect(pdf.getKeywords()).toContain('Administrator-maintained')

  await navigation.getByRole('button', { name: 'Dashboard', exact: true }).click()
  await page.getByRole('button', { name: 'Open facility 05 in Facilities' }).focus()
  await expect(page.locator('[data-testid="dashboard-pin-preview"][data-facility-id="roanoke-highway-114"]').getByTestId('square-footage-available')).toHaveText('Available 0 SQF')
})

test('admin saves one complete facility-space record while public Overview and map preview stay synchronized', async ({ browser, page }, testInfo) => {
  test.setTimeout(150_000)
  const consoleErrors: string[] = []
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()) })
  await useFlatMap(page)
  await page.goto('/')
  await signIn(page)
  const navigation = page.getByRole('navigation', { name: 'Primary navigation' })
  await navigation.getByRole('button', { name: 'Operations', exact: true }).click()
  const workbench = page.getByRole('region', { name: 'Operations facility space workbench' })
  await workbench.getByRole('button', { name: /Facility 08[\s\S]*Summerville, SC/ }).click()
  const editor = workbench.getByRole('form', { name: `Update facility space for ${summervilleAddress}` })
  await expect(editor.getByLabel('Available space')).toHaveValue('')
  await expect(editor.getByLabel('Bulk')).toHaveValue('70000')
  await expect(editor.getByLabel('Rack')).toHaveValue('0')
  await editor.getByLabel('Available space').fill('80000')
  await editor.getByLabel('Bulk').fill('25000')
  await editor.getByLabel('Rack').fill('700')
  await editor.getByRole('button', { name: 'Save facility space' }).click()
  await expect(editor.getByRole('status')).toHaveText('Facility space saved.')
  await expect(editor).toContainText('25,000 SQF')
  await expect(editor).toContainText('700 pallet positions')
  await expect(editor).toContainText('Available space80,000 SQF')

  const history = workbench.getByRole('region', { name: 'Change history' })
  const firstRecord = history.locator('tbody tr')
  await expect(firstRecord).toHaveCount(1)
  await expect(firstRecord).toContainText('Pending → 80,000 SQF')
  await expect(firstRecord).toContainText(/70,000 SQFsource snapshot → 25,000 SQF/)
  await expect(firstRecord).toContainText(/0 pallet positionssource snapshot → 700 pallet positions/)
  await expect(firstRecord).toContainText('IAM ID 2084344241143070722')
  await expect(firstRecord.getByRole('time')).toContainText('UTC')
  await expect(history.getByRole('button', { name: 'Previous history page' })).toBeDisabled()
  await expect(history.getByRole('button', { name: 'Next history page' })).toBeDisabled()

  const workbenchDesktop = testInfo.outputPath('bulk-rack-workbench-desktop.png')
  await page.screenshot({ path: workbenchDesktop, fullPage: true })
  await testInfo.attach('bulk-rack-workbench-desktop', { path: workbenchDesktop, contentType: 'image/png' })
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true)
  const workbenchMobile = testInfo.outputPath('bulk-rack-workbench-mobile.png')
  await page.screenshot({ path: workbenchMobile, fullPage: true })
  await testInfo.attach('bulk-rack-workbench-mobile', { path: workbenchMobile, contentType: 'image/png' })

  await page.setViewportSize({ width: 1536, height: 1024 })
  const publicPage = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  try {
    await useFlatMap(publicPage)
    await publicPage.goto('/')
    await publicPage.getByRole('button', { name: 'Facilities', exact: true }).click()
    await publicPage.getByRole('button', { name: `Select ${summervilleAddress}` }).click()
    await expect(publicPage.getByTestId('bulk-rack-bulk')).toHaveText('Bulk25,000 SQF')
    await expect(publicPage.getByTestId('bulk-rack-rack')).toHaveText('Rack700 pallet positions')

    await editor.getByLabel('Bulk').fill('0')
    await editor.getByRole('button', { name: 'Save facility space' }).click()
    await expect(editor.getByRole('status')).toHaveText('Facility space saved.')
    await expect(editor.getByLabel('Rack')).toHaveValue('700')
    await expect(history.locator('tbody tr')).toHaveCount(2)
    await expect(history.locator('tbody tr').first()).toContainText(/80,000 SQF.*→ 80,000 SQF/)
    await expect(history.locator('tbody tr').first()).toContainText(/25,000 SQF.*→ 0 SQF/)
    await expect(history.locator('tbody tr').first()).toContainText(/700 pallet positions.*→ 700 pallet positions/)
    await publicPage.reload()
    await publicPage.getByRole('button', { name: 'Facilities', exact: true }).click()
    await publicPage.getByRole('button', { name: `Select ${summervilleAddress}` }).click()
    await expect(publicPage.getByTestId('bulk-rack-bulk')).toHaveText('Bulk0 SQF')
    await expect(publicPage.getByTestId('bulk-rack-rack')).toHaveText('Rack700 pallet positions')

    await navigation.getByRole('button', { name: 'Facilities', exact: true }).click()
    await page.getByRole('button', { name: `Select ${summervilleAddress}` }).click()
    const bulkRack = page.getByTestId('bulk-rack')
    await expect(bulkRack.getByTestId('bulk-rack-bulk')).toHaveText('Bulk0 SQF')
    await expect(bulkRack.getByTestId('bulk-rack-rack')).toHaveText('Rack700 pallet positions')
    await expect(bulkRack).toContainText('Administrator-maintained live portal values.')
    await bulkRack.scrollIntoViewIfNeeded()
    const overviewDesktop = testInfo.outputPath('bulk-rack-overview-desktop.png')
    await page.screenshot({ path: overviewDesktop })
    await testInfo.attach('bulk-rack-overview-desktop', { path: overviewDesktop, contentType: 'image/png' })

    await page.getByRole('tab', { name: 'Documents' }).click()
    const profileDownload = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Download facility profile PDF' }).click()
    const profile = await profileDownload
    const profilePdf = await PDFDocument.load(await profile.createReadStream().then(async (stream) => {
      const chunks: Buffer[] = []
      for await (const chunk of stream) chunks.push(Buffer.from(chunk))
      return Buffer.concat(chunks)
    }))
    expect(profilePdf.getKeywords()).toContain('0 SQF')
    expect(profilePdf.getKeywords()).toContain('700 pallet positions')

    await navigation.getByRole('button', { name: 'Dashboard', exact: true }).click()
    await page.getByRole('button', { name: 'Open facility 08 in Facilities' }).focus()
    const preview = page.locator('[data-testid="dashboard-pin-preview"][data-facility-id="summerville-cypress-tradeport"]')
    await expect(preview.getByTestId('square-footage-available')).toHaveText('Available 80,000 SQF')
    await expect(preview.getByTestId('square-footage-bulk')).toHaveText('Bulk: 0 SQF')
    await expect(preview.getByTestId('square-footage-rack')).toHaveText('Rack: 700 pallet positions')
    const previewDesktop = testInfo.outputPath('bulk-rack-map-preview-desktop.png')
    await page.screenshot({ path: previewDesktop })
    await testInfo.attach('bulk-rack-map-preview-desktop', { path: previewDesktop, contentType: 'image/png' })

    await publicPage.setViewportSize({ width: 390, height: 844 })
    expect(await publicPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true)
    await publicPage.getByTestId('bulk-rack').scrollIntoViewIfNeeded()
    const overviewMobile = testInfo.outputPath('bulk-rack-overview-mobile.png')
    await publicPage.screenshot({ path: overviewMobile })
    await testInfo.attach('bulk-rack-overview-mobile', { path: overviewMobile, contentType: 'image/png' })

    await navigation.getByRole('button', { name: 'Operations', exact: true }).click()
    await workbench.getByRole('button', { name: /Facility 08[\s\S]*Summerville, SC/ }).click()
    await page.setViewportSize({ width: 390, height: 844 })
    for (let save = 0; save < 10; save += 1) {
      await expect(editor.getByRole('button', { name: 'Save facility space' })).toBeEnabled()
      const response = page.waitForResponse((candidate) => candidate.url().includes('/api/admin/facility-space/summerville-cypress-tradeport') && candidate.request().method() === 'POST')
      await editor.getByRole('button', { name: 'Save facility space' }).click()
      expect((await response).ok()).toBe(true)
    }
    await expect(history).toContainText('12 records')
    await expect(history.locator('tbody tr')).toHaveCount(10)
    await expect(history.getByRole('button', { name: 'Next history page' })).toBeEnabled()
    await history.getByRole('button', { name: 'Next history page' }).click()
    await expect(history).toContainText('Page 2 of 2')
    await expect(history.locator('tbody tr')).toHaveCount(2)
    await expect(history.getByRole('button', { name: 'Previous history page' })).toBeEnabled()
    const historyWrap = history.locator('.history-table-wrap')
    await historyWrap.scrollIntoViewIfNeeded()
    expect(await historyWrap.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true)
    expect(await history.locator('tbody tr').first().locator('td').evaluateAll((cells) => cells.every((cell) => cell.scrollWidth <= cell.clientWidth + 1))).toBe(true)
    const historyMobile = testInfo.outputPath('facility-space-history-mobile.png')
    await page.screenshot({ path: historyMobile })
    await testInfo.attach('facility-space-history-mobile', { path: historyMobile, contentType: 'image/png' })
    const updaterCell = history.locator('tbody tr').first().locator('td').last()
    await historyWrap.evaluate((element) => {
      const lastCell = element.querySelector('tbody tr td:last-child') as HTMLElement
      element.scrollLeft += lastCell.getBoundingClientRect().right - element.getBoundingClientRect().right
    })
    await expect.poll(() => historyWrap.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0)
    const updaterBounds = await updaterCell.evaluate((cell) => {
      const cellBox = cell.getBoundingClientRect()
      const wrapBox = cell.closest('.history-table-wrap')!.getBoundingClientRect()
      return { cellLeft: cellBox.left, cellRight: cellBox.right, wrapLeft: wrapBox.left, wrapRight: wrapBox.right }
    })
    expect(updaterBounds.cellLeft).toBeGreaterThanOrEqual(updaterBounds.wrapLeft - 1)
    expect(updaterBounds.cellRight).toBeLessThanOrEqual(updaterBounds.wrapRight + 1)
    const historyMobileRight = testInfo.outputPath('facility-space-history-mobile-right.png')
    await page.screenshot({ path: historyMobileRight })
    await testInfo.attach('facility-space-history-mobile-right', { path: historyMobileRight, contentType: 'image/png' })
  } finally {
    await publicPage.close()
  }
  expect(consoleErrors).toEqual([])
})
