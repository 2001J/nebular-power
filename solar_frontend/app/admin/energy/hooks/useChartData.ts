/**
 * useChartData Hook
 * 
 * Transforms pre-aggregated SystemSeriesPoint data into chart-ready format.
 * 
 * IMPORTANT: This hook now expects PRE-AGGREGATED data from getSystemSeriesForTimeRange().
 * The backend has already converted power readings (W) to energy (kWh) using proper
 * trapezoidal integration. We just need to format labels and structure for the chart.
 */

"use client";

import { useMemo } from 'react';
import type { 
  ChartDataPoint, 
  SystemSeriesPoint, 
  SystemOverview, 
  TimeRange 
} from '@/src/types/energyTypes';
import { getBucketLabel } from '@/lib/api/energy';

export interface UseChartDataProps {
  systemSeries: SystemSeriesPoint[];
  overview: SystemOverview | null;
  timeRange: TimeRange;
}

export interface UseChartDataReturn {
  chartData: ChartDataPoint[];
  isEmpty: boolean;
  totalGeneration: number;
  totalConsumption: number;
}

/**
 * Generate empty chart data for a time range (when no data available)
 */
function generateEmptyChartData(timeRange: TimeRange): ChartDataPoint[] {
  const emptyPoint = (name: string): ChartDataPoint => ({
    name,
    total: 0,
    residential: 0,
    commercial: 0,
    industrial: 0,
    consumption: 0
  });

  switch (timeRange) {
    case 'day':
      return Array.from({ length: 24 }, (_, i) => emptyPoint(`${i}:00`));
    case 'week':
      return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(emptyPoint);
    case 'month':
      return Array.from({ length: 31 }, (_, i) => emptyPoint((i + 1).toString()));
    case 'year':
      return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(emptyPoint);
    default:
      return [];
  }
}

/**
 * Custom hook for transforming system series data into chart data
 * 
 * This hook uses pre-integrated kWh values directly from the backend.
 * NO power→energy conversions are done here!
 */
export function useChartData({
  systemSeries,
  overview,
  timeRange
}: UseChartDataProps): UseChartDataReturn {
  
  // Transform system series to chart data
  const chartData = useMemo(() => {
    if (!systemSeries || systemSeries.length === 0) {
      console.log('[useChartData] No series data, generating empty chart');
      return generateEmptyChartData(timeRange);
    }

    console.log('[useChartData] Transforming', systemSeries.length, 'data points for', timeRange);

    // Sort by timestamp
    const sorted = [...systemSeries].sort(
      (a, b) => new Date(a.bucketStart).getTime() - new Date(b.bucketStart).getTime()
    );

    // Transform each point - values are ALREADY in kWh from backend!
    const transformed: ChartDataPoint[] = sorted.map(point => {
      const typeBreakdown = point.generationByTypeKWh || {};
      
      return {
        name: getBucketLabel(point.bucketStart, timeRange),
        total: point.generationKWh || 0,
        residential: typeBreakdown['RESIDENTIAL'] || 0,
        commercial: typeBreakdown['COMMERCIAL'] || 0,
        industrial: typeBreakdown['INDUSTRIAL'] || 0,
        consumption: point.consumptionKWh || 0,
      };
    });

    const totalGen = transformed.reduce((sum, p) => sum + p.total, 0);
    const totalCon = transformed.reduce((sum, p) => sum + p.consumption, 0);
    
    console.log('[useChartData] Chart data ready:', {
      points: transformed.length,
      totalGeneration: totalGen.toFixed(3) + ' kWh',
      totalConsumption: totalCon.toFixed(3) + ' kWh',
    });

    return transformed;
  }, [systemSeries, timeRange]);

  // Calculate totals
  const totals = useMemo(() => {
    const totalGeneration = chartData.reduce((sum, point) => sum + point.total, 0);
    const totalConsumption = chartData.reduce((sum, point) => sum + point.consumption, 0);
    return { totalGeneration, totalConsumption };
  }, [chartData]);

  // Check if data is empty (all zeros)
  const isEmpty = useMemo(() => {
    return chartData.every(point => point.total === 0 && point.consumption === 0);
  }, [chartData]);

  return {
    chartData,
    isEmpty,
    totalGeneration: totals.totalGeneration,
    totalConsumption: totals.totalConsumption
  };
}
