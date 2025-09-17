/**
 * Utility functions for data export operations
 */

export interface ExportColumn<T> {
  readonly key: keyof T | string;
  readonly title: string;
  readonly transform?: (value: any, row: T) => string;
}

/**
 * Export data to CSV format
 */
export function exportToCSV<T>(
  data: T[],
  columns: ExportColumn<T>[],
  filename: string = 'export.csv'
): void {
  if (data.length === 0) {
    throw new Error('No data to export');
  }

  // Create headers
  const headers = columns.map(col => col.title);
  
  // Create rows
  const rows = data.map(row => {
    return columns.map(col => {
      const value = typeof col.key === 'string' && col.key.includes('.')
        ? col.key.split('.').reduce((obj: any, key: string) => obj?.[key], row)
        : row[col.key as keyof T];
      
      const transformedValue = col.transform ? col.transform(value, row) : value;
      
      // Handle CSV escaping
      const stringValue = String(transformedValue || '');
      return stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')
        ? `"${stringValue.replace(/"/g, '""')}"` // Escape quotes and wrap in quotes
        : stringValue;
    });
  });

  // Combine headers and rows
  const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');

  // Create and download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Format date for export
 */
export function formatDateForExport(date: string | Date | null | undefined): string {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString();
  } catch {
    return String(date || '');
  }
}

/**
 * Format currency for export
 */
export function formatCurrencyForExport(
  amount: number | string | null | undefined,
  currency: string = 'USD'
): string {
  if (amount === null || amount === undefined || amount === '') return '';
  
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numAmount)) return String(amount);
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(numAmount);
}

/**
 * Format status for export
 */
export function formatStatusForExport(status: string | null | undefined): string {
  if (!status) return '';
  
  return status
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Create common export columns for customer data
 */
export function createCustomerExportColumns<T extends Record<string, any>>(): ExportColumn<T>[] {
  return [
    { key: 'id', title: 'ID' },
    { key: 'fullName', title: 'Name' },
    { key: 'email', title: 'Email' },
    { key: 'phoneNumber', title: 'Phone' },
    { key: 'status', title: 'Status', transform: (value) => formatStatusForExport(value) },
    { 
      key: 'createdAt', 
      title: 'Date Joined', 
      transform: (value) => formatDateForExport(value)
    },
  ];
}

/**
 * Create common export columns for payment data
 */
export function createPaymentExportColumns<T extends Record<string, any>>(): ExportColumn<T>[] {
  return [
    { key: 'id', title: 'Payment ID' },
    { key: 'customer.fullName', title: 'Customer Name' },
    { 
      key: 'amount', 
      title: 'Amount', 
      transform: (value) => formatCurrencyForExport(value) 
    },
    { key: 'paymentMethod', title: 'Payment Method' },
    { key: 'status', title: 'Status', transform: (value) => formatStatusForExport(value) },
    { 
      key: 'paymentDate', 
      title: 'Payment Date', 
      transform: (value) => formatDateForExport(value)
    },
  ];
}

/**
 * Create common export columns for installation data
 */
export function createInstallationExportColumns<T extends Record<string, any>>(): ExportColumn<T>[] {
  return [
    { key: 'id', title: 'Installation ID' },
    { key: 'customer.fullName', title: 'Customer Name' },
    { key: 'address', title: 'Address' },
    { key: 'systemSize', title: 'System Size (kW)' },
    { key: 'status', title: 'Status', transform: (value) => formatStatusForExport(value) },
    { 
      key: 'installationDate', 
      title: 'Installation Date', 
      transform: (value) => formatDateForExport(value)
    },
  ];
}
