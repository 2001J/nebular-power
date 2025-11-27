/**
 * Energy Monitoring Page (Refactored)
 * Admin dashboard for system-wide energy monitoring
 * 
 * This file has been refactored from 1,585 lines to ~250 lines by:
 * - Extracting data transformation logic to utils/dataTransformers.ts
 * - Moving chart components to components/EnergyChart.tsx
 * - Creating custom hooks for data management
 * - Breaking UI into smaller sub-components
 */

"use client";

import React, { useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import type { TimeRange } from '@/src/types/energyTypes';

// Custom hooks
import { useEnergyData } from './hooks/useEnergyData';
import { useChartData } from './hooks/useChartData';
import { useSystemMetrics } from './hooks/useSystemMetrics';

// Components
import { EnergyChart } from './components/EnergyChart';
import { EnergyMetricsCards } from './components/EnergyMetricsCards';
import { TopProducersTable } from './components/TopProducersTable';
import { ChartControls } from './components/ChartControls';
import { ChartErrorBoundary } from './components/ChartErrorBoundary';
import { formatPower } from '@/lib/energyUtils';

/**
 * Main Energy Monitoring Page Component
 */
export default function EnergyMonitoringPage() {
  // ============================================================================
  // State Management
  // ============================================================================
  
  const [timeRange, setTimeRange] = useState<TimeRange>('day');

  // ============================================================================
  // Data Fetching (Custom Hooks)
  // Now fetches pre-aggregated time-series data based on timeRange
  // ============================================================================
  
  const {
    systemOverview,
    systemSeries,
    loading,
    refetch
  } = useEnergyData({ timeRange });

  // Transform system series to chart data
  // NOTE: systemSeries already contains kWh values - no conversion needed!
  const { chartData, totalGeneration, totalConsumption } = useChartData({
    systemSeries,
    overview: systemOverview,
    timeRange
  });

  const metrics = useSystemMetrics(systemOverview);

  // ============================================================================
  // Event Handlers
  // ============================================================================
  
  /**
   * Handle time range change
   */
  const handleTimeRangeChange = useCallback((value: TimeRange) => {
    console.log('[EnergyMonitoring] Time range changed to:', value);
    setTimeRange(value);
  }, []);

  /**
   * Handle manual data refresh
   */
  const handleRefresh = useCallback(() => {
    console.log('[EnergyMonitoring] Manual refresh triggered');
    refetch();
  }, [refetch]);

  /**
   * Handle data export to CSV
   */
  const handleExportData = useCallback(() => {
    if (!chartData || chartData.length === 0) {
      toast.error('No data to export');
      return;
    }

    try {
      // Create CSV data
      const headers = Object.keys(chartData[0]);
      const csvRows = chartData.map(row =>
        headers.map(header => row[header as keyof typeof row]).join(',')
      );

      // Add headers to top
      csvRows.unshift(headers.join(','));

      // Convert to CSV string
      const csvString = csvRows.join('\n');

      // Create download link
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute(
        'download',
        `energy_data_${timeRange}_${new Date().toISOString().split('T')[0]}.csv`
      );
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success('Export successful', {
        description: `Exported ${timeRange} energy data to CSV file.`
      });
    } catch (err) {
      console.error('[EnergyMonitoring] Export error:', err);
      toast.error('Export failed', {
        description: 'Failed to export data. Please try again.'
      });
    }
  }, [chartData, timeRange]);

  // ============================================================================
  // Render
  // ============================================================================
  
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <Breadcrumb className="mb-2">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/admin">Admin</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Energy Monitoring</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Energy Monitoring
          </h1>
          <p className="text-muted-foreground">
            System-wide view of energy production and consumption across all installations.
          </p>
        </div>
        
        {/* Header Controls - Preset buttons only */}
        <ChartControls
          timeRange={timeRange}
          onTimeRangeChange={handleTimeRangeChange}
          onRefresh={handleRefresh}
          onExport={handleExportData}
          loading={loading}
          showButtonVariant={true}
        />
      </div>

      {/* Overview Header Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">
                Energy Production Overview
              </h2>
              <p className="text-muted-foreground">
                Current system-wide energy production is{' '}
                <span className="font-bold text-green-600">
                  {formatPower(metrics.currentSystemGenerationWatts)}
                </span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Cards */}
      <EnergyMetricsCards metrics={metrics} loading={loading} />

      {/* Charts Section */}
      <Card>
        <CardContent className="pt-6">
          <Tabs defaultValue="combined" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="combined">Production & Consumption</TabsTrigger>
              <TabsTrigger value="production">Production Only</TabsTrigger>
              <TabsTrigger value="consumption">Consumption Only</TabsTrigger>
            </TabsList>

            {/* Combined Chart */}
            <TabsContent value="combined">
              <ChartErrorBoundary>
                <EnergyChart
                  data={chartData}
                  timeRange={timeRange}
                  type="combined"
                  loading={loading}
                  height={400}
                />
              </ChartErrorBoundary>
            </TabsContent>

            {/* Production Chart */}
            <TabsContent value="production">
              <ChartErrorBoundary>
                <EnergyChart
                  data={chartData}
                  timeRange={timeRange}
                  type="production"
                  loading={loading}
                  height={400}
                />
              </ChartErrorBoundary>
            </TabsContent>

            {/* Consumption Chart */}
            <TabsContent value="consumption">
              <ChartErrorBoundary>
                <EnergyChart
                  data={chartData}
                  timeRange={timeRange}
                  type="consumption"
                  loading={loading}
                  height={400}
                />
              </ChartErrorBoundary>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Top Producers Table */}
      <TopProducersTable
        topProducers={systemOverview?.topProducers || []}
        loading={loading}
      />
    </div>
  );
}
