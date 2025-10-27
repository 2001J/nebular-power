import { describe, expect, test, vi, beforeEach } from 'vitest';
import {
  exportToCSV,
  formatDateForExport,
  formatCurrencyForExport,
  formatStatusForExport,
} from '@/lib/exportUtils';

describe('exportUtils', () => {
  beforeEach(() => {
    // jsdom stubs
    // Ensure URL methods exist and are stubbed
    // @ts-ignore
    if (!URL.createObjectURL) (URL as any).createObjectURL = vi.fn();
    // @ts-ignore
    if (!URL.revokeObjectURL) (URL as any).revokeObjectURL = vi.fn();
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    // Ensure document body is clean
    document.body.innerHTML = '';
  });

  test('format helpers', () => {
    expect(formatDateForExport('2024-01-01')).toMatch(/2024|1|Jan/);
    expect(formatCurrencyForExport(12.34)).toContain('$');
    expect(formatStatusForExport('SUSPENDED_PAYMENT')).toBe('Suspended Payment');
  });

  test('exportToCSV creates a download link and clicks it', () => {
    const clickMock = vi.fn();
    vi.spyOn(document, 'createElement').mockImplementation((tagName: any) => {
      const a = document.createElementNS('http://www.w3.org/1999/xhtml', tagName);
      // @ts-ignore
      a.click = clickMock;
      return a as any;
    });

    const data = [{ id: 1, name: 'Alice, "Briggs"' }];
    const columns = [
      { key: 'id', title: 'ID' },
      { key: 'name', title: 'Name' },
    ];

    exportToCSV(data, columns, 'test.csv');
    // Ensure link was clicked to trigger download
    expect(clickMock).toHaveBeenCalledTimes(1);
  });
});
