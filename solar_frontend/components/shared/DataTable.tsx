import React from 'react';
import { Search, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { LoadingSpinner, EmptyState } from './LoadingStates';

export interface DataTableColumn<T> {
  readonly key: keyof T | string;
  readonly title: string;
  readonly sortable?: boolean;
  readonly render?: (value: any, row: T, index: number) => React.ReactNode;
  readonly width?: string;
  readonly className?: string;
}

interface DataTableFilter {
  readonly key: string;
  readonly label: string;
  readonly options: Array<{ readonly value: string; readonly label: string }>;
  readonly defaultValue?: string;
}

interface DataTableAction<T> {
  readonly label: string;
  readonly onClick: (row: T) => void;
  readonly variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  readonly size?: 'default' | 'sm' | 'lg' | 'icon';
  readonly disabled?: (row: T) => boolean;
}

interface DataTableProps<T> {
  readonly data: T[];
  readonly columns: DataTableColumn<T>[];
  readonly loading?: boolean;
  readonly error?: Error | null;
  
  // Search
  readonly searchable?: boolean;
  readonly searchPlaceholder?: string;
  readonly searchValue?: string;
  readonly onSearchChange?: (value: string) => void;
  
  // Pagination
  readonly pagination?: {
    readonly currentPage: number;
    readonly totalPages: number;
    readonly totalElements: number;
    readonly pageSize: number;
    readonly onPageChange: (page: number) => void;
    readonly onPageSizeChange?: (size: number) => void;
  };
  
  // Filters
  readonly filters?: DataTableFilter[];
  readonly filterValues?: Record<string, string>;
  readonly onFilterChange?: (key: string, value: string) => void;
  
  // Sorting
  readonly sortField?: string;
  readonly sortDirection?: 'asc' | 'desc';
  readonly onSortChange?: (field: string, direction: 'asc' | 'desc') => void;
  
  // Actions
  readonly actions?: DataTableAction<T>[];
  readonly bulkActions?: Array<{
    readonly label: string;
    readonly onClick: (selectedRows: T[]) => void;
  }>;
  
  // Export
  readonly exportable?: boolean;
  readonly onExport?: () => void;
  
  // Empty state
  readonly emptyState?: {
    readonly title: string;
    readonly description?: string;
    readonly action?: {
      readonly label: string;
      readonly onClick: () => void;
    };
  };
  
  readonly className?: string;
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  loading,
  error,
  searchable = true,
  searchPlaceholder = "Search...",
  searchValue,
  onSearchChange,
  pagination,
  filters,
  filterValues = {},
  onFilterChange,
  sortField,
  sortDirection,
  onSortChange,
  actions,
  exportable,
  onExport,
  emptyState,
  className
}: DataTableProps<T>) {
  const handleSort = React.useCallback((column: DataTableColumn<T>) => {
    if (!column.sortable || !onSortChange) return;
    
    const field = typeof column.key === 'string' ? column.key : String(column.key);
    const newDirection = sortField === field && sortDirection === 'asc' ? 'desc' : 'asc';
    onSortChange(field, newDirection);
  }, [sortField, sortDirection, onSortChange]);
  
  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center p-8">
          <LoadingSpinner size="lg" text="Loading data..." />
        </CardContent>
      </Card>
    );
  }
  
  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <EmptyState
            title="Error loading data"
            description={error.message}
            action={{
              label: "Try again",
              onClick: () => window.location.reload()
            }}
          />
        </CardContent>
      </Card>
    );
  }
  
  const hasData = data.length > 0;
  const showEmptyState = !hasData && emptyState;
  
  return (
    <Card className={className}>
      {/* Header with search, filters, and actions */}
      <CardContent className="p-6 pb-0">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 items-center gap-2">
            {searchable && (
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={searchPlaceholder}
                  value={searchValue || ''}
                  onChange={(e) => onSearchChange?.(e.target.value)}
                  className="pl-8 w-64"
                />
              </div>
            )}
            
            {filters?.map((filter) => (
              <Select
                key={filter.key}
                value={filterValues[filter.key] || filter.defaultValue || ''}
                onValueChange={(value) => onFilterChange?.(filter.key, value)}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder={filter.label} />
                </SelectTrigger>
                <SelectContent>
                  {filter.options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ))}
          </div>
          
          <div className="flex items-center gap-2">
            {exportable && (
              <Button variant="outline" size="sm" onClick={onExport}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            )}
          </div>
        </div>
      </CardContent>
      
      {/* Table */}
      <CardContent className="p-0">
        {showEmptyState ? (
          <div className="p-8">
            <EmptyState {...emptyState} />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  <TableHead
                    key={`header-${String(column.key)}`}
                    className={cn(
                      column.sortable && "cursor-pointer select-none hover:bg-muted/50",
                      column.className
                    )}
                    style={{ width: column.width }}
                    onClick={() => handleSort(column)}
                  >
                    <div className="flex items-center gap-2">
                      {column.title}
                      {column.sortable && sortField === column.key && (
                        <span className="text-xs">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </TableHead>
                ))}
                {actions && actions.length > 0 && (
                  <TableHead className="w-24">Actions</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row, rowIndex) => {
                // Create a unique key based on row data or index
                const rowKey = (row.id || row.key || rowIndex) as string | number;
                return (
                  <TableRow key={`row-${rowKey}`}>
                    {columns.map((column) => {
                      const value = typeof column.key === 'string' && column.key.includes('.')
                        ? column.key.split('.').reduce((obj, key) => obj?.[key], row)
                        : row[column.key as keyof T];
                      
                      const getDisplayValue = (val: any): string => {
                        if (val === null || val === undefined) return '';
                        if (typeof val === 'object') return JSON.stringify(val);
                        return String(val);
                      };
                      const displayValue = getDisplayValue(value);
                      
                      return (
                        <TableCell key={`cell-${rowKey}-${String(column.key)}`} className={column.className}>
                          {column.render ? column.render(value, row, rowIndex) : displayValue}
                        </TableCell>
                      );
                    })}
                    {actions && actions.length > 0 && (
                      <TableCell key={`actions-${rowKey}`}>
                        <div className="flex items-center gap-1">
                          {actions.map((action) => (
                            <Button
                              key={`action-${rowKey}-${action.label}`}
                              variant={action.variant || 'ghost'}
                              size={action.size || 'sm'}
                              onClick={() => action.onClick(row)}
                              disabled={action.disabled?.(row)}
                            >
                              {action.label}
                            </Button>
                          ))}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
      
      {/* Pagination */}
      {pagination && hasData && (
        <CardContent className="p-6 pt-0">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Showing {((pagination.currentPage) * pagination.pageSize) + 1} to{' '}
              {Math.min((pagination.currentPage + 1) * pagination.pageSize, pagination.totalElements)} of{' '}
              {pagination.totalElements} results
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
                disabled={pagination.currentPage === 0}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              
              <span className="text-sm">
                Page {pagination.currentPage + 1} of {pagination.totalPages}
              </span>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
                disabled={pagination.currentPage >= pagination.totalPages - 1}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// Status badge component for common use cases
interface StatusBadgeProps {
  readonly status: string;
  readonly variant?: 'default' | 'destructive' | 'outline' | 'secondary';
  readonly className?: string;
}

export function StatusBadge({ status, variant, className }: StatusBadgeProps) {
  const getVariant = (status: string) => {
    const lowerStatus = status.toLowerCase();
    if (['active', 'completed', 'success', 'paid', 'verified'].includes(lowerStatus)) {
      return 'default';
    }
    if (['inactive', 'failed', 'error', 'cancelled', 'suspended'].includes(lowerStatus)) {
      return 'destructive';
    }
    if (['pending', 'processing', 'in_progress'].includes(lowerStatus)) {
      return 'outline';
    }
    return 'secondary';
  };
  
  return (
    <Badge variant={variant || getVariant(status)} className={className}>
      {status}
    </Badge>
  );
}
