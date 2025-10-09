import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useAsyncState } from '@/hooks/shared/useAsyncState';

function TestComponent({ succeed = true }: { succeed?: boolean }) {
  const asyncFn = React.useCallback(async () => {
    if (!succeed) throw new Error('fail');
    return 'result';
  }, [succeed]);

  const state = useAsyncState(asyncFn, { showToastOnError: false });

  return (
    <div>
      <div data-testid="loading">{state.loading ? 'loading' : 'idle'}</div>
      <div data-testid="error">{state.error ? state.error.message : ''}</div>
      <div data-testid="data">{state.data ?? ''}</div>
      <button onClick={() => state.execute()}>run</button>
    </div>
  );
}

describe('useAsyncState', () => {
  test('executes async function and sets data', async () => {
    render(<TestComponent succeed />);
    fireEvent.click(screen.getByText('run'));
    await waitFor(() => expect(screen.getByTestId('data').textContent).toBe('result'));
    expect(screen.getByTestId('loading').textContent).toBe('idle');
    expect(screen.getByTestId('error').textContent).toBe('');
  });

  test('handles error state', async () => {
    render(<TestComponent succeed={false} />);
    fireEvent.click(screen.getByText('run'));
    await waitFor(() => expect(screen.getByTestId('error').textContent).toBe('fail'));
    expect(screen.getByTestId('data').textContent).toBe('');
  });
});

