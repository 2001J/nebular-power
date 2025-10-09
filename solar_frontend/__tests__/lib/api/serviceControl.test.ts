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

describe('serviceControlApi', () => {
  beforeEach(() => {
    makeApiRequestMock.mockReset();
    makeApiRequestMock.mockImplementation((fn: any) => fn());
    Object.values(apiClientMock as any).forEach((fn: any) => fn.mockReset?.());
  });

  test('updateServiceStatus normalizes payload and validates status', async () => {
    apiClientMock.put.mockResolvedValueOnce({ data: { ok: true } });
    const result = await serviceControlApi.updateServiceStatus('1', { status: 'active', statusReason: 'x' });
    expect(apiClientMock.put).toHaveBeenCalledWith('/api/service/status/1', {
      status: 'ACTIVE',
      statusReason: 'x',
      updatedBy: 'SYSTEM',
      scheduledChange: null,
      scheduledTime: null,
    });
    expect(result).toEqual({ ok: true });
  });

  test('getLogsByTimeRange maps params to start/end', async () => {
    apiClientMock.get.mockResolvedValueOnce({ data: [] });
    await serviceControlApi.getLogsByTimeRange('2024-01-01', '2024-01-02');
    expect(apiClientMock.get).toHaveBeenCalledWith('/api/service/logs/time-range', {
      params: { start: '2024-01-01', end: '2024-01-02', page: 0, size: 20 },
    });
  });

  test('scheduleStatusChange sends query parameters', async () => {
    apiClientMock.post.mockResolvedValueOnce({ data: { scheduled: true } });
    const res = await serviceControlApi.scheduleStatusChange('2', 'ACTIVE', 'reason', '2024-01-01T00:00:00Z');
    expect(apiClientMock.post).toHaveBeenCalledWith('/api/service/status/2/schedule', null, {
      params: {
        targetStatus: 'ACTIVE',
        reason: 'reason',
        scheduledTime: '2024-01-01T00:00:00Z',
      },
    });
    expect(res).toEqual({ scheduled: true });
  });
});
