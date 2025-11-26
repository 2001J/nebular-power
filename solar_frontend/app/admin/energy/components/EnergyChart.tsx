/**
 * Reusable Energy Chart Component
 * Consolidates three chart variants into one configurable component
 */

"use client";

import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  AreaChart,
  Bar,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from '@/components/ui/direct-recharts';
import { ChartContainer } from '@/components/ui/chart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Sun, AlertTriangle, Zap } from 'lucide-react';
import type { ChartDataPoint, ChartType, TimeRange } from '@/src/types/energyTypes';
import { formatChartYAxis, formatChartTooltip, getMonthlyXAxisConfig } from '@/lib/energyUtils';

// ============================================================================
// Component Props
// ============================================================================

export interface EnergyChartProps {
  data: ChartDataPoint[];
  timeRange: TimeRange;
  type: ChartType;
  loading?: boolean;
  height?: number;
  title?: string;
  showLegend?: boolean;
}

// ============================================================================
// Loading Skeleton Component
// ============================================================================

function ChartSkeleton({ height = 400 }: Readonly<{ height?: number }>) {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
      </CardHeader>
      <CardContent>
        <Skeleton className={`h-[${height}px] w-full`} />
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Empty State Component
// ============================================================================

function EmptyChartState() {
  return (
    <Card>
      <CardContent className="py-12">
        <div className="flex flex-col items-center justify-center text-center">
          <Sun className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No Data Available</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Energy data will appear here once your installations start generating power.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Chart Configuration for shadcn theming
// ============================================================================

const chartConfig = {
  total: {
    label: "Total Production",
    color: "hsl(142, 76%, 36%)", // Vibrant green for solar energy
    gradientStart: "hsl(142, 76%, 46%)",
    gradientEnd: "hsl(142, 76%, 26%)",
  },
  residential: {
    label: "Residential",
    color: "hsl(217, 91%, 60%)", // Bright blue
    gradientStart: "hsl(217, 91%, 70%)",
    gradientEnd: "hsl(217, 91%, 50%)",
  },
  commercial: {
    label: "Commercial",
    color: "hsl(280, 100%, 70%)", // Purple
    gradientStart: "hsl(280, 100%, 80%)",
    gradientEnd: "hsl(280, 100%, 60%)",
  },
  industrial: {
    label: "Industrial",
    color: "hsl(25, 95%, 53%)", // Orange
    gradientStart: "hsl(25, 95%, 63%)",
    gradientEnd: "hsl(25, 95%, 43%)",
  },
  consumption: {
    label: "Consumption",
    color: "hsl(0, 84%, 60%)", // Red-orange
    gradientStart: "hsl(0, 84%, 70%)",
    gradientEnd: "hsl(0, 84%, 50%)",
  },
};

// ============================================================================
// X-Axis Configuration Helper
// ============================================================================

function getXAxisConfig(timeRange: TimeRange) {
  if (timeRange === 'day') {
    return { interval: 2 }; // Show every 3rd hour (0, 3, 6, 9, etc.)
  }
  if (timeRange === 'month') {
    return getMonthlyXAxisConfig();
  }
  return {}; // Default for week and year
}

// ============================================================================
// Combined Chart (Production + Consumption)
// ============================================================================

function CombinedChart({ data, timeRange }: Readonly<{ data: ChartDataPoint[]; timeRange: TimeRange }>) {
  const xAxisConfig = getXAxisConfig(timeRange);

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border bg-background/95 backdrop-blur-sm p-3 shadow-lg">
          <p className="font-semibold text-sm mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 mb-1">
              <div
                className="w-3 h-3 rounded-full"
                style={{
                  backgroundColor: entry.color,
                  boxShadow: `0 0 8px ${entry.color}40`
                }}
              />
              <span className="text-xs text-muted-foreground">{entry.name}:</span>
              <span className="text-sm font-medium">
                {formatChartTooltip(entry.value)}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <ChartContainer className="h-[400px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart 
          data={data} 
          margin={{ top: 20, right: 20, left: 20, bottom: 20 }}
        >
          <defs>
            <linearGradient id="productionGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={chartConfig.total.gradientStart} stopOpacity={0.9} />
              <stop offset="50%" stopColor={chartConfig.total.color} stopOpacity={0.8} />
              <stop offset="100%" stopColor={chartConfig.total.gradientEnd} stopOpacity={0.6} />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <CartesianGrid 
            strokeDasharray="3 3" 
            className="stroke-muted/30" 
            vertical={false}
          />
          <XAxis
            dataKey="name"
            className="text-xs"
            tickLine={false}
            axisLine={false}
            tick={{ fill: 'hsl(var(--muted-foreground))' }}
            {...xAxisConfig}
          />
          <YAxis
            yAxisId="left"
            tickFormatter={formatChartYAxis}
            className="text-xs"
            tickLine={false}
            axisLine={false}
            tick={{ fill: 'hsl(var(--muted-foreground))' }}
            width={60}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tickFormatter={formatChartYAxis}
            className="text-xs"
            tickLine={false}
            axisLine={false}
            tick={{ fill: 'hsl(var(--muted-foreground))' }}
            width={60}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="circle"
          />
          <Area
            yAxisId="left"
            type="monotone"
            dataKey="total"
            name="Total Production"
            fill="url(#productionGradient)"
            stroke={chartConfig.total.color}
            strokeWidth={2}
            fillOpacity={0.7}
            style={{ filter: 'url(#glow)' }}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="consumption"
            name="Consumption"
            stroke={chartConfig.consumption.color}
            strokeWidth={3}
            dot={{ 
              fill: chartConfig.consumption.color, 
              strokeWidth: 2, 
              r: 4,
              filter: 'drop-shadow(0 0 4px rgba(255, 100, 100, 0.6))'
            }}
            activeDot={{ 
              r: 6, 
              fill: chartConfig.consumption.color,
              stroke: 'white',
              strokeWidth: 2,
              filter: 'drop-shadow(0 0 8px rgba(255, 100, 100, 0.8))'
            }}
            style={{ 
              stroke: chartConfig.consumption.color,
              filter: 'drop-shadow(0 0 2px rgba(255, 100, 100, 0.4))'
            }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}

// ============================================================================
// Production Chart (Stacked by Type)
// ============================================================================

function ProductionChart({ data, timeRange }: Readonly<{ data: ChartDataPoint[]; timeRange: TimeRange }>) {
  const xAxisConfig = getXAxisConfig(timeRange);

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const total = payload.reduce((sum: number, entry: any) => sum + (entry.value || 0), 0);
      return (
        <div className="rounded-lg border bg-background/95 backdrop-blur-sm p-3 shadow-lg">
          <p className="font-semibold text-sm mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 mb-1">
              <div
                className="w-3 h-3 rounded-full"
                style={{
                  backgroundColor: entry.color,
                  boxShadow: `0 0 8px ${entry.color}40`
                }}
              />
              <span className="text-xs text-muted-foreground">{entry.name}:</span>
              <span className="text-sm font-medium">
                {formatChartTooltip(entry.value)}
              </span>
            </div>
          ))}
          <div className="mt-2 pt-2 border-t">
            <div className="flex items-center gap-2">
              <Zap className="w-3 h-3 text-primary" />
              <span className="text-xs text-muted-foreground">Total:</span>
              <span className="text-sm font-semibold">
                {formatChartTooltip(total)}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <ChartContainer className="h-[400px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
          <defs>
            <linearGradient id="residentialGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={chartConfig.residential.gradientStart} stopOpacity={0.9} />
              <stop offset="50%" stopColor={chartConfig.residential.color} stopOpacity={0.7} />
              <stop offset="100%" stopColor={chartConfig.residential.gradientEnd} stopOpacity={0.4} />
            </linearGradient>
            <linearGradient id="commercialGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={chartConfig.commercial.gradientStart} stopOpacity={0.9} />
              <stop offset="50%" stopColor={chartConfig.commercial.color} stopOpacity={0.7} />
              <stop offset="100%" stopColor={chartConfig.commercial.gradientEnd} stopOpacity={0.4} />
            </linearGradient>
            <linearGradient id="industrialGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={chartConfig.industrial.gradientStart} stopOpacity={0.9} />
              <stop offset="50%" stopColor={chartConfig.industrial.color} stopOpacity={0.7} />
              <stop offset="100%" stopColor={chartConfig.industrial.gradientEnd} stopOpacity={0.4} />
            </linearGradient>
            <filter id="productionStackGlow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <CartesianGrid 
            strokeDasharray="3 3" 
            className="stroke-muted/30" 
            vertical={false}
          />
          <XAxis
            dataKey="name"
            className="text-xs"
            tickLine={false}
            axisLine={false}
            tick={{ fill: 'hsl(var(--muted-foreground))' }}
            {...xAxisConfig}
          />
          <YAxis
            tickFormatter={formatChartYAxis}
            className="text-xs"
            tickLine={false}
            axisLine={false}
            tick={{ fill: 'hsl(var(--muted-foreground))' }}
            width={60}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="circle"
          />
          <Area
            type="monotone"
            dataKey="residential"
            name="Residential"
            stackId="a"
            fill="url(#residentialGradient)"
            stroke={chartConfig.residential.color}
            strokeWidth={2}
            fillOpacity={0.8}
            style={{ filter: 'url(#productionStackGlow)' }}
          />
          <Area
            type="monotone"
            dataKey="commercial"
            name="Commercial"
            stackId="a"
            fill="url(#commercialGradient)"
            stroke={chartConfig.commercial.color}
            strokeWidth={2}
            fillOpacity={0.8}
            style={{ filter: 'url(#productionStackGlow)' }}
          />
          <Area
            type="monotone"
            dataKey="industrial"
            name="Industrial"
            stackId="a"
            fill="url(#industrialGradient)"
            stroke={chartConfig.industrial.color}
            strokeWidth={2}
            fillOpacity={0.8}
            style={{ filter: 'url(#productionStackGlow)' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}

// ============================================================================
// Consumption Chart (Area)
// ============================================================================

function ConsumptionChart({ data, timeRange }: Readonly<{ data: ChartDataPoint[]; timeRange: TimeRange }>) {
  const xAxisConfig = getXAxisConfig(timeRange);

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border bg-background/95 backdrop-blur-sm p-3 shadow-lg">
          <p className="font-semibold text-sm mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{
                  backgroundColor: entry.color,
                  boxShadow: `0 0 8px ${entry.color}40`
                }}
              />
              <span className="text-xs text-muted-foreground">{entry.name}:</span>
              <span className="text-sm font-medium">
                {formatChartTooltip(entry.value)}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <ChartContainer className="h-[400px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
          <defs>
            <linearGradient id="consumptionGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={chartConfig.consumption.gradientStart} stopOpacity={0.9} />
              <stop offset="50%" stopColor={chartConfig.consumption.color} stopOpacity={0.7} />
              <stop offset="100%" stopColor={chartConfig.consumption.gradientEnd} stopOpacity={0.2} />
            </linearGradient>
            <filter id="consumptionGlow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <CartesianGrid 
            strokeDasharray="3 3" 
            className="stroke-muted/30" 
            vertical={false}
          />
          <XAxis
            dataKey="name"
            className="text-xs"
            tickLine={false}
            axisLine={false}
            tick={{ fill: 'hsl(var(--muted-foreground))' }}
            {...xAxisConfig}
          />
          <YAxis
            tickFormatter={formatChartYAxis}
            className="text-xs"
            tickLine={false}
            axisLine={false}
            tick={{ fill: 'hsl(var(--muted-foreground))' }}
            width={60}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="circle"
          />
          <Area
            type="monotone"
            dataKey="consumption"
            name="Consumption"
            stroke={chartConfig.consumption.color}
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#consumptionGradient)"
            style={{ 
              stroke: chartConfig.consumption.color,
              filter: 'url(#consumptionGlow)'
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}

// ============================================================================
// Main EnergyChart Component
// ============================================================================

export function EnergyChart({
  data,
  timeRange,
  type,
  loading = false,
  height = 400,
  title,
  showLegend = true
}: Readonly<EnergyChartProps>) {
  // Debug logging
  console.log('[EnergyChart] Rendering with:', {
    type,
    timeRange,
    dataLength: data?.length,
    loading,
    firstDataPoint: data?.[0]
  });

  // Show loading skeleton
  if (loading) {
    console.log('[EnergyChart] Showing loading skeleton');
    return <ChartSkeleton height={height} />;
  }

  // Show empty state if no data
  if (!data || data.length === 0) {
    console.log('[EnergyChart] Showing empty state - no data');
    return <EmptyChartState />;
  }

  console.log('[EnergyChart] Rendering chart with', data.length, 'data points');

  // Render appropriate chart based on type
  const renderChart = () => {
    switch (type) {
      case 'combined':
        return <CombinedChart data={data} timeRange={timeRange} />;
      case 'production':
        return <ProductionChart data={data} timeRange={timeRange} />;
      case 'consumption':
        return <ConsumptionChart data={data} timeRange={timeRange} />;
      default:
        return (
          <div className="flex items-center justify-center h-[400px]">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">Invalid chart type</p>
            </div>
          </div>
        );
    }
  };

  // Wrap in card if title provided
  if (title) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          {renderChart()}
        </CardContent>
      </Card>
    );
  }

  // Return chart directly if no title
  return <>{renderChart()}</>;
}

// ============================================================================
// Export Individual Chart Components (Optional)
// ============================================================================

export { CombinedChart, ProductionChart, ConsumptionChart, ChartSkeleton, EmptyChartState };
