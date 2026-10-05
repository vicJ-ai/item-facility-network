import { expect, test, type Page } from '@playwright/test'
import { facilities } from '../src/data/facilities'

test.use({ timezoneId: 'America/Los_Angeles', reducedMotion: 'reduce', viewport: { width: 1280, height: 800 } })
// Software WebGL is slow; globe start-up needs more time than the flat-map suites.
test.setTimeout(60_000)

async function openDashboardGlobe(page: Page, search = '') {
  await page.addInitScript(() => {
    if (!localStorage.getItem('locations-theme')) localStorage.setItem('locations-theme', 'light')
  })
  await page.goto(`/${search}`)
  await expect(page.getByRole('heading', { name: 'Facility directory' })).toBeVisible()
  await page.getByRole('button', { name: 'Dashboard', exact: true }).click()
  const globe = page.getByTestId('dashboard-globe')
  await expect(globe).toHaveAttribute('data-globe-ready', 'true', { timeout: 20_000 })
  return globe
}

test('Automatic quality resolves to Performance on a software renderer', async ({ page }) => {
  const globe = await openDashboardGlobe(page)
  await expect(globe).toHaveAttribute('data-quality-choice', 'auto')
  // Headless Chromium renders WebGL with SwiftShader, which the probe recognises as software.
  await expect(globe).toHaveAttribute('data-quality', 'performance')
  await expect(page.getByRole('button', { name: 'Globe quality: Automatic, currently Performance' })).toBeVisible()
})

test('a chosen quality applies at once, persists across reloads, and the menu closes on Esc or outside click', async ({ page }) => {
  const globe = await openDashboardGlobe(page)
  const toggle = page.locator('.quality-toggle')
  await toggle.click()
  const menu = page.getByRole('radiogroup', { name: 'Globe quality' })
  await expect(menu).toBeVisible()
  await expect(menu.getByRole('radio')).toHaveCount(4)
  await expect(menu.getByRole('radio', { name: /^Automatic/ })).toHaveAttribute('aria-checked', 'true')
  await expect(menu).toContainText('Currently Performance')

  await menu.getByRole('radio', { name: /^High/ }).click()
  await expect(globe).toHaveAttribute('data-quality', 'high')
  await expect(globe).toHaveAttribute('data-quality-choice', 'high')
  await expect(menu.getByRole('radio', { name: /^High/ })).toHaveAttribute('aria-checked', 'true')
  await page.keyboard.press('Escape')
  await expect(menu).toHaveCount(0)
  await expect(toggle).toBeFocused()

  await toggle.click()
  await menu.getByRole('radio', { name: /^Balanced/ }).click()
  await expect(globe).toHaveAttribute('data-quality', 'balanced')
  await page.mouse.click(640, 500)
  await expect(menu).toHaveCount(0)

  await page.reload()
  await page.getByRole('button', { name: 'Dashboard', exact: true }).click()
  await expect(page.getByTestId('dashboard-globe')).toHaveAttribute('data-quality', 'balanced', { timeout: 20_000 })
  expect(await page.evaluate(() => localStorage.getItem('globe-quality-v1'))).toBe('balanced')
})

test('the globe stays loaded across projection and view switches, without duplicate pins', async ({ page }) => {
  const globe = await openDashboardGlobe(page)
  // Tag the live stage element; the same element must come back, not a rebuilt one.
  await globe.evaluate((element) => { (element as HTMLElement & { tourTag?: string }).tourTag = 'original' })
  const tagOf = () => globe.evaluate((element) => (element as HTMLElement & { tourTag?: string }).tourTag ?? null)

  await page.getByRole('button', { name: 'Show flat map' }).click()
  await expect(globe).toBeHidden()
  await expect(page.locator('.location-marker-wrap')).toHaveCount(facilities.length)
  await expect(page.locator('.quality-toggle')).toHaveCount(0)
  await page.getByRole('button', { name: 'Show globe' }).click()
  await expect(globe).toBeVisible()
  await expect(globe).toHaveAttribute('data-globe-ready', 'true')
  await expect(globe.locator('.globe-pin')).toHaveCount(facilities.length)
  expect(await tagOf()).toBe('original')

  await page.getByRole('button', { name: 'Facilities', exact: true }).click()
  await expect(globe).toBeHidden()
  await page.getByRole('button', { name: 'Dashboard', exact: true }).click()
  await expect(globe).toBeVisible()
  expect(await tagOf()).toBe('original')
})

test('the quality menu steps aside during the Preview tour', async ({ page }) => {
  await openDashboardGlobe(page, '?previewSpeed=20&previewFps=6')
  await expect(page.locator('.quality-toggle')).toBeVisible()
  await page.getByRole('button', { name: 'Preview' }).click()
  await expect(page.getByTestId('preview-tour')).toBeVisible()
  await expect(page.locator('.quality-control')).toBeHidden()
})

test('the Preview tour loads coarser imagery while flying and full detail on arrival', async ({ page }) => {
  const globe = await openDashboardGlobe(page, '?previewFps=6')
  await page.getByRole('button', { name: 'Preview' }).click()
  // With reduced motion the tour cuts instead of flying, so flight detail never turns coarse.
  await expect(page.getByTestId('preview-tour')).toBeVisible()
  await expect.poll(() => page.getByTestId('preview-tour').getAttribute('data-preview-stop'), { timeout: 30_000 }).toBeTruthy()
  expect(await globe.getAttribute('data-flight-detail')).not.toBe('coarse')
})

test.describe('with motion', () => {
  test.use({ reducedMotion: 'no-preference' })

  test('flights switch to coarse imagery and arrivals restore full detail', async ({ page }) => {
    const globe = await openDashboardGlobe(page, '?previewFps=6')
    await page.getByRole('button', { name: 'Preview' }).click()
    await expect.poll(() => globe.getAttribute('data-flight-detail'), { timeout: 30_000 }).toBe('coarse')
    await expect.poll(() => globe.getAttribute('data-flight-detail'), { timeout: 30_000 }).toBe('full')
    await page.keyboard.press('Escape')
    await expect(page.getByTestId('preview-tour')).toHaveCount(0)
    await expect(globe).toHaveAttribute('data-flight-detail', 'full')
  })
})

test('?debug=perf shows the performance readout, and it is absent otherwise', async ({ page }) => {
  await openDashboardGlobe(page, '?debug=perf')
  const hud = page.getByTestId('perf-hud')
  await expect(hud).toBeVisible()
  await expect(hud).toContainText('fps')
  await expect(hud).toContainText('Quality Performance (auto)')
  await expect.poll(() => hud.textContent(), { timeout: 15_000 }).toMatch(/GPU \d/)

  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Facility directory' })).toBeVisible()
  await expect(page.getByTestId('perf-hud')).toHaveCount(0)
})
