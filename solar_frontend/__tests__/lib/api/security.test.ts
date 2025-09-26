import { describe, expect, test } from 'vitest';
import { securityApi } from '@/lib/api/security';

describe('securityApi normalization (MSW)', () => {
  test('getTamperEvents unwraps Page to array', async () => {
    const res = await securityApi.getTamperEvents();
    expect(Array.isArray(res)).toBe(true);
    expect(res).toHaveLength(2);
  });

  test('getInstallationAlerts returns array for direct arrays', async () => {
    const res = await securityApi.getInstallationAlerts('123');
    expect(Array.isArray(res)).toBe(true);
    expect(res[0].id).toBe('a');
  });
});
