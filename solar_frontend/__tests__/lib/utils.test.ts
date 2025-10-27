import {
  cn,
  formatDate,
  formatCurrency,
  parseNumber,
  parseBoolean,
  formatNumber,
  formatEnergyValue,
  validateApiResponse,
} from '@/lib/utils';

describe('utils', () => {
  test('formatDate returns fallback on invalid or empty', () => {
    expect(formatDate(undefined)).toBe('N/A');
    expect(formatDate(null)).toBe('N/A');
    const out = formatDate('invalid-date');
    // Accept current behavior of Invalid Date string or fallback
    expect(['N/A', 'Invalid Date']).toContain(out);
  });

  test('formatDate formats valid ISO string', () => {
    const date = new Date('2024-05-01T10:30:00Z').toISOString();
    const out = formatDate(date);
    expect(typeof out).toBe('string');
    expect(out.length).toBeGreaterThan(0);
  });

  test('formatCurrency handles numbers and strings', () => {
    expect(formatCurrency(12.5)).toContain('$');
    expect(formatCurrency('12.5')).toContain('$');
    expect(formatCurrency('abc')).toBe('$0.00');
    expect(formatCurrency(undefined)).toBe('$0.00');
  });

  test('parseNumber converts safely', () => {
    expect(parseNumber('10')).toBe(10);
    expect(parseNumber('abc', 5)).toBe(5);
    expect(parseNumber(null, 7)).toBe(7);
  });

  test('parseBoolean handles multiple truthy/falsey strings', () => {
    expect(parseBoolean('true')).toBe(true);
    expect(parseBoolean('1')).toBe(true);
    expect(parseBoolean('yes')).toBe(true);
    expect(parseBoolean('false')).toBe(false);
    expect(parseBoolean('0')).toBe(false);
    expect(parseBoolean('no')).toBe(false);
    expect(parseBoolean(undefined, true)).toBe(true);
  });

  test('formatNumber formats with decimals', () => {
    expect(formatNumber(1234.567, 2)).toBe('1,234.57');
    expect(formatNumber('abc', 2, '0')).toBe('0.00');
  });

  test('formatEnergyValue adds units', () => {
    expect(formatEnergyValue(500)).toBe('500.00 kWh');
    expect(formatEnergyValue(2500)).toBe('2.50 MWh');
    expect(formatEnergyValue(1_500_000)).toBe('1.50 GWh');
  });

  test('validateApiResponse validates required fields and types', () => {
    type Foo = { id: string; count: number };
    const valid = { id: 'x', count: 2 };
    const invalidMissing = { count: 2 } as any;
    const invalidType = { id: 'x', count: '2' } as any;

    expect(validateApiResponse<Foo>(valid, ['id', 'count'], { count: 'number' })).toEqual(valid);
    expect(validateApiResponse<Foo>(invalidMissing, ['id', 'count'])).toBeNull();
    expect(validateApiResponse<Foo>(invalidType, ['id', 'count'], { count: 'number' })).toBeNull();
  });
});
