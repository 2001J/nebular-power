/**
 * Energy Monitoring Utility Functions
 * Chart formatting and data processing helpers
 */

// ============================================================================
// Chart Formatting Functions
// ============================================================================

/**
 * Format Y-axis tick values with smart scaling
 * Handles wide range of values from 0.0001 kWh to 1000+ kWh
 * 
 * @param value - The numeric value to format
 * @returns Formatted string with appropriate precision
 * 
 * @example
 * formatChartYAxis(0) => "0"
 * formatChartYAxis(1250) => "1.3k"
 * formatChartYAxis(2.5) => "2.5"
 * formatChartYAxis(0.045) => "0.045"
 */
export function formatChartYAxis(value: number): string {
  if (value === 0) return '0';
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  if (value >= 1) return value.toFixed(1);
  if (value >= 0.01) return value.toFixed(3);
  return value.toFixed(4);
}

/**
 * Format tooltip values with enhanced precision
 * More detailed than Y-axis formatting for hover interactions
 * 
 * @param value - The numeric value to format
 * @returns Formatted string with kWh unit
 * 
 * @example
 * formatChartTooltip(0) => "0.00 kWh"
 * formatChartTooltip(1250) => "1.25k kWh"
 * formatChartTooltip(2.567) => "2.57 kWh"
 * formatChartTooltip(0.04523) => "0.045 kWh"
 */
export function formatChartTooltip(value: number): string {
  const numValue = typeof value === 'number' ? value : parseFloat(value as string) || 0;
  
  let displayValue: string;
  if (numValue === 0) {
    displayValue = '0.00';
  } else if (numValue >= 1000) {
    displayValue = `${(numValue / 1000).toFixed(2)}k`;
  } else if (numValue >= 1) {
    displayValue = numValue.toFixed(2);
  } else if (numValue >= 0.01) {
    displayValue = numValue.toFixed(3);
  } else {
    displayValue = numValue.toFixed(5);
  }
  
  return `${displayValue} kWh`;
}

/**
 * Get X-axis configuration for monthly view
 * Provides angled labels and proper spacing for 28-31 day labels
 * 
 * @returns Configuration object for Recharts XAxis component
 * 
 * @example
 * <XAxis {...getMonthlyXAxisConfig()} />
 */
export function getMonthlyXAxisConfig() {
  return {
    interval: 2,           // Show every 2nd day label
    angle: -45,            // Angle labels for readability
    textAnchor: 'end' as const,  // Align text to end
    height: 60             // Extra space for angled labels
  };
}

// ============================================================================
// Energy Value Formatting Functions
// ============================================================================

/**
 * Format energy values with appropriate units (GWh, MWh, kWh, Wh)
 * Automatically scales to the most readable unit
 * 
 * @param kWh - Energy value in kilowatt-hours
 * @returns Formatted string with unit
 * 
 * @example
 * formatEnergy(0.5) => "0.50 kWh"
 * formatEnergy(1250) => "1.25 MWh"
 * formatEnergy(2500000) => "2.50 GWh"
 */
export function formatEnergy(kWh: number): string {
  if (kWh >= 1000000) {
    return `${(kWh / 1000000).toFixed(2)} GWh`;
  }
  if (kWh >= 1000) {
    return `${(kWh / 1000).toFixed(2)} MWh`;
  }
  if (kWh >= 1) {
    return `${kWh.toFixed(2)} kWh`;
  }
  return `${(kWh * 1000).toFixed(0)} Wh`;
}

/**
 * Format power values (watts) with appropriate units
 * 
 * @param watts - Power value in watts
 * @returns Formatted string with unit
 * 
 * @example
 * formatPower(500) => "500 W"
 * formatPower(2500) => "2.50 kW"
 * formatPower(1500000) => "1.50 MW"
 */
export function formatPower(watts: number): string {
  if (watts >= 1000000) {
    return `${(watts / 1000000).toFixed(2)} MW`;
  }
  if (watts >= 1000) {
    return `${(watts / 1000).toFixed(2)} kW`;
  }
  return `${watts.toFixed(0)} W`;
}

