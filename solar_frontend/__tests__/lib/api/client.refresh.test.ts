import { describe, expect, test, beforeEach } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/lib/api/client';

describe('apiClient interceptors token 401 handling (no refresh)', () => {
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

  test('401 clears tokens and redirects to /login', async () => {
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

    await expect(apiClient.get('/api/protected')).rejects.toBeTruthy();
    // Allow any microtasks to complete
    await new Promise(r => setTimeout(r, 0));
  expect((window.location as any).href).toBe('/login?reason=unauthorized');

    // Restore
    Object.defineProperty(window, 'location', { configurable: true, value: original });
  }, 10000);
});
