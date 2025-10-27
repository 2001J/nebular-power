import { describe, expect, test, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useCustomers } from '@/hooks/useCustomers';

vi.mock('@/components/auth-provider', () => ({ 
  useAuth: () => ({ 
    user: { role: 'ADMIN', id: '1', email: 'admin@test.com' },
    isAuthenticated: true,
  }) 
}));

vi.mock('@/components/ui/use-toast', () => ({ 
  useToast: () => ({ toast: vi.fn() }) 
}));

vi.mock('@/lib/api/customers', () => ({
  customerApi: {
    deactivateCustomer: vi.fn().mockResolvedValue({}),
    deleteCustomer: vi.fn().mockResolvedValue({}),
    searchCustomers: vi.fn().mockResolvedValue({ 
      content: [{ id: '1', fullName: 'Alice', email: 'a@a.com', status: 'active', createdAt: new Date().toISOString() }],
      totalElements: 1,
      totalPages: 1,
      number: 0,
      size: 10,
    }),
    getAllCustomers: vi.fn().mockResolvedValue({ 
      content: [{ id: '1', fullName: 'Alice', email: 'a@a.com', status: 'active', createdAt: new Date().toISOString() }],
      totalElements: 1,
      totalPages: 1,
      number: 0,
      size: 10,
    }),
  },
}));

import { customerApi } from '@/lib/api/customers';

describe('useCustomers', () => {
  test('loads customers and actions work', async () => {
    const { result } = renderHook(() => useCustomers({ searchDebounceMs: 0 }));
    
    // Wait for customers to load
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    }, { timeout: 3000 });
    
    // Verify customers are loaded
    expect(result.current.customers).toHaveLength(1);
    expect(result.current.customers[0].fullName).toBe('Alice');
    
    // Test suspend action
    await result.current.actions.suspendCustomer('1');
    expect(customerApi.deactivateCustomer).toHaveBeenCalledWith('1');
    
    // Test delete action
    await result.current.actions.deleteCustomer('2');
    expect(customerApi.deleteCustomer).toHaveBeenCalledWith('2');
  });
});