/**
 * Format efficiency percentage
 * 
 * @param efficiency - Efficiency value (0-100)
 * @returns Formatted percentage string
 * 
 * @example
 * formatEfficiency(87.5) => "87.5%"
 * formatEfficiency(0) => "0.0%"
 */
export function formatEfficiency(efficiency: number): string {
  return `${efficiency.toFixed(1)}%`;
}

// ============================================================================
// Data Scaling Functions
// ============================================================================

/**
 * Scale energy data to match a target total
 * Used for normalization when readings don't sum to expected totals
 * 
 * @param data - Array of data points to scale
 * @param targetTotal - Target sum value
 * @param key - Key of the property to scale
 * @returns Scaled data array
 */
export function scaleDataToTotal<T extends Record<string, any>>(
  data: T[],
  targetTotal: number,
  key: keyof T
): T[] {
  const currentTotal = data.reduce((sum, item) => sum + (item[key] || 0), 0);
  
  if (currentTotal === 0 || targetTotal === 0) {
    return data;
  }
  
  const scaleFactor = targetTotal / currentTotal;
  
  return data.map(item => ({
    ...item,
    [key]: (item[key] || 0) * scaleFactor
  }));
}

/**
 * Generate empty chart data structure
 * Used when no readings are available
 * 
 * @param timeRange - Time range type
 * @returns Array of empty data points with proper time labels
 */
export function generateEmptyChartData(timeRange: 'day' | 'week' | 'month' | 'year'): Array<{
  name: string;
  total: number;
  residential: number;
  commercial: number;
  industrial: number;
  consumption: number;
}> {
  const data: Array<{
    name: string;
    total: number;
    residential: number;
    commercial: number;
    industrial: number;
    consumption: number;
  }> = [];
  
  switch (timeRange) {
    case 'day':
      for (let i = 0; i < 24; i++) {
        data.push({
          name: `${i}:00`,
          total: 0,
          residential: 0,
          commercial: 0,
          industrial: 0,
          consumption: 0
        });
      }
      break;
    
    case 'week': {
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      for (const day of days) {
        data.push({
          name: day,
          total: 0,
          residential: 0,
          commercial: 0,
          industrial: 0,
          consumption: 0
        });
      }
      break;
    }
    
    case 'month':
      for (let i = 1; i <= 31; i++) {
        data.push({
          name: i.toString(),
          total: 0,
          residential: 0,
          commercial: 0,
          industrial: 0,
          consumption: 0
        });
      }
      break;
    
    case 'year': {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      for (const month of months) {
        data.push({
          name: month,
          total: 0,
          residential: 0,
          commercial: 0,
          industrial: 0,
          consumption: 0
        });
      }
      break;
    }
  }
  
  return data;
}

// ============================================================================
// Time Formatting Functions
// ============================================================================

/**
 * Get time bucket label based on time range
 * 
 * @param date - Date object
 * @param timeRange - Time range type
 * @returns Formatted label string
 */
export function getTimeBucketLabel(date: Date, timeRange: 'day' | 'week' | 'month' | 'year'): string {
  switch (timeRange) {
    case 'day':
      return `${date.getHours()}:00`;
    
    case 'week': {
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      return dayNames[date.getDay()];
    }
    
    case 'month':
      return date.getDate().toString();
    
    case 'year': {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return monthNames[date.getMonth()];
    }
    
    default:
      return date.toISOString();
  }
}

/**
 * Get bucket key for grouping readings
 * 
 * @param date - Date object
 * @param timeRange - Time range type
 * @returns Bucket key string
 */
export function getBucketKey(date: Date, timeRange: 'day' | 'week' | 'month' | 'year'): string {
  switch (timeRange) {
    case 'day':
      return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}`;
    
    case 'week':
      return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    
    case 'month':
      return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    
    case 'year':
      return `${date.getFullYear()}-${date.getMonth()}`;
    
    default:
      return date.toISOString();
  }
}
