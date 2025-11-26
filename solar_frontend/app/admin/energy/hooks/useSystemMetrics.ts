/**
 * useSystemMetrics Hook
 * Extracts and manages system-wide energy metrics
 */

"use client";

import { useMemo } from 'react';
import type { SystemOverview, EnergyMetricsData } from '@/src/types/energyTypes';

export interface UseSystemMetricsReturn extends EnergyMetricsData {
  hasData: boolean;
}

/**
 * Custom hook for extracting system metrics from overview data
 * Provides memoized metrics to prevent unnecessary recalculations
 */
export function useSystemMetrics(systemOverview: SystemOverview | null): UseSystemMetricsReturn {
  const metrics = useMemo(() => {
    if (!systemOverview) {
      return {
        totalProductionToday: 0,
        totalProductionWeek: 0,
        totalProductionMonth: 0,
        totalProductionYear: 0,
        totalConsumptionToday: 0,
        totalConsumptionWeek: 0,
        totalConsumptionMonth: 0,
        totalConsumptionYear: 0,
        averageEfficiency: 0,
        currentSystemGenerationWatts: 0,
        totalActiveInstallations: 0,
        hasData: false
      };
    }

    return {
      totalProductionToday: systemOverview.todayTotalGenerationKWh || 0,
      totalProductionWeek: systemOverview.weekToDateGenerationKWh || 0,
      totalProductionMonth: systemOverview.monthToDateGenerationKWh || 0,
      totalProductionYear: systemOverview.yearToDateGenerationKWh || 0,
      totalConsumptionToday: systemOverview.todayTotalConsumptionKWh || 0,
      totalConsumptionWeek: systemOverview.weekToDateConsumptionKWh || 0,
      totalConsumptionMonth: systemOverview.monthToDateConsumptionKWh || 0,
      totalConsumptionYear: systemOverview.yearToDateConsumptionKWh || 0,
      averageEfficiency: systemOverview.averageSystemEfficiency || 0,
      currentSystemGenerationWatts: systemOverview.currentSystemGenerationWatts || 0,
      totalActiveInstallations: systemOverview.totalActiveInstallations || 0,
      hasData: true
    };
  }, [systemOverview]);

  return metrics;
}
