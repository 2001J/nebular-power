import { describe, expect, test } from 'vitest';
import {
  formatChartYAxis,
  formatChartTooltip,
  getMonthlyXAxisConfig,
  formatEnergy,
  formatPower,
  formatEfficiency,
  scaleDataToTotal,
  generateEmptyChartData,
  getTimeBucketLabel,
  getBucketKey,
} from '@/lib/energyUtils';

describe('formatChartYAxis', () => {
  test('returns "0" for zero value', () => {
    expect(formatChartYAxis(0)).toBe('0');
  });

  test('formats values >= 1000 as "Xk"', () => {
    expect(formatChartYAxis(1000)).toBe('1.0k');
    expect(formatChartYAxis(1250)).toBe('1.3k');
    expect(formatChartYAxis(2500)).toBe('2.5k');
    expect(formatChartYAxis(10000)).toBe('10.0k');
  });

  test('formats values >= 1 with one decimal place', () => {
    expect(formatChartYAxis(1)).toBe('1.0');
    expect(formatChartYAxis(2.5)).toBe('2.5');
    expect(formatChartYAxis(99.9)).toBe('99.9');
    expect(formatChartYAxis(500)).toBe('500.0');
  });

  test('formats values >= 0.01 with three decimal places', () => {
    expect(formatChartYAxis(0.01)).toBe('0.010');
    expect(formatChartYAxis(0.045)).toBe('0.045');
    expect(formatChartYAxis(0.5)).toBe('0.500');
  });

  test('formats values < 0.01 with four decimal places', () => {
    expect(formatChartYAxis(0.0001)).toBe('0.0001');
    expect(formatChartYAxis(0.009)).toBe('0.0090');
    expect(formatChartYAxis(0.0055)).toBe('0.0055');
  });
});

describe('formatChartTooltip', () => {
  test('returns "0.00 kWh" for zero value', () => {
    expect(formatChartTooltip(0)).toBe('0.00 kWh');
  });

  test('formats values >= 1000 as "Xk kWh"', () => {
    expect(formatChartTooltip(1000)).toBe('1.00k kWh');
    expect(formatChartTooltip(1250)).toBe('1.25k kWh');
    expect(formatChartTooltip(2500)).toBe('2.50k kWh');
  });

  test('formats values >= 1 with two decimal places', () => {
    expect(formatChartTooltip(1)).toBe('1.00 kWh');
    expect(formatChartTooltip(2.567)).toBe('2.57 kWh');
    expect(formatChartTooltip(99.995)).toBe('100.00 kWh');
  });

  test('formats values >= 0.01 with three decimal places', () => {
    expect(formatChartTooltip(0.01)).toBe('0.010 kWh');
    expect(formatChartTooltip(0.04523)).toBe('0.045 kWh');
    expect(formatChartTooltip(0.5)).toBe('0.500 kWh');
  });

  test('formats values < 0.01 with five decimal places', () => {
    expect(formatChartTooltip(0.001)).toBe('0.00100 kWh');
    expect(formatChartTooltip(0.009)).toBe('0.00900 kWh');
  });

  test('handles string values coerced to numbers', () => {
    expect(formatChartTooltip('5.5' as any)).toBe('5.50 kWh');
    expect(formatChartTooltip('invalid' as any)).toBe('0.00 kWh');
  });
});

describe('getMonthlyXAxisConfig', () => {
  test('returns expected configuration', () => {
    const config = getMonthlyXAxisConfig();
    expect(config.interval).toBe(2);
    expect(config.angle).toBe(-45);
    expect(config.textAnchor).toBe('end');
    expect(config.height).toBe(60);
  });
});

describe('formatEnergy', () => {
  test('formats values >= 1,000,000 as GWh', () => {
    expect(formatEnergy(1000000)).toBe('1.00 GWh');
    expect(formatEnergy(2500000)).toBe('2.50 GWh');
  });

  test('formats values >= 1000 as MWh', () => {
    expect(formatEnergy(1000)).toBe('1.00 MWh');
    expect(formatEnergy(1250)).toBe('1.25 MWh');
    expect(formatEnergy(50000)).toBe('50.00 MWh');
  });

  test('formats values >= 1 as kWh', () => {
    expect(formatEnergy(1)).toBe('1.00 kWh');
    expect(formatEnergy(5.5)).toBe('5.50 kWh');
    expect(formatEnergy(999)).toBe('999.00 kWh');
  });

  test('formats values < 1 as Wh', () => {
    expect(formatEnergy(0.5)).toBe('500 Wh');
    expect(formatEnergy(0.1)).toBe('100 Wh');
    expect(formatEnergy(0.001)).toBe('1 Wh');
  });
});

describe('formatPower', () => {
  test('formats values >= 1,000,000 as MW', () => {
    expect(formatPower(1000000)).toBe('1.00 MW');
    expect(formatPower(1500000)).toBe('1.50 MW');
  });

  test('formats values >= 1000 as kW', () => {
    expect(formatPower(1000)).toBe('1.00 kW');
    expect(formatPower(2500)).toBe('2.50 kW');
    expect(formatPower(999999)).toBe('1000.00 kW');
  });

  test('formats values < 1000 as W', () => {
    expect(formatPower(500)).toBe('500 W');
    expect(formatPower(100)).toBe('100 W');
    expect(formatPower(0)).toBe('0 W');
  });
});

