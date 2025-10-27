import { describe, expect, test, vi, beforeEach } from 'vitest';
import { userApi } from '@/lib/api/user';

const makeApiRequestMock = vi.fn();

vi.mock('@/lib/api/client', () => ({
  makeApiRequest: (fn: any) => makeApiRequestMock(fn),
  apiClient: {},
}));

describe('userApi', () => {
  beforeEach(() => makeApiRequestMock.mockReset());

  test('getCurrentUser and updateProfile proxy through', async () => {
    makeApiRequestMock.mockResolvedValueOnce({ id: 'u1', email: 'a@b.com', name: 'A', role: 'ADMIN' });
    const u = await userApi.getCurrentUser();
    expect(u.id).toBe('u1');

    makeApiRequestMock.mockResolvedValueOnce({ id: 'u1', email: 'a@b.com', name: 'A', role: 'ADMIN' });
    const up = await userApi.updateProfile({ name: 'B' });
    expect(up.name).toBe('A');
  });

  test('getActivityLogs normalizes array to pageable and handles null', async () => {
    makeApiRequestMock.mockResolvedValueOnce([{ id: 'l1', activityType: 'INFO', timestamp: '2024-01-01' }]);
    const page = await userApi.getActivityLogs(0, 5);
    expect(page.totalPages).toBe(1);

    makeApiRequestMock.mockResolvedValueOnce(null);
    const empty = await userApi.getActivityLogs(0, 5);
    expect(empty.empty).toBe(true);
    expect(empty.content).toEqual([]);
  });
});
