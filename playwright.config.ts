import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  globalSetup: './tests/global-setup.ts',
  timeout: 30_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4211',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: {
      // Headless Chromium has no GPU; SwiftShader provides the WebGL the 3D globe needs.
      args: ['--enable-unsafe-swiftshader'],
      ...(process.env.PLAYWRIGHT_CHROME_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROME_PATH } : {}),
    },
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1536, height: 1024 } } },
  ],
  webServer: [
    { command: 'NODE_ENV=test FACILITY_FAKE_IAM_ENABLED=true tsx server/fake-iam.ts', url: 'http://127.0.0.1:4212/health', reuseExistingServer: false, timeout: 30_000 },
    {
      command: 'DATABASE_SCHEMA=facility_network_e2e PORT=4211 PUBLIC_ORIGIN=http://127.0.0.1:4211 ITEMGPT_BASE_URL=http://127.0.0.1:4212 WMS_API_BASE_URL=http://127.0.0.1:4212 WMS_SERVICE_USERNAME=fake-service WMS_SERVICE_PASSWORD=test-password npm run start',
      url: 'http://127.0.0.1:4211/api/health', reuseExistingServer: false, timeout: 120_000,
    },
  ],
})
