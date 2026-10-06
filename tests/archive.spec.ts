import { expect, test, type Page } from '@playwright/test'

const roanokeAddress = '1230 W Highway 114, Roanoke, TX 76262'

async function useFlatMap(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('locations-theme', 'light')
    localStorage.setItem('dashboard-projection-v1', 'map')
  })
}

async function signIn(page: Page) {
  await page.getByRole('button', { name: 'WISE sign in' }).click()
  const dialog = page.getByRole('dialog', { name: 'Administrator sign in' })
  await dialog.getByLabel('WISE username').fill('lmadala')
  await dialog.getByLabel('Password').fill('test-password')
  await dialog.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(dialog).toBeHidden()
}

async function expectNetworkSize(page: Page, size: number) {
  await expect(page.locator('.overview-metrics b').first()).toHaveText(String(size))
  await expect(page.locator('.location-pin')).toHaveCount(size)
  await expect(page.locator('tbody tr')).toHaveCount(size)
}

// Leaves Roanoke restored even when an assertion fails part-way, since other specs expect all 29 facilities.
async function restoreRoanoke(page: Page) {
  await page.evaluate(async () => {
    const session = await fetch('/api/auth/session', { cache: 'no-store' }).then((response) => response.json()) as { csrfToken?: string }
    const admin = await fetch('/api/admin/archive', { cache: 'no-store' }).then((response) => response.json()) as { facilities: { facilityId: string; archived: boolean; version: number }[] }
    const record = admin.facilities.find((entry) => entry.facilityId === 'roanoke-highway-114')
    if (!session.csrfToken || !record?.archived) return
    await fetch('/api/admin/archive/roanoke-highway-114', {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-csrf-token': session.csrfToken },
      body: JSON.stringify({ archived: false, version: record.version }),
    })
  })
}

test('an administrator archives a facility from Operations for every viewer, then restores it', async ({ page, browser }) => {
  test.setTimeout(90_000)
  await useFlatMap(page)
  await page.goto('/')
  await signIn(page)

  const viewerContext = await browser.newContext()
  const viewer = await viewerContext.newPage()
  try {
    await page.getByRole('navigation', { name: 'Primary navigation' }).getByRole('button', { name: 'Operations', exact: true }).click()
    const workbench = page.getByRole('region', { name: 'Operations facility space workbench' })
    await workbench.getByRole('complementary', { name: 'Select a facility' }).getByRole('button', { name: /Roanoke, TX/ }).click()
    const panel = workbench.getByRole('region', { name: `Archive status for ${roanokeAddress}` })
    await expect(panel).toContainText('In the live network.')

    // Archiving asks for confirmation first, and Cancel leaves the facility live.
    await panel.getByRole('button', { name: 'Archive facility' }).click()
    await panel.getByRole('group', { name: 'Confirm archive' }).getByRole('button', { name: 'Cancel' }).click()
    await expect(panel.getByRole('group', { name: 'Confirm archive' })).toHaveCount(0)
    await panel.getByRole('button', { name: 'Archive facility' }).click()
    await panel.getByRole('button', { name: 'Confirm archive' }).click()
    await expect(panel.getByRole('status')).toHaveText('Facility archived. It is now hidden from the live network for every viewer.')
    await expect(panel).toContainText('by Lalith Madala')
    await expect(panel.getByRole('button', { name: 'Restore facility' })).toBeVisible()
    await expect(workbench.getByRole('button', { name: /Roanoke, TX/ })).toContainText('Archived')
    const history = workbench.getByRole('region', { name: 'Archive history' })
    await expect(history.locator('tbody tr')).toHaveCount(1)
    await expect(history.locator('tbody tr').first()).toContainText('Archived')
    await expect(history.locator('tbody tr').first()).toContainText('Lalith Madala')

    // A separate anonymous viewer sees the facility leave the live network, and finds it under the Archived filter.
    await useFlatMap(viewer)
    await viewer.goto('/')
    await expectNetworkSize(viewer, 28)
    await expect(viewer.getByRole('button', { name: `Select ${roanokeAddress}` })).toHaveCount(0)
    await viewer.getByLabel('Filter by status').selectOption('Archived')
    await expect(viewer.locator('tbody tr')).toHaveCount(1)
    await expect(viewer.getByText('1 of 1 archived', { exact: true })).toBeVisible()
    await viewer.getByRole('button', { name: `Select ${roanokeAddress}` }).click()
    await expect(viewer.getByTestId('archived-banner')).toContainText('by Lalith Madala')
    await expect(viewer.getByTestId('archived-status')).toContainText('An administrator can restore it from the Operations workspace.')

    // Restoring returns it to the live network.
    await panel.getByRole('button', { name: 'Restore facility' }).click()
    await panel.getByRole('button', { name: 'Confirm restore' }).click()
    await expect(panel.getByRole('status')).toHaveText('Facility restored to the live network.')
    await expect(history.locator('tbody tr')).toHaveCount(2)
    await expect(history.locator('tbody tr').first()).toContainText('Restored')
    await viewer.reload()
    await expectNetworkSize(viewer, 29)
  } finally {
    await restoreRoanoke(page)
    await viewerContext.close()
  }
})

test('the archive controls are not reachable without administrator sign-in', async ({ page }) => {
  await useFlatMap(page)
  await page.goto('/')
  await expect(page.getByRole('navigation', { name: 'Primary navigation' }).getByRole('button', { name: 'Operations', exact: true })).toHaveCount(0)
  expect((await page.request.get('/api/admin/archive')).status()).toBe(401)
  expect((await page.request.post('/api/admin/archive/roanoke-highway-114', { data: { archived: true, version: 0 } })).status()).toBe(401)
})
