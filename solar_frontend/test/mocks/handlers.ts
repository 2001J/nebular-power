import { http, HttpResponse } from 'msw';

export const handlers = [
  // Security tamper events - proper event objects
  http.get('*/api/security/admin/alerts', () => {
    return HttpResponse.json({ 
      content: [
        { 
          id: 1, 
          installationId: 101, 
          eventType: 'PHYSICAL_TAMPER', 
          severity: 'HIGH', 
          status: 'NEW',
          description: 'Physical tampering detected on solar panel',
          timestamp: '2024-10-05T10:30:00Z'
        }, 
        { 
          id: 2, 
          installationId: 102, 
          eventType: 'VOLTAGE_FLUCTUATION', 
          severity: 'MEDIUM', 
          status: 'ACKNOWLEDGED',
          description: 'Unusual voltage fluctuation detected',
          timestamp: '2024-10-05T09:15:00Z'
        }
      ] 
    });
  }),
  http.get('*/api/security/admin/all-alerts', () => {
    return HttpResponse.json({ 
      content: [
        { 
          id: 1, 
          installationId: 101, 
          eventType: 'PHYSICAL_TAMPER', 
          severity: 'HIGH', 
          status: 'NEW',
          description: 'Physical tampering detected on solar panel',
          timestamp: '2024-10-05T10:30:00Z'
        }, 
        { 
          id: 2, 
          installationId: 102, 
          eventType: 'VOLTAGE_FLUCTUATION', 
          severity: 'MEDIUM', 
          status: 'RESOLVED',
          description: 'Unusual voltage fluctuation detected',
          timestamp: '2024-10-05T09:15:00Z',
          resolvedBy: 'Admin User',
          resolvedAt: '2024-10-05T11:00:00Z'
        },
        { 
          id: 3, 
          installationId: 103, 
          eventType: 'CONNECTION_INTERRUPTION', 
          severity: 'CRITICAL', 
          status: 'NEW',
          description: 'Connection interruption detected',
          timestamp: '2024-10-05T08:45:00Z'
        }
      ] 
    });
  }),
  // Security alerts via monitoring controller - installations with tamper flags
  http.get('*/monitoring/installations/tamper-alerts', () => {
    return HttpResponse.json([
      { id: 101, tamperDetected: true, name: 'Installation A' }, 
      { id: 102, tamperDetected: true, name: 'Installation B' }
    ]);
  }),

  // Installation alerts (array)
  http.get('*/api/security/installations/:installationId/events', () => {
    return HttpResponse.json([{ id: 'a' }, { id: 'b' }]);
  }),

  // Individual tamper event
  http.get('*/api/security/tamper-events/:eventId', ({ params }) => {
    const { eventId } = params as any;
    return HttpResponse.json({
      id: eventId,
      installationId: 101,
      eventType: 'PHYSICAL_TAMPER',
      severity: 'HIGH',
      status: 'NEW',
      description: 'Detailed tamper event information',
      timestamp: '2024-10-05T10:30:00Z'
    });
  }),

  // Acknowledge event
  http.put('*/api/security/events/:eventId/acknowledge', ({ params }) => {
    const { eventId } = params as any;
    return HttpResponse.json({
      id: eventId,
      status: 'ACKNOWLEDGED',
      acknowledgedBy: 'Test User',
      acknowledgedAt: '2024-10-05T12:00:00Z'
    });
  }),

  // Update event status
  http.put('*/api/security/admin/events/:eventId/status', ({ params }) => {
    const { eventId } = params as any;
    return HttpResponse.json({
      id: eventId,
      status: 'UPDATED',
      updatedBy: 'Admin User',
      updatedAt: '2024-10-05T12:15:00Z'
    });
  }),

  // Resolve event
  http.post('*/api/security/admin/events/:eventId/resolve', ({ params }) => {
    const { eventId } = params as any;
    return HttpResponse.json({
      id: eventId,
      status: 'RESOLVED',
      resolvedBy: 'Admin User',
      resolvedAt: '2024-10-05T12:30:00Z',
      resolutionNotes: 'Issue resolved successfully'
    });
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
