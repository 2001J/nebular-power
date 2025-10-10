import { describe, expect, test, vi, beforeEach } from 'vitest';
import { complianceApi } from '@/lib/api/compliance';

const makeApiRequestMock = vi.fn();

vi.mock('@/lib/api/client', () => ({
  makeApiRequest: (fn: any) => makeApiRequestMock(fn),
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock('@/lib/api/installations', () => ({
  installationApi: {
    getAllInstallations: vi.fn().mockResolvedValue({ content: [{ id: 'i1' }] }),
  },
}));

vi.mock('@/lib/api/paymentCompliance', () => ({
  paymentComplianceApi: {
    getPaymentsDueReport: vi.fn().mockResolvedValue([{ id: 'pd1' }]),
  },
}));

vi.mock('@/lib/api/security', () => ({
  securityApi: {
    getUnresolvedEvents: vi.fn().mockResolvedValue([{ id: 'se1' }]),
  },
}));

vi.mock('@/lib/api/serviceControl', () => ({
  serviceControlApi: {
    getCurrentStatus: vi.fn().mockResolvedValue({ status: 'OK', lastUpdated: '2024-01-01', issues: [] }),
  },
}));

vi.mock('@/lib/api/user', () => ({
  userApi: {
    getActivityLogs: vi.fn().mockResolvedValue({ content: [{ id: 'a1', activityType: 'INFO', timestamp: '2024-01-01' }] }),
  },
}));

describe('complianceApi', () => {
  beforeEach(() => makeApiRequestMock.mockReset());

  test('getComprehensiveReport routes by type', async () => {
    makeApiRequestMock.mockResolvedValueOnce([{ id: 'se1' }]);
    const security = await complianceApi.getComprehensiveReport('security');
    expect(Array.isArray(security)).toBe(true);

    makeApiRequestMock.mockResolvedValueOnce([{ id: 'pd1' }]);
    const payments = await complianceApi.getComprehensiveReport('payment');
    expect(Array.isArray(payments)).toBe(true);

    // installation path uses installationApi + serviceControlApi; no direct makeApiRequest
    const installation = await complianceApi.getComprehensiveReport('installation');
    expect(Array.isArray(installation)).toBe(true);

    // activity path uses makeApiRequest first, then userApi fallback on failure
    makeApiRequestMock.mockResolvedValueOnce({ content: [{ id: 'a2', activityType: 'INFO', timestamp: '2024-01-02' }] });
    const activity = await complianceApi.getComprehensiveReport('activity');
    expect(Array.isArray(activity)).toBe(true);
  });

  test('generateComplianceReport falls back on error', async () => {
    makeApiRequestMock.mockRejectedValueOnce(new Error('fail'));
    const res = await complianceApi.generateComplianceReport('security', 'json', '2024-01-01', '2024-01-31');
    expect(res).toHaveProperty('success', true);
    expect(res).toHaveProperty('reportType', 'security');
  });
});
