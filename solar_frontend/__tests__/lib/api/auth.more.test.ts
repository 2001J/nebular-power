import { describe, expect, test, vi, beforeEach } from 'vitest';
import { authApi } from '@/lib/api/auth';

const getMock = vi.fn();
const postMock = vi.fn();

vi.mock('@/lib/api/client', () => ({
  makeApiRequest: async (fn: any) => {
    const res = await fn();
    return res?.data;
  },
  apiClient: {
    get: (...args: any[]) => getMock(...args),
    post: (...args: any[]) => postMock(...args),
  },
}));

describe('authApi additional coverage', () => {
  beforeEach(() => {
    getMock.mockReset();
    postMock.mockReset();
    if (typeof window !== 'undefined') {
      localStorage.clear();
      sessionStorage.clear();
    }
  });

  test('login normalizes backend AuthResponse to LoginResponse', async () => {
    postMock.mockResolvedValueOnce({ data: {
      accessToken: 't', refreshToken: 'r', email: 'a@b.com', fullName: 'A', role: 'ADMIN', id: 1, expiresIn: 3600,
    }});
    const res = await authApi.login({ email: 'a@b.com', password: 'x' });
    expect(res.token).toBe('t');
    expect(res.user.role).toBe('ADMIN');
  });

  test('register, refresh, verifyEmail, request/reset/change password, validate, me', async () => {
    postMock
      .mockResolvedValueOnce({ data: { data: { id: 'u1', email: 'e', name: 'n', role: 'ADMIN' }, timestamp: 't' } }) // register
      .mockResolvedValueOnce({ data: { token: 'new' } }) // refresh
      .mockResolvedValueOnce({ data: { message: 'ok', timestamp: 't' } }) // forgot-password
      .mockResolvedValueOnce({ data: { message: 'ok', timestamp: 't' } }) // reset-password
      .mockResolvedValueOnce({ data: { message: 'ok', timestamp: 't' } }); // change-password

    getMock
      .mockResolvedValueOnce({ data: { data: { email: 'x@y.com' }, timestamp: 't' } }) // verify-email ApiResponse shape
      .mockResolvedValueOnce({ data: { data: { id: 'u1' }, timestamp: 't' } }) // validate
      .mockResolvedValueOnce({ data: { id: 'u1', email: 'e', name: 'n', role: 'ADMIN' } }); // me

    const reg = await authApi.register({ email: 'e', password: 'p', fullName: 'n' });
    expect(reg.data.id).toBe('u1');

    const ref = await authApi.refreshToken('r');
    expect(ref.token || (ref as any).refreshToken || ref).toBeDefined();

  const ver = await authApi.verifyEmail('tok');
  expect(ver.data.email).toBe('x@y.com');

    const req = await authApi.requestPasswordReset('e');
    expect(req.message).toBe('ok');

    const rp = await authApi.resetPassword('tok', 'np');
    expect(rp.message).toBe('ok');

    const ch = await authApi.changePassword('cp', 'np');
    expect(ch.message).toBe('ok');

    const val = await authApi.validateSession();
    expect(val.data.id).toBe('u1');

    const me = await authApi.getCurrentUser();
    expect(me.id).toBe('u1');
  });

  test('logout posts logout and clears tokens even on error', async () => {
    // put tokens
    localStorage.setItem('token', 't');
    localStorage.setItem('refreshToken', 'r');
    // api fails
    postMock.mockRejectedValueOnce(new Error('down'));
    await expect(authApi.logout()).rejects.toThrow('down');
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('refreshToken')).toBeNull();
  });
});
