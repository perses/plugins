import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // Look for .spec.ts files in any plugin's e2e subfolder
  testDir: './',
  testMatch: '**/e2e/**/*.spec.ts',
  fullyParallel: false, // Set to false to prevent plugin attachment conflicts
  reporter: 'html',
  use: {
    // Standard Perses Core URL
    baseURL: process.env.PERSES_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], storageState: 'playwright/.auth/user.json' },
      dependencies: ['setup'],
    },
  ],
});
