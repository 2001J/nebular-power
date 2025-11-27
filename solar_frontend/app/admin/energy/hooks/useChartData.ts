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
 * 
 * IMPORTANT: Always generates a full time range chart to ensure consistent display
 */
export function useChartData({
  systemSeries,
  overview,
  timeRange
}: UseChartDataProps): UseChartDataReturn {
  
  // Transform system series to chart data
  const chartData = useMemo(() => {
    console.log('[useChartData] Transforming', systemSeries?.length || 0, 'data points for', timeRange);

    // Always start with a full time range of empty buckets
    const buckets: Record<string, ChartDataPoint> = {};
    
    // Initialize all buckets for the time range
    const emptyPoint = (name: string): ChartDataPoint => ({
      name,
      total: 0,
      residential: 0,
      commercial: 0,
      industrial: 0,
      consumption: 0
    });

    if (timeRange === 'day') {
      for (let i = 0; i < 24; i++) {
        const name = `${i}:00`;
        buckets[name] = emptyPoint(name);
      }
    } else if (timeRange === 'week') {
      ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].forEach(day => {
        buckets[day] = emptyPoint(day);
      });
    } else if (timeRange === 'month') {
      const now = new Date();
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      for (let i = 1; i <= daysInMonth; i++) {
        const name = i.toString();
        buckets[name] = emptyPoint(name);
      }
    } else { // year
      ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].forEach(month => {
        buckets[month] = emptyPoint(month);
      });
    }

    // Fill in actual data from series
    if (systemSeries && systemSeries.length > 0) {
      systemSeries.forEach(point => {
        const label = getBucketLabel(point.bucketStart, timeRange);
        const typeBreakdown = point.generationByTypeKWh || {};
        
        if (buckets[label]) {
          buckets[label].total += point.generationKWh || 0;
          buckets[label].residential += typeBreakdown['RESIDENTIAL'] || 0;
          buckets[label].commercial += typeBreakdown['COMMERCIAL'] || 0;
          buckets[label].industrial += typeBreakdown['INDUSTRIAL'] || 0;
          buckets[label].consumption += point.consumptionKWh || 0;
        }
      });
    }

    // Convert to array and sort properly
    const transformed = Object.values(buckets);
    
    // Sort based on time range
    if (timeRange === 'day') {
      transformed.sort((a, b) => parseInt(a.name.split(':')[0]) - parseInt(b.name.split(':')[0]));
    } else if (timeRange === 'week') {
      const dayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      transformed.sort((a, b) => dayOrder.indexOf(a.name) - dayOrder.indexOf(b.name));
    } else if (timeRange === 'month') {
      transformed.sort((a, b) => parseInt(a.name) - parseInt(b.name));
    } else { // year
      const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      transformed.sort((a, b) => monthOrder.indexOf(a.name) - monthOrder.indexOf(b.name));
    }

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
