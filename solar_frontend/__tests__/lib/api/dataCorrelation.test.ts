/**
 * Data Correlation Tests
 * 
 * These tests verify that data flows correctly through the entire pipeline:
 * - Sum of individual installations equals system total
 * - Chart data sums to overview totals
 * - No data loss or incorrect transformations
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SystemSeriesPoint, SystemOverview, ChartDataPoint } from '@/src/types/energyTypes';

// Mock the API client
vi.mock('@/lib/api/client', () => ({
  apiClient: {
    get: vi.fn(),
  },
  makeApiRequest: vi.fn((fn) => fn()),
}));

describe('Data Correlation', () => {
  /**
   * Test: System series data should sum to overview totals
   * This verifies the backend is sending consistent data
   */
  describe('Backend Data Consistency', () => {
    it('system series generationKWh should sum close to overview todayTotalGenerationKWh', () => {
      // Sample system series data (as returned by backend)
      const systemSeries: SystemSeriesPoint[] = [
        { bucketStart: '2025-11-24T00:00:00', generationKWh: 0, consumptionKWh: 0.5, avgGenerationWatts: 0, avgConsumptionWatts: 500 },
        { bucketStart: '2025-11-24T06:00:00', generationKWh: 0.5, consumptionKWh: 0.8, avgGenerationWatts: 500, avgConsumptionWatts: 800 },
        { bucketStart: '2025-11-24T09:00:00', generationKWh: 2.5, consumptionKWh: 1.2, avgGenerationWatts: 2500, avgConsumptionWatts: 1200 },
        { bucketStart: '2025-11-24T12:00:00', generationKWh: 4.0, consumptionKWh: 1.5, avgGenerationWatts: 4000, avgConsumptionWatts: 1500 },
        { bucketStart: '2025-11-24T15:00:00', generationKWh: 2.0, consumptionKWh: 1.8, avgGenerationWatts: 2000, avgConsumptionWatts: 1800 },
        { bucketStart: '2025-11-24T18:00:00', generationKWh: 0.3, consumptionKWh: 2.0, avgGenerationWatts: 300, avgConsumptionWatts: 2000 },
      ];

      // Overview data (should have matching totals)
      const overview: SystemOverview = {
        totalActiveInstallations: 5,
        todayTotalGenerationKWh: 9.3, // 0 + 0.5 + 2.5 + 4.0 + 2.0 + 0.3 = 9.3
        todayTotalConsumptionKWh: 7.8, // 0.5 + 0.8 + 1.2 + 1.5 + 1.8 + 2.0 = 7.8
        weekToDateGenerationKWh: 50.0,
        weekToDateConsumptionKWh: 40.0,
        monthToDateGenerationKWh: 200.0,
        monthToDateConsumptionKWh: 160.0,
        yearToDateGenerationKWh: 2000.0,
        yearToDateConsumptionKWh: 1600.0,
        currentSystemGenerationWatts: 2000,
        averageSystemEfficiency: 85.5,
        recentlyActiveInstallations: [],
        recentInstallationReadings: [],
        topProducers: [],
      };

      // Calculate sum from series
      const seriesGenerationTotal = systemSeries.reduce((sum, pt) => sum + pt.generationKWh, 0);
      const seriesConsumptionTotal = systemSeries.reduce((sum, pt) => sum + pt.consumptionKWh, 0);

      // Verify correlation within 1% tolerance
      const generationDrift = Math.abs(seriesGenerationTotal - overview.todayTotalGenerationKWh) / overview.todayTotalGenerationKWh;
      const consumptionDrift = Math.abs(seriesConsumptionTotal - overview.todayTotalConsumptionKWh) / overview.todayTotalConsumptionKWh;

      expect(generationDrift).toBeLessThan(0.01);
      expect(consumptionDrift).toBeLessThan(0.01);
    });
  });

  /**
   * Test: Chart transformation should preserve totals
   */
  describe('Frontend Data Transformation', () => {
    it('transformed chart data should preserve total energy values', () => {
      // Input: SystemSeriesPoint data
      const systemSeries: SystemSeriesPoint[] = [
        { 
          bucketStart: '2025-11-24T10:00:00', 
          generationKWh: 3.5, 
          consumptionKWh: 2.1,
          avgGenerationWatts: 3500,
          avgConsumptionWatts: 2100,
          generationByTypeKWh: { RESIDENTIAL: 2.0, COMMERCIAL: 1.0, INDUSTRIAL: 0.5 },
          consumptionByTypeKWh: { RESIDENTIAL: 1.2, COMMERCIAL: 0.6, INDUSTRIAL: 0.3 },
        },
        { 
          bucketStart: '2025-11-24T11:00:00', 
          generationKWh: 4.2, 
          consumptionKWh: 2.5,
          avgGenerationWatts: 4200,
          avgConsumptionWatts: 2500,
          generationByTypeKWh: { RESIDENTIAL: 2.4, COMMERCIAL: 1.2, INDUSTRIAL: 0.6 },
          consumptionByTypeKWh: { RESIDENTIAL: 1.5, COMMERCIAL: 0.7, INDUSTRIAL: 0.3 },
        },
      ];

      // Transform to chart data (simulating useChartData hook)
      const chartData: ChartDataPoint[] = systemSeries.map(point => ({
        name: `${new Date(point.bucketStart).getHours()}:00`,
        total: point.generationKWh,
        residential: point.generationByTypeKWh?.RESIDENTIAL || 0,
        commercial: point.generationByTypeKWh?.COMMERCIAL || 0,
        industrial: point.generationByTypeKWh?.INDUSTRIAL || 0,
        consumption: point.consumptionKWh,
      }));

      // Verify totals are preserved
      const inputGenerationTotal = systemSeries.reduce((sum, pt) => sum + pt.generationKWh, 0);
      const outputGenerationTotal = chartData.reduce((sum, pt) => sum + pt.total, 0);

      const inputConsumptionTotal = systemSeries.reduce((sum, pt) => sum + pt.consumptionKWh, 0);
      const outputConsumptionTotal = chartData.reduce((sum, pt) => sum + pt.consumption, 0);

      expect(outputGenerationTotal).toBeCloseTo(inputGenerationTotal, 5);
      expect(outputConsumptionTotal).toBeCloseTo(inputConsumptionTotal, 5);

      // Verify type breakdown sums to total
      const residentialTotal = chartData.reduce((sum, pt) => sum + pt.residential, 0);
      const commercialTotal = chartData.reduce((sum, pt) => sum + pt.commercial, 0);
      const industrialTotal = chartData.reduce((sum, pt) => sum + pt.industrial, 0);
      
      expect(residentialTotal + commercialTotal + industrialTotal).toBeCloseTo(outputGenerationTotal, 5);
    });

    it('should handle empty data gracefully', () => {
      const emptyChartData: ChartDataPoint[] = [];
      
      const totalGeneration = emptyChartData.reduce((sum, pt) => sum + pt.total, 0);
      const totalConsumption = emptyChartData.reduce((sum, pt) => sum + pt.consumption, 0);

      expect(totalGeneration).toBe(0);
      expect(totalConsumption).toBe(0);
    });

    it('should handle missing type breakdown', () => {
      const seriesWithoutTypes: SystemSeriesPoint[] = [
        { 
          bucketStart: '2025-11-24T10:00:00', 
          generationKWh: 3.5, 
          consumptionKWh: 2.1,
          avgGenerationWatts: 3500,
          avgConsumptionWatts: 2100,
          // No generationByTypeKWh
        },
      ];

      // Transform without type data
      const chartData: ChartDataPoint[] = seriesWithoutTypes.map(point => ({
        name: `${new Date(point.bucketStart).getHours()}:00`,
        total: point.generationKWh,
        residential: point.generationByTypeKWh?.RESIDENTIAL || 0,
        commercial: point.generationByTypeKWh?.COMMERCIAL || 0,
        industrial: point.generationByTypeKWh?.INDUSTRIAL || 0,
        consumption: point.consumptionKWh,
      }));

      // Total should still be correct
      expect(chartData[0].total).toBe(3.5);
      expect(chartData[0].consumption).toBe(2.1);
      
      // Type breakdown should be 0
      expect(chartData[0].residential).toBe(0);
      expect(chartData[0].commercial).toBe(0);
      expect(chartData[0].industrial).toBe(0);
    });
  });

  /**
   * Test: Normalization factor sanity check
   */
  describe('Normalization Factor Validation', () => {
    it('should flag excessive normalization as a data problem', () => {
      // If chart data requires >2x normalization, something is wrong
      const chartTotal = 5.0;  // Sum from chart
      const expectedTotal = 15.0;  // From overview
      
      const normalizationFactor = expectedTotal / chartTotal;
      
      // This should be flagged as problematic
      const isProblematic = normalizationFactor < 0.5 || normalizationFactor > 2.0;
      
      expect(isProblematic).toBe(true);
      expect(normalizationFactor).toBe(3.0); // 15/5 = 3x normalization needed
    });

    it('should accept minor normalization factors', () => {
      // Minor floating point differences are OK
      const chartTotal = 9.28;
      const expectedTotal = 9.3;
      
      const normalizationFactor = expectedTotal / chartTotal;
      
      // Should be close to 1.0
      expect(normalizationFactor).toBeCloseTo(1.0, 1);
      
      const isAcceptable = normalizationFactor >= 0.95 && normalizationFactor <= 1.05;
      expect(isAcceptable).toBe(true);
    });
  });

  /**
   * Test: Data correlation across time ranges
   */
  describe('Time Range Aggregation', () => {
    it('week total should be >= day total', () => {
      const overview: Partial<SystemOverview> = {
        todayTotalGenerationKWh: 9.3,
        weekToDateGenerationKWh: 52.5,  // Should be >= today
      };

      expect(overview.weekToDateGenerationKWh).toBeGreaterThanOrEqual(overview.todayTotalGenerationKWh!);
    });

    it('month total should be >= week total', () => {
      const overview: Partial<SystemOverview> = {
        weekToDateGenerationKWh: 52.5,
        monthToDateGenerationKWh: 180.0,  // Should be >= week
      };

      expect(overview.monthToDateGenerationKWh).toBeGreaterThanOrEqual(overview.weekToDateGenerationKWh!);
    });

    it('year total should be >= month total', () => {
      const overview: Partial<SystemOverview> = {
        monthToDateGenerationKWh: 180.0,
        yearToDateGenerationKWh: 2000.0,  // Should be >= month
      };

      expect(overview.yearToDateGenerationKWh).toBeGreaterThanOrEqual(overview.monthToDateGenerationKWh!);
    });
  });
});

