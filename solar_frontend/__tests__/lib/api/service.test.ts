import { describe, expect, test, vi, beforeEach } from 'vitest';
import { serviceApi } from '@/lib/api/service';

const makeApiRequestMock = vi.fn();
const postMock = vi.fn();
const getMock = vi.fn();

vi.mock('@/lib/api/client', () => ({
  makeApiRequest: async (fn: any) => {
    // call-through so apiClient spies are exercised
    const res = await fn();
    return makeApiRequestMock.mockResolvedValue(res) && res;
  },
  apiClient: {
    post: (...args: any[]) => postMock(...args),
    get: (...args: any[]) => getMock(...args),
  },
}));

describe('serviceApi', () => {
  beforeEach(() => {
    makeApiRequestMock.mockReset();
    postMock.mockReset();
    getMock.mockReset();
  });

  test('start/stop/restart service endpoints', async () => {
    postMock.mockResolvedValue({ data: { message: 'ok' } });
    await serviceApi.startService('i1');
    await serviceApi.stopService('i1');
    await serviceApi.restartService('i1');
    expect(postMock).toHaveBeenCalledTimes(3);
  });

  test('getSystemHealth and getSystemHeartbeats', async () => {
    getMock.mockResolvedValue({ data: { overallStatus: 'healthy' } });
    await serviceApi.getSystemHealth();
    getMock.mockResolvedValue({ data: { content: [] } });
    await serviceApi.getSystemHeartbeats(0, 10);
    expect(getMock).toHaveBeenCalledTimes(2);
  });
});
