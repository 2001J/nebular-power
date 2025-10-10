import { describe, expect, test, vi, beforeEach } from 'vitest';
import { tamperDetectionApi } from '@/lib/api/tamperDetection';

const makeApiRequestMock = vi.fn();
const postMock = vi.fn();
const putMock = vi.fn();
const getMock = vi.fn();

vi.mock('@/lib/api/client', () => ({
  makeApiRequest: async (fn: any) => {
    try {
      const res = await fn();
      makeApiRequestMock.mockResolvedValue(res);
      return res;
    } catch (e) {
      makeApiRequestMock.mockRejectedValue(e);
      throw e;
    }
  },
  apiClient: {
    post: (...args: any[]) => postMock(...args),
    put: (...args: any[]) => putMock(...args),
    get: (...args: any[]) => getMock(...args),
  },
}));

describe('tamperDetectionApi', () => {
  beforeEach(() => {
    makeApiRequestMock.mockReset();
    postMock.mockReset();
    putMock.mockReset();
    getMock.mockReset();
    // clear localStorage between tests
    if (typeof window !== 'undefined') {
      window.localStorage.clear();
    }
  });

  test('start/stop monitoring persists state', async () => {
    postMock.mockResolvedValue({ data: { ok: true } });
    await tamperDetectionApi.startMonitoring('i1');
    expect(postMock).toHaveBeenCalled();
    expect(window.localStorage.getItem('monitoring_i1')).toBe('true');

    await tamperDetectionApi.stopMonitoring('i1');
    expect(window.localStorage.getItem('monitoring_i1')).toBe('false');
  });

  test('getMonitoringStatus falls back to localStorage on error', async () => {
    // make the underlying api call fail so the catch path is used
    getMock.mockRejectedValueOnce(new Error('network'));
    window.localStorage.setItem('monitoring_i2', 'true');
    const status = await tamperDetectionApi.getMonitoringStatus('i2');
    expect(status.isMonitoring).toBe(true);
  });

  test('adjustSensitivity and runDiagnostics call endpoints', async () => {
    putMock.mockResolvedValue({ data: { ok: true } });
    postMock.mockResolvedValue({ data: { ok: true } });
    await tamperDetectionApi.adjustSensitivity('i3', 'panel_removal', 5);
    await tamperDetectionApi.runDiagnostics('i3');
    expect(putMock).toHaveBeenCalled();
    expect(postMock).toHaveBeenCalled();
  });
});
