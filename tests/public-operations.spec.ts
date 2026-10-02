import { expect, test, type Locator, type Page } from '@playwright/test'

const valleyViewAddress = '6800 Valley View St., Buena Park, CA 90620'

async function openPublicOperations(page: Page) {
  await page.getByRole('button', { name: 'Facilities', exact: true }).click()
  await page.getByRole('button', { name: `Select ${valleyViewAddress}` }).click()
  const tabs = page.getByRole('tablist', { name: 'Facility details' })
  await expect(tabs.getByRole('tab')).toHaveText(['Overview', 'Site Plan', 'Photos', 'Documents', 'Operations'])
  await tabs.getByRole('tab', { name: 'Operations' }).click()
  return page.getByRole('region', { name: `Operations contacts for ${valleyViewAddress}` })
}

async function expectCardFits(card: Locator) {
  await card.scrollIntoViewIfNeeded()
  const layout = await card.evaluate((element) => ({
    cardWidth: element.getBoundingClientRect().width,
    viewportWidth: document.documentElement.clientWidth,
    horizontalClipping: element.scrollWidth > element.clientWidth + 1,
  }))
  expect(layout.cardWidth).toBeLessThanOrEqual(layout.viewportWidth)
  expect(layout.horizontalClipping).toBe(false)
}

test('anonymous visitors can read facility contacts and portraits while admin surfaces remain protected', async ({ page }, testInfo) => {
  test.setTimeout(45_000)
  const consoleErrors: string[] = []
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()) })
  await page.addInitScript(() => {
    localStorage.setItem('locations-theme', 'light')
    localStorage.setItem('dashboard-projection-v1', 'map')
  })
  await page.goto('/')

  const navigation = page.getByRole('navigation', { name: 'Primary navigation' })
  await expect(navigation.getByRole('button')).toHaveText(['Dashboard', 'Facilities'])
  const panel = await openPublicOperations(page)
  await expect(panel.locator('.operations-contact-card')).toHaveCount(5)

  const expectedContacts = [
    ['Michelle Topete', 'Manager of Account Management & Client Onboarding', 'michelle.topete@unisco.com'],
    ['Mary Smothers', 'Sr Director of Account Management & Client Onboarding', 'mary.smothers@unisco.com'],
    ['Ruben Jauregui', 'General Manager', 'ruben.jauregui@unisco.com'],
    ['Mark Tuttle', 'Director of Operations', 'mark.tuttle@unisco.com'],
    ['John Diaz', 'Sr. Vice President of Operations', 'john.diaz@unisco.com'],
  ] as const
  for (const [name, role, email] of expectedContacts) {
    const card = panel.locator('.operations-contact-card').filter({ hasText: email })
    await expect(card).toContainText(name)
    await expect(card.locator('.operations-contact-role')).toHaveText(role)
    await expect(card.getByRole('link', { name: email })).toHaveAttribute('href', `mailto:${email}`)
    await expectCardFits(card)
  }

  for (const name of ['Michelle Topete', 'Mary Smothers', 'Ruben Jauregui', 'Mark Tuttle', 'John Diaz']) {
    const portrait = panel.getByRole('img', { name: `Portrait of ${name}` })
    await portrait.scrollIntoViewIfNeeded()
    await expect.poll(() => portrait.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0 && image.naturalHeight > 0)).toBe(true)
  }

  const customers = panel.getByTestId('top-customers')
  await expect(customers.locator('li')).toHaveCount(20)
  await expect(customers.locator('li').first()).toHaveText('1GURUNANDA, LLC')
  await expect(customers.locator('li').last()).toHaveText('20DUPRAY USA LLC')
  await expect(customers).toContainText('Ranked as listed for location 889 · SNA.')

  expect((await page.request.get('/api/operations/not-a-facility')).status()).toBe(404)
  expect((await page.request.get('/api/operations/portraits/not-allowlisted.png')).status()).toBe(404)
  expect((await page.request.get('/api/admin/availability')).status()).toBe(401)
  expect((await page.request.get('/api/admin/availability/history')).status()).toBe(401)
  expect((await page.request.get('/api/admin/access')).status()).toBe(401)

  const desktopScreenshot = testInfo.outputPath('public-operations-desktop.png')
  await page.screenshot({ path: desktopScreenshot, fullPage: true })
  await testInfo.attach('public-operations-desktop', { path: desktopScreenshot, contentType: 'image/png' })

  await page.setViewportSize({ width: 390, height: 844 })
  await expect(panel).toBeVisible()
  for (const card of await panel.locator('.operations-contact-card').all()) await expectCardFits(card)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true)
  const mobileScreenshot = testInfo.outputPath('public-operations-mobile.png')
  await page.screenshot({ path: mobileScreenshot, fullPage: true })
  await testInfo.attach('public-operations-mobile', { path: mobileScreenshot, contentType: 'image/png' })

  expect(consoleErrors).toEqual([])
})
