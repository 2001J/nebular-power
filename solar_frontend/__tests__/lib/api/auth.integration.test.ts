import { describe, expect, test, beforeEach } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/lib/api/client';
import { authApi } from '@/lib/api/auth';

const mock = new MockAdapter(apiClient as any);

describe('authApi.login integration shape', () => {
  beforeEach(() => {
    mock.reset();
    localStorage.clear();
    sessionStorage.clear();
  });

  test('accepts (email, password) and normalizes backend AuthResponse', async () => {
    mock
      .onPost('/api/auth/login')
      .reply(200, {
        accessToken: 'jwt-abc',
        tokenType: 'Bearer',
        id: 123,
        email: 'a@a.com',
        fullName: 'Alice',
        role: 'ADMIN',
        passwordChangeRequired: false,
        lastLogin: '2025-10-03T12:00:00Z',
      });

    const res = await authApi.login('a@a.com', 'pw');
    expect(res.token).toBe('jwt-abc');
    expect(res.user.email).toBe('a@a.com');
    expect(res.user.name).toBe('Alice');
    expect(res.user.role).toBe('ADMIN');
  });
});
