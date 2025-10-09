import { describe, expect, test, vi } from 'vitest';
import { makeApiRequest, NETWORK_CONFIG } from '@/lib/api/client';

describe('makeApiRequest retry logic', () => {
  test('retries once on retryable status codes', async () => {
    const axiosLikeError = { isAxiosError: true, response: { status: NETWORK_CONFIG.retryStatusCodes[0] }, message: 'x' } as any;
    const requestFn = vi.fn()
      .mockRejectedValueOnce(axiosLikeError)
      .mockResolvedValueOnce({ data: 'ok' });

    const before = Date.now();
    const res = await makeApiRequest(requestFn as any);
    const after = Date.now();

    expect(res).toBe('ok');
    expect(requestFn).toHaveBeenCalledTimes(2);
    // Ensure delay roughly happened (best-effort; not strict)
    expect(after - before).toBeGreaterThanOrEqual(NETWORK_CONFIG.retryDelay - 10);
  });
});
