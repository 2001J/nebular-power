import { describe, expect, test, vi, beforeEach } from 'vitest';
import { paymentApi } from '@/lib/api/payments';

const getMock = vi.fn();
const postMock = vi.fn();

vi.mock('@/lib/api/client', () => ({
  makeApiRequest: async (fn: any) => {
    // unwrap axios-like { data }
    const res = await fn();
    return res?.data;
  },
  apiClient: {
    get: (...args: any[]) => getMock(...args),
    post: (...args: any[]) => postMock(...args),
  },
}));

describe('paymentApi low coverage endpoints', () => {
  beforeEach(() => {
    getMock.mockReset();
    postMock.mockReset();
  });

  test('makePayment posts payload', async () => {
    postMock.mockResolvedValueOnce({ data: { ok: true } });
    const res = await paymentApi.makePayment({ amount: 10 });
    expect(res.ok).toBe(true);
    expect(postMock).toHaveBeenCalled();
    expect(postMock.mock.calls[0][0]).toBe('/api/payments/make-payment');
  });

  test('getUpcomingPayments returns list', async () => {
    getMock.mockResolvedValueOnce({ data: [{ id: 'p1' }] });
    const res = await paymentApi.getUpcomingPayments();
    expect(Array.isArray(res)).toBe(true);
  });

  test('getPaymentHistory passes pagination', async () => {
    getMock.mockResolvedValueOnce({ data: { content: [], number: 2, size: 5 } });
    const res = await paymentApi.getPaymentHistory(2, 5);
    expect(res.number).toBe(2);
    expect(res.size).toBe(5);
    expect(getMock.mock.calls[0][0]).toBe('/api/payments/history');
  });

  test('getPaymentDashboard success returns data', async () => {
    getMock.mockResolvedValueOnce({ data: { installationId: 'i1' } });
    const res = await paymentApi.getPaymentDashboard();
    expect(res.installationId).toBe('i1');
  });

  test('getPaymentDashboard 404 returns normalized empty dashboard', async () => {
    // Simulate makeApiRequest catch block receiving error with response.status
    // We achieve this by making apiClient.get throw; makeApiRequest passes it through
    getMock.mockRejectedValueOnce({ response: { status: 404 } });
    const res = await paymentApi.getPaymentDashboard();
    expect(res.totalAmount).toBe(0);
    expect(res.recentPayments).toEqual([]);
    expect(res.status).toBe('ACTIVE');
  });

  test('getAdminPayments builds graph and summary', async () => {
    // Force diffDays small to select 'day' range (24 entries)
    getMock.mockResolvedValueOnce({ data: { totalRevenue: 2400, startDate: '2025-01-01', endDate: '2025-01-02' } });
    const res = await paymentApi.getAdminPayments(0, 10, 'dueDate', 'desc');
    expect(res.summary.totalRevenue).toBe(2400);
    expect(res.graphData.timeRange).toBe('day');
    expect(Array.isArray(res.graphData.data)).toBe(true);
    expect(res.graphData.data.length).toBe(24);
  });

  test('getPaymentReports calls correct endpoint', async () => {
    getMock.mockResolvedValueOnce({ data: { items: [] } });
    const res = await paymentApi.getPaymentReports('revenue', '2025-01-01', '2025-01-31');
    expect(res.items).toBeDefined();
    expect(getMock.mock.calls[0][0]).toBe('/api/admin/payments/reports/revenue');
  });

  test('getCustomerPaymentPlan success and 404 fallback', async () => {
    getMock.mockResolvedValueOnce({ data: [{ id: 'plan1' }] });
    const ok = await paymentApi.getCustomerPaymentPlan('u1');
    expect(ok[0].id).toBe('plan1');

    getMock.mockRejectedValueOnce({ response: { status: 404 } });
    const none = await paymentApi.getCustomerPaymentPlan('u2');
    expect(none).toEqual([]);
  });
});
