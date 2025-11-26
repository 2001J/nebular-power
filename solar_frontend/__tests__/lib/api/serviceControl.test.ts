import { describe, expect, test, vi, beforeEach } from 'vitest';
import { serviceControlApi } from '@/lib/api/serviceControl';

const makeApiRequestMock = vi.fn();

vi.mock('@/lib/api/client', () => {
  const apiClientMock = { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() };
  return {
    // Emulate real makeApiRequest returning response.data
    makeApiRequest: async (fn: any) => {
      const res = await fn();
      return res?.data ?? res;
    },
    apiClient: apiClientMock,
  };
});
import { apiClient as apiClientMock } from '@/lib/api/client';
// Cast to any to access vitest mock helpers in a type-safe way for TS
const api = apiClientMock as unknown as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

describe('serviceControlApi', () => {
  beforeEach(() => {
    makeApiRequestMock.mockReset();
    makeApiRequestMock.mockImplementation((fn: any) => fn());
    Object.values(api as any).forEach((fn: any) => fn.mockReset?.());
  });

  test('updateServiceStatus normalizes payload and validates status', async () => {
    api.put.mockResolvedValueOnce({ data: { ok: true } });
    const result = await serviceControlApi.updateServiceStatus('inst1', { 
      status: 'active', 
      statusReason: 'Test reason',
      updatedBy: 'test-user' 
    });
    expect(api.put).toHaveBeenCalledWith('/api/service/status/inst1', {
      status: 'ACTIVE',
      statusReason: 'Test reason',
      updatedBy: 'test-user',
    });
    expect(result).toEqual({ ok: true });
  });

  test('getLogsByTimeRange maps params to start/end', async () => {
    api.get.mockResolvedValueOnce({ data: [] });
    await serviceControlApi.getLogsByTimeRange('2024-01-01', '2024-01-02');
    expect(api.get).toHaveBeenCalledWith('/api/service/logs/time-range', {
      params: { start: '2024-01-01', end: '2024-01-02', page: 0, size: 20 },
    });
  });
});
