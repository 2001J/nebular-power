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
    const data = await makeApiRequest<any>(() =>
      apiClient.get('/monitoring/installations/overview', { params })
    );

    // Normalize to a pageable-like structure for UI expectations
    if (!data) return { content: [], totalElements: 0, totalPages: 0, size: params?.size ?? 10, number: params?.page ?? 0 };

    if (Array.isArray(data)) {
      return {
        content: data,
        totalElements: data.length,
        totalPages: 1,
        size: data.length,
        number: 0,
      };
    }

    if (data.content && Array.isArray(data.content)) {
      return data;
    }

    if (data.recentlyActiveInstallations && Array.isArray(data.recentlyActiveInstallations)) {
      return {
        content: data.recentlyActiveInstallations,
        totalElements: data.totalActiveInstallations ?? data.recentlyActiveInstallations.length,
        totalPages: 1,
        size: data.recentlyActiveInstallations.length,
        number: 0,
        overview: data,
      };
    }

    return {
      content: [],
      totalElements: data.totalActiveInstallations ?? 0,
      totalPages: 1,
      size: 0,
      number: 0,
      overview: data,
    };
  },

  async getTamperAlerts(): Promise<any[]> {
    return makeApiRequest(() => apiClient.get<any[]>('/monitoring/installations/tamper-alerts'));
  },
};

export default installationApi;
