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

  async getSystemSeries(
    startDateISO: string,
    endDateISO: string,
    bucket: 'minute' | 'hour' | 'day' | 'month' = 'hour'
  ): Promise<any[]> {
    try {
      return await makeApiRequest(() =>
        apiClient.get<any[]>('/monitoring/readings/system-series', {
          params: { startDate: startDateISO, endDate: endDateISO, bucket },
        })
      );
    } catch {
      // Graceful fallback
      return [];
    }
  },

  async getInstallationDashboard(installationId: string): Promise<any> {
    if (!installationId) return null as any;
    try {
      return await makeApiRequest(() => apiClient.get<any>(`/monitoring/dashboard/installation/${installationId}`));
    } catch (_e) {
      return null as any;
    }
  },

  async getRecentReadings(installationId: string, limit = 10): Promise<any[]> {
    if (!installationId) return [];
    try {
      return await makeApiRequest(() =>
        apiClient.get<any[]>(`/monitoring/readings/recent/${installationId}`, { params: { limit } })
      );
    } catch {
      return [];
    }
  },

  async getAggregatedSeries(
    installationId: string,
    startDateISO: string,
    endDateISO: string,
    bucket: 'minute' | 'hour' | 'day' | 'month' = 'hour'
  ): Promise<any[]> {
    try {
      return await makeApiRequest(() =>
        apiClient.get<any[]>(`/monitoring/readings/series/${installationId}`, {
          params: { startDate: startDateISO, endDate: endDateISO, bucket },
        })
      );
    } catch {
      // Graceful fallback
      return [];
    }
  },

  async getSummariesByPeriodAndDateRange(
    installationId: string,
    period: string,
    startDate: string,
    endDate: string
  ): Promise<any[]> {
    // Backend expects LocalDate (yyyy-MM-dd) for summaries
    const toDateOnly = (v: string) => {
      if (!v) return '';
      // Accept ISO or yyyy-MM-dd, return yyyy-MM-dd
      const d = v.includes('T') ? v.split('T')[0] : v;
      return d;
    };
    const start = toDateOnly(startDate);
    const end = toDateOnly(endDate);

    // Map UI period keys to backend
    const periodMap: Record<string, string> = {
      day: 'daily',
      week: 'weekly',
      month: 'monthly',
      year: 'monthly',
      daily: 'daily',
      weekly: 'weekly',
      monthly: 'monthly',
    };
    const mapped = periodMap[period] || 'daily';

    try {
      return await makeApiRequest(() =>
        apiClient.get<any[]>(`/monitoring/summaries/${installationId}/${mapped}`, {
          params: { startDate: start, endDate: end },
        })
      );
    } catch (_e) {
      // Fallback to aggregated series
      try {
        const bucket = period === 'day' ? 'hour' : period === 'week' || period === 'month' ? 'day' : 'month';
        return await energyApi.getAggregatedSeries(installationId, startDate, endDate, bucket as any);
      } catch {
        return [];
      }
    }
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
