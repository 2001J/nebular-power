import { apiClient, makeApiRequest } from './client';

// Settings API (keeps legacy behavior; backend endpoints may be partial)
export const settingsApi = {
  async getSystemSettings() {
    return makeApiRequest(() => apiClient.get('/api/admin/settings'));
  },
  async updateSystemSettings(settings: any) {
    return makeApiRequest(() => apiClient.put('/api/admin/settings', settings));
  },
  async getNotificationSettings() {
    return makeApiRequest(() => apiClient.get('/api/admin/settings/notifications'));
  },
  async updateNotificationSettings(settings: any) {
    return makeApiRequest(() => apiClient.put('/api/admin/settings/notifications', settings));
  },
  async getSecuritySettings() {
    return makeApiRequest(() => apiClient.get('/api/admin/settings/security'));
  },
  async updateSecuritySettings(settings: any) {
    return makeApiRequest(() => apiClient.put('/api/admin/settings/security', settings));
  },
};

export default settingsApi;

