/**
 * Energy Monitoring API
 * 
 * This module provides functions for fetching energy data from the backend.
 * 
 * KEY ENDPOINTS:
 * - /monitoring/readings/series/{id} - Pre-aggregated kWh data for ONE installation
 * - /monitoring/readings/system-series - Pre-aggregated kWh data for ALL installations
 * 
 * IMPORTANT: The backend returns kWh values that are already properly integrated
 * from power readings. Do NOT do any power→energy conversions in the frontend!
 */

import { apiClient, makeApiRequest } from './client';
import type {
  TimeRange,
  BucketSize,
  InstallationSeriesPoint,
  SystemSeriesPoint,
  SystemOverview
} from '@/src/types/energyTypes';

// ============================================================================
// TIME RANGE HELPERS
// ============================================================================

/**
 * Format a date as ISO 8601 LOCAL time (no timezone suffix)
 * Backend uses LocalDateTime which is timezone-agnostic
 */
function toLocalISOString(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/**
 * Get date range and bucket size for a given time range
 * Returns ISO strings in LOCAL time format (no Z suffix) for backend compatibility
 */
export function getDateRangeForTimeRange(timeRange: TimeRange): {
  startDate: string;
  endDate: string;
  bucket: BucketSize;
} {
  const now = new Date();
  let startDate: Date;
  let bucket: BucketSize;

  switch (timeRange) {
    case 'day':
      // Today from midnight
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      bucket = 'hour';
      break;
    case 'week':
      // Last 7 days
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      startDate.setHours(0, 0, 0, 0);
      bucket = 'day';
      break;
    case 'month':
      // Current month from day 1
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      bucket = 'day';
      break;
    case 'year':
      // Current year from January 1
      startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
      bucket = 'month';
      break;
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      bucket = 'hour';
  }

  return { 
    startDate: toLocalISOString(startDate), 
    endDate: toLocalISOString(now), 
    bucket 
  };
}

/**
 * Get human-readable label for a bucket timestamp
 * Labels represent the START of the time period.
 * 
 * Backend uses LocalDateTime (no timezone) - timestamps should be displayed as-is.
 * DO NOT add 'Z' suffix - that would incorrectly treat local time as UTC!
 */
export function getBucketLabel(bucketStart: string, timeRange: TimeRange): string {
  // Parse timestamp as local time (no timezone conversion)
  // Backend sends LocalDateTime like "2025-11-25T10:00:00" which should display as 10:00
  const date = new Date(bucketStart);

  switch (timeRange) {
    case 'day':
      return `${date.getHours()}:00`;
    case 'week':
      return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];
    case 'month':
      return date.getDate().toString();
    case 'year':
      return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][date.getMonth()];
    default:
      return bucketStart;
  }
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

export const energyApi = {
  /**
   * Get system-wide overview metrics
   */
  async getSystemOverview(): Promise<SystemOverview> {
    try {
      return await makeApiRequest(() => apiClient.get<SystemOverview>('/monitoring/installations/overview'));
    } catch (_e) {
      // Fallback endpoint
      return makeApiRequest(() => apiClient.get<SystemOverview>('/api/service/system/overview'));
    }
  },

  /**
   * Get pre-aggregated chart data for a SINGLE installation
   * 
   * THIS IS THE CORRECT DATA SOURCE FOR PER-INSTALLATION CHARTS.
   * Values are already in kWh - use directly!
   */
  async getInstallationSeries(
    installationId: string,
    startDate: string,
    endDate: string,
    bucket: BucketSize = 'hour'
  ): Promise<InstallationSeriesPoint[]> {
    if (!installationId) return [];

    try {
      return await makeApiRequest(() =>
        apiClient.get<InstallationSeriesPoint[]>(`/monitoring/readings/series/${installationId}`, {
          params: { startDate, endDate, bucket },
        })
      );
    } catch {
      console.error(`[energyApi] Failed to fetch series for installation ${installationId}`);
      return [];
    }
  },

  /**
   * Convenience method: Get installation series for a specific time range
   */
  async getInstallationSeriesForTimeRange(
    installationId: string,
    timeRange: TimeRange
  ): Promise<InstallationSeriesPoint[]> {
    if (!installationId) return [];

    const { startDate, endDate, bucket } = getDateRangeForTimeRange(timeRange);
    return this.getInstallationSeries(installationId, startDate, endDate, bucket);
  },

  /**
   * Get pre-aggregated chart data for ALL installations combined
   * 
   * THIS IS THE CORRECT DATA SOURCE FOR ADMIN SYSTEM-WIDE CHARTS.
   * Includes breakdown by installation type.
   */
  async getSystemSeries(
    startDate: string,
    endDate: string,
    bucket: BucketSize = 'hour'
  ): Promise<SystemSeriesPoint[]> {
    try {
      console.log('[getSystemSeries] Requesting:', { startDate, endDate, bucket });

      const result = await makeApiRequest(() =>
        apiClient.get<SystemSeriesPoint[]>('/monitoring/readings/system-series', {
          params: { startDate, endDate, bucket },
        })
      );

      console.log('[getSystemSeries] Response:', result);
      return result;
    } catch (error) {
      console.error('[energyApi] Failed to fetch system series:', error);
      console.error('[energyApi] Request params were:', { startDate, endDate, bucket });
      return [];
    }
  },

  /**
   * Convenience method: Get system series for a specific time range
   */
  async getSystemSeriesForTimeRange(timeRange: TimeRange): Promise<SystemSeriesPoint[]> {
    const { startDate, endDate, bucket } = getDateRangeForTimeRange(timeRange);
    return this.getSystemSeries(startDate, endDate, bucket);
  },

  /**
   * Get dashboard metrics for a single installation
   */
  async getInstallationDashboard(installationId: string): Promise<any> {
    if (!installationId) return null;
    try {
      return await makeApiRequest(() =>
        apiClient.get<any>(`/monitoring/dashboard/installation/${installationId}`)
      );
    } catch (_e) {
      return null;
    }
  },

  /**
   * Get recent raw readings for a single installation
   * 
   * NOTE: These are RAW power readings (Watts), NOT pre-aggregated kWh.
   * Use getInstallationSeries() for chart data instead!
   */
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

  /**
   * @deprecated Use getInstallationSeries() instead
   */
  async getAggregatedSeries(
    installationId: string,
    startDateISO: string,
    endDateISO: string,
    bucket: BucketSize = 'hour'
  ): Promise<any[]> {
    return this.getInstallationSeries(installationId, startDateISO, endDateISO, bucket);
  },

  /**
   * Get energy summaries for date range
   */
  async getSummariesByPeriodAndDateRange(
    installationId: string,
    period: string,
    startDate: string,
    endDate: string
  ): Promise<any[]> {
    const toDateOnly = (v: string) => {
      if (!v) return '';
      return v.includes('T') ? v.split('T')[0] : v;
    };

    const start = toDateOnly(startDate);
    const end = toDateOnly(endDate);

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
      const bucket = period === 'day' ? 'hour' : period === 'week' || period === 'month' ? 'day' : 'month';
      return this.getInstallationSeries(installationId, startDate, endDate, bucket as BucketSize);
    }
  },

  /**
   * Calculate average efficiency for an installation
   */
  async calculateInstallationAverageEfficiency(installationId: string): Promise<number> {
    try {
      const dashboardData = await this.getInstallationDashboard(installationId);
      return dashboardData?.averageEfficiencyPercentage || dashboardData?.currentEfficiencyPercentage || 0;
    } catch {
      return 0;
    }
  },
};

export default energyApi;
