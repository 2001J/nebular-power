import { apiClient, makeApiRequest } from './client';

type MonitoringStatus = { isMonitoring?: boolean } & Record<string, unknown>;

const STORAGE_PREFIX = 'monitoring_';

const isBrowser = typeof window !== 'undefined';

function persistMonitoringState(installationId: string, value: boolean) {
  if (!isBrowser) return;
  try {
    window.localStorage.setItem(`${STORAGE_PREFIX}${installationId}`, value ? 'true' : 'false');
  } catch (error) {
    console.warn('Unable to persist monitoring state', error);
  }
}

function readMonitoringState(installationId: string): boolean | null {
  if (!isBrowser) return null;
  try {
    const stored = window.localStorage.getItem(`${STORAGE_PREFIX}${installationId}`);
    return stored === null ? null : stored === 'true';
  } catch (error) {
    console.warn('Unable to read monitoring state', error);
    return null;
  }
}

export const tamperDetectionApi = {
  async startMonitoring(installationId: string) {
    const response = await makeApiRequest(() =>
      apiClient.post(`/api/security/detection/installations/${installationId}/start`)
    );
    persistMonitoringState(installationId, true);
    return response;
  },

  async stopMonitoring(installationId: string) {
    const response = await makeApiRequest(() =>
      apiClient.post(`/api/security/detection/installations/${installationId}/stop`)
    );
    persistMonitoringState(installationId, false);
    return response;
  },

  async getMonitoringStatus(installationId: string): Promise<MonitoringStatus> {
    try {
      const status = await makeApiRequest<MonitoringStatus>(() =>
        apiClient.get(`/api/security/detection/installations/${installationId}/status`)
      );

      if (typeof status?.isMonitoring === 'boolean') {
        persistMonitoringState(installationId, status.isMonitoring);
      }

      return status;
    } catch (error) {
      const fallback = readMonitoringState(installationId);
      return { isMonitoring: fallback ?? false };
    }
  },

  async runDiagnostics(installationId: string) {
    return makeApiRequest(() =>
      apiClient.post(`/api/security/detection/installations/${installationId}/diagnostics`)
    );
  },

  async adjustSensitivity(installationId: string, eventType: string, threshold: number) {
    return makeApiRequest(() =>
      apiClient.put(`/api/security/detection/installations/${installationId}/sensitivity/${eventType}`, {
        threshold,
      })
    );
  },
};

export default tamperDetectionApi;
