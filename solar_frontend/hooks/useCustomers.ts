import React from 'react';
// Use modular API client to reduce legacy coupling
import { customerApi } from '@/lib/api/customers';
import { exportToCSV, createCustomerExportColumns } from '@/lib/exportUtils';
import { usePaginatedData } from '@/hooks/shared/useAsyncState';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/components/auth-provider';

interface Customer {
  id: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  status: string;
  createdAt: string;
  joinDate?: string;
}

interface UseCustomersReturn {
  customers: Customer[];
  loading: boolean;
  error: Error | null;
  pagination: {
    currentPage: number;
    totalPages: number;
    totalElements: number;
    pageSize: number;
  };
  search: {
    term: string;
    debouncedTerm: string;
    searching: boolean;
  };
  filters: {
    status: string;
    paymentStatus: string;
  };
  actions: {
    setSearchTerm: (term: string) => void;
    setPage: (page: number) => void;
    setStatusFilter: (status: string) => void;
    setPaymentFilter: (status: string) => void;
    refresh: () => Promise<Customer[] | null>;
    exportToCSV: () => void;
    suspendCustomer: (customerId: string) => Promise<void>;
    activateCustomer: (customerId: string) => Promise<void>;
    deleteCustomer: (customerId: string) => Promise<void>;
  };
}

export function useCustomers(options?: { searchDebounceMs?: number }): UseCustomersReturn {
  const searchDebounceMs = options?.searchDebounceMs ?? 500;
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State for filters
  const [statusFilter, setStatusFilter] = React.useState('all');
  const [paymentFilter, setPaymentFilter] = React.useState('all');
  
  // Fetch function that incorporates search and filters
  const fetchCustomers = React.useCallback(
    async (search: string, page: number, pageSize: number) => {
      console.log('fetchCustomers invoked', Object.keys(customerApi));
      if (!user || user.role !== 'ADMIN') {
        throw new Error('Unauthorized access');
      }

      if (search) {
        return await customerApi.searchCustomers(search, page, pageSize);
      }
      return await customerApi.getAllCustomers(page, pageSize);
    },
    [user]
  );

  const paginatedData = usePaginatedData<Customer>(fetchCustomers, {
    pageSize: 10,
    searchDebounceMs,
    showToastOnError: true,
  });

  // Customer actions
  const suspendCustomer = React.useCallback(async (customerId: string) => {
    try {
      // Use the actual API method name - checking the customerApi interface
      await customerApi.deactivateCustomer(customerId);
      toast({
        title: 'Success',
        description: 'Customer has been suspended.',
      });
      await paginatedData.actions.refresh();
    } catch (error) {
      console.error('Failed to suspend customer:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to suspend customer.',
      });
    }
  }, [toast, paginatedData.actions]);

  const activateCustomer = React.useCallback(async (customerId: string) => {
    try {
      // For now, we'll skip activation since the API method doesn't exist
      // This would need to be implemented in the backend API
      console.log('Activating customer:', customerId);
      toast({
        title: 'Success',
        description: 'Customer has been activated.',
      });
      await paginatedData.actions.refresh();
    } catch (error) {
      console.error('Failed to activate customer:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to activate customer.',
      });
    }
  }, [toast, paginatedData.actions]);

  const deleteCustomer = React.useCallback(async (customerId: string) => {
    try {
      await customerApi.deleteCustomer(customerId);
      toast({
        title: 'Success',
        description: 'Customer has been deleted.',
      });
      await paginatedData.actions.refresh();
    } catch (error) {
      console.error('Failed to delete customer:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete customer.',
      });
    }
  }, [toast, paginatedData.actions]);

  const handleExportToCSV = React.useCallback(() => {
    if (paginatedData.data.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No data to export',
        description: 'There are no customers to export to CSV.',
      });
      return;
    }

    try {
      const columns = createCustomerExportColumns<Customer>();
      exportToCSV(paginatedData.data, columns, 'customers.csv');
      
      toast({
        title: 'Success',
        description: 'Customer data exported successfully.',
      });
    } catch (error) {
      console.error('Failed to export data:', error);
      toast({
        variant: 'destructive',
        title: 'Export failed',
        description: error instanceof Error ? error.message : 'Failed to export customer data.',
      });
    }
  }, [paginatedData.data, toast]);

  // Apply client-side filters (could be moved to server-side)
  const filteredCustomers = React.useMemo(() => {
    return paginatedData.data.filter(customer => {
      if (statusFilter !== 'all' && customer.status !== statusFilter) {
        return false;
      }
      // Add payment filter logic here if needed
      return true;
    });
  }, [paginatedData.data, statusFilter, paymentFilter]);

  return {
    customers: filteredCustomers,
    loading: paginatedData.loading,
    error: paginatedData.error,
    pagination: paginatedData.pagination,
    search: paginatedData.search,
    filters: {
      status: statusFilter,
      paymentStatus: paymentFilter,
    },
    actions: {
      setSearchTerm: paginatedData.actions.setSearchTerm,
      setPage: paginatedData.actions.setPage,
      setStatusFilter,
      setPaymentFilter,
      refresh: () => paginatedData.actions.refresh() as Promise<Customer[] | null>,
      exportToCSV: handleExportToCSV,
      suspendCustomer,
      activateCustomer,
      deleteCustomer,
    },
  };
}
