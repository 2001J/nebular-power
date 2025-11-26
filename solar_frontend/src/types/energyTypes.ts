/**
 * Type definitions for Energy Monitoring System
 * Extracted from monolithic components for better type safety and reusability
 */

// ============================================================================
// Core Energy Data Types
// ============================================================================

export interface EnergyReading {
  id?: string;
  installationId: string;
  powerGenerationWatts: number;
  powerConsumptionWatts: number;
  timestamp: string;
  batteryLevel?: number;
  gridPowerWatts?: number;
  energyProduced?: number;
  energyConsumed?: number;
  totalGenerationKWh?: number;
  totalConsumptionKWh?: number;
}

export interface Installation {
  id: string;
  customerId: string;
  customerName?: string;
  address: string;
  systemSize: number;
  status: 'active' | 'inactive' | 'maintenance' | 'suspended';
  installationDate: string;
  coordinates?: { 
    latitude: number; 
    longitude: number; 
  };
  installationType?: InstallationType;
  type?: InstallationType; // Alternative field name used in some responses
}

export type InstallationType = 'RESIDENTIAL' | 'COMMERCIAL' | 'INDUSTRIAL';

// ============================================================================
// System Overview & Metrics
// ============================================================================

export interface SystemOverview {
  totalActiveInstallations: number;
  todayTotalGenerationKWh: number;
  todayTotalConsumptionKWh: number;
  weekToDateGenerationKWh: number;
  weekToDateConsumptionKWh: number;
  monthToDateGenerationKWh: number;
  monthToDateConsumptionKWh: number;
  yearToDateGenerationKWh: number;
  yearToDateConsumptionKWh: number;
  currentSystemGenerationWatts: number;
  averageSystemEfficiency: number;
  recentlyActiveInstallations: Installation[];
  recentInstallationReadings: EnergyReading[];
  topProducers: TopProducer[];
}

export interface TopProducer {
  id: number;
  name: string;
  todayGenerationKWh: number;
  averageEfficiencyPercentage: number;
  location: string;
  type: InstallationType;
  customerName?: string;
  username?: string;  // User email from backend
  systemSize?: number;
}

// ============================================================================
// Chart Series Data Types (from backend aggregation endpoints)
// ============================================================================

/**
 * Pre-integrated time-series data point from backend.
 * Values are ALREADY in kWh - NO conversion needed!
 * 
 * Use for per-installation charts via: /monitoring/readings/series/{id}
 */
export interface InstallationSeriesPoint {
  bucketStart: string;                  // ISO timestamp for bucket start
  generationKWh: number;                // Energy generated in this bucket (kWh)
  consumptionKWh: number;               // Energy consumed in this bucket (kWh)
  avgGenerationWatts: number;           // Average power during bucket (W)
  avgConsumptionWatts: number;          // Average power during bucket (W)
  powerUnit?: string;                   // "W"
  energyUnit?: string;                  // "kWh"
}

/**
 * System-wide aggregated data point from backend.
 * Includes breakdown by installation type.
 * 
 * Use for admin system-wide charts via: /monitoring/readings/system-series
 */
export interface SystemSeriesPoint {
  bucketStart: string;
  generationKWh: number;
  consumptionKWh: number;
  avgGenerationWatts: number;
  avgConsumptionWatts: number;
  generationByTypeKWh?: Record<string, number>;  // e.g., { "RESIDENTIAL": 1.5, "COMMERCIAL": 0.8 }
  consumptionByTypeKWh?: Record<string, number>;
  powerUnit?: string;
  energyUnit?: string;
}

// ============================================================================
// Chart Display Types (for UI components)
// ============================================================================

export interface ChartDataPoint {
  name: string;           // Time label (e.g., "10:00", "Mon", "15", "Jan")
  total: number;          // Total production kWh
  residential: number;    // Residential production kWh
  commercial: number;     // Commercial production kWh
  industrial: number;     // Industrial production kWh
  consumption: number;    // Total consumption kWh
}

export type TimeRange = 'day' | 'week' | 'month' | 'year';

export type BucketSize = 'minute' | 'hour' | 'day' | 'month';

export type ChartType = 'production' | 'consumption' | 'combined';

// ============================================================================
// Data Transformation Types
// ============================================================================

export interface NormalizedReading extends EnergyReading {
  installationType: InstallationType;
  generationKWh: number;
  consumptionKWh: number;
}

export interface TimeBucket {
  timestamp: Date;
  label: string;
  total: number;
  residential: number;
  commercial: number;
  industrial: number;
  consumption: number;
}

export interface TransformConfig {
  readings: EnergyReading[];
  timeRange: TimeRange;
  overview: SystemOverview;
}

// ============================================================================
// UI Component Props Types
// ============================================================================

export interface EnergyMetricsData {
  totalProductionToday: number;
  totalProductionWeek: number;
  totalProductionMonth: number;
  totalProductionYear: number;
  totalConsumptionToday: number;
  totalConsumptionWeek: number;
  totalConsumptionMonth: number;
  totalConsumptionYear: number;
  averageEfficiency: number;
  currentSystemGenerationWatts: number;
  totalActiveInstallations: number;
}

export interface ChartControlsState {
  timeRange: TimeRange;
  onTimeRangeChange: (range: TimeRange) => void;
  isLoading?: boolean;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface SystemOverviewResponse {
  success: boolean;
  data: SystemOverview;
  message?: string;
}

export interface InstallationListResponse {
  success: boolean;
  data: Installation[];
  message?: string;
}

export interface EnergyReadingsResponse {
  success: boolean;
  data: EnergyReading[];
  message?: string;
}

// ============================================================================
// Utility Types
// ============================================================================

export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface ApiError {
  message: string;
  code?: string;
  details?: any;
}
