import { describe, test, vi, beforeEach } from 'vitest';
import { paymentComplianceApi } from '@/lib/api/paymentCompliance';

const getMock = vi.fn();
const postMock = vi.fn();
const putMock = vi.fn();

vi.mock('@/lib/api/client', () => ({
  makeApiRequest: async (fn: any) => {
    const res = await fn();
    return res?.data;
  },
  apiClient: {
    get: (...args: any[]) => getMock(...args),
    post: (...args: any[]) => postMock(...args),
    put: (...args: any[]) => putMock(...args),
  },
}));

describe('paymentComplianceApi additional endpoints', () => {
  beforeEach(() => {
    getMock.mockReset();
    postMock.mockReset();
    putMock.mockReset();
  });

  test('overdue and configs', async () => {
    getMock.mockResolvedValueOnce({ data: { content: [] } });
    await paymentComplianceApi.getOverduePayments();
    getMock.mockResolvedValueOnce({ data: {} });
    await paymentComplianceApi.getGracePeriodConfig();
    putMock.mockResolvedValueOnce({ data: {} });
    await paymentComplianceApi.updateGracePeriodConfig({});
    getMock.mockResolvedValueOnce({ data: {} });
    await paymentComplianceApi.getReminderConfig();
    putMock.mockResolvedValueOnce({ data: {} });
    await paymentComplianceApi.updateReminderConfig({});
  });

  test('manual reminders and payments', async () => {
    postMock.mockResolvedValueOnce({ data: {} });
    await paymentComplianceApi.sendManualReminder('p1', 'EMAIL');
    getMock.mockResolvedValueOnce({ data: [] });
    await paymentComplianceApi.getPaymentReminders('p1');
    postMock.mockResolvedValueOnce({ data: {} });
    await paymentComplianceApi.recordManualPayment('c1', {});
  });

  test('payment plans and reports', async () => {
    getMock.mockResolvedValueOnce({ data: { id: 'pl1' } });
    await paymentComplianceApi.getPaymentPlanById('pl1');
    putMock.mockResolvedValueOnce({ data: {} });
    await paymentComplianceApi.updatePaymentPlan('c1', 'pl1', {});
    postMock.mockResolvedValueOnce({ data: {} });
    await paymentComplianceApi.createPaymentPlan('c1', {});

    getMock.mockResolvedValue({ data: {} });
    await paymentComplianceApi.getPaymentHistoryReport('i1');
    await paymentComplianceApi.getCustomerInstallationPayments('i1');
    await paymentComplianceApi.getPaymentPlanReport('pl1');
    await paymentComplianceApi.getPaymentPlansByStatusReport('ACTIVE');
    await paymentComplianceApi.getUpcomingPaymentsReport(7);
    await paymentComplianceApi.getOverduePaymentsReport();
    await paymentComplianceApi.getPaymentsDueReport('2025-01-01', '2025-01-31');
  });
});
