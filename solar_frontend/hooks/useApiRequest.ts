import { useState, useCallback } from 'react';

/**
 * Custom hook to manage API requests with loading, error, and success states
 * @template T The type of data returned by the API
 * @template E The type of error returned by the API
 */
export function useApiRequest<T = any, E = any>() {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<E | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const execute = useCallback(async <R = T>(
    apiCall: () => Promise<R>,
    onSuccess?: (data: R) => void,
    onError?: (error: any) => void
  ): Promise<R | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await apiCall();
      setData(result as unknown as T);
      if (onSuccess) onSuccess(result);
      return result;
    } catch (err: any) {
      setError(err);
      if (onError) onError(err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    data,
    error,
    isLoading,
    execute,
    reset
  };
} 