# Frontend Architecture Guide - Refactored Code

This guide explains the new, clean architecture we've implemented to solve the "spaghetti code" issues in the frontend.

## Overview

The refactored architecture follows these principles:

1. **Separation of Concerns**: UI, business logic, and data fetching are separated
2. **Reusability**: Common patterns are extracted into shared hooks and components
3. **Type Safety**: Strong TypeScript types throughout
4. **Consistency**: Standardized patterns for common operations
5. **Maintainability**: Smaller, focused components that are easy to understand

## Architecture Layers

### 1. Shared Utilities Layer (`/hooks/shared/`, `/components/shared/`, `/lib/`)

#### Custom Hooks

**`useAsyncState<T>`** - Universal async operation handler
```typescript
const { data, loading, error, execute, refresh } = useAsyncState(
  () => api.fetchSomething(),
  {
    onSuccess: (data) => console.log('Success!', data),
    showToastOnError: true
  }
);
```

**`usePaginatedData<T>`** - Complete pagination solution
```typescript
const {
  data,
  loading,
  pagination,
  search,
  actions: { setSearchTerm, setPage, refresh }
} = usePaginatedData(fetchFunction, { pageSize: 10 });
```

**`useForm<T>`** - Comprehensive form handling
```typescript
const form = useForm({
  initialValues: { name: '', email: '' },
  validate: (values) => {
    const errors: any = {};
    if (!values.name) errors.name = 'Name is required';
    return Object.keys(errors).length ? errors : null;
  },
  onSubmit: async (values) => {
    await api.createUser(values);
  }
});
```

#### Shared UI Components

**`DataTable<T>`** - Feature-complete table with search, pagination, sorting
```typescript
<DataTable
  data={customers}
  columns={columns}
  loading={loading}
  searchable
  pagination={pagination}
  actions={tableActions}
  exportable
  onExport={exportToCSV}
/>
```

**Loading States** - Consistent loading and error states
```typescript
<LoadingCard title="Loading customers..." />
<ErrorState title="Failed to load" onRetry={retry} />
<EmptyState title="No data" action={{ label: "Add New", onClick: create }} />
```

#### Utility Functions

**Export Utilities** - Type-safe CSV export
```typescript
exportToCSV(data, createCustomerExportColumns(), 'customers.csv');
```

### 2. Domain Layer (`/hooks/useCustomers.ts`, etc.)

Domain-specific hooks that combine shared utilities with business logic:

```typescript
export function useCustomers(): UseCustomersReturn {
  // Combines usePaginatedData with customer-specific logic
  // Handles search, filtering, CRUD operations
  // Provides clean interface to components
}
```

### 3. Component Layer (`/app/admin/customers/page-refactored.tsx`)

Clean, focused components that use domain hooks:

```typescript
export default function CustomersPageRefactored() {
  const { customers, loading, actions } = useCustomers();
  
  // Only UI logic here - no business logic or data fetching
  return <DataTable data={customers} ... />;
}
```

## Migration Pattern

### Before (Spaghetti Code)
```typescript
export default function CustomersPage() {
  // 20+ useState declarations
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  // ... 15+ more state variables
  
  // Multiple useEffects
  useEffect(() => {
    // Fetch customers logic (50+ lines)
  }, [searchTerm, page, filters]);
  
  useEffect(() => {
    // Debounce search logic
  }, [searchTerm]);
  
  // Inline functions (200+ lines of mixed logic)
  const handleSearch = (term) => { /* ... */ };
  const handleDelete = async (id) => { /* ... */ };
  const exportToCSV = () => { /* ... */ };
  
  // Massive JSX return (300+ lines)
  return (
    <div>
      {/* Inline loading states, tables, modals, etc. */}
    </div>
  );
}
```

### After (Clean Architecture)
```typescript
export default function CustomersPageRefactored() {
  const { customers, loading, actions } = useCustomers();
  const [confirmAction, setConfirmAction] = useState(null);
  
  const handleAction = (type, customer) => {
    setConfirmAction({ type, customer });
  };
  
  return (
    <div>
      <PageHeader title="Customers" actions={headerActions} />
      <DataTable
        data={customers}
        columns={columns}
        loading={loading}
        actions={tableActions}
      />
      <ConfirmDialog action={confirmAction} />
    </div>
  );
}
```

## Key Benefits

### 1. **Reduced Complexity**
- Components went from 500+ lines to ~200 lines
- Single responsibility per component/hook
- Clear separation between UI and logic

### 2. **Better Reusability**
- `DataTable` can be used for customers, payments, installations
- `useAsyncState` works for any API call
- `useForm` handles all form scenarios

### 3. **Improved Testing**
- Business logic in hooks can be unit tested separately
- UI components are pure and easy to test
- Shared utilities have comprehensive tests

### 4. **Consistent UX**
- All loading states look the same
- Error handling is consistent
- Export functionality works the same everywhere

### 5. **Better Developer Experience**
- TypeScript provides full autocomplete
- Patterns are predictable and easy to follow
- New features can be added quickly

## Best Practices

### 1. **Use Shared Hooks First**
Before writing custom state management, check if a shared hook fits:
- `useAsyncState` for API calls
- `usePaginatedData` for lists with search/pagination
- `useForm` for forms

### 2. **Keep Components Pure**
Components should only handle:
- Rendering UI
- User interaction events
- Local UI state (modals, accordions, etc.)

Business logic goes in domain hooks.

### 3. **Follow TypeScript Conventions**
- Define interfaces for all data structures
- Use generics for reusable components
- Prefer `readonly` for component props

### 4. **Consistent Error Handling**
- Always handle errors in hooks
- Use toast notifications for user feedback
- Log errors for debugging

### 5. **Export Utilities**
Create reusable export functions for different data types:
```typescript
const customerColumns = createCustomerExportColumns<Customer>();
exportToCSV(customers, customerColumns, 'customers.csv');
```

## Future Enhancements

1. **Add React Query** for better caching and synchronization
2. **Implement optimistic updates** for better UX
3. **Add more shared components** (forms, modals, etc.)
4. **Create page templates** for common layouts
5. **Add comprehensive testing** for all shared utilities

## File Structure

```
/hooks/
  /shared/
    useAsyncState.ts     # Universal async handler
    useForm.ts           # Form management
  useCustomers.ts        # Customer domain logic
  usePayments.ts         # Payment domain logic
  index.ts               # Export all hooks

/components/
  /shared/
    LoadingStates.tsx    # Loading, error, empty states
    DataTable.tsx        # Feature-complete table
    index.ts             # Export all components
  
/lib/
  exportUtils.ts         # CSV export utilities
  
/app/
  /admin/
    /customers/
      page-refactored.tsx  # Clean customer page
```

This architecture makes the codebase much more maintainable and provides a solid foundation for future development.
