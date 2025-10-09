import { describe, expect, test, vi, beforeEach } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/lib/api/client';
import { authApi } from '@/lib/api/auth';

const mock = new MockAdapter(apiClient as any);

describe('authApi with axios-mock-adapter', () => {
  beforeEach(() => {
    mock.reset();
    // Clean storage
    localStorage.clear();
    sessionStorage.clear();
  });

  test('login returns token payload', async () => {
    mock.onPost('/api/auth/login').reply(200, { token: 't', refreshToken: 'r', user: { id: 'u' }, expiresIn: 3600 });
    const res = await authApi.login({ email: 'a@a.com', password: 'x' } as any);
    expect(res.token).toBe('t');
    expect(res.refreshToken).toBe('r');
  });

  test('validateSession returns user payload', async () => {
    mock.onGet('/api/auth/validate').reply(200, { data: { id: 'user' } });
    const res = await authApi.validateSession();
    expect(res.data.id).toBe('user');
  });
});

