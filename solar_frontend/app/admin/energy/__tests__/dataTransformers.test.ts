/**
 * Unit Tests for Energy Chart Data Transformers
 * Tests the core data transformation logic extracted from the monolithic component
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  EnergyChartDataTransformer,
  transformReadingsToChartData
} from '../utils/dataTransformers';
import type {
  EnergyReading,
  SystemOverview
} from '@/src/types/energyTypes';

describe('EnergyChartDataTransformer', () => {
  let mockReadings: EnergyReading[];
  let mockOverview: SystemOverview;

  beforeEach(() => {
    // Setup mock data
    mockReadings = [
      {
        id: '1',
        installationId: 'inst-1',
        powerGenerationWatts: 4000,
        powerConsumptionWatts: 3000,
        timestamp: '2025-11-23T10:00:00Z',
        totalGenerationKWh: 4,
        totalConsumptionKWh: 3
      },
      {
        id: '2',
        installationId: 'inst-2',
        powerGenerationWatts: 3000,
        powerConsumptionWatts: 2500,
        timestamp: '2025-11-23T11:00:00Z',
        totalGenerationKWh: 3,
        totalConsumptionKWh: 2.5
      }
    ];

    mockOverview = {
      totalActiveInstallations: 2,
      todayTotalGenerationKWh: 50,
      todayTotalConsumptionKWh: 40,
      weekToDateGenerationKWh: 300,
      weekToDateConsumptionKWh: 250,
      monthToDateGenerationKWh: 1200,
      monthToDateConsumptionKWh: 1000,
      yearToDateGenerationKWh: 12000,
      yearToDateConsumptionKWh: 10000,
      currentSystemGenerationWatts: 5000,
      averageSystemEfficiency: 85,
      recentlyActiveInstallations: [],
      recentInstallationReadings: [],
      topProducers: []
    };
  });

  describe('Day View Transformation', () => {
    it('should create 24 hourly buckets for day view', () => {
      const transformer = new EnergyChartDataTransformer(
        mockReadings,
        mockOverview,
        'day'
      );
      const result = transformer.transform();

      expect(result).toHaveLength(24);
      expect(result[0].name).toBe('0:00');
      expect(result[23].name).toBe('23:00');
    });

    it('should normalize production data to match overview totals', () => {
      const transformer = new EnergyChartDataTransformer(
        mockReadings,
        mockOverview,
        'day'
      );
      const result = transformer.transform();

      const totalProduction = result.reduce((sum, point) => sum + point.total, 0);
      expect(totalProduction).toBeCloseTo(mockOverview.todayTotalGenerationKWh, 1);
    });

    it('should handle empty readings gracefully', () => {
      const transformer = new EnergyChartDataTransformer(
        [],
        mockOverview,
        'day'
      );
      const result = transformer.transform();

      expect(result).toHaveLength(24);
      expect(result[0]).toHaveProperty('total');
      expect(result[0]).toHaveProperty('consumption');
    });
  });

  describe('Week View Transformation', () => {
    it('should create 7 daily buckets for week view', () => {
      const transformer = new EnergyChartDataTransformer(
        mockReadings,
        mockOverview,
        'week'
      );
      const result = transformer.transform();

      expect(result).toHaveLength(7);
      // Week should have day names
      const dayNames = result.map(r => r.name);
      expect(dayNames).toContain('Mon');
      expect(dayNames).toContain('Sun');
    });
  });

  describe('Month View Transformation', () => {
    it('should create daily buckets for current month', () => {
      const transformer = new EnergyChartDataTransformer(
        mockReadings,
        mockOverview,
        'month'
      );
      const result = transformer.transform();

      // Should have between 28-31 days depending on current month
      expect(result.length).toBeGreaterThanOrEqual(28);
      expect(result.length).toBeLessThanOrEqual(31);
      
      // First day should be "1"
      expect(result[0].name).toBe('1');
    });
  });

  describe('Year View Transformation', () => {
    it('should create 12 monthly buckets for year view', () => {
      const transformer = new EnergyChartDataTransformer(
        mockReadings,
        mockOverview,
        'year'
      );
      const result = transformer.transform();

      expect(result).toHaveLength(12);
      expect(result[0].name).toBe('Jan');
      expect(result[11].name).toBe('Dec');
    });
  });

  describe('Data Structure', () => {
    it('should include all required properties in chart data points', () => {
      const transformer = new EnergyChartDataTransformer(
        mockReadings,
        mockOverview,
        'day'
      );
      const result = transformer.transform();

      const point = result[0];
      expect(point).toHaveProperty('name');
      expect(point).toHaveProperty('total');
      expect(point).toHaveProperty('residential');
      expect(point).toHaveProperty('commercial');
      expect(point).toHaveProperty('industrial');
      expect(point).toHaveProperty('consumption');
    });

    it('should have numeric values for all energy fields', () => {
      const transformer = new EnergyChartDataTransformer(
        mockReadings,
        mockOverview,
        'day'
      );
      const result = transformer.transform();

      result.forEach(point => {
        expect(typeof point.total).toBe('number');
        expect(typeof point.residential).toBe('number');
        expect(typeof point.commercial).toBe('number');
        expect(typeof point.industrial).toBe('number');
        expect(typeof point.consumption).toBe('number');
      });
    });
  });

  describe('Helper Function', () => {
    it('should work with the helper function transformReadingsToChartData', () => {
      const result = transformReadingsToChartData(
        mockReadings,
        'day',
        mockOverview
      );

      expect(result).toHaveLength(24);
      expect(result[0]).toHaveProperty('name');
      expect(result[0]).toHaveProperty('total');
    });
  });

  describe('Edge Cases', () => {
    it('should handle null overview gracefully', () => {
      const transformer = new EnergyChartDataTransformer(
        mockReadings,
        null as any,
        'day'
      );
      const result = transformer.transform();

      // Should still return valid structure
      expect(result).toHaveLength(24);
    });

    it('should handle readings with missing fields', () => {
      const incompleteReadings: EnergyReading[] = [
        {
          installationId: 'inst-1',
          powerGenerationWatts: 0,
          powerConsumptionWatts: 0,
          timestamp: '2025-11-23T10:00:00Z'
        }
      ];

      const transformer = new EnergyChartDataTransformer(
        incompleteReadings,
        mockOverview,
        'day'
      );
      const result = transformer.transform();

      expect(result).toHaveLength(24);
      // Should not throw errors
    });

    it('should categorize installations by type correctly', () => {
      const typedReadings: EnergyReading[] = [
        {
          installationId: 'inst-1',
          powerGenerationWatts: 4000,
          powerConsumptionWatts: 3000,
          timestamp: '2025-11-23T10:00:00Z',
          totalGenerationKWh: 4,
          totalConsumptionKWh: 3
        },
        {
          installationId: 'inst-2',
          powerGenerationWatts: 6000,
          powerConsumptionWatts: 5000,
          timestamp: '2025-11-23T10:00:00Z',
          totalGenerationKWh: 6,
          totalConsumptionKWh: 5
        }
      ];

      const transformer = new EnergyChartDataTransformer(
        typedReadings,
        mockOverview,
        'day'
      );
      const result = transformer.transform();

      // Find the 10:00 bucket
      const bucket = result.find(r => r.name === '10:00');
      expect(bucket).toBeDefined();
      
      if (bucket) {
        // Should have both residential and commercial contributions
        expect(bucket.residential).toBeGreaterThan(0);
        expect(bucket.commercial).toBeGreaterThan(0);
      }
    });
  });
});