describe('formatEfficiency', () => {
  test('formats efficiency with one decimal place', () => {
    expect(formatEfficiency(87.5)).toBe('87.5%');
    expect(formatEfficiency(0)).toBe('0.0%');
    expect(formatEfficiency(100)).toBe('100.0%');
    expect(formatEfficiency(50.123)).toBe('50.1%');
  });
});

describe('scaleDataToTotal', () => {
  test('scales data to match target total', () => {
    const data = [
      { name: 'A', value: 10 },
      { name: 'B', value: 20 },
      { name: 'C', value: 20 },
    ];
    const scaled = scaleDataToTotal(data, 100, 'value');
    expect(scaled[0].value).toBe(20);
    expect(scaled[1].value).toBe(40);
    expect(scaled[2].value).toBe(40);
  });

  test('returns original data when current total is zero', () => {
    const data = [
      { name: 'A', value: 0 },
      { name: 'B', value: 0 },
    ];
    const scaled = scaleDataToTotal(data, 100, 'value');
    expect(scaled[0].value).toBe(0);
    expect(scaled[1].value).toBe(0);
  });

  test('returns original data when target total is zero', () => {
    const data = [
      { name: 'A', value: 10 },
      { name: 'B', value: 20 },
    ];
    const scaled = scaleDataToTotal(data, 0, 'value');
    expect(scaled[0].value).toBe(10);
    expect(scaled[1].value).toBe(20);
  });

  test('handles undefined values gracefully', () => {
    const data = [
      { name: 'A' },
      { name: 'B', value: 20 },
    ] as any[];
    const scaled = scaleDataToTotal(data, 40, 'value');
    expect(scaled[0].value).toBe(0);
    expect(scaled[1].value).toBe(40);
  });
});

describe('generateEmptyChartData', () => {
  test('generates 24 hourly data points for day view', () => {
    const data = generateEmptyChartData('day');
    expect(data.length).toBe(24);
    expect(data[0].name).toBe('0:00');
    expect(data[23].name).toBe('23:00');
    expect(data[0].total).toBe(0);
    expect(data[0].residential).toBe(0);
    expect(data[0].commercial).toBe(0);
    expect(data[0].industrial).toBe(0);
    expect(data[0].consumption).toBe(0);
  });

  test('generates 7 day data points for week view', () => {
    const data = generateEmptyChartData('week');
    expect(data.length).toBe(7);
    expect(data[0].name).toBe('Mon');
    expect(data[6].name).toBe('Sun');
  });

  test('generates 31 day data points for month view', () => {
    const data = generateEmptyChartData('month');
    expect(data.length).toBe(31);
    expect(data[0].name).toBe('1');
    expect(data[30].name).toBe('31');
  });

  test('generates 12 month data points for year view', () => {
    const data = generateEmptyChartData('year');
    expect(data.length).toBe(12);
    expect(data[0].name).toBe('Jan');
    expect(data[11].name).toBe('Dec');
  });
});

describe('getTimeBucketLabel', () => {
  test('returns hour format for day view', () => {
    const date = new Date(2024, 0, 15, 10, 30, 0);
    expect(getTimeBucketLabel(date, 'day')).toBe('10:00');
  });

  test('returns day name for week view', () => {
    // January 15, 2024 is a Monday
    const monday = new Date(2024, 0, 15);
    expect(getTimeBucketLabel(monday, 'week')).toBe('Mon');
    
    const sunday = new Date(2024, 0, 14);
    expect(getTimeBucketLabel(sunday, 'week')).toBe('Sun');
  });

  test('returns day of month for month view', () => {
    const date = new Date(2024, 0, 15);
    expect(getTimeBucketLabel(date, 'month')).toBe('15');
    
    const firstDay = new Date(2024, 0, 1);
    expect(getTimeBucketLabel(firstDay, 'month')).toBe('1');
  });

  test('returns month name for year view', () => {
    const january = new Date(2024, 0, 15);
    expect(getTimeBucketLabel(january, 'year')).toBe('Jan');
    
    const december = new Date(2024, 11, 15);
    expect(getTimeBucketLabel(december, 'year')).toBe('Dec');
  });

  test('returns ISO string for unknown time range', () => {
    const date = new Date(2024, 0, 15);
    const result = getTimeBucketLabel(date, 'unknown' as any);
    expect(result).toBe(date.toISOString());
  });
});

describe('getBucketKey', () => {
  test('returns hour-level key for day view', () => {
    const date = new Date(2024, 0, 15, 10, 30, 0);
    expect(getBucketKey(date, 'day')).toBe('2024-0-15-10');
  });

  test('returns day-level key for week view', () => {
    const date = new Date(2024, 0, 15, 10, 30, 0);
    expect(getBucketKey(date, 'week')).toBe('2024-0-15');
  });

  test('returns day-level key for month view', () => {
    const date = new Date(2024, 0, 15, 10, 30, 0);
    expect(getBucketKey(date, 'month')).toBe('2024-0-15');
  });

  test('returns month-level key for year view', () => {
    const date = new Date(2024, 5, 15, 10, 30, 0);
    expect(getBucketKey(date, 'year')).toBe('2024-5');
  });

  test('returns ISO string for unknown time range', () => {
    const date = new Date(2024, 0, 15);
    const result = getBucketKey(date, 'unknown' as any);
    expect(result).toBe(date.toISOString());
  });
});

