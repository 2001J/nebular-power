import axios, { AxiosError, AxiosResponse } from 'axios';

// Network error handling configuration
export const NETWORK_CONFIG = {
  maxRetries: 1,
  retryDelay: 800,
  retryStatusCodes: [408, 429, 502, 503, 504],
  timeout: 10000,
};

// API Error Response interface
export interface ApiErrorResponse {
  status?: number;
  data?: any;
  message?: string;
}

// Helper function to safely access error properties
export const getErrorDetails = (error: unknown): ApiErrorResponse => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError;
    return {
      status: axiosError.response?.status,
      data: axiosError.response?.data,
      message: axiosError.message,
    };
  } else if (error instanceof Error) {
    return {
      message: error.message,
    };
  } else {
    return {
      message: 'Unknown error occurred',
    };
  }
};

// Create axios instance with base URL
export const apiClient = axios.create({
  baseURL: '', // Empty baseURL to use relative URLs that go through Next.js proxy
  timeout: NETWORK_CONFIG.timeout,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Safe storage helpers for SSR-compat
const isBrowser = typeof window !== 'undefined';
const getToken = (): string | null => {
  if (!isBrowser) return null;
  try {
    return localStorage.getItem('token') || sessionStorage.getItem('token');
  } catch {
    return null;
  }
};
const getRefreshToken = (): string | null => {
  if (!isBrowser) return null;
  try {
    return localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken');
  } catch {
    return null;
  }
};
const setTokens = (token: string, refreshToken?: string | null) => {
  if (!isBrowser) return;
  try {
    const storage = localStorage.getItem('token') ? localStorage : sessionStorage;
    storage.setItem('token', token);
    if (refreshToken) storage.setItem('refreshToken', refreshToken);
  } catch {
    // no-op
  }
};
const clearTokens = () => {
  if (!isBrowser) return;
  try {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('refreshToken');
  } catch {
    // no-op
  }
};

// No token refresh queue; simplify handling

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    // Guard browser-only storage usage for SSR safety
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error instanceof Error ? error : new Error('Request error'))
);

// Response interceptor to handle token refresh
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Unauthorized: clear tokens and redirect to login without refresh attempts
      clearTokens();
      if (typeof window !== 'undefined') {
        window.location.href = '/login?reason=unauthorized';
      }
    }
    return Promise.reject(error instanceof Error ? error : new Error('API error'));
  }
);

/**
 * Generic API request handler with retry logic
 */
export async function makeApiRequest<T>(
  requestFn: () => Promise<AxiosResponse<T>>,
  retries: number = NETWORK_CONFIG.maxRetries
): Promise<T> {
  try {
    const response = await requestFn();
    return response.data;
  } catch (error) {
    const errorDetails = getErrorDetails(error);
    
    // Check if we should retry
    if (
      retries > 0 &&
      errorDetails.status &&
      NETWORK_CONFIG.retryStatusCodes.includes(errorDetails.status)
    ) {
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, NETWORK_CONFIG.retryDelay));
      return makeApiRequest(requestFn, retries - 1);
    }
    
    throw error;
  }
}

/**
 * Helper function to handle paginated responses
 */
export interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}

/**
 * Helper function to build query string from params
 */
export function buildQueryString(params: Record<string, any>): string {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      searchParams.append(key, String(value));
    }
  });
  
  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}
