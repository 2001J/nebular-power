import { test, expect } from '@playwright/test';

test('admin customers page renders table shell', async ({ page }) => {
  await page.goto('/admin/customers');
  await expect(page.getByText('Customers')).toBeVisible();
  // Basic UI bits visible
  await expect(page.getByPlaceholder('Search customers...')).toBeVisible();
});

