import { describe, expect, test } from 'vitest';
import { paymentApi } from '@/lib/api/payments';

describe('paymentApi (MSW)', () => {
  test('dashboard/history/upcoming endpoints', async () => {
    const dash = await paymentApi.getPaymentDashboard();
    expect(dash.totalDue).toBeDefined();

    const hist = await paymentApi.getPaymentHistory();
    expect(hist.content.length).toBeGreaterThan(0);

    const up = await paymentApi.getUpcomingPayments();
    expect(up.content.length).toBeGreaterThan(0);
  });

  test('admin reports with reportType', async () => {
    const rep = await paymentApi.getPaymentReports('revenue', '2024-01-01', '2024-01-31');
    expect(rep.reportType).toBe('revenue');
  });
});

