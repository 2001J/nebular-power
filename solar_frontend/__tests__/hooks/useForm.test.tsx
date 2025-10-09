import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useForm } from '@/hooks/shared/useForm';

function FormComponent({ resolve = true }: { resolve?: boolean }) {
  const onSubmit = React.useCallback(async () => {
    if (!resolve) throw new Error('failed');
  }, [resolve]);

  const form = useForm({
    initialValues: { name: '' },
    onSubmit,
    validate: values => (values.name ? null : { name: 'Required' }),
    showToastOnError: false,
  });

  return (
    <form onSubmit={form.handleSubmit}>
      <input
        aria-label="name"
        value={form.values.name}
        onChange={e => form.setValue('name', e.target.value)}
      />
      <div data-testid="error">{form.errors.name || ''}</div>
      <button type="submit">submit</button>
    </form>
  );
}

describe('useForm', () => {
  test('validates and submits successfully', async () => {
    render(<FormComponent resolve />);
    fireEvent.change(screen.getByLabelText('name'), { target: { value: 'Alice' } });
    fireEvent.click(screen.getByText('submit'));
    await waitFor(() => expect(screen.getByTestId('error').textContent).toBe(''));
  });

  test('shows validation error', async () => {
    render(<FormComponent resolve />);
    fireEvent.click(screen.getByText('submit'));
    await waitFor(() => expect(screen.getByTestId('error').textContent).toBe('Required'));
  });
});

