import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4191',
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
  webServer: {
    command: 'npm run preview -- --host 0.0.0.0 --port 4191 --strictPort',
    url: 'http://127.0.0.1:4191',
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
