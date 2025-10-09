import { describe, expect, test, vi, beforeEach } from 'vitest';
import { installationApi } from '@/lib/api/installations';

const makeApiRequestMock = vi.fn();

vi.mock('@/lib/api/client', () => ({
  makeApiRequest: (fn: any) => makeApiRequestMock(fn),
  apiClient: {},
}));

describe('installationApi.getAllInstallations', () => {
  beforeEach(() => makeApiRequestMock.mockReset());

  test('wraps array responses into pageable object', async () => {
    makeApiRequestMock.mockResolvedValueOnce([{ id: 1 }, { id: 2 }]);
    const res = await installationApi.getAllInstallations();
    expect(res.content).toHaveLength(2);
    expect(res.totalElements).toBe(2);
    expect(res.totalPages).toBe(1);
  });

  test('passes through pageable response', async () => {
    const response = { content: [{ id: 1 }], totalElements: 1, totalPages: 1 };
    makeApiRequestMock.mockResolvedValueOnce(response);
    const res = await installationApi.getAllInstallations();
    expect(res).toBe(response);
  });

  test('handles SystemOverviewResponse structure', async () => {
    const overview = {
      recentlyActiveInstallations: [{ id: 5 }],
      totalActiveInstallations: 1,
    };
    makeApiRequestMock.mockResolvedValueOnce(overview);
    const res = await installationApi.getAllInstallations();
    expect(res.content).toEqual([{ id: 5 }]);
    expect(res.overview).toEqual(overview);
  });
});

