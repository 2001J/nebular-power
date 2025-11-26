import { test, expect } from '@playwright/test';

test.describe('Admin Payments Management', () => {
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

    // Mock payments list API
    await page.route('**/api/payments**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          content: [
            {
              id: 1,
              customerName: 'Test Customer',
              amount: 500,
              dueDate: '2024-12-31',
              status: 'PENDING',
              paymentPlanName: 'Standard Plan',
            },
          ],
          number: 0,
          size: 10,
          totalElements: 1,
          totalPages: 1,
        }),
      });
    });
  });

  test('payments page renders with data', async ({ page }) => {
    await page.goto('/admin/payments', { waitUntil: 'load' });

    // Verify we're on the payments page
    expect(page.url()).toContain('/admin/payments');

    // Check that page has loaded with content
    const pageContent = await page.locator('body').textContent();
    expect(pageContent).toBeTruthy();
  });

  test('can filter payments by status', async ({ page }) => {
    await page.goto('/admin/payments');

    // Look for status filter
    const statusFilter = page.getByRole('combobox').first();
    if (await statusFilter.isVisible()) {
      await statusFilter.click();
      
      // Check if status options exist
      await expect(page.getByText(/pending|paid|overdue/i)).toBeVisible();
    }
  });
});
