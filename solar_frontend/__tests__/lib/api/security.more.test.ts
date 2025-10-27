import { describe, expect, test, vi, beforeEach } from 'vitest';
import { securityApi } from '@/lib/api/security';

const getMock = vi.fn();
const putMock = vi.fn();
const postMock = vi.fn();

vi.mock('@/lib/api/client', () => ({
  makeApiRequest: async (fn: any) => {
    const res = await fn();
    return res?.data;
  },
  apiClient: {
    get: (...args: any[]) => getMock(...args),
    put: (...args: any[]) => putMock(...args),
    post: (...args: any[]) => postMock(...args),
  },
}));

describe('securityApi additional endpoints', () => {
  beforeEach(() => {
    getMock.mockReset();
    putMock.mockReset();
    postMock.mockReset();
  });

  test('getTamperEvents/unresolved/all variations handle array and paginated', async () => {
    getMock.mockResolvedValueOnce({ data: [{ id: 'e1' }] });
    const a = await securityApi.getTamperEvents();
    expect(a.length).toBe(1);

    getMock.mockResolvedValueOnce({ data: { content: [{ id: 'e2' }] } });
    const b = await securityApi.getUnresolvedEvents();
    expect(b.length).toBe(1);

    getMock.mockResolvedValueOnce({ data: { content: [] } });
    const c = await securityApi.getAllTamperEvents();
    expect(Array.isArray(c)).toBe(true);
  });

  test('installation alerts and audit logs', async () => {
    getMock.mockResolvedValueOnce({ data: { content: [] } });
    await securityApi.getInstallationAlerts('i1');

    getMock.mockResolvedValueOnce({ data: { content: [] } });
    await securityApi.getAdminAuditLogs(0, 20, 'LOGIN');

    getMock.mockResolvedValueOnce({ data: { content: [] } });
    await securityApi.getLogsByTimeRange('i1', 's', 'e', 0, 20);
  });

  test('events get/ack/update/resolve', async () => {
    getMock.mockResolvedValueOnce({ data: {} });
    await securityApi.getTamperEventById('e1');

    putMock.mockResolvedValueOnce({ data: {} });
    await securityApi.acknowledgeEvent('e1');

    putMock.mockResolvedValueOnce({ data: {} });
    await securityApi.updateEventStatus('e1', 'RESOLVED');

    postMock.mockResolvedValueOnce({ data: {} });
    await securityApi.resolveEvent('e1', 'admin', 'ok');
  });

  test('getInstallationSecurityStatus protective fallback', async () => {
    getMock.mockRejectedValueOnce(new Error('down'));
    const s = await securityApi.getInstallationSecurityStatus('i1');
    expect(s.status).toBe('UNKNOWN');
  });
});
