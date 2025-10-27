import { describe, expect, test } from 'vitest';
import { paymentComplianceApi } from '@/lib/api/paymentCompliance';

describe('paymentComplianceApi (MSW)', () => {
  test('reports endpoints respond', async () => {
    const hist = await paymentComplianceApi.getPaymentHistoryReport('1');
    expect(Array.isArray(hist)).toBe(true);
    const plan = await paymentComplianceApi.getPaymentPlanReport('1');
    expect(Array.isArray(plan)).toBe(true);
    const byStatus = await paymentComplianceApi.getPaymentPlansByStatusReport('ACTIVE');
    expect(Array.isArray(byStatus)).toBe(true);
    const upcoming = await paymentComplianceApi.getUpcomingPaymentsReport(7);
    expect(upcoming).toBeDefined();
    const overdue = await paymentComplianceApi.getOverduePaymentsReport();
    expect(overdue).toBeDefined();
  });

  test('installation payments returns pageable content', async () => {
    const res = await paymentComplianceApi.getCustomerInstallationPayments('123');
    expect(res.content).toBeDefined();
  });
});
