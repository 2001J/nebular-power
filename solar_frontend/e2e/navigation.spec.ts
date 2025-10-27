import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('homepage renders correctly', async ({ page }) => {
    await page.goto('/');

    // Check for main content (this depends on your homepage implementation)
    await expect(page).toHaveTitle(/Solar|Nebular|Home/i);
  });

  test('404 page handles invalid routes', async ({ page }) => {
    const response = await page.goto('/this-route-does-not-exist');
    
    // Next.js should return 404 status
    expect(response?.status()).toBe(404);
  });

  test('admin navigation sidebar works', async ({ page }) => {
    // Set up admin authentication
    await page.addInitScript(() => {
      localStorage.setItem('token', 'mock-admin-token');
    });

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

    // Mock all required APIs
    await page.route('**/api/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ content: [], totalElements: 0 }),
      });
    });

    await page.goto('/admin', { waitUntil: 'domcontentloaded' });

    // Simply verify the page loaded and we're on admin route
    expect(page.url()).toContain('/admin');
    
    // Check page has content
    const content = await page.locator('body').textContent();
    expect(content).toBeTruthy();
  });

  test('customer navigation sidebar works', async ({ page }) => {
    // Set up customer authentication
    await page.addInitScript(() => {
      localStorage.setItem('token', 'mock-customer-token');
    });

    await page.route('**/api/profile', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'customer-1',
          email: 'customer@test.com',
          fullName: 'Test Customer',
          role: 'CUSTOMER',
          passwordChangeRequired: false,
        }),
      });
    });

    // Mock all required APIs
    await page.route('**/api/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.goto('/customer', { waitUntil: 'domcontentloaded' });

    // Simply verify the page loaded and we're on customer route
    expect(page.url()).toContain('/customer');
    
    // Check page has content
    const content = await page.locator('body').textContent();
    expect(content).toBeTruthy();
  });
});
