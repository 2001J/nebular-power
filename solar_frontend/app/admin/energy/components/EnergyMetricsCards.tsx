/**
 * EnergyMetricsCards Component
 * Displays summary cards for energy production and consumption metrics
 */

"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUp, Zap, Battery, TrendingUp } from 'lucide-react';
import type { EnergyMetricsData } from '@/src/types/energyTypes';
import { formatEnergy, formatEfficiency, formatPower } from '@/lib/energyUtils';

export interface EnergyMetricsCardsProps {
  metrics: EnergyMetricsData;
  loading?: boolean;
}

/**
 * Format energy value with appropriate unit
 */
function formatEnergyValue(kWh: number): string {
  return formatEnergy(kWh);
}

/**
 * EnergyMetricsCards Component
 */
export function EnergyMetricsCards({ metrics, loading = false }: EnergyMetricsCardsProps) {
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <div className="h-4 w-32 bg-muted animate-pulse rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-24 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <>
      {/* Production Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              Today&apos;s Production
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatEnergyValue(metrics.totalProductionToday)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              <ArrowUp className="inline h-4 w-4 text-green-500" /> Data available
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              Weekly Production
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatEnergyValue(metrics.totalProductionWeek)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              <ArrowUp className="inline h-4 w-4 text-green-500" /> Data available
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              Monthly Production
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatEnergyValue(metrics.totalProductionMonth)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              <ArrowUp className="inline h-4 w-4 text-green-500" /> Data available
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              Yearly Production
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatEnergyValue(metrics.totalProductionYear)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              <ArrowUp className="inline h-4 w-4 text-green-500" /> Data available
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Consumption and System Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Battery className="h-4 w-4 text-blue-500" />
              Today&apos;s Consumption
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatEnergyValue(metrics.totalConsumptionToday)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              System usage
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              Average Efficiency
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatEfficiency(metrics.averageEfficiency)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              System-wide average
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4 text-orange-500" />
              Current Generation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPower(metrics.currentSystemGenerationWatts)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Real-time power
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Installations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.totalActiveInstallations}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Currently online
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
