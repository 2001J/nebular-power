import { describe, expect, test } from 'vitest';
import { settingsApi } from '@/lib/api/settings';

describe('settingsApi (MSW)', () => {
  test('get and update system settings', async () => {
    const current = await settingsApi.getSystemSettings();
    expect(current.general.companyName).toBe('NebulaPower');
    const res = await settingsApi.updateSystemSettings({ general: { companyName: 'X' } });
    expect(res.ok).toBe(true);
  });

  test('notifications and security endpoints', async () => {
    const n = await settingsApi.getNotificationSettings();
    expect(n.emailNotifications).toBe(true);
    expect((await settingsApi.updateNotificationSettings({})).ok).toBe(true);

    const s = await settingsApi.getSecuritySettings();
    expect(s.twoFactorAuth).toBe(false);
    expect((await settingsApi.updateSecuritySettings({})).ok).toBe(true);
  });
});

