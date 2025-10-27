import { describe, expect, test, vi, beforeEach } from 'vitest';
import { complianceApi } from '@/lib/api/compliance';

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

const getAllInstallations = vi.fn();
vi.mock('@/lib/api/installations', () => ({
  installationApi: {
    getAllInstallations: (...args: any[]) => getAllInstallations(...args),
  },
}));

const getCurrentStatus = vi.fn();
vi.mock('@/lib/api/serviceControl', () => ({
  serviceControlApi: {
    getCurrentStatus: (...args: any[]) => getCurrentStatus(...args),
  },
}));

const getActivityLogs = vi.fn();
vi.mock('@/lib/api/user', () => ({
  userApi: {
    getActivityLogs: (...args: any[]) => getActivityLogs(...args),
  },
}));

describe('complianceApi deep coverage', () => {
  beforeEach(() => {
    getMock.mockReset();
    postMock.mockReset();
    getAllInstallations.mockReset();
    getCurrentStatus.mockReset();
    getActivityLogs.mockReset();
  });

  test('installation compliance merges status and falls back on error', async () => {
    getAllInstallations.mockResolvedValueOnce({ content: [
      { id: 'i1', status: 'OLD', lastServiceDate: 'x', issuesCount: 1 },
      { id: 'i2' },
    ] });
    // First installation returns status; second throws
    getCurrentStatus
      .mockResolvedValueOnce({ status: 'OK', lastUpdated: '2025-01-01', issues: [] })
      .mockRejectedValueOnce(new Error('down'));

    const res = await complianceApi.getComprehensiveReport('installation');
    expect(res).toHaveLength(2);
    const a = res[0];
    expect(a.status).toBe('OK');
    expect(a.lastServiceDate).toBe('2025-01-01');
    expect(a.issuesCount).toBe(0);
    const b = res[1];
    expect(b.status).toBe('UNKNOWN');
    expect(b.issuesCount).toBe(0);
  });

  test('activity logs fallback: primary fails, userApi provides content', async () => {
    // Primary endpoint throws
    getMock.mockRejectedValueOnce(new Error('primary down'));
    getActivityLogs.mockResolvedValueOnce({ content: [
      { id: 'a1', activityType: 'INFO', timestamp: '2025-01-01' },
      { id: 'a2', activityType: 'WARN', timestamp: '2025-01-02' },
    ]});

    const logs = await complianceApi.getComprehensiveReport('activity');
    expect(Array.isArray(logs)).toBe(true);
    expect(logs.length).toBe(2);
  });

  test('generateComplianceReport success returns server payload', async () => {
    postMock.mockResolvedValueOnce({ data: { ok: true, id: 'r1' } });
    const r = await complianceApi.generateComplianceReport('security', 'json');
    expect(r.ok).toBe(true);
    expect(r.id).toBe('r1');
  });

  test('unsupported report type throws', async () => {
    await expect(complianceApi.getComprehensiveReport('unknown' as any)).rejects.toThrow('Unsupported compliance report type');
  });
});
