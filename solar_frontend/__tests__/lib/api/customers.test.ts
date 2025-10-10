import { describe, expect, test, vi, beforeEach } from 'vitest';
import { customerApi } from '@/lib/api/customers';

const makeApiRequestMock = vi.fn();

vi.mock('@/lib/api/client', () => ({
  makeApiRequest: (fn: any) => makeApiRequestMock(fn),
  apiClient: {},
  buildQueryString: (params: Record<string, any>) => {
    const qs = new URLSearchParams(params as any).toString();
    return qs ? `?${qs}` : '';
  },
}));

describe('customerApi', () => {
  beforeEach(() => makeApiRequestMock.mockReset());

  test('getAllCustomers normalizes array to pageable', async () => {
    makeApiRequestMock.mockResolvedValueOnce([{ id: 'c1' }, { id: 'c2' }]);
    const res = await customerApi.getAllCustomers();
    expect(res.content).toHaveLength(2);
    expect(res.totalPages).toBe(1);
    expect(res.empty).toBe(false);
  });

  test('getAllCustomers passes pageable through', async () => {
    const page = { content: [{ id: 'c1' }], totalElements: 1, totalPages: 1, size: 1, number: 0, first: true, last: true, empty: false };
    makeApiRequestMock.mockResolvedValueOnce(page);
    const res = await customerApi.getAllCustomers();
    expect(res).toEqual(page);
  });

  test('getAllCustomers handles null to empty page', async () => {
    makeApiRequestMock.mockResolvedValueOnce(null);
    const res = await customerApi.getAllCustomers(2, 25);
    expect(res.empty).toBe(true);
    expect(res.content).toEqual([]);
    expect(res.number).toBe(2);
    expect(res.size).toBe(25);
  });

  test('getCustomerActivityLogs normalizes array to pageable', async () => {
    makeApiRequestMock.mockResolvedValueOnce([{ id: 'l1', activityType: 'INFO', timestamp: '2024-01-01' }]);
    const res = await customerApi.getCustomerActivityLogs('x');
    expect(res.content).toHaveLength(1);
    expect(res.totalPages).toBe(1);
  });

  test('searchCustomers calls endpoint with query', async () => {
    const page = { content: [], totalElements: 0, totalPages: 0, size: 10, number: 0, first: true, last: true, empty: true };
    makeApiRequestMock.mockResolvedValueOnce(page);
    const res = await customerApi.searchCustomers('john');
    expect(res).toEqual(page);
  });

  test('getCustomerById returns customer', async () => {
    makeApiRequestMock.mockResolvedValueOnce({ id: 'c1', email: 'e', fullName: 'F', status: 'active', createdAt: 'x' });
    const c = await customerApi.getCustomerById('c1');
    expect(c.id).toBe('c1');
  });

  test('create/update/deactivate/reactivate/reset/delete work', async () => {
    makeApiRequestMock
      .mockResolvedValueOnce({ data: { id: 'c2' }, timestamp: 't' }) // create
      .mockResolvedValueOnce({ data: { id: 'c2' }, timestamp: 't' }) // update
      .mockResolvedValueOnce({ data: { message: 'ok' }, timestamp: 't' }) // deactivate
      .mockResolvedValueOnce({ data: { message: 'ok' }, timestamp: 't' }) // reactivate
      .mockResolvedValueOnce({ data: { message: 'ok' }, timestamp: 't' }) // reset
      .mockResolvedValueOnce({ data: { message: 'ok' }, timestamp: 't' }); // delete

    const created = await customerApi.createCustomer({ email: 'a', fullName: 'b' });
    expect(created.data.id).toBe('c2');
    const updated = await customerApi.updateCustomer('c2', { fullName: 'bb' });
    expect(updated.data.id).toBe('c2');
    const deact = await customerApi.deactivateCustomer('c2');
    expect(deact.data.message).toBe('ok');
    const react = await customerApi.reactivateCustomer('c2');
    expect(react.data.message).toBe('ok');
    const reset = await customerApi.resetCustomerPassword('c2');
    expect(reset.data.message).toBe('ok');
    const del = await customerApi.deleteCustomer('c2');
    expect(del.data.message).toBe('ok');
  });

  test('getCustomerStats returns numbers', async () => {
    makeApiRequestMock.mockResolvedValueOnce({ total: 10, active: 8, inactive: 1, suspended: 1 });
    const stats = await customerApi.getCustomerStats();
    expect(stats.total).toBe(10);
  });

  test('getCustomersByStatus builds query', async () => {
    const page = { content: [], totalElements: 0, totalPages: 0, size: 10, number: 0, first: true, last: true, empty: true };
    makeApiRequestMock.mockResolvedValueOnce(page);
    const res = await customerApi.getCustomersByStatus('active', 0, 10);
    expect(res).toEqual(page);
  });
});
