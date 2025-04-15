import { useState, useCallback, useEffect } from 'react';
import { toast } from '@/components/ui/use-toast';
import { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import apiClient from '@/lib/api';

interface ApiRequestState<T> {
  data: T | null;
  error: AxiosError | Error | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

interface UseApiRequestOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: AxiosError | Error) => void;
  showErrorToast?: boolean;
  showSuccessToast?: boolean;
  successToastMessage?: string;
  executeOnMount?: boolean;
  deps?: any[];
  retryCount?: number;
}

const defaultOptions: UseApiRequestOptions<any> = {
  showErrorToast: true,
  showSuccessToast: false,
  executeOnMount: true,
  retryCount: 0,
  deps: [],
};

/**
 * Custom hook for safely handling API requests with proper error handling.
 * @param url The API endpoint URL
 * @param method The HTTP method
 * @param config Optional axios request configuration
 * @param options Additional options for the API request
 */
export function useApiRequest<T = any>(
  url: string,
  method: 'get' | 'post' | 'put' | 'delete' | 'patch' = 'get',
  config: AxiosRequestConfig = {},
  options: UseApiRequestOptions<T> = {}
): [
    ApiRequestState<T>,
    (data?: any, overrideConfig?: AxiosRequestConfig) => Promise<T | null>,
    () => void
  ] {
  // Merge options with defaults
  const mergedOptions = { ...defaultOptions, ...options };

  // Initialize state
  const [state, setState] = useState<ApiRequestState<T>>({
    data: null,
    error: null,
    isLoading: mergedOptions.executeOnMount,
    isSuccess: false,
    isError: false,
  });

  // Function to reset the state
  const reset = useCallback(() => {
    setState({
      data: null,
      error: null,
      isLoading: false,
      isSuccess: false,
      isError: false,
    });
  }, []);

  // Function to execute the API request
  const executeRequest = useCallback(
    async (data?: any, overrideConfig?: AxiosRequestConfig): Promise<T | null> => {
      // Don't update loading state for very quick responses to prevent flicker
      let loadingTimerId: NodeJS.Timeout | null = null;

      // Set a delay before showing loading state
      loadingTimerId = setTimeout(() => {
        setState(prev => {
          // Only update state if we're not already loading
          if (!prev.isLoading) {
            return { ...prev, isLoading: true, isError: false, error: null };
          }
          return prev;
        });
      }, 150); // Short delay to prevent loading flash

      try {
        // Merge configs - add cache busting for GET requests to prevent stale data
        const requestConfig = { ...config, ...overrideConfig };
        if (method === 'get' && !requestConfig.params?.cacheBust) {
          requestConfig.params = {
            ...requestConfig.params,
            // Add small random cacheBust parameter
            cacheBust: Date.now() % 10000
          };
        }

        // Select appropriate method and execute
        let response: AxiosResponse<T>;
        if (method === 'get' || method === 'delete') {
          response = await apiClient[method]<T>(url, requestConfig);
        } else {
          response = await apiClient[method]<T>(url, data, requestConfig);
        }

        // Clear the loading timer
        if (loadingTimerId) {
          clearTimeout(loadingTimerId);
          loadingTimerId = null;
        }

        // Handle successful response
        setState({
          data: response.data,
          error: null,
          isLoading: false,
          isSuccess: true,
          isError: false,
        });

        // Call onSuccess callback if provided
        if (mergedOptions.onSuccess) {
          mergedOptions.onSuccess(response.data);
        }

        // Show success toast if enabled
        if (mergedOptions.showSuccessToast) {
          toast({
            title: "Success",
            description: mergedOptions.successToastMessage || "Operation completed successfully",
          });
        }

        return response.data;
      } catch (error) {
        // Clear the loading timer
        if (loadingTimerId) {
          clearTimeout(loadingTimerId);
          loadingTimerId = null;
        }

        // Minimize logging - only log in dev environment
        if (process.env.NODE_ENV === 'development') {
          console.error(`API ${method.toUpperCase()} request to ${url} failed`);
        }

        const errorObject = error instanceof Error ? error : new Error('Unknown error occurred');

        // Update state with error
        setState({
          data: null,
          error: errorObject as AxiosError | Error,
          isLoading: false,
          isSuccess: false,
          isError: true,
        });

        // Call onError callback if provided
        if (mergedOptions.onError) {
          mergedOptions.onError(errorObject as AxiosError | Error);
        }

        // Show error toast if enabled and it's not a common network error that's already handled by the API client
        if (mergedOptions.showErrorToast) {
          const axiosError = error as AxiosError;
          // Don't show toast for network errors that are already handled centrally
          if (!axiosError.code?.includes('ECONNABORTED') &&
            !axiosError.code?.includes('ERR_NETWORK') &&
            !axiosError.message?.includes('Network Error')) {
            const status = axiosError.response?.status;
            const errorMessage = axiosError.response?.data?.message || axiosError.message || 'An error occurred';

            toast({
              title: status ? `Error (${status})` : "Error",
              description: errorMessage,
              variant: "destructive",
            });
          }
        }

        return null;
      }
    },
    [url, method, config, mergedOptions]
  );

  // Execute on mount if enabled, with better memo handling
  useEffect(() => {
    let mounted = true;

    if (mergedOptions.executeOnMount) {
      // Wrap in async function to properly handle cleanup
      const fetchData = async () => {
        try {
          const result = await executeRequest();
          // Only update state if component is still mounted
          if (!mounted) return;
        } catch (err) {
          // Error handling is already done in executeRequest
          if (!mounted) return;
        }
      };

      fetchData();
    }

    // Cleanup function to prevent updates after unmount
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [executeRequest]);

  return [state, executeRequest, reset];
}

/**
 * Custom hook for making GET requests
 */
export function useApiGet<T = any>(
  url: string,
  config: AxiosRequestConfig = {},
  options: UseApiRequestOptions<T> = {}
) {
  return useApiRequest<T>(url, 'get', config, options);
}

/**
 * Custom hook for making POST requests
 */
export function useApiPost<T = any>(
  url: string,
  config: AxiosRequestConfig = {},
  options: UseApiRequestOptions<T> = { executeOnMount: false }
) {
  return useApiRequest<T>(url, 'post', config, { executeOnMount: false, ...options });
}

/**
 * Custom hook for making PUT requests
 */
export function useApiPut<T = any>(
  url: string,
  config: AxiosRequestConfig = {},
  options: UseApiRequestOptions<T> = { executeOnMount: false }
) {
  return useApiRequest<T>(url, 'put', config, { executeOnMount: false, ...options });
}

/**
 * Custom hook for making DELETE requests
 */
export function useApiDelete<T = any>(
  url: string,
  config: AxiosRequestConfig = {},
  options: UseApiRequestOptions<T> = { executeOnMount: false }
) {
  return useApiRequest<T>(url, 'delete', config, { executeOnMount: false, ...options });
}

export default useApiRequest; 