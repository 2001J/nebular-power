import { apiClient, makeApiRequest } from './client';
import type { EnergyReading } from './types';

export const energyApi = {
  async getSystemOverview(): Promise<any> {
    try {
      return await makeApiRequest(() => apiClient.get<any>('/monitoring/installations/overview'));
    } catch (_e) {
      // Fallback to integration overview endpoint if monitoring overview is unavailable
      return makeApiRequest(() => apiClient.get<any>('/api/service/system/overview'));
    }
  },

  async getInstallationDashboard(installationId: string): Promise<any> {
    return makeApiRequest(() => apiClient.get<any>(`/monitoring/dashboard/installation/${installationId}`));
  },

  async getRecentReadings(installationId: string, limit = 10): Promise<any[]> {
    return makeApiRequest(() =>
      apiClient.get<any[]>(`/monitoring/readings/recent/${installationId}`, { params: { limit } })
    );
  },

  async getSummariesByPeriodAndDateRange(
    installationId: string,
    period: string,
    startDate: string,
    endDate: string
  ): Promise<any[]> {
    return makeApiRequest(() =>
      apiClient.get<any[]>(`/monitoring/summaries/${installationId}/${period}`, {
        params: { startDate, endDate },
      })
    );
  },

  async calculateInstallationAverageEfficiency(installationId: string): Promise<number> {
    try {
      const dashboardData = await energyApi.getInstallationDashboard(installationId);
      if (!dashboardData) return 0;

      const recentReadings = await energyApi.getRecentReadings(installationId, 30);
      if (recentReadings && recentReadings.length > 0) {
        let efficiencySum = 0;
        let validReadingsCount = 0;

        (recentReadings as EnergyReading[]).forEach((reading) => {
          if (reading.powerGenerationWatts > 0 && reading.powerConsumptionWatts > 0) {
            const readingEfficiency = Math.min(
              100,
              (reading.powerGenerationWatts / reading.powerConsumptionWatts) * 100,
            );
            efficiencySum += readingEfficiency;
            validReadingsCount++;
          }
        });

        if (validReadingsCount > 0) {
          const averageEfficiency = efficiencySum / validReadingsCount;
          return Math.round(averageEfficiency * 100) / 100;
        }
      }

      return dashboardData.currentEfficiencyPercentage || 0;
    } catch {
      return 0;
    }
  },
};

export default energyApi;

