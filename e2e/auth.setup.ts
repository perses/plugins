import { test as setup } from '@playwright/test';

setup('authenticate', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel(/username/i).fill('admin');
  await page.getByLabel(/password/i).fill('password');
  await page.getByRole('button', { name: /Sign in/i }).click();
  // Save storage state to a file
  await page.context().storageState({ path: 'playwright/.auth/user.json' });
});
