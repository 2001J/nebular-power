import { describe, expect, test, beforeEach } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/lib/api/client';

describe('apiClient interceptors token refresh', () => {
  let mock: MockAdapter;
  beforeEach(() => {
    mock = new MockAdapter(apiClient as any);
    mock.reset();
    localStorage.clear();
    sessionStorage.clear();
    // seed token
    localStorage.setItem('token', 'old');
    localStorage.setItem('refreshToken', 'refresh');
  });

  test('401 triggers refresh and retries original request', async () => {
    mock.onGet('/api/protected').replyOnce(401).onGet('/api/protected').replyOnce(200, { ok: true });
    mock.onPost('/api/auth/refresh').reply(200, { token: 'new', refreshToken: 'newR' });

    const res = await apiClient.get('/api/protected');
    expect(res.data.ok).toBe(true);
  });

  test.skip('refresh failure redirects to /login', async () => {
    // Set up to capture location change
    let assigned = '';
    const original = window.location;
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        set href(v: string) { assigned = v; },
        get href() { return assigned; }
      }
    } as any);

    mock.onGet('/api/protected').replyOnce(401);
    mock.onPost('/api/auth/refresh').reply(401);

    await expect(apiClient.get('/api/protected')).rejects.toBeTruthy();
    // Allow any microtasks to complete
    await new Promise(r => setTimeout(r, 0));
    expect((window.location as any).href).toBe('/login');

    // Restore
    Object.defineProperty(window, 'location', { configurable: true, value: original });
  }, 10000);
});
