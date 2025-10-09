import { describe, expect, test, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { act } from 'react';
import { useCustomers } from '@/hooks/useCustomers';

vi.mock('@/components/auth-provider', () => ({ useAuth: () => ({ user: { role: 'ADMIN' } }) }));
vi.mock('@/components/ui/use-toast', () => ({ useToast: () => ({ toast: () => {} }) }));

vi.mock('@/lib/api/customers', () => {
  const deactivateCustomer = vi.fn().mockResolvedValue({});
  const deleteCustomer = vi.fn().mockResolvedValue({});
  const searchCustomers = vi.fn().mockResolvedValue({ content: [{ id: '1', fullName: 'Alice', email: 'a@a.com', status: 'active', createdAt: new Date().toISOString() }] });
  const getAllCustomers = vi.fn().mockResolvedValue({ content: [{ id: '2', fullName: 'Bob', email: 'b@b.com', status: 'inactive', createdAt: new Date().toISOString() }] });
  return {
    customerApi: { deactivateCustomer, deleteCustomer, searchCustomers, getAllCustomers },
  };
});
import { customerApi } from '@/lib/api/customers';

function TestComponent() {
  const state = useCustomers({ searchDebounceMs: 0 });
  return (
    <div>
      <div data-testid="count">{state.customers.length}</div>
      <button onClick={() => state.actions.suspendCustomer('1')}>suspend</button>
      <button onClick={() => state.actions.deleteCustomer('2')}>delete</button>
    </div>
  );
}

describe('useCustomers', () => {
  beforeEach(() => {
    (customerApi.deactivateCustomer as any).mockClear();
    (customerApi.deleteCustomer as any).mockClear();
  });

test('loads customers and actions work', async () => {
    render(<TestComponent />);
    // Wait for customers to load (count should reflect mock response)
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('1'));
    await act(async () => { screen.getByText('suspend').click(); });
    expect((customerApi.deactivateCustomer as any)).toHaveBeenCalledWith('1');
    await act(async () => { screen.getByText('delete').click(); });
    expect((customerApi.deleteCustomer as any)).toHaveBeenCalledWith('2');
  });
});
