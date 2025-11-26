/**
 * Chart Data API - SINGLE SOURCE OF TRUTH
 * 
 * This file provides the unified API for fetching chart-ready energy data.
 * Both customer and admin views should use these functions to ensure data consistency.
 * 
 * KEY PRINCIPLES:
 * 1. Data from backend is already in kWh (properly integrated from power readings)
 * 2. Each bucket represents energy during that time period (e.g., "10:00" = energy from 10:00-10:59)
 * 3. The same installation data should look identical whether viewed by customer or admin
 */

import { apiClient, makeApiRequest } from './client';

// ============================================================================
// TYPES
// ============================================================================

export type TimeRange = 'day' | 'week' | 'month' | 'year';

export type BucketSize = 'minute' | 'hour' | 'day' | 'month';

/**
 * A single data point for charts
 * This is the FINAL format that goes directly to chart components
 */
export interface ChartDataPoint {
  /** Human-readable label for this time bucket (e.g., "10:00", "Mon", "15", "Jan") */
  label: string;
  /** ISO timestamp of bucket start (for sorting and reference) */
  bucketStart: string;
  /** Energy generated during this bucket (kWh) */
  generationKWh: number;
  /** Energy consumed during this bucket (kWh) */
  consumptionKWh: number;
  /** Average power generation during this bucket (W) */
  avgGenerationWatts: number;
  /** Average power consumption during this bucket (W) */
  avgConsumptionWatts: number;
  /** Efficiency percentage (generation/consumption * 100, capped at 100) */
  efficiency: number;
}

/**
 * Summary metrics for a time period
 */
export interface PeriodSummary {
  totalGenerationKWh: number;
  totalConsumptionKWh: number;
  avgEfficiency: number;
  peakGenerationKWh: number;
  peakGenerationTime: string;
}

/**
 * Complete chart data response
 */
export interface ChartDataResponse {
  /** Array of data points for the chart */
  dataPoints: ChartDataPoint[];
  /** Summary metrics for the period */
  summary: PeriodSummary;
  /** Time range this data represents */
  timeRange: TimeRange;
  /** Whether this is data for a single installation or system-wide */
  isSystemWide: boolean;
  /** Installation ID (null if system-wide) */
  installationId: string | null;
}

/**
 * Backend series point structure (from /monitoring/readings/series/{id})
 */
interface BackendSeriesPoint {
  bucketStart: string;
  generationKWh: number;
  consumptionKWh: number;
  avgGenerationWatts: number;
  avgConsumptionWatts: number;
  powerUnit?: string;
  energyUnit?: string;
}

/**
 * Backend system series point structure (from /monitoring/readings/system-series)
 */
interface BackendSystemSeriesPoint extends BackendSeriesPoint {
  generationByTypeKWh?: Record<string, number>;
  consumptionByTypeKWh?: Record<string, number>;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get the date range and bucket size for a time range
 */
function getDateRangeForTimeRange(timeRange: TimeRange): {
  startDate: Date;
  endDate: Date;
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

  return { startDate, endDate: now, bucket };
}

/**
 * Convert a bucket timestamp to a human-readable label
 * 
 * IMPORTANT: Bucket labels represent the START of the time period.
 * "10:00" means data from 10:00:00 to 10:59:59
 */
function getBucketLabel(bucketStart: string, timeRange: TimeRange): string {
  // Backend sends LocalDateTime (no timezone) - display as-is
  // DO NOT add 'Z' - that would incorrectly treat local time as UTC!
  const date = new Date(bucketStart);
  
  switch (timeRange) {
    case 'day':
      // Hour format: "10:00" (represents 10:00-10:59)
      return `${date.getHours()}:00`;
    
    case 'week':
      // Day name: "Mon" (represents Monday's full day)
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      return dayNames[date.getDay()];
    
    case 'month':
      // Day of month: "15" (represents the 15th day)
      return date.getDate().toString();
    
    case 'year':
      // Month name: "Jan" (represents January's full month)
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return monthNames[date.getMonth()];
    
    default:
      return date.toISOString();
  }
}

/**
 * Calculate efficiency percentage
 */
function calculateEfficiency(generationKWh: number, consumptionKWh: number): number {
  if (consumptionKWh <= 0) return 0;
  return Math.min(100, (generationKWh / consumptionKWh) * 100);
}

/**
 * Generate empty data points for a time range (for when no data exists)
 */
function generateEmptyDataPoints(timeRange: TimeRange): ChartDataPoint[] {
  const emptyPoint = (label: string, bucketStart: string): ChartDataPoint => ({
    label,
    bucketStart,
    generationKWh: 0,
    consumptionKWh: 0,
    avgGenerationWatts: 0,
    avgConsumptionWatts: 0,
    efficiency: 0,
  });

  const now = new Date();
  const points: ChartDataPoint[] = [];

  switch (timeRange) {
    case 'day':
      for (let hour = 0; hour < 24; hour++) {
        const date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, 0, 0);
        points.push(emptyPoint(`${hour}:00`, date.toISOString()));
      }
      break;
    
    case 'week':
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        points.push(emptyPoint(dayNames[date.getDay()], date.toISOString()));
      }
      break;
    
    case 'month':
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(now.getFullYear(), now.getMonth(), day, 0, 0, 0);
        points.push(emptyPoint(day.toString(), date.toISOString()));
      }
      break;
    
    case 'year':
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      for (let month = 0; month < 12; month++) {
        const date = new Date(now.getFullYear(), month, 1, 0, 0, 0);
        points.push(emptyPoint(monthNames[month], date.toISOString()));
      }
      break;
  }

  return points;
}

