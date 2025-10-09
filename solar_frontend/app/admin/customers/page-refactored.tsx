"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

// Import our new shared components
import { PageHeader } from '@/components/shared/LoadingStates';
import { DataTable, StatusBadge } from '@/components/shared/DataTable';
import type { DataTableColumn } from '@/components/shared/DataTable';

// Import our custom hook
import { useCustomers } from '@/hooks/useCustomers';

interface Customer {
  id: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  status: string;
  createdAt: string;
  joinDate?: string;
}

export default function CustomersPageRefactored() {
  const router = useRouter();
  const {
    customers,
    loading,
    error,
    pagination,
    search,
    filters,
    actions
  } = useCustomers();

  // Dialog states
  const [showConfirmDialog, setShowConfirmDialog] = React.useState(false);
  const [confirmAction, setConfirmAction] = React.useState<{
    type: 'suspend' | 'activate' | 'delete';
    customerId: string;
    customerName: string;
  } | null>(null);

  // Handle customer actions with confirmation
  const handleCustomerAction = (
    type: 'suspend' | 'activate' | 'delete',
    customer: Customer
  ) => {
    setConfirmAction({
      type,
      customerId: customer.id,
      customerName: customer.fullName,
    });
    setShowConfirmDialog(true);
  };

  const executeAction = async () => {
    if (!confirmAction) return;

    switch (confirmAction.type) {
      case 'suspend':
        await actions.suspendCustomer(confirmAction.customerId);
        break;
      case 'activate':
        await actions.activateCustomer(confirmAction.customerId);
        break;
      case 'delete':
        await actions.deleteCustomer(confirmAction.customerId);
        break;
    }

    setShowConfirmDialog(false);
    setConfirmAction(null);
  };

  // Define table columns
  const columns: DataTableColumn<Customer>[] = [
    {
      key: 'fullName',
      title: 'Name',
      sortable: true,
      render: (value, row) => (
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-muted-foreground" />
          <div>
            <div className="font-medium">{value}</div>
            <div className="text-sm text-muted-foreground">{row.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'phoneNumber',
      title: 'Phone',
      render: (value) => value || 'N/A',
    },
    {
      key: 'status',
      title: 'Status',
      sortable: true,
      render: (value) => <StatusBadge status={value} />,
    },
    {
      key: 'createdAt',
      title: 'Date Joined',
      sortable: true,
      render: (value) => {
        try {
          return new Date(value).toLocaleDateString();
        } catch {
          return 'N/A';
        }
      },
    },
  ];

  // Define table actions
  const tableActions = [
    {
      label: 'View',
      onClick: (customer: Customer) => router.push(`/admin/customers/${customer.id}`),
      variant: 'ghost' as const,
    },
    {
      label: 'Edit',
      onClick: (customer: Customer) => router.push(`/admin/customers/${customer.id}/edit`),
      variant: 'ghost' as const,
    },
    {
      label: 'Suspend',
      onClick: (customer: Customer) => handleCustomerAction('suspend', customer),
      variant: 'ghost' as const,
      disabled: (customer: Customer) => customer.status === 'suspended',
    },
    {
      label: 'Activate',
      onClick: (customer: Customer) => handleCustomerAction('activate', customer),
      variant: 'ghost' as const,
      disabled: (customer: Customer) => customer.status === 'active',
    },
    {
      label: 'Delete',
      onClick: (customer: Customer) => handleCustomerAction('delete', customer),
      variant: 'destructive' as const,
    },
  ];

  // Define filters
  const statusFilters = [
    { value: 'all', label: 'All Statuses' },
    { value: 'active', label: 'Active' },
    { value: 'suspended', label: 'Suspended' },
    { value: 'inactive', label: 'Inactive' },
  ];

  const breadcrumbs = (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="/admin">Dashboard</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>Customers</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );

  const headerActions = (
    <>
      <Button onClick={actions.exportToCSV} variant="outline">
        Export CSV
      </Button>
      <Button onClick={() => router.push('/admin/customers/new')}>
        <Plus className="w-4 h-4 mr-2" />
        Add Customer
      </Button>
    </>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        description="Manage your customer accounts and their information."
        breadcrumbs={breadcrumbs}
        actions={headerActions}
      />

      <DataTable
        data={customers}
        columns={columns}
        loading={loading}
        error={error}
        searchable
        searchPlaceholder="Search customers..."
        searchValue={search.term}
        onSearchChange={actions.setSearchTerm}
        pagination={{
          currentPage: pagination.currentPage,
          totalPages: pagination.totalPages,
          totalElements: pagination.totalElements,
          pageSize: pagination.pageSize,
          onPageChange: actions.setPage,
        }}
        filters={[
          {
            key: 'status',
            label: 'Status',
            options: statusFilters,
            defaultValue: 'all',
          },
        ]}
        filterValues={{
          status: filters.status,
        }}
        onFilterChange={(key, value) => {
          if (key === 'status') {
            actions.setStatusFilter(value);
          }
        }}
        actions={tableActions}
        exportable
        onExport={actions.exportToCSV}
        emptyState={{
          title: 'No customers found',
          description: 'Get started by adding your first customer.',
          action: {
            label: 'Add Customer',
            onClick: () => router.push('/admin/customers/new'),
          },
        }}
      />

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {(() => {
                if (confirmAction?.type === 'delete') return 'Delete Customer';
                if (confirmAction?.type === 'suspend') return 'Suspend Customer';
                return 'Activate Customer';
              })()}
            </DialogTitle>
            <DialogDescription>
              {(() => {
                if (confirmAction?.type === 'delete') {
                  return `Are you sure you want to delete ${confirmAction?.customerName}? This action cannot be undone.`;
                }
                if (confirmAction?.type === 'suspend') {
                  return `Are you sure you want to suspend ${confirmAction?.customerName}? They will not be able to access their account.`;
                }
                return `Are you sure you want to activate ${confirmAction?.customerName}? They will be able to access their account.`;
              })()}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowConfirmDialog(false);
                setConfirmAction(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant={confirmAction?.type === 'delete' ? 'destructive' : 'default'}
              onClick={executeAction}
            >
              {(() => {
                if (confirmAction?.type === 'delete') return 'Delete';
                if (confirmAction?.type === 'suspend') return 'Suspend';
                return 'Activate';
              })()}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
