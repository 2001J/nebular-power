/**
 * useInstallationChartData Hook - SINGLE SOURCE OF TRUTH
 * 
 * This hook provides chart data for a single installation.
 * It should be used by BOTH:
 * - Customer dashboard (solar_frontend/app/customer/charts/page.tsx)
 * - Admin installation detail (solar_frontend/app/admin/installations/[id]/page.tsx)
 * 
 * This ensures that the same installation data looks identical regardless of who views it.
 */

"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  getInstallationChartData, 
  ChartDataResponse, 
  ChartDataPoint,
  TimeRange 
} from '@/lib/api/chartData';

export interface UseInstallationChartDataOptions {
  /** The installation ID to fetch data for */
  installationId: string | null;
  /** Time range to display */
  timeRange: TimeRange;
  /** Auto-refresh interval in milliseconds (0 = disabled) */
  refreshInterval?: number;
}

export interface UseInstallationChartDataReturn {
  /** Chart data points ready for rendering */
  dataPoints: ChartDataPoint[];
  /** Summary metrics for the period */
  summary: ChartDataResponse['summary'];
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
 * Hook for fetching and managing installation chart data
 * 
 * @example
 * ```tsx
 * // In customer charts page:
 * const { dataPoints, loading, totalGeneration } = useInstallationChartData({
 *   installationId: selectedInstallation,
 *   timeRange: 'day',
 * });
 * 
 * // In admin installation detail:
 * const { dataPoints, loading, refetch } = useInstallationChartData({
 *   installationId: id,
 *   timeRange: selectedTimeRange,
 * });
 * ```
 */
export function useInstallationChartData(
  options: UseInstallationChartDataOptions
): UseInstallationChartDataReturn {
  const { installationId, timeRange, refreshInterval = 0 } = options;

  const [chartData, setChartData] = useState<ChartDataResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch chart data from API
   */
  const fetchData = useCallback(async () => {
    if (!installationId) {
      setChartData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log(`[useInstallationChartData] Fetching data for installation ${installationId}, timeRange: ${timeRange}`);
      
      const response = await getInstallationChartData(installationId, timeRange);
      
      console.log(`[useInstallationChartData] Received ${response.dataPoints.length} data points`);
      console.log(`[useInstallationChartData] Summary:`, response.summary);
      
      setChartData(response);
    } catch (err) {
      console.error('[useInstallationChartData] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load chart data');
    } finally {
      setLoading(false);
    }
  }, [installationId, timeRange]);

  // Fetch on mount and when dependencies change
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Set up auto-refresh if enabled
  useEffect(() => {
    if (refreshInterval > 0 && installationId) {
      const interval = setInterval(fetchData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchData, refreshInterval, installationId]);

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
    loading,
    error,
    refetch: fetchData,
    totalGeneration: summary.totalGenerationKWh,
    totalConsumption: summary.totalConsumptionKWh,
    avgEfficiency: summary.avgEfficiency,
    isEmpty,
  };
}

export default useInstallationChartData;

