import { useState, useEffect } from 'react';

interface UseApiOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: any) => void;
  onSettled?: () => void;
  enabled?: boolean;
  dependencies?: any[];
}

interface UseApiState<T> {
  isLoading: boolean;
  error: any;
  data: T | null;
}

/**
 * A custom hook for making API calls with loading, error, and data states
 */
export function useApi<T>(
  apiCall: () => Promise<T>,
  options: UseApiOptions<T> = {}
): [UseApiState<T>, () => Promise<void>] {
  const {
    onSuccess,
    onError,
    onSettled,
    enabled = true,
    dependencies = [],
  } = options;

  const [state, setState] = useState<UseApiState<T>>({
    isLoading: false,
    error: null,
    data: null,
  });

  const fetchData = async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await apiCall();
      setState({ isLoading: false, error: null, data: result });
      onSuccess?.(result);
      return result;
    } catch (error) {
      setState({ isLoading: false, error, data: null });
      onError?.(error);
      throw error;
    } finally {
      onSettled?.();
    }
  };

  useEffect(() => {
    if (enabled) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...dependencies]);

  return [state, fetchData];
}

/**
 * A custom hook for mutation operations (create, update, delete)
 */
export function useMutation<T, R = any>(
  mutationFn: (data: R) => Promise<T>,
  options: {
    onSuccess?: (data: T) => void;
    onError?: (error: any) => void;
    onSettled?: () => void;
  } = {}
) {
  const { onSuccess, onError, onSettled } = options;
  const [state, setState] = useState<UseApiState<T>>({
    isLoading: false,
    error: null,
    data: null,
  });

  const mutate = async (data: R) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await mutationFn(data);
      setState({ isLoading: false, error: null, data: result });
      onSuccess?.(result);
      return result;
    } catch (error) {
      setState({ isLoading: false, error, data: null });
      onError?.(error);
      throw error;
    } finally {
      onSettled?.();
    }
  };

  return {
    mutate,
    ...state,
  };
}

/**
 * A custom hook for lazy loading data 
 */
export function useLazyApi<T>(
  apiCall: () => Promise<T>,
  options: {
    onSuccess?: (data: T) => void;
    onError?: (error: any) => void;
    onSettled?: () => void;
  } = {}
) {
  return useApi(apiCall, { ...options, enabled: false });
} 