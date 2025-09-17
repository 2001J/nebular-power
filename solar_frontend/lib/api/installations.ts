import { apiClient, makeApiRequest } from './client';

export const installationApi = {
  async getCustomerInstallations(customerId: string): Promise<any[]> {
    return makeApiRequest(() =>
      apiClient.get<any[]>(`/monitoring/installations/customer/${customerId}`)
    );
  },

  async getInstallationDetails(installationId: string): Promise<any> {
    return makeApiRequest(() =>
      apiClient.get<any>(`/monitoring/installations/${installationId}`)
    );
  },

  async createInstallation(installationData: any): Promise<any> {
    return makeApiRequest(() =>
      apiClient.post<any>('/monitoring/installations', installationData, {
        headers: { 'Content-Type': 'application/json' },
      })
    );
  },

  async updateInstallation(installationId: string, installationData: any): Promise<any> {
    return makeApiRequest(() =>
      apiClient.put<any>(`/monitoring/installations/${installationId}`, installationData)
    );
  },

  async getAllInstallations(params?: {
    page?: number;
    size?: number;
    sortBy?: string;
    direction?: 'asc' | 'desc';
    status?: string;
    type?: string;
    search?: string;
  }): Promise<any> {
    return makeApiRequest(() =>
      apiClient.get<any>('/monitoring/installations/overview', { params })
    );
  },

  async getTamperAlerts(): Promise<any[]> {
    return makeApiRequest(() => apiClient.get<any[]>('/monitoring/installations/tamper-alerts'));
  },
};

export default installationApi;

