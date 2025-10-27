import { apiClient, makeApiRequest } from './client';

/**
 * Minimal service control API surface used by UI components.
 * Non-breaking wrapper around backend endpoints.
 */
export const serviceApi = {
  /** Start service for an installation */
  async startService(installationId: string): Promise<{ message?: string }> {
    return makeApiRequest(() =>
      apiClient.post<{ message?: string }>(`/api/service/status/installations/${installationId}/start`)
    );
  },

  /** Stop service for an installation */
  async stopService(installationId: string): Promise<{ message?: string }> {
    return makeApiRequest(() =>
      apiClient.post<{ message?: string }>(`/api/service/status/installations/${installationId}/stop`)
    );
  },

  /** Restart service for an installation */
  async restartService(installationId: string): Promise<{ message?: string }> {
    return makeApiRequest(() =>
      apiClient.post<{ message?: string }>(`/api/service/status/installations/${installationId}/restart`)
    );
  },

  /** Get overall system health report */
  async getSystemHealth(): Promise<any> {
    return makeApiRequest(() =>
      apiClient.get<any>('/api/service/system/health-report')
    );
  },

  /** Get paginated device heartbeats */
  async getSystemHeartbeats(page: number = 0, size: number = 50): Promise<any> {
    return makeApiRequest(() =>
      apiClient.get<any>('/monitoring/system/heartbeats', { params: { page, size } })
    );
  },
};

export default serviceApi;
