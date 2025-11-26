import { describe, expect, test, vi, beforeEach } from 'vitest';
import { serviceControlApi } from '@/lib/api/serviceControl';

const getMock = vi.fn();
const postMock = vi.fn();
const putMock = vi.fn();
const deleteMock = vi.fn();

vi.mock('@/lib/api/client', () => ({
  makeApiRequest: async (fn: any) => {
    const res = await fn();
    return res?.data;
  },
  apiClient: {
    get: (...args: any[]) => getMock(...args),
    post: (...args: any[]) => postMock(...args),
    put: (...args: any[]) => putMock(...args),
    delete: (...args: any[]) => deleteMock(...args),
  },
}));

describe('serviceControlApi additional endpoints', () => {
  beforeEach(() => {
    getMock.mockReset();
    postMock.mockReset();
    putMock.mockReset();
    deleteMock.mockReset();
  });

  test('status endpoints', async () => {
    getMock.mockResolvedValueOnce({ data: { status: 'OK' } });
    await serviceControlApi.getCurrentStatus('i1');
    getMock.mockResolvedValueOnce({ data: { content: [] } });
    await serviceControlApi.getStatusHistory('i1');
  });

  test('updateServiceStatus validates status and sends put', async () => {
    putMock.mockResolvedValueOnce({ data: { ok: true } });
    await serviceControlApi.updateServiceStatus('i1', { status: 'ACTIVE' });
    await expect(serviceControlApi.updateServiceStatus('i1', { status: 'BAD' })).rejects.toThrow('Invalid status value');
  });

  test('suspend/restore', async () => {
    postMock.mockResolvedValue({ data: { ok: true } });
    await serviceControlApi.suspendServiceForPayment('i1', 'r');
    await serviceControlApi.suspendServiceForSecurity('i1', 'r');
    await serviceControlApi.suspendServiceForMaintenance('i1', {});
    await serviceControlApi.restoreService('i1', 'r');
  });

  test('command endpoints', async () => {
    postMock.mockResolvedValue({ data: { ok: true } });
    await serviceControlApi.sendCommand('i1', 'restart');
    getMock.mockResolvedValue({ data: { content: [] } });
    await serviceControlApi.getCommandsByStatus('pending');
    await serviceControlApi.getCommandsByInstallation('i1');
    getMock.mockResolvedValue({ data: [] });
    await serviceControlApi.getPendingCommands('i1');
    getMock.mockResolvedValue({ data: {} });
    await serviceControlApi.getCommandById('c1');
    await serviceControlApi.getCommandByCorrelationId('x');
    await serviceControlApi.getCommandStatusCounts();
    postMock.mockResolvedValue({ data: { ok: true } });
    await serviceControlApi.cancelCommand('c1');
    await serviceControlApi.retryCommand('c1');
  });

  test('log endpoints + export', async () => {
    getMock.mockResolvedValue({ data: { content: [] } });
  await serviceControlApi.getLogsByTimeRange('s', 'e');
    await serviceControlApi.getLogsByOperation('RESTART');
    getMock.mockResolvedValue({ data: [] });
    await serviceControlApi.getLogsBySourceSystem('SYS');
    getMock.mockResolvedValue({ data: new Blob(['x']) });
    await serviceControlApi.exportLogs({});
  });
});
