/**
 * Energy Chart Data Transformers
 * 
 * ARCHITECTURE NOTE:
 * ------------------
 * The backend already provides pre-integrated kWh values via:
 * - /monitoring/readings/series/{id} - Per-installation aggregated data
 * - /monitoring/readings/system-series - System-wide aggregated data
 * 
 * These endpoints use proper trapezoidal integration on the backend and return
 * values that are ALREADY in kWh. The frontend should use these directly.
 * 
 * The useChartData hook now uses SystemSeriesPoint directly.
 * The EnergyChartDataTransformer class below is kept for backward compatibility
 * but should be considered DEPRECATED.
 */

import type {
  ChartDataPoint,
  TimeRange,
  SystemSeriesPoint
} from '@/src/types/energyTypes';
import { getBucketLabel } from '@/lib/api/energy';

// ============================================================================
// RECOMMENDED: Transform pre-aggregated data
// ============================================================================

/**
 * Transform pre-aggregated SystemSeriesPoint data to chart format.
 * Use this when you have data from getSystemSeriesForTimeRange().
 * Values are ALREADY in kWh - no conversion needed!
 */
export function transformSystemSeriesToChartData(
  series: SystemSeriesPoint[],
  timeRange: TimeRange
): ChartDataPoint[] {
  if (!series || series.length === 0) {
    return generateEmptyChartData(timeRange);
  }

  // Sort by timestamp
  const sorted = [...series].sort(
    (a, b) => new Date(a.bucketStart).getTime() - new Date(b.bucketStart).getTime()
  );

  // Transform each point - values are ALREADY in kWh!
  return sorted.map(point => {
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
}

/**
 * Generate empty chart data with proper labels for a time range
 */
export function generateEmptyChartData(timeRange: TimeRange): ChartDataPoint[] {
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

// ============================================================================
// DEPRECATED: Legacy transformer class
// ============================================================================

import type {
  EnergyReading,
  SystemOverview,
  InstallationType,
  NormalizedReading,
  TimeBucket
} from '@/src/types/energyTypes';
import { getBucketKey, generateEmptyChartData as legacyGenerateEmptyChartData } from '@/lib/energyUtils';

/**
 * @deprecated Use transformSystemSeriesToChartData() instead
 * 
 * This class was used to convert raw energy readings (power in Watts) to chart data.
 * It includes normalization logic to fix data discrepancies, which was a symptom of
 * incorrect data processing rather than a proper solution.
 * 
 * The backend now provides properly integrated kWh values, so this class is no longer needed.
 */
export class EnergyChartDataTransformer {
  private readings: EnergyReading[];
  private overview: SystemOverview;
  private timeRange: TimeRange;

  constructor(readings: EnergyReading[], overview: SystemOverview, timeRange: TimeRange) {
    console.warn('[EnergyChartDataTransformer] DEPRECATED: Use transformSystemSeriesToChartData() instead');
    this.readings = readings;
    this.overview = overview;
    this.timeRange = timeRange;
  }

  /**
   * @deprecated Main transformation method
   */
  transform(): ChartDataPoint[] {
    if (!this.readings || this.readings.length === 0) {
      return this.generateFallbackData();
    }

    const normalizedReadings = this.normalizeReadings();

    switch (this.timeRange) {
      case 'day':
        return this.transformDayView(normalizedReadings);
      case 'week':
        return this.transformWeekView(normalizedReadings);
      case 'month':
        return this.transformMonthView(normalizedReadings);
      case 'year':
        return this.transformYearView(normalizedReadings);
      default:
        return this.generateFallbackData();
    }
  }

  private normalizeReadings(): NormalizedReading[] {
    return this.readings.map(reading => {
      const generationKWh = this.calculateGenerationKWh(reading);
      const consumptionKWh = this.calculateConsumptionKWh(reading);
      const installationType = this.determineInstallationType(reading);

      return {
        ...reading,
        generationKWh,
        consumptionKWh,
        installationType
      };
    });
  }

  private calculateGenerationKWh(reading: EnergyReading): number {
    // Priority: pre-calculated kWh values
    if (reading.totalGenerationKWh !== undefined) return reading.totalGenerationKWh;
    if (reading.energyProduced !== undefined) return reading.energyProduced;
    // Fallback: assume hourly and convert (this is the problematic assumption)
    if (reading.powerGenerationWatts !== undefined) return reading.powerGenerationWatts / 1000;
    return 0;
  }

  private calculateConsumptionKWh(reading: EnergyReading): number {
    if (reading.totalConsumptionKWh !== undefined) return reading.totalConsumptionKWh;
    if (reading.energyConsumed !== undefined) return reading.energyConsumed;
    if (reading.powerConsumptionWatts !== undefined) return reading.powerConsumptionWatts / 1000;
    return 0;
  }

  private determineInstallationType(reading: any): InstallationType {
    if (reading.installationType) return reading.installationType;
    if (reading.type) return reading.type;
    return 'RESIDENTIAL';
  }

  private transformDayView(readings: NormalizedReading[]): ChartDataPoint[] {
    const buckets = new Map<string, TimeBucket>();

    for (let hour = 0; hour < 24; hour++) {
      const date = new Date();
      date.setHours(hour, 0, 0, 0);
      const key = getBucketKey(date, 'day');
      
      buckets.set(key, {
        timestamp: date,
        label: `${hour}:00`,
        total: 0,
        residential: 0,
        commercial: 0,
        industrial: 0,
        consumption: 0
      });
    }

    readings.forEach(reading => {
      const date = new Date(reading.timestamp);
      const key = getBucketKey(date, 'day');
      const bucket = buckets.get(key);

      if (bucket) {
        bucket.total += reading.generationKWh;
        bucket.consumption += reading.consumptionKWh;

        switch (reading.installationType) {
          case 'RESIDENTIAL':
            bucket.residential += reading.generationKWh;
            break;
          case 'COMMERCIAL':
            bucket.commercial += reading.generationKWh;
            break;
          case 'INDUSTRIAL':
            bucket.industrial += reading.generationKWh;
            break;
        }
      }
    });

    return Array.from(buckets.values())
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
      .map(bucket => ({
        name: bucket.label,
        total: bucket.total,
        residential: bucket.residential,
        commercial: bucket.commercial,
        industrial: bucket.industrial,
        consumption: bucket.consumption
      }));
  }

  private transformWeekView(readings: NormalizedReading[]): ChartDataPoint[] {
    const buckets = new Map<string, TimeBucket>();
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const key = getBucketKey(date, 'week');
      
      buckets.set(key, {
        timestamp: date,
        label: dayNames[date.getDay()],
        total: 0,
        residential: 0,
        commercial: 0,
        industrial: 0,
        consumption: 0
      });
    }

    readings.forEach(reading => {
      const date = new Date(reading.timestamp);
      const key = getBucketKey(date, 'week');
      const bucket = buckets.get(key);

      if (bucket) {
        bucket.total += reading.generationKWh;
        bucket.consumption += reading.consumptionKWh;

        switch (reading.installationType) {
          case 'RESIDENTIAL':
            bucket.residential += reading.generationKWh;
            break;
          case 'COMMERCIAL':
            bucket.commercial += reading.generationKWh;
            break;
          case 'INDUSTRIAL':
            bucket.industrial += reading.generationKWh;
            break;
        }
      }
    });

    return Array.from(buckets.values())
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
      .map(bucket => ({
        name: bucket.label,
        total: bucket.total,
        residential: bucket.residential,
        commercial: bucket.commercial,
        industrial: bucket.industrial,
        consumption: bucket.consumption
      }));
  }

  private transformMonthView(readings: NormalizedReading[]): ChartDataPoint[] {
    const buckets = new Map<string, TimeBucket>();
    
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day, 0, 0, 0, 0);
      const key = getBucketKey(date, 'month');
      
      buckets.set(key, {
        timestamp: date,
        label: day.toString(),
        total: 0,
        residential: 0,
        commercial: 0,
        industrial: 0,
        consumption: 0
      });
    }

    readings.forEach(reading => {
      const date = new Date(reading.timestamp);
      const key = getBucketKey(date, 'month');
      const bucket = buckets.get(key);

      if (bucket) {
        bucket.total += reading.generationKWh;
        bucket.consumption += reading.consumptionKWh;

        switch (reading.installationType) {
          case 'RESIDENTIAL':
            bucket.residential += reading.generationKWh;
            break;
          case 'COMMERCIAL':
            bucket.commercial += reading.generationKWh;
            break;
          case 'INDUSTRIAL':
            bucket.industrial += reading.generationKWh;
            break;
        }
      }
    });

    return Array.from(buckets.values())
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
      .map(bucket => ({
        name: bucket.label,
        total: bucket.total,
        residential: bucket.residential,
        commercial: bucket.commercial,
        industrial: bucket.industrial,
        consumption: bucket.consumption
      }));
  }

  private transformYearView(readings: NormalizedReading[]): ChartDataPoint[] {
    const buckets = new Map<string, TimeBucket>();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const year = new Date().getFullYear();
    for (let month = 0; month < 12; month++) {
      const date = new Date(year, month, 1, 0, 0, 0, 0);
      const key = getBucketKey(date, 'year');
      
      buckets.set(key, {
        timestamp: date,
        label: monthNames[month],
        total: 0,
        residential: 0,
        commercial: 0,
        industrial: 0,
        consumption: 0
      });
    }

    readings.forEach(reading => {
      const date = new Date(reading.timestamp);
      const key = getBucketKey(date, 'year');
      const bucket = buckets.get(key);

      if (bucket) {
        bucket.total += reading.generationKWh;
        bucket.consumption += reading.consumptionKWh;

        switch (reading.installationType) {
          case 'RESIDENTIAL':
            bucket.residential += reading.generationKWh;
            break;
          case 'COMMERCIAL':
            bucket.commercial += reading.generationKWh;
            break;
          case 'INDUSTRIAL':
            bucket.industrial += reading.generationKWh;
            break;
        }
      }
    });

    return Array.from(buckets.values())
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
      .map(bucket => ({
        name: bucket.label,
        total: bucket.total,
        residential: bucket.residential,
        commercial: bucket.commercial,
        industrial: bucket.industrial,
        consumption: bucket.consumption
      }));
  }

  private generateFallbackData(): ChartDataPoint[] {
    return legacyGenerateEmptyChartData(this.timeRange);
  }
}

/**
 * @deprecated Use transformSystemSeriesToChartData() instead
 */
export function transformReadingsToChartData(
  readings: EnergyReading[],
  timeRange: TimeRange,
  overview: SystemOverview
): ChartDataPoint[] {
  console.warn('[transformReadingsToChartData] DEPRECATED: Use transformSystemSeriesToChartData() instead');
  const transformer = new EnergyChartDataTransformer(readings, overview, timeRange);
  return transformer.transform();
}
