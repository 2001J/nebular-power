import { apiClient, makeApiRequest } from './client';

export const paymentComplianceApi = {
  // Overdue payments (paginated)
  async getOverduePayments(page = 0, size = 10, sortBy = 'dueDate', sortDirection: 'asc' | 'desc' = 'asc') {
    return makeApiRequest(() =>
      apiClient.get('/api/admin/payments/overdue', { params: { page, size, sortBy, sortDirection } })
    );
  },

  // Grace period config
  async getGracePeriodConfig() {
    return makeApiRequest(() => apiClient.get('/api/admin/payments/grace-period-config'));
  },
  async updateGracePeriodConfig(config: any) {
    return makeApiRequest(() => apiClient.put('/api/admin/payments/grace-period-config', config));
  },

  // Reminder config
  async getReminderConfig() {
    return makeApiRequest(() => apiClient.get('/api/admin/payments/reminder-config'));
  },
  async updateReminderConfig(config: any) {
    return makeApiRequest(() => apiClient.put('/api/admin/payments/reminder-config', config));
  },

  // Manual reminders and payments
  async sendManualReminder(paymentId: string, reminderType: string) {
    // Controller exposes POST /api/admin/payments/reminders/send?paymentId&reminderType
    return makeApiRequest(() =>
      apiClient.post('/api/admin/payments/reminders/send', null, { params: { paymentId, reminderType } })
    );
  },
  async getPaymentReminders(paymentId: string) {
    // Not explicitly present; if missing, keep route from legacy as best-effort
    return makeApiRequest(() => apiClient.get(`/api/admin/payments/${paymentId}/reminders`));
  },
  async recordManualPayment(customerId: string, paymentData: any) {
    return makeApiRequest(() =>
      apiClient.post(`/api/admin/payments/customers/${customerId}/manual-payment`, paymentData)
    );
  },

  // Payment plans
  async getPaymentPlanById(planId: string) {
    return makeApiRequest(() => apiClient.get(`/api/admin/payments/plans/${planId}`));
  },
  async updatePaymentPlan(planId: string, request: any) {
    return makeApiRequest(() => apiClient.put(`/api/admin/payments/plans/${planId}`, request));
  },
  async createPaymentPlan(customerId: string, request: any) {
    return makeApiRequest(() => apiClient.post(`/api/admin/payments/customers/${customerId}/plan`, request));
  },

  // Reports
  async getPaymentHistoryReport(installationId: string, startDate?: string, endDate?: string) {
    const params: any = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    return makeApiRequest(() =>
      apiClient.get(`/api/admin/payments/reports/history/${installationId}`, { params })
    );
  },
  async getCustomerInstallationPayments(installationId: string, _timestamp?: number) {
    // Align to AdminPaymentController: GET /api/admin/payments/installations/{installationId}/payments
    return makeApiRequest(() =>
      apiClient.get(`/api/admin/payments/installations/${installationId}/payments`, {
        params: { page: 0, size: 100, sortBy: 'dueDate', direction: 'desc' },
      })
    );
  },
  async getPaymentPlanReport(paymentPlanId: string) {
    return makeApiRequest(() => apiClient.get(`/api/admin/payments/reports/payment-plan/${paymentPlanId}`));
  },
  async getPaymentPlansByStatusReport(status: string) {
    return makeApiRequest(() => apiClient.get(`/api/admin/payments/reports/payment-plans/status/${status}`));
  },
  async getUpcomingPaymentsReport(daysAhead = 7) {
    return makeApiRequest(() =>
      apiClient.get('/api/admin/payments/reports/upcoming', { params: { daysAhead } })
    );
  },
  async getOverduePaymentsReport() {
    return makeApiRequest(() => apiClient.get('/api/admin/payments/reports/overdue'));
  },
  async getPaymentsDueReport(startDate?: string, endDate?: string) {
    return makeApiRequest(() =>
      apiClient.get('/api/admin/payments/reports', {
        params: { reportType: 'compliance', startDate, endDate },
      })
    );
  },
};

export default paymentComplianceApi;

