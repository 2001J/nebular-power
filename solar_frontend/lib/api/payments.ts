import { apiClient, makeApiRequest } from './client';

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
    return makeApiRequest(() => apiClient.get('/api/payments/dashboard'));
  },

  async getCustomerPaymentPlan(userId: string): Promise<any> {
    return makeApiRequest(() => apiClient.get(`/api/payments/customers/${userId}/plan`));
  },
};

export default paymentApi;

