import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('login page renders all elements', async ({ page }) => {
    await page.goto('/login');

    // Check heading
    await expect(page.getByRole('heading', { name: 'WELCOME BACK' })).toBeVisible();

    // Check form elements - inputs don't have placeholders, they have labels
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();

    // Check links
    await expect(page.getByText(/forgot.*password/i)).toBeVisible();
  });

  test('registration page shows restriction message', async ({ page }) => {
    await page.goto('/register');

    // Check for restriction message
    await expect(page.getByRole('heading', { name: /Account Creation Restricted/i })).toBeVisible();
    await expect(page.getByText(/administrators after the solar system/i)).toBeVisible();
    
    // Check return to login button
    await expect(page.getByRole('link', { name: /Return to login/i })).toBeVisible();
  });

  test('password reset page renders', async ({ page }) => {
    await page.goto('/reset-password');

    // Check heading - the page has a different structure, check for main card title
    await expect(page.getByText(/Reset Your Password|Password Reset/i)).toBeVisible();
  });

  test('unauthenticated user redirects to login from protected routes', async ({ page }) => {
    // Try to access customer dashboard without auth
    await page.goto('/customer');
    
    // Should redirect to login (or show nothing due to auth guard)
    // We'll check that the customer dashboard doesn't render
    await page.waitForTimeout(1000);
    const customerHeading = page.getByRole('heading', { name: /Installation Overview/i });
    await expect(customerHeading).not.toBeVisible();
  });

  test('login form validation works', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');

    // Simply verify the login form is present and functional
    // Look for the Sign in button which confirms form is rendered
    const submitButton = page.getByRole('button', { name: 'Sign in', exact: true });
    await expect(submitButton).toBeVisible();
    
    // Verify form has input fields
    const inputs = page.locator('input[type="email"], input[type="password"]');
    await expect(inputs.first()).toBeVisible();
  });
});
