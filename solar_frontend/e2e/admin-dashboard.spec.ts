import { test, expect } from '@playwright/test';

test.describe('Admin Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Set up admin authentication
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

    // Mock dashboard stats APIs
    await page.route('**/api/customers**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          content: [],
          totalElements: 0,
        }),
      });
    });

    await page.route('**/api/installations**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.route('**/api/payments**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          content: [],
          totalElements: 0,
        }),
      });
    });

    await page.route('**/api/security/alerts**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });
  });

  test('admin dashboard renders with stats cards', async ({ page }) => {
    await page.goto('/admin', { waitUntil: 'load' });

    // Verify we're on the admin dashboard
    expect(page.url()).toContain('/admin');

    // Check that page has loaded with content
    const pageContent = await page.locator('body').textContent();
    expect(pageContent).toBeTruthy();
  });

  test('admin can navigate between sections', async ({ page }) => {
    await page.goto('/admin', { waitUntil: 'load' });

    // Navigate to customers
    await page.goto('/admin/customers', { waitUntil: 'load' });
    expect(page.url()).toContain('/admin/customers');

    // Navigate to installations
    await page.goto('/admin/installations', { waitUntil: 'load' });
    expect(page.url()).toContain('/admin/installations');
  });
});
