import { describe, expect, test, vi, beforeEach } from 'vitest';
import { energyApi } from '@/lib/api/energy';

const getMock = vi.fn();

vi.mock('@/lib/api/client', () => ({
  makeApiRequest: async (fn: any) => {
    const res = await fn();
    return res?.data;
  },
  apiClient: {
    get: (...args: any[]) => getMock(...args),
  },
}));

describe('energyApi fallbacks', () => {
  beforeEach(() => getMock.mockReset());

  test('getSystemOverview falls back to integration endpoint on error', async () => {
    getMock.mockRejectedValueOnce(new Error('down'));
    getMock.mockResolvedValueOnce({ data: { ok: true } });
    const res = await energyApi.getSystemOverview();
    expect(res.ok).toBe(true);
    expect(getMock).toHaveBeenCalledTimes(2);
  });

  test('getSystemSeries returns [] on error', async () => {
    getMock.mockRejectedValueOnce(new Error('down'));
    const res = await energyApi.getSystemSeries('2024-01-01', '2024-01-02', 'hour');
    expect(res).toEqual([]);
  });

  test('getInstallationDashboard returns null for missing id and on error', async () => {
    const res1 = await energyApi.getInstallationDashboard('');
    expect(res1).toBeNull();
    getMock.mockRejectedValueOnce(new Error('down'));
    const res2 = await energyApi.getInstallationDashboard('i1');
    expect(res2).toBeNull();
  });

  test('getRecentReadings guards empty id and returns [] on error', async () => {
    const res1 = await energyApi.getRecentReadings('');
    expect(res1).toEqual([]);
    getMock.mockRejectedValueOnce(new Error('down'));
    const res2 = await energyApi.getRecentReadings('i1');
    expect(res2).toEqual([]);
  });

  test('getAggregatedSeries returns [] on error', async () => {
    getMock.mockRejectedValueOnce(new Error('down'));
    const res = await energyApi.getAggregatedSeries('i1', '2024-01-01', '2024-01-02', 'day');
    expect(res).toEqual([]);
  });

  test('getSummariesByPeriodAndDateRange fallback to aggregated series', async () => {
    // First request fails -> fallback to aggregated
    getMock.mockRejectedValueOnce(new Error('down'));
    // aggregated series returns []
    getMock.mockResolvedValueOnce({ data: [] });
    const res = await energyApi.getSummariesByPeriodAndDateRange('i1', 'week', '2024-01-01', '2024-01-07');
    expect(Array.isArray(res)).toBe(true);
  });

  test('calculateInstallationAverageEfficiency handles errors and empty data', async () => {
    // dashboard ok, recent readings empty
    getMock.mockResolvedValueOnce({ data: { currentEfficiencyPercentage: 42 } });
    getMock.mockResolvedValueOnce({ data: [] });
    const v1 = await energyApi.calculateInstallationAverageEfficiency('i1');
    expect(v1).toBe(42);

    // getInstallationDashboard error -> 0
    getMock.mockRejectedValueOnce(new Error('down'));
    const v2 = await energyApi.calculateInstallationAverageEfficiency('i1');
    expect(v2).toBe(0);
  });
});
