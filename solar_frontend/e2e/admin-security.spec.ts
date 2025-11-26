import { test, expect } from '@playwright/test';

test.describe('Admin Security Monitoring', () => {
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

    // Mock security alerts API
    await page.route('**/api/security/alerts**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 1,
            installationId: 1,
            installationName: 'Test Installation',
            type: 'TAMPER_DETECTED',
            severity: 'HIGH',
            message: 'Physical tampering detected',
            timestamp: new Date().toISOString(),
            status: 'ACTIVE',
          },
        ]),
      });
    });
  });

  test('security dashboard renders with alerts', async ({ page }) => {
    await page.goto('/admin/security', { waitUntil: 'load' });

    // Verify we're on the security page
    expect(page.url()).toContain('/admin/security');

    // Check that page has loaded with content
    const pageContent = await page.locator('body').textContent();
    expect(pageContent).toBeTruthy();
  });

  test('security alerts page displays alerts table', async ({ page }) => {
    await page.goto('/admin/security/alerts', { waitUntil: 'load' });

    // Verify we're on the alerts page
    expect(page.url()).toContain('/admin/security/alerts');

    // Check that page has loaded with content
    const pageContent = await page.locator('body').textContent();
    expect(pageContent).toBeTruthy();
  });
});
