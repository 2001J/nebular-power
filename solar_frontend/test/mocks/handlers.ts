import { http, HttpResponse } from 'msw';

export const handlers = [
  // Security alerts (Page wrapper)
  http.get('*/api/security/admin/alerts', () => {
    return HttpResponse.json({ content: [{ id: 1 }, { id: 2 }] });
  }),

  // Installation alerts (array)
  http.get('*/api/security/installations/:installationId/events', () => {
    return HttpResponse.json([{ id: 'a' }, { id: 'b' }]);
  }),

  // Energy overview and dashboards
  http.get('*/monitoring/installations/overview', () => {
    return HttpResponse.json({
      totalActiveInstallations: 1,
      recentlyActiveInstallations: [{ id: 1 }],
    });
  }),
  http.get('*/monitoring/dashboard/installation/:installationId', ({ params }) => {
    const { installationId } = params as any;
    return HttpResponse.json({ installationId, currentEfficiencyPercentage: 75 });
  }),
  http.get('*/monitoring/readings/recent/:installationId', () => {
    return HttpResponse.json([
      { powerGenerationWatts: 100, powerConsumptionWatts: 200, timestamp: 't1' },
      { powerGenerationWatts: 150, powerConsumptionWatts: 250, timestamp: 't2' },
    ]);
  }),
  http.get('*/monitoring/readings/history/:installationId', () => {
    return HttpResponse.json([{ timestamp: 't-1' }]);
  }),

  // Payments (customer)
  http.get('*/api/payments/dashboard', () => {
    return HttpResponse.json({ totalDue: 100, upcomingPayments: [{ id: 1 }], recentPayments: [{ id: 2 }] });
  }),
  http.get('*/api/payments/history', () => {
    return HttpResponse.json({ content: [{ id: 10 }, { id: 11 }] });
  }),
  http.get('*/api/payments/upcoming', () => {
    return HttpResponse.json({ content: [{ id: 20 }, { id: 21 }] });
  }),

  // Admin payment reports
  http.get('*/api/admin/payments/reports/:reportType', ({ params }) => {
    const { reportType } = params as any;
    return HttpResponse.json({ reportType, data: { ok: true } });
  }),
  http.get('*/api/admin/payments/reports/history/:installationId', () => {
    return HttpResponse.json([{ id: 1 }, { id: 2 }]);
  }),
  http.get('*/api/admin/payments/reports/payment-plan/:paymentPlanId', () => {
    return HttpResponse.json([{ id: 100 }]);
  }),
  http.get('*/api/admin/payments/reports/payment-plans/status/:status', () => {
    return HttpResponse.json([{ id: 'plan' }]);
  }),
  http.get('*/api/admin/payments/reports/upcoming', () => {
    return HttpResponse.json([{ id: 'up1' }]);
  }),
  http.get('*/api/admin/payments/reports/overdue', () => {
    return HttpResponse.json([{ id: 'ov1' }]);
  }),
  http.get('*/api/admin/payments/installations/:installationId/payments', () => {
    return HttpResponse.json({ content: [{ id: 'p1' }] });
  }),

  // Settings endpoints
  http.get('*/api/admin/settings', () => {
    return HttpResponse.json({ general: { companyName: 'NebulaPower' } });
  }),
  http.put('*/api/admin/settings', () => {
    return HttpResponse.json({ ok: true });
  }),
  http.get('*/api/admin/settings/notifications', () => {
    return HttpResponse.json({ emailNotifications: true });
  }),
  http.put('*/api/admin/settings/notifications', () => {
    return HttpResponse.json({ ok: true });
  }),
  http.get('*/api/admin/settings/security', () => {
    return HttpResponse.json({ twoFactorAuth: false });
  }),
  http.put('*/api/admin/settings/security', () => {
    return HttpResponse.json({ ok: true });
  }),
];
