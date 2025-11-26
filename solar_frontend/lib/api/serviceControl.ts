import { apiClient, makeApiRequest } from './client';

const ensureReason = (reason: string, errorMessage: string): string => {
  const trimmedReason = (reason ?? '').trim();
  if (!trimmedReason) {
    throw new Error(errorMessage);
  }
  return trimmedReason;
};

// Service Status endpoints
export const serviceControlApi = {
  async getCurrentStatus(installationId: string): Promise<any> {
    return makeApiRequest(() => apiClient.get(`/api/service/status/${installationId}`));
  },

  async getStatusHistory(installationId: string, page = 0, size = 20): Promise<any> {
    return makeApiRequest(() =>
      apiClient.get(`/api/service/status/${installationId}/history`, { params: { page, size } })
    );
  },

  async updateServiceStatus(installationId: string, statusData: any): Promise<any> {
    const validStatusValues = [
      'ACTIVE',
      'SUSPENDED_PAYMENT',
      'SUSPENDED_SECURITY',
      'SUSPENDED_MAINTENANCE',
      'TRANSITIONING',
      'PENDING',
    ];

    const status = String(statusData?.status || '').toUpperCase();
    if (!validStatusValues.includes(status)) {
      throw new Error(`Invalid status value: ${status}`);
    }

    const payload = {
      status,
      statusReason: statusData.statusReason || '',
      updatedBy: statusData.updatedBy || 'SYSTEM',
    };

    return makeApiRequest(() => apiClient.put(`/api/service/status/${installationId}`, payload));
  },

  async suspendServiceForPayment(installationId: string, reason: string): Promise<any> {
    const validatedReason = ensureReason(
      reason,
      'A reason is required to suspend a service for payment issues.'
    );

    return makeApiRequest(() =>
      apiClient.post(`/api/service/status/${installationId}/suspend/payment`, null, {
        params: { reason: validatedReason },
      })
    );
  },

  async suspendServiceForSecurity(installationId: string, reason: string): Promise<any> {
    const validatedReason = ensureReason(
      reason,
      'A reason is required to suspend a service for security concerns.'
    );

    return makeApiRequest(() =>
      apiClient.post(`/api/service/status/${installationId}/suspend/security`, null, {
        params: { reason: validatedReason },
      })
    );
  },

  async suspendServiceForMaintenance(installationId: string, maintenanceData: any): Promise<any> {
    return makeApiRequest(() =>
      apiClient.post(`/api/service/status/${installationId}/suspend/maintenance`, maintenanceData)
    );
  },

  async restoreService(installationId: string, reason: string): Promise<any> {
    return makeApiRequest(() =>
      apiClient.post(`/api/service/status/${installationId}/restore`, null, { params: { reason } })
    );
  },

  async getInstallationsByStatus(status: string, page = 0, size = 20): Promise<any> {
    return makeApiRequest(() =>
      apiClient.get('/api/service/status/by-state', { params: { status, page, size } })
    );
  },

  async getBatchStatuses(installationIds: (string | number)[]): Promise<any> {
    return makeApiRequest(() => apiClient.post('/api/service/status/batch', installationIds));
  },

  // Commands endpoints
  async sendCommand(installationId: string, command: string, parameters?: Record<string, any>): Promise<any> {
    return makeApiRequest(() =>
      apiClient.post(`/api/service/commands/${installationId}`, parameters || {}, { params: { command } })
    );
  },

  async getCommandsByStatus(status: string, page = 0, size = 20): Promise<any> {
    return makeApiRequest(() =>
      apiClient.get(`/api/service/commands/status/${status}`, { params: { page, size } })
    );
  },

  async getCommandsByInstallation(installationId: string, page = 0, size = 20): Promise<any> {
    return makeApiRequest(() =>
      apiClient.get(`/api/service/commands/${installationId}`, { params: { page, size } })
    );
  },

  async getPendingCommands(installationId: string): Promise<any[]> {
    return makeApiRequest(() => apiClient.get(`/api/service/commands/${installationId}/pending`));
  },

  async getCommandById(commandId: string): Promise<any> {
    return makeApiRequest(() => apiClient.get(`/api/service/commands/id/${commandId}`));
  },

  async getCommandByCorrelationId(correlationId: string): Promise<any> {
    return makeApiRequest(() => apiClient.get(`/api/service/commands/correlation/${correlationId}`));
  },

  async cancelCommand(commandId: string): Promise<any> {
    return makeApiRequest(() => apiClient.post(`/api/service/commands/${commandId}/cancel`));
  },

  async retryCommand(commandId: string): Promise<any> {
    return makeApiRequest(() => apiClient.post(`/api/service/commands/${commandId}/retry`));
  },

  async getCommandStatusCounts(): Promise<any> {
    return makeApiRequest(() => apiClient.get('/api/service/commands/stats/status-counts'));
  },

  // Logs endpoints
  async getLogsByTimeRange(startTime: string, endTime: string, page = 0, size = 20): Promise<any> {
    return makeApiRequest(() =>
      apiClient.get('/api/service/logs/time-range', {
        params: { start: startTime, end: endTime, page, size },
      })
    );
  },

  async getLogsByOperation(operation: string, page = 0, size = 20): Promise<any> {
    return makeApiRequest(() =>
      apiClient.get(`/api/service/logs/operation/${operation}`, { params: { page, size } })
    );
  },

  async getLogsBySourceSystem(sourceSystem: string): Promise<any[]> {
    // Backend returns a list for this endpoint
    return makeApiRequest(() => apiClient.get(`/api/service/logs/source-system/${sourceSystem}`));
  },

  async getLogsByInstallation(installationId: string, page = 0, size = 20): Promise<any> {
    return makeApiRequest(() =>
      apiClient.get(`/api/service/logs/installation/${installationId}`, { params: { page, size } })
    );
  },

  async exportLogs(filters: Record<string, any>): Promise<Blob> {
    // Keep existing path used by UI; backend may implement this
    return makeApiRequest(() =>
      apiClient.get('/api/service/logs/export', { params: filters, responseType: 'blob' })
    );
  },
};

export default serviceControlApi;

