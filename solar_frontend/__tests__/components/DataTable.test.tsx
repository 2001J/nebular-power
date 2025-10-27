import React from 'react';
import { describe, expect, test, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DataTable, StatusBadge, type DataTableColumn } from '@/components/shared/DataTable';

type Row = { id: number; name: string; status: string };

const rows: Row[] = [
  { id: 1, name: 'Alice', status: 'active' },
  { id: 2, name: 'Bob', status: 'inactive' },
];

const columns: DataTableColumn<Row>[] = [
  { key: 'name', title: 'Name', sortable: true },
  { key: 'status', title: 'Status' },
];

describe('DataTable', () => {
  test('renders rows and columns', () => {
    render(
      <DataTable
        data={rows}
        columns={columns}
        searchable={false}
      />
    );

    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  test('triggers sort when clicking sortable header', () => {
    const onSortChange = vi.fn();
    render(
      <DataTable
        data={rows}
        columns={columns}
        onSortChange={onSortChange}
        sortField="name"
        sortDirection="asc"
        searchable={false}
      />
    );

    fireEvent.click(screen.getByText('Name'));
    expect(onSortChange).toHaveBeenCalledWith('name', 'desc');
  });

  test('search input calls onSearchChange', () => {
    const onSearchChange = vi.fn();
    render(
      <DataTable
        data={rows}
        columns={columns}
        onSearchChange={onSearchChange}
      />
    );
    const input = screen.getByPlaceholderText('Search...');
    fireEvent.change(input, { target: { value: 'ali' } });
    expect(onSearchChange).toHaveBeenCalledWith('ali');
  });

  test('pagination buttons call onPageChange', () => {
    const onPageChange = vi.fn();
    render(
      <DataTable
        data={rows}
        columns={columns}
        searchable={false}
        pagination={{ currentPage: 0, totalPages: 3, totalElements: 30, pageSize: 10, onPageChange }}
      />
    );
    fireEvent.click(screen.getByText('Next'));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  test('row actions call callback', () => {
    const onRowAction = vi.fn();
    render(
      <DataTable
        data={rows}
        columns={columns}
        searchable={false}
        actions={[{ label: 'View', onClick: onRowAction }]}
      />
    );
    fireEvent.click(screen.getAllByText('View')[0]);
    expect(onRowAction).toHaveBeenCalledWith(rows[0]);
  });
});

describe('StatusBadge', () => {
  test('renders appropriate variant text', () => {
    render(<StatusBadge status="active" />);
    expect(screen.getByText('active')).toBeInTheDocument();
  });
});

