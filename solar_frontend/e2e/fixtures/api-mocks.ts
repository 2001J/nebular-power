import { Page } from '@playwright/test';

/**
 * Centralized API mocking utilities for E2E tests
 * This eliminates the need for a real backend server
 */

export interface MockUser {
  id: string;
  email: string;
  fullName: string;
  role: 'ADMIN' | 'CUSTOMER';
  passwordChangeRequired?: boolean;
}

export const mockUsers = {
  admin: {
    id: 'admin-1',
    email: 'admin@test.com',
    fullName: 'Test Admin',
    role: 'ADMIN' as const,
    passwordChangeRequired: false,
  },
  customer: {
    id: 'customer-1',
    email: 'customer@test.com',
    fullName: 'Test Customer',
    role: 'CUSTOMER' as const,
    passwordChangeRequired: false,
  },
};

/**
 * Mock authentication for a user
 */
export async function mockAuth(page: Page, user: MockUser) {
  // Set token in localStorage before navigation
  await page.addInitScript((token) => {
    localStorage.setItem('token', token);
  }, `mock-${user.role.toLowerCase()}-token`);

  // Mock the user profile endpoint
  await page.route('**/api/profile', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(user),
    });
  });
}

/**
 * Mock all API endpoints with empty/default responses
 * This prevents the app from trying to reach the real backend
 */
export async function mockAllApis(page: Page) {
  // Catch-all for any unmocked API calls
  await page.route('**/api/**', async (route) => {
    const url = route.request().url();
    
    // Default empty responses based on common patterns
    let response: any = { content: [], totalElements: 0 };
    
    if (url.includes('/customers')) {
      response = { content: [], number: 0, size: 10, totalElements: 0, totalPages: 0 };
    } else if (url.includes('/installations')) {
      response = [];
    } else if (url.includes('/payments')) {
      response = { content: [], number: 0, size: 10, totalElements: 0, totalPages: 0 };
    } else if (url.includes('/security')) {
      response = [];
    }
    
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response),
    });
  });

  // Mock monitoring endpoints
  await page.route('**/monitoring/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });
}

/**
 * Setup admin user with all API mocks
 */
export async function setupAdminAuth(page: Page) {
  await mockAuth(page, mockUsers.admin);
  await mockAllApis(page);
}

/**
 * Setup customer user with all API mocks
 */
export async function setupCustomerAuth(page: Page) {
  await mockAuth(page, mockUsers.customer);
  await mockAllApis(page);
}

/**
 * Mock specific data for testing
 */
export const mockData = {
  customers: (count = 1) => ({
    content: Array.from({ length: count }, (_, i) => ({
      id: `customer-${i + 1}`,
      fullName: `Test Customer ${i + 1}`,
      email: `customer${i + 1}@test.com`,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
    })),
    number: 0,
    size: 10,
    totalElements: count,
    totalPages: Math.ceil(count / 10),
  }),

  installations: (count = 1) => 
    Array.from({ length: count }, (_, i) => ({
      id: i + 1,
      name: `Installation ${i + 1}`,
      installedCapacityKW: 5.5,
      location: `Location ${i + 1}`,
      installationDate: '2024-01-15',
      status: 'ACTIVE',
      tamperDetected: false,
      type: 'RESIDENTIAL',
    })),

  payments: (count = 1) => ({
    content: Array.from({ length: count }, (_, i) => ({
      id: i + 1,
      customerName: `Customer ${i + 1}`,
      amount: 500 + i * 100,
      dueDate: '2024-12-31',
      status: 'PENDING',
      paymentPlanName: 'Standard Plan',
    })),
    number: 0,
    size: 10,
    totalElements: count,
    totalPages: Math.ceil(count / 10),
  }),

  securityAlerts: (count = 1) =>
    Array.from({ length: count }, (_, i) => ({
      id: i + 1,
      installationId: i + 1,
      installationName: `Installation ${i + 1}`,
      type: 'TAMPER_DETECTED',
      severity: 'HIGH',
      message: 'Physical tampering detected',
      timestamp: new Date().toISOString(),
      status: 'ACTIVE',
    })),
};
