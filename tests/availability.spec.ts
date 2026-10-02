import { expect, test } from '@playwright/test'
import { PDFDocument } from 'pdf-lib'

const valleyViewAddress = '6800 Valley View St., Buena Park, CA 90620'
const roanokeAddress = '1230 W Highway 114, Roanoke, TX 76262'

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

test('admin availability workflow updates both public surfaces while privileged navigation stays hidden publicly', async ({ browser, page }, testInfo) => {
  test.setTimeout(60_000)
  const consoleErrors: string[] = []
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
  const workbench = page.getByRole('region', { name: 'Operations availability workbench' })
  await expect(workbench.getByRole('heading', { name: 'Facility availability' })).toBeVisible()
  await expect(workbench.locator('.workbench-facilities > button')).toHaveCount(29)
  await expect(workbench.getByText('Pending', { exact: true }).first()).toBeVisible()

  const editor = workbench.getByRole('form', { name: `Update available space for ${valleyViewAddress}` })
  await editor.getByLabel('Available space').fill('123456')
  await editor.getByRole('button', { name: 'Save available space' }).click()
  await expect(editor.getByRole('status')).toHaveText('Available space saved.')
  await expect(editor).toContainText('123,456 SQF')

  const history = workbench.getByRole('region', { name: 'Change history' })
  await expect(history).toContainText('Pending → 123,456 SQF')
  await expect(history).toContainText('lmadala')
  await expect(history).toContainText('IAM ID 2084344241143070722')
  await expect(history.getByRole('time')).toContainText('UTC')
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
  await expect(overviewAvailability).toContainText('123,456 SQF')
  await expect(overviewAvailability).toContainText('Live portal value, separate from immutable building-capacity and site-plan facts.')

  await publicNavigation.getByRole('button', { name: 'Dashboard', exact: true }).click()
  await page.getByRole('button', { name: 'Open facility 01 in Facilities' }).dispatchEvent('mouseover')
  const preview = page.locator('[data-testid="dashboard-pin-preview"][data-facility-id="buena-park-valley-view"]')
  await expect(preview.getByTestId('square-footage-available')).toHaveText('Available 123,456 SQF')

  const publicPage = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  try {
    await useFlatMap(publicPage)
    await publicPage.goto('/')
    const refreshedPublicNavigation = publicPage.getByRole('navigation', { name: 'Primary navigation' })
    await expect(refreshedPublicNavigation.getByRole('button')).toHaveText(['Dashboard', 'Facilities'])
    await openValleyView(publicPage)
    await expect(publicPage.getByTestId('overview-available-space')).toContainText('123,456 SQF')
    await refreshedPublicNavigation.getByRole('button', { name: 'Dashboard', exact: true }).click()
    await publicPage.getByRole('button', { name: 'Open facility 01 in Facilities' }).dispatchEvent('mouseover')
    await expect(publicPage.locator('[data-testid="dashboard-pin-preview"][data-facility-id="buena-park-valley-view"]').getByTestId('square-footage-available')).toHaveText('Available 123,456 SQF')
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
  const workbench = page.getByRole('region', { name: 'Operations availability workbench' })
  await workbench.getByRole('button', { name: /Facility 05[\s\S]*Roanoke, TX/ }).click()
  const editor = workbench.getByRole('form', { name: `Update available space for ${roanokeAddress}` })
  await expect(editor).toContainText('4,000 SQF')
  await expect(editor).toContainText('User-supplied snapshot')
  await editor.getByLabel('Available space').fill('0')
  await editor.getByRole('button', { name: 'Save available space' }).click()
  await expect(editor.getByRole('status')).toHaveText('Available space saved.')

  await navigation.getByRole('button', { name: 'Facilities', exact: true }).click()
  await page.getByRole('button', { name: `Select ${roanokeAddress}` }).click()
  await expect(page.getByTestId('overview-available-space')).toContainText('0 SQF')
  await expect(page.getByTestId('overview-available-space')).toContainText('Administrator-maintained')
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
})
