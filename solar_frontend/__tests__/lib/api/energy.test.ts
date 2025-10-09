import { describe, expect, test } from 'vitest';
import { energyApi } from '@/lib/api/energy';

describe('energyApi (MSW)', () => {
  test('getSystemOverview returns data', async () => {
    const res = await energyApi.getSystemOverview();
    expect(res.totalActiveInstallations).toBe(1);
    expect(Array.isArray(res.recentlyActiveInstallations)).toBe(true);
  });

  test('getInstallationDashboard returns dashboard', async () => {
    const res = await energyApi.getInstallationDashboard('1');
    expect(res.currentEfficiencyPercentage).toBeDefined();
  });

  test('getRecentReadings returns array', async () => {
    const res = await energyApi.getRecentReadings('1', 10);
    expect(Array.isArray(res)).toBe(true);
    expect(res.length).toBeGreaterThan(0);
  });

  test('calculateInstallationAverageEfficiency returns a number', async () => {
    const avg = await energyApi.calculateInstallationAverageEfficiency('1');
    expect(typeof avg).toBe('number');
  });
});

