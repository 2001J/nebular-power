// no default React import needed with automatic JSX runtime
import { describe, expect, test, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { act } from 'react';
import { usePaginatedData } from '@/hooks/shared/useAsyncState';

function Wrapper({ fetcher }: Readonly<{ fetcher: any }>) {
  const state = usePaginatedData<any>(fetcher, { pageSize: 5, searchDebounceMs: 100 });
  return (
    <div>
      <div data-testid="length">{state.data.length}</div>
      <div data-testid="page">{state.pagination.currentPage}</div>
      <div data-testid="term">{state.search.term}</div>
      <button onClick={() => state.actions.setSearchTerm('john')}>search</button>
      <button onClick={() => state.actions.setPage(2)}>page2</button>
    </div>
  );
}

describe('usePaginatedData', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  test('debounces search triggers fetch', async () => {
    const fetcher = vi.fn().mockResolvedValue({ content: [{ id: 1 }], totalPages: 1, totalElements: 1, number: 0, size: 5 });
    render(<Wrapper fetcher={fetcher} />);

    // Initial fetch
    expect(fetcher).toHaveBeenCalled();

    // Trigger search
    await act(async () => { screen.getByText('search').click(); });
    await act(async () => { vi.advanceTimersByTime(110); });

    expect(fetcher).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
    // Allow extra calls in strict mode but ensure at least two calls
    await waitFor(() => expect(fetcher.mock.calls.length).toBeGreaterThanOrEqual(2));
  });
});
