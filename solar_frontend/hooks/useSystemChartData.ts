/**
 * useSystemChartData Hook
 * 
 * This hook provides system-wide chart data (all installations combined).
 * Used by the admin energy monitoring page to show aggregate data.
 */

"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  getSystemChartData, 
  ChartDataResponse, 
  ChartDataPoint,
  TimeRange 
} from '@/lib/api/chartData';

export interface UseSystemChartDataOptions {
  /** Time range to display */
  timeRange: TimeRange;
  /** Auto-refresh interval in milliseconds (0 = disabled) */
  refreshInterval?: number;
}

export interface UseSystemChartDataReturn {
  /** Chart data points ready for rendering */
  dataPoints: ChartDataPoint[];
  /** Summary metrics for the period */
  summary: ChartDataResponse['summary'];
  /** Generation breakdown by installation type */
  byType: Record<string, number> | undefined;
  /** Whether data is currently loading */
  loading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Manually trigger a data refresh */
  refetch: () => Promise<void>;
  /** Total generation for the period (kWh) */
  totalGeneration: number;
  /** Total consumption for the period (kWh) */
  totalConsumption: number;
  /** Average efficiency for the period (%) */
  avgEfficiency: number;
  /** Whether data is empty (no readings) */
  isEmpty: boolean;
}

/**
 * Hook for fetching and managing system-wide chart data
 * 
 * @example
 * ```tsx
 * // In admin energy monitoring page:
 * const { dataPoints, loading, byType, totalGeneration } = useSystemChartData({
 *   timeRange: 'day',
 * });
 * ```
 */
export function useSystemChartData(
  options: UseSystemChartDataOptions
): UseSystemChartDataReturn {
  const { timeRange, refreshInterval = 0 } = options;

  const [chartData, setChartData] = useState<(ChartDataResponse & { byType?: Record<string, number> }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch chart data from API
   */
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      console.log(`[useSystemChartData] Fetching system-wide data for timeRange: ${timeRange}`);
      
      const response = await getSystemChartData(timeRange);
      
      console.log(`[useSystemChartData] Received ${response.dataPoints.length} data points`);
      console.log(`[useSystemChartData] Summary:`, response.summary);
      if (response.byType) {
        console.log(`[useSystemChartData] By type:`, response.byType);
      }
      
      setChartData(response);
    } catch (err) {
      console.error('[useSystemChartData] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load chart data');
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  // Fetch on mount and when dependencies change
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Set up auto-refresh if enabled
  useEffect(() => {
    if (refreshInterval > 0) {
      const interval = setInterval(fetchData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchData, refreshInterval]);

  // Computed values
  const dataPoints = useMemo(() => chartData?.dataPoints || [], [chartData]);
  
  const summary = useMemo(() => chartData?.summary || {
    totalGenerationKWh: 0,
    totalConsumptionKWh: 0,
    avgEfficiency: 0,
    peakGenerationKWh: 0,
    peakGenerationTime: '',
  }, [chartData]);

  const isEmpty = useMemo(() => {
    if (!chartData) return true;
    return chartData.dataPoints.every(p => p.generationKWh === 0 && p.consumptionKWh === 0);
  }, [chartData]);

  return {
    dataPoints,
    summary,
    byType: chartData?.byType,
    loading,
    error,
    refetch: fetchData,
    totalGeneration: summary.totalGenerationKWh,
    totalConsumption: summary.totalConsumptionKWh,
    avgEfficiency: summary.avgEfficiency,
    isEmpty,
  };
}

export default useSystemChartData;