/**
 * Transform backend series data to chart data points
 */
function transformToChartData(
  backendData: BackendSeriesPoint[],
  timeRange: TimeRange
): ChartDataPoint[] {
  if (!backendData || backendData.length === 0) {
    return generateEmptyDataPoints(timeRange);
  }

  // Sort by timestamp
  const sorted = [...backendData].sort(
    (a, b) => new Date(a.bucketStart).getTime() - new Date(b.bucketStart).getTime()
  );

  return sorted.map(point => ({
    label: getBucketLabel(point.bucketStart, timeRange),
    bucketStart: point.bucketStart,
    generationKWh: point.generationKWh || 0,
    consumptionKWh: point.consumptionKWh || 0,
    avgGenerationWatts: point.avgGenerationWatts || 0,
    avgConsumptionWatts: point.avgConsumptionWatts || 0,
    efficiency: calculateEfficiency(point.generationKWh || 0, point.consumptionKWh || 0),
  }));
}

/**
 * Calculate summary from chart data points
 */
function calculateSummary(dataPoints: ChartDataPoint[]): PeriodSummary {
  const totalGenerationKWh = dataPoints.reduce((sum, p) => sum + p.generationKWh, 0);
  const totalConsumptionKWh = dataPoints.reduce((sum, p) => sum + p.consumptionKWh, 0);
  
  let peakGenerationKWh = 0;
  let peakGenerationTime = '';
  
  dataPoints.forEach(point => {
    if (point.generationKWh > peakGenerationKWh) {
      peakGenerationKWh = point.generationKWh;
      peakGenerationTime = point.label;
    }
  });

  return {
    totalGenerationKWh,
    totalConsumptionKWh,
    avgEfficiency: calculateEfficiency(totalGenerationKWh, totalConsumptionKWh),
    peakGenerationKWh,
    peakGenerationTime,
  };
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Get chart data for a single installation
 * 
 * This is the PRIMARY function for getting per-installation chart data.
 * Used by both customer dashboard and admin installation detail view.
 * 
 * @param installationId - The installation ID
 * @param timeRange - Time range to fetch ('day', 'week', 'month', 'year')
 * @returns Chart data ready for rendering
 */
export async function getInstallationChartData(
  installationId: string,
  timeRange: TimeRange
): Promise<ChartDataResponse> {
  if (!installationId) {
    return {
      dataPoints: generateEmptyDataPoints(timeRange),
      summary: { totalGenerationKWh: 0, totalConsumptionKWh: 0, avgEfficiency: 0, peakGenerationKWh: 0, peakGenerationTime: '' },
      timeRange,
      isSystemWide: false,
      installationId: null,
    };
  }

  const { startDate, endDate, bucket } = getDateRangeForTimeRange(timeRange);

  try {
    const backendData = await makeApiRequest<BackendSeriesPoint[]>(() =>
      apiClient.get(`/monitoring/readings/series/${installationId}`, {
        params: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          bucket,
        },
      })
    );

    const dataPoints = transformToChartData(backendData || [], timeRange);
    const summary = calculateSummary(dataPoints);

    return {
      dataPoints,
      summary,
      timeRange,
      isSystemWide: false,
      installationId,
    };
  } catch (error) {
    console.error('[chartData] Error fetching installation chart data:', error);
    return {
      dataPoints: generateEmptyDataPoints(timeRange),
      summary: { totalGenerationKWh: 0, totalConsumptionKWh: 0, avgEfficiency: 0, peakGenerationKWh: 0, peakGenerationTime: '' },
      timeRange,
      isSystemWide: false,
      installationId,
    };
  }
}

/**
 * Get system-wide chart data (all installations combined)
 * 
 * This is the PRIMARY function for getting admin system-wide chart data.
 * Shows combined energy production/consumption across all installations.
 * 
 * @param timeRange - Time range to fetch ('day', 'week', 'month', 'year')
 * @returns Chart data ready for rendering
 */
export async function getSystemChartData(
  timeRange: TimeRange
): Promise<ChartDataResponse & { byType?: Record<string, number> }> {
  const { startDate, endDate, bucket } = getDateRangeForTimeRange(timeRange);

  try {
    const backendData = await makeApiRequest<BackendSystemSeriesPoint[]>(() =>
      apiClient.get('/monitoring/readings/system-series', {
        params: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          bucket,
        },
      })
    );

    const dataPoints = transformToChartData(backendData || [], timeRange);
    const summary = calculateSummary(dataPoints);

    // Extract type breakdown if available
    let byType: Record<string, number> | undefined;
    if (backendData && backendData.length > 0) {
      byType = {};
      backendData.forEach(point => {
        if (point.generationByTypeKWh) {
          Object.entries(point.generationByTypeKWh).forEach(([type, value]) => {
            byType![type] = (byType![type] || 0) + value;
          });
        }
      });
    }

    return {
      dataPoints,
      summary,
      timeRange,
      isSystemWide: true,
      installationId: null,
      byType,
    };
  } catch (error) {
    console.error('[chartData] Error fetching system chart data:', error);
    return {
      dataPoints: generateEmptyDataPoints(timeRange),
      summary: { totalGenerationKWh: 0, totalConsumptionKWh: 0, avgEfficiency: 0, peakGenerationKWh: 0, peakGenerationTime: '' },
      timeRange,
      isSystemWide: true,
      installationId: null,
    };
  }
}

const chartDataApi = {
  getInstallationChartData,
  getSystemChartData,
};

export default chartDataApi;

