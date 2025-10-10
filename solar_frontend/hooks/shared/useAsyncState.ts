import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';

export interface UseAsyncStateOptions<T> {
  initialData?: T | null;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  showToastOnError?: boolean;
  errorTitle?: string;
}

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<T | null>;
  execute: (asyncFn?: () => Promise<T>) => Promise<T | null>;
}

/**
 * A comprehensive hook for managing async operations with loading, error, and success states
 */
export function useAsyncState<T>(
  asyncFunction: () => Promise<T>,
  options: UseAsyncStateOptions<T> = {}
): AsyncState<T> {
  const {
    initialData = null,
    onSuccess,
    onError,
    showToastOnError = true,
    errorTitle = 'Error'
  } = options;

  const [data, setData] = useState<T | null>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  const execute = useCallback(async (asyncFn = asyncFunction): Promise<T | null> => {
    try {
      setLoading(true);
      setError(null);

      const result = await asyncFn();
      
      setData(result);
      onSuccess?.(result);
      
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error occurred');
      setError(error);
      onError?.(error);
      
      if (showToastOnError) {
        toast({
          variant: 'destructive',
          title: errorTitle,
          description: error.message,
        });
      }
      
      return null;
    } finally {
      setLoading(false);
    }
  }, [asyncFunction, onSuccess, onError, showToastOnError, errorTitle, toast]);

  const refresh = useCallback(() => execute(), [execute]);

  return { data, loading, error, refresh, execute };
}

/**
 * Hook for managing paginated data with search functionality
 */
export interface UsePaginatedDataOptions<T> {
  pageSize?: number;
  initialSearch?: string;
  searchDebounceMs?: number;
  showToastOnError?: boolean;
}

export interface PaginatedState<T> {
  data: T[];
  loading: boolean;
  error: Error | null;
  pagination: {
    currentPage: number;
    totalPages: number;
    totalElements: number;
    pageSize: number;
  };
  search: {
    term: string;
    debouncedTerm: string;
    searching: boolean;
  };
  actions: {
    setSearchTerm: (term: string) => void;
    setPage: (page: number) => void;
    setPageSize: (size: number) => void;
    refresh: () => Promise<T | null>;
  };
}

export function usePaginatedData<T>(
  fetchFunction: (search: string, page: number, pageSize: number) => Promise<any>,
  options: UsePaginatedDataOptions<T> = {}
): PaginatedState<T> {
  const {
    pageSize = 10,
    initialSearch = '',
    searchDebounceMs = 500,
    showToastOnError = true
  } = options;

  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(initialSearch);
  const [pagination, setPagination] = useState({
    currentPage: 0,
    totalPages: 0,
    totalElements: 0,
    pageSize
  });

  const { toast } = useToast();

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, searchDebounceMs);

    return () => clearTimeout(timer);
  }, [searchTerm, searchDebounceMs]);

  // Fetch data when dependencies change
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        if (debouncedSearchTerm) {
          setSearching(true);
        }
        setError(null);

        const response = await fetchFunction(
          debouncedSearchTerm,
          pagination.currentPage,
          pagination.pageSize
        );

        if (response && Array.isArray((response as any).content)) {
          const page = response as any;
          setData(page.content);
          setPagination(prev => {
            const next = {
              ...prev,
              totalPages: typeof page.totalPages === 'number' ? page.totalPages : prev.totalPages,
              totalElements: typeof page.totalElements === 'number' ? page.totalElements : prev.totalElements,
              currentPage: typeof page.number === 'number' ? page.number : prev.currentPage,
              pageSize: typeof page.size === 'number' ? page.size : prev.pageSize,
            };
            const unchanged =
              next.totalPages === prev.totalPages &&
              next.totalElements === prev.totalElements &&
              next.currentPage === prev.currentPage &&
              next.pageSize === prev.pageSize;
            return unchanged ? prev : next;
          });
        } else if (Array.isArray(response)) {
          setData(response as any);
        } else {
          setData([]);
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to fetch data');
        setError(error);
        
        if (showToastOnError) {
          toast({
            variant: 'destructive',
            title: 'Error loading data',
            description: error.message,
          });
        }
        
        setData([]);
      } finally {
        setLoading(false);
        setSearching(false);
      }
    };

    fetchData();
  }, [debouncedSearchTerm, pagination.currentPage, pagination.pageSize, fetchFunction, showToastOnError, toast]);

  const setPage = useCallback((page: number) => {
    setPagination(prev => ({ ...prev, currentPage: page }));
  }, []);

  const setPageSizeCallback = useCallback((size: number) => {
    setPagination(prev => ({ 
      ...prev, 
      pageSize: size,
      currentPage: 0 // Reset to first page when changing page size
    }));
  }, []);

  const refresh = useCallback(async () => {
    setPagination(prev => ({ ...prev, currentPage: 0 }));
    return null;
  }, []);

  return {
    data,
    loading,
    error,
    pagination,
    search: {
      term: searchTerm,
      debouncedTerm: debouncedSearchTerm,
      searching
    },
    actions: {
      setSearchTerm,
      setPage,
      setPageSize: setPageSizeCallback,
      refresh
    }
  };
}
