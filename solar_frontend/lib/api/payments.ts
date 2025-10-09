import { apiClient, makeApiRequest } from './client';

function buildRevenueGraph(timeRange: 'day' | 'week' | 'month', totalRevenue: number, start: Date): Array<{ name: string; revenue: number }> {
  const data: Array<{ name: string; revenue: number }> = [];
  if (timeRange === 'day') {
    for (let hour = 0; hour < 24; hour++) {
      let factor = 1;
      if (hour >= 8 && hour <= 18) factor = 1.5;
      else if (hour >= 20 || hour <= 6) factor = 0.3;
      data.push({ name: `${hour}:00`, revenue: Math.round((totalRevenue / 24) * factor * 100) / 100 });
    }
    return data;
  }
  if (timeRange === 'week') {
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const dailyAverage = totalRevenue / 7;
    dayNames.forEach((day, idx) => {
      let factor = 1;
      if (idx >= 5) factor = 0.6;
      else if (idx === 2 || idx === 3) factor = 1.3;
      data.push({ name: day, revenue: Math.round(dailyAverage * factor * 100) / 100 });
    });
    return data;
  }
  const daysInPeriod = 30;
  const dailyAverage = totalRevenue / daysInPeriod;
  for (let i = 0; i < daysInPeriod; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    const factor = 0.7 + Math.random() * 0.6;
    data.push({ name: `${date.getDate()}`, revenue: Math.round(dailyAverage * factor * 100) / 100 });
  }
  return data;
}

export const paymentApi = {
  async makePayment(paymentData: any): Promise<any> {
    return makeApiRequest(() => apiClient.post('/api/payments/make-payment', paymentData));
  },

  async getUpcomingPayments(): Promise<any> {
    return makeApiRequest(() => apiClient.get('/api/payments/upcoming'));
  },

  async getPaymentHistory(page = 0, size = 20): Promise<any> {
    return makeApiRequest(() =>
      apiClient.get('/api/payments/history', { params: { page, size } })
    );
  },

  async getPaymentDashboard(): Promise<any> {
    try {
      return await makeApiRequest(() => apiClient.get('/api/payments/dashboard'));
    } catch (e: any) {
      // If no installations or plan yet, backend may return 404; normalize to empty dashboard
      const status = e?.response?.status;
      if (status === 404) {
        return {
          installationId: null,
          totalAmount: 0,
          remainingAmount: 0,
          nextPaymentAmount: 0,
          nextPaymentDueDate: null,
          totalInstallments: 0,
          remainingInstallments: 0,
          completedInstallments: 0,
          hasOverduePayments: false,
          recentPayments: [],
          upcomingPayments: [],
          activePlan: null,
          paymentPlanId: null,
          startDate: null,
          endDate: null,
          frequency: 'MONTHLY',
          installmentAmount: 0,
          status: 'ACTIVE',
        };
      }
      throw e;
    }
  },

  // Admin summary used by admin dashboard
  async getAdminPayments(page = 0, size = 20, sortBy = 'dueDate', direction = 'desc'): Promise<any> {
    // Compute last 30-day window
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    const startDate = thirtyDaysAgo.toISOString().split('T')[0];
    const endDate = today.toISOString().split('T')[0];

    // Fetch revenue report and build graph data similar to legacy behavior
    const revenueData = await makeApiRequest<any>(() =>
      apiClient.get('/api/admin/payments/reports/revenue', {
        params: { startDate, endDate },
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', Pragma: 'no-cache' },
      })
    );

    const totalRevenue = revenueData?.totalRevenue ?? 0;

    // Determine timeRange from period length
    const startDateTime = revenueData?.startDate ? new Date(revenueData.startDate) : thirtyDaysAgo;
    const endDateTime = revenueData?.endDate ? new Date(revenueData.endDate) : today;
    const diffDays = Math.ceil(Math.abs(endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60 * 60 * 24));
  let timeRange: 'day' | 'week' | 'month';
  if (diffDays <= 7) timeRange = 'day';
  else if (diffDays <= 31) timeRange = 'week';
  else timeRange = 'month';

    // Generate simple graph data
    const graphData = buildRevenueGraph(timeRange, totalRevenue, startDateTime);

    return {
      content: [],
      totalPages: 0,
      totalElements: 0,
      size,
      number: page,
      summary: revenueData ?? { totalRevenue: 0, expectedRevenue: 0, collectionRate: 0 },
      graphData: { timeRange, data: graphData },
    };
  },

  // Admin payment reports
  async getPaymentReports(reportType: string, startDate?: string, endDate?: string): Promise<any> {
    // Aligns to PaymentReportController: GET /api/admin/payments/reports/{reportType}
    return makeApiRequest(() =>
      apiClient.get(`/api/admin/payments/reports/${reportType}`, {
        params: { startDate, endDate },
      })
    );
  },

  async getCustomerPaymentPlan(userId: string): Promise<any> {
    try {
      return await makeApiRequest(() => apiClient.get(`/api/payments/customers/${userId}/plan`));
    } catch (e: any) {
      if (e?.response?.status === 404) return [];
      throw e;
    }
  },
};

export default paymentApi;
