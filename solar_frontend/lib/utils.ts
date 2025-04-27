import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combines classes with clsx and applies Tailwind's merge utility
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Safely formats a date string with fallback value
 */
export function formatDate(dateString?: string | null, fallback = 'N/A'): string {
  if (!dateString) return fallback;
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return fallback;
  }
}

/**
 * Formats a number as currency with dollar sign
 */
export function formatCurrency(value: number | string | null | undefined, fallback = '$0.00'): string {
  if (value === null || value === undefined) return fallback;
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return fallback;
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num);
}

/**
 * Safely parses a string to a number with fallback
 */
export function parseNumber(value: any, fallback = 0): number {
  if (value === null || value === undefined) return fallback;
  const parsed = Number(value);
  return isNaN(parsed) ? fallback : parsed;
}

/**
 * Safely parses a boolean value with fallback
 */
export function parseBoolean(value: any, fallback = false): boolean {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lowercased = value.toLowerCase();
    if (lowercased === 'true' || lowercased === 'yes' || lowercased === '1') return true;
    if (lowercased === 'false' || lowercased === 'no' || lowercased === '0') return false;
  }
  return fallback;
}

/**
 * Ensures an API response has required fields
 */
export function validateApiResponse<T>(
  data: any,
  requiredFields: (keyof T)[],
  fieldTypes?: Partial<Record<keyof T, string>>
): T | null {
  if (!data) return null;

  // Check required fields exist
  for (const field of requiredFields) {
    if (data[field] === undefined) {
      console.error(`API response validation failed: missing required field ${String(field)}`);
      return null;
    }
  }

  // Check field types if provided
  if (fieldTypes) {
    for (const [field, expectedType] of Object.entries(fieldTypes)) {
      const actualType = typeof data[field];
      if (data[field] !== null && actualType !== expectedType) {
        console.error(`API response validation failed: field ${field} should be ${expectedType}, got ${actualType}`);
        return null;
      }
    }
  }

  return data as T;
}

/**
 * Formats a number with thousands separator and fixed decimals
 */
export function formatNumber(value: any, decimals = 2, fallback = '0'): string {
  if (value === null || value === undefined) return fallback;
  const num = parseNumber(value);
  if (isNaN(num)) return fallback;

  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

export function formatEnergyValue(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(2)} GWh`
  } else if (value >= 1000) {
    return `${(value / 1000).toFixed(2)} MWh`
  } else {
    return `${value.toFixed(2)} kWh`
  }
}
