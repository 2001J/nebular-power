import { test, expect } from '@playwright/test';

test('admin customers page renders table shell', async ({ page }) => {
  await page.goto('/admin/customers');
  
  // Wait for the main heading to be visible
  await expect(page.getByRole('heading', { name: 'Customer Management' })).toBeVisible();
  
  // Check that the search input is visible
  await expect(page.getByPlaceholder('Search by name or email...')).toBeVisible();
  
  // Check that the breadcrumb shows "Customers"
  await expect(page.getByText('Customers').last()).toBeVisible();
});

