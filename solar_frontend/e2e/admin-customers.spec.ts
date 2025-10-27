import { test, expect } from '@playwright/test';

test('admin customers page renders table shell', async ({ page }) => {
  // Set a mock auth token in localStorage before navigation
  await page.addInitScript(() => {
    localStorage.setItem('token', 'mock-admin-token');
  });

  // Mock the user profile API endpoint
  await page.route('**/api/profile', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'admin-1',
        email: 'admin@test.com',
        fullName: 'Test Admin',
        role: 'ADMIN',
        passwordChangeRequired: false,
      }),
    });
  });

  // Mock the customer list API endpoint
  await page.route('**/api/customers**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        content: [],
        number: 0,
        size: 10,
        totalElements: 0,
        totalPages: 0,
      }),
    });
  });

  await page.goto('/admin/customers');
  
  // Wait for the main heading to be visible
  await expect(page.getByRole('heading', { name: 'Customer Management' })).toBeVisible();
  
  // Check that the search input is visible
  await expect(page.getByPlaceholder('Search by name or email...')).toBeVisible();
  
  // Check that the breadcrumb shows "Customers"
  await expect(page.getByText('Customers').last()).toBeVisible();
});

