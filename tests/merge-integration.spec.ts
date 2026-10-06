import { expect, test } from '@playwright/test'
import { PDFDocument } from 'pdf-lib'
import { facilityOperations, facilitiesNeedingOperationsContactReview } from '../server/data/facility-operations'

const houstonAddress = '3401 Navigation Blvd, Houston, TX 77003'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('locations-theme', 'light')
    localStorage.setItem('dashboard-projection-v1', 'map')
  })
  await page.route('**/api/auth/session', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ authenticated: false }) }))
  await page.route('**/api/availability', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ availability: [{ facilityId: 'houston-navigation', squareFeet: 0 }] }) }))
  await page.route('**/api/bulk-rack', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ bulkRack: [{ facilityId: 'houston-navigation', bulkSquareFeet: 0, rackPalletPositions: 12 }] }) }))
  await page.route('**/api/operations/*', (route) => {
    const path = new URL(route.request().url()).pathname
    const facilityId = decodeURIComponent(path.slice('/api/operations/'.length))
    if (facilityId.startsWith('portraits/')) return route.fulfill({ status: 404 })
    const operations = facilityOperations[facilityId]
    const reviewRequired = (facilitiesNeedingOperationsContactReview as readonly string[]).includes(facilityId)
    return route.fulfill({
      status: operations || reviewRequired ? 200 : 404,
      contentType: 'application/json',
      body: JSON.stringify({ operations: operations ?? null, reviewRequired }),
    })
  })
})

test('public merged views preserve server contacts, zero overrides, Client Base, PDF contacts, and Archived filtering', async ({ page }) => {
  await page.goto('/')
  const navigation = page.getByRole('navigation', { name: 'Primary navigation' })
  await expect(navigation.getByRole('button')).toHaveText(['Dashboard', 'Facilities'])
  await page.getByRole('button', { name: `Select ${houstonAddress}` }).click()

  await expect(page.getByTestId('overview-available-space')).toHaveText('0 SQF')
  await expect(page.getByTestId('bulk-rack-bulk')).toHaveText('Bulk0 SQF')
  await expect(page.getByTestId('bulk-rack-rack')).toHaveText('Rack12 pallet positions')

  const tabs = page.getByRole('tablist', { name: 'Facility details' })
  await expect(tabs.getByRole('tab')).toHaveText(['Overview', 'Site Plan', 'Photos', 'Documents', 'Operations', 'Client Base'])
  await tabs.getByRole('tab', { name: 'Operations' }).click()
  const operations = page.getByRole('region', { name: `Operations contacts for ${houstonAddress}` })
  await expect(operations).toContainText('Michelle Topete')
  await expect(operations).toContainText('Mary Smothers')
  await expect(operations).toContainText('Jessica Barajas')
  await expect(operations.getByTestId('client-base')).toHaveCount(0)

  await tabs.getByRole('tab', { name: 'Client Base' }).click()
  await expect(page.getByTestId('client-base').locator('li')).not.toHaveCount(0)

  await tabs.getByRole('tab', { name: 'Documents' }).click()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download facility profile PDF' }).click()
  const download = await downloadPromise
  const stream = await download.createReadStream()
  const chunks: Buffer[] = []
  for await (const chunk of stream) chunks.push(Buffer.from(chunk))
  const pdf = await PDFDocument.load(Buffer.concat(chunks))
  expect(pdf.getKeywords()).toContain('Jessica Barajas')
  expect(pdf.getKeywords()).toContain('0 SQF')
  expect(pdf.getKeywords()).toContain('Administrator-maintained')

  await page.getByRole('button', { name: 'All facilities' }).click()
  await page.getByLabel('Filter by status').selectOption('Archived')
  await expect(page.locator('tbody tr')).toHaveCount(0)
  await expect(page.getByText('0 of 0 archived', { exact: true })).toBeVisible()
})

test('narrated Preview exposes working controls and serves generated audio', async ({ page }) => {
  const clip = await page.request.get('/narration/06a03d4da0286dfb.mp3')
  expect(clip.ok()).toBe(true)
  expect(clip.headers()['content-type']).toContain('audio')

  await page.goto('/?previewSpeed=20&previewFps=6')
  await page.getByRole('button', { name: 'Dashboard', exact: true }).click()
  await page.getByRole('button', { name: 'Preview' }).click()
  const preview = page.getByTestId('preview-tour')
  await expect(preview).toBeVisible()
  await expect(page.getByRole('button', { name: 'Mute narration' })).toBeVisible()
  await page.getByRole('button', { name: 'Mute narration' }).click()
  await expect(page.getByRole('button', { name: 'Unmute narration' })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Stop preview' }).click()
  await expect(preview).toBeHidden()
})
