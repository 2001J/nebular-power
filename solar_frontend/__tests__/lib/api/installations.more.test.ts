import { describe, test, vi, beforeEach } from 'vitest';
import { installationApi } from '@/lib/api/installations';

const getMock = vi.fn();
const postMock = vi.fn();
const putMock = vi.fn();

vi.mock('@/lib/api/client', () => ({
  makeApiRequest: async (fn: any) => {
    const res = await fn();
    return res?.data;
  },
  apiClient: {
    get: (...args: any[]) => getMock(...args),
    post: (...args: any[]) => postMock(...args),
    put: (...args: any[]) => putMock(...args),
  },
}));

describe('installationApi additional endpoints', () => {
  beforeEach(() => {
    getMock.mockReset();
    postMock.mockReset();
    putMock.mockReset();
  });

  test('customer/list/detail create/update/tamper', async () => {
    getMock.mockResolvedValueOnce({ data: [] });
    await installationApi.getCustomerInstallations('c1');
    getMock.mockResolvedValueOnce({ data: {} });
    await installationApi.getInstallationDetails('i1');
    postMock.mockResolvedValueOnce({ data: { id: 'i2' } });
    await installationApi.createInstallation({});
    putMock.mockResolvedValueOnce({ data: { ok: true } });
    await installationApi.updateInstallation('i1', {});
    getMock.mockResolvedValueOnce({ data: [] });
    await installationApi.getTamperAlerts();
  });
});
