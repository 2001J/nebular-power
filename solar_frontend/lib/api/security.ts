import { apiClient, makeApiRequest } from './client';

export const securityApi = {
  async getTamperEvents(): Promise<any[]> {
    // Get unresolved tamper events from the proper endpoint
    const res = await makeApiRequest<any>(() => apiClient.get('/api/security/admin/alerts'));
    const data = res;
    return Array.isArray(data) ? data : data?.content ?? [];
  },

  async getUnresolvedEvents(): Promise<any[]> {
    // Get unresolved tamper events
    const res = await makeApiRequest<any>(() => apiClient.get('/api/security/admin/alerts'));
    const data = res;
    return Array.isArray(data) ? data : data?.content ?? [];
  },

  async getAllTamperEvents(): Promise<any[]> {
    // Get all tamper events (resolved and unresolved)
    const res = await makeApiRequest<any>(() => apiClient.get('/api/security/admin/all-alerts'));
    const data = res;
    return Array.isArray(data) ? data : data?.content ?? [];
  },

  async getInstallationAlerts(installationId: string): Promise<any[]> {
    const res = await makeApiRequest<any>(() =>
      apiClient.get(`/api/security/installations/${installationId}/events`)
    );
  const data = res;
    return Array.isArray(data) ? data : data?.content ?? [];
  },

  async getAdminAuditLogs(page = 0, size = 20, activityType?: string): Promise<any> {
    const params: Record<string, any> = { page, size };
    if (activityType) params.activityType = activityType;
    return makeApiRequest(() => apiClient.get('/api/security/admin/audit', { params }));
  },

  async getLogsByTimeRange(
    installationId: string,
    startTime: string,
    endTime: string,
    page = 0,
    size = 20
  ): Promise<any> {
    return makeApiRequest(() =>
      apiClient.get(`/api/security/admin/installations/${installationId}/audit/time-range`, {
        params: { startTime, endTime, page, size },
      })
    );
  },

  async getTamperEventById(eventId: string): Promise<any> {
    return makeApiRequest(() => apiClient.get(`/api/security/tamper-events/${eventId}`));
  },

  async acknowledgeEvent(eventId: string): Promise<any> {
    return makeApiRequest(() => apiClient.put(`/api/security/events/${eventId}/acknowledge`));
  },

  async updateEventStatus(eventId: string, status: string): Promise<any> {
    return makeApiRequest(() => 
      apiClient.put(`/api/security/admin/events/${eventId}/status`, { status })
    );
  },

  async resolveEvent(eventId: string, resolvedBy: string, resolutionNotes?: string): Promise<any> {
    const params = new URLSearchParams({ resolvedBy });
    if (resolutionNotes) params.append('resolutionNotes', resolutionNotes);
    
    return makeApiRequest(() => 
      apiClient.post(`/api/security/admin/events/${eventId}/resolve?${params.toString()}`)
    );
  },

  async getInstallationSecurityStatus(installationId: string): Promise<any> {
    try {
      const alerts = await securityApi.getInstallationAlerts(installationId);
      return {
        tamperDetected: alerts.some((a: any) => a.type === 'TAMPER_DETECTION' && !a.resolved),
        lastCheck: new Date().toISOString(),
        lastMaintenance: null,
        alerts,
        status: alerts.length > 0 ? 'WARNING' : 'SECURE',
      };
    } catch {
      return {
        tamperDetected: false,
        lastCheck: new Date().toISOString(),
        lastMaintenance: null,
        alerts: [],
        status: 'UNKNOWN',
      };
    }
  },
};

export default securityApi;
