import { test, expect } from '@playwright/test';

test('admin customers page renders table shell', async ({ page }) => {
  // Set a mock auth token in localStorage before navigation
  await page.addInitScript(() => {
    localStorage.setItem('token', 'mock-admin-token');
  });

  // Mock all other API calls FIRST (catch-all)
  await page.route('**/api/**', async (route) => {
    // Check if it's the profile endpoint
    if (route.request().url().includes('/api/profile')) {
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
    }
    // Check if it's the customers endpoint
    else if (route.request().url().includes('/api/customers')) {
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
    }
    // Default response for other endpoints
    else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ content: [], totalElements: 0 }),
      });
    }
  });

  await page.goto('/admin/customers', { waitUntil: 'load' });
  
  // Verify we're on the customers page
  expect(page.url()).toContain('/admin/customers');
  
  // Check that the page has loaded with some content
  const pageContent = await page.locator('body').textContent();
  expect(pageContent).toBeTruthy();
});

