/**
 * useEnergyData Hook
 * 
 * Fetches system-wide energy data for the admin energy monitoring page.
 * 
 * KEY CHANGE: Now fetches pre-aggregated time-series data from getSystemSeriesForTimeRange()
 * instead of using snapshot readings from the overview.
 */

"use client";

import { useState, useEffect, useCallback } from 'react';
import { energyApi } from '@/lib/api';
import type { 
  SystemOverview, 
  SystemSeriesPoint, 
  Installation, 
  TimeRange 
} from '@/src/types/energyTypes';
import { toast } from 'sonner';

export interface UseEnergyDataProps {
  timeRange?: TimeRange;
}

export interface UseEnergyDataReturn {
  systemOverview: SystemOverview | null;
  systemSeries: SystemSeriesPoint[];  // Pre-aggregated time-series data
  installations: Installation[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Custom hook for fetching and managing system-wide energy data
 * 
 * @param props.timeRange - Time range to fetch data for ('day', 'week', 'month', 'year')
 */
export function useEnergyData(props?: UseEnergyDataProps): UseEnergyDataReturn {
  const timeRange = props?.timeRange || 'day';
  
  const [systemOverview, setSystemOverview] = useState<SystemOverview | null>(null);
  const [systemSeries, setSystemSeries] = useState<SystemSeriesPoint[]>([]);
  const [installations, setInstallations] = useState<Installation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch energy data from API
   */
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('[useEnergyData] Fetching data for timeRange:', timeRange);
      
      // Fetch overview and time-series data in parallel
      const [overview, series] = await Promise.all([
        energyApi.getSystemOverview(),
        energyApi.getSystemSeriesForTimeRange(timeRange)
      ]);
      
      console.log('[useEnergyData] Overview received:', {
        todayGeneration: overview?.todayTotalGenerationKWh,
        activeInstallations: overview?.totalActiveInstallations,
      });
      
      console.log('[useEnergyData] Series received:', {
        pointCount: series?.length || 0,
        firstPoint: series?.[0],
        lastPoint: series?.[series?.length - 1],
      });
      
      setSystemOverview(overview);
      setSystemSeries(series || []);
      setInstallations(overview?.recentlyActiveInstallations || []);
      
    } catch (err: unknown) {
      console.error('[useEnergyData] Error fetching data:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load energy data';
      setError(errorMessage);
      toast.error('Failed to load energy data', {
        description: errorMessage
      });
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  // Fetch data on mount and when timeRange changes
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    systemOverview,
    systemSeries,
    installations,
    loading,
    error,
    refetch: fetchData
  };
}
