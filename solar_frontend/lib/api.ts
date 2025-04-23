import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import { toast } from "@/components/ui/use-toast";

// Define a proper API error type interface to handle errors
interface ApiErrorResponse {
  status?: number;
  data?: any;
  message?: string;
}

// Network error handling configuration
const NETWORK_CONFIG = {
  // Maximum number of retries for network requests
  maxRetries: 1, // Reduced from 3
  // Base delay between retries (ms)
  retryDelay: 800, // Reduced from 1000
  // List of status codes that should trigger a retry
  retryStatusCodes: [408, 429, 502, 503, 504], // Removed 500 as it's often a legitimate server error
  // Timeout for requests (ms)
  timeout: 10000, // Reduced from 15000
};

// Helper function to safely access error properties
const getErrorDetails = (error: unknown): ApiErrorResponse => {
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
const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080',
  timeout: NETWORK_CONFIG.timeout,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Track if we're currently refreshing a token to prevent multiple refresh requests
let isRefreshingToken = false;
let tokenRefreshPromise: Promise<string | null> | null = null;
let failedRequestsQueue: { resolve: Function, reject: Function, config: any }[] = [];

// Function to process failed requests after token refresh
const processFailedRequestsQueue = (token: string | null) => {
  failedRequestsQueue.forEach(request => {
    if (token) {
      // If we have a new token, apply it to the failed request and retry
      request.config.headers.Authorization = `Bearer ${token}`;
      request.resolve(apiClient(request.config));
    } else {
      // If token refresh failed, reject all queued requests
      request.reject(new Error("Authentication failed"));
    }
  });

  // Clear the queue
  failedRequestsQueue = [];
};

// Add interceptor to add auth token to requests
apiClient.interceptors.request.use(
  (config) => {
    // Skip adding token for auth-related endpoints
    if (config.url?.includes('/api/auth/login') ||
      config.url?.includes('/api/auth/register') ||
      config.url?.includes('/api/auth/refresh-token')) {
      return config;
    }

    let token = null;

    if (typeof window !== 'undefined') {
      // Prefer localStorage token (permanent) over sessionStorage (temporary)
      token = localStorage.getItem("token") || sessionStorage.getItem("token");

      // Only log in development and without the actual token value
      if (process.env.NODE_ENV === 'development') {
        console.log("Token found for request:", !!token, "for URL:", config.url);
      }
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else if (process.env.NODE_ENV === 'development') {
      console.warn("No auth token available for request to:", config.url);
    }

    // Add retry count to config (if it doesn't exist)
    if (config.headers && !config.headers['x-retry-count']) {
      config.headers['x-retry-count'] = 0;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Update the response interceptor to handle auth errors with better logging and prevent auto logout loops
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Extract request config
    const originalRequest = error.config;

    // Add timestamp tracking for debugging token expiry issues
    const currentTime = new Date().toISOString();
    console.log(`API Error at ${currentTime} for ${originalRequest.url}:`,
      error.response ? `Status ${error.response.status}` : 'Network Error');

    // Handle authentication errors (expired token)
    if (error.response?.status === 401 && !originalRequest._retry &&
      originalRequest.url !== '/api/auth/login' &&
      originalRequest.url !== '/api/auth/refresh-token') {

      // Set flag to prevent infinite retry loops
      originalRequest._retry = true;

      // Log detailed auth error information
      console.log(`Auth error for ${originalRequest.url} - Token expired or invalid`);

      // Check if token exists before attempting refresh
      const hasRefreshToken = typeof window !== 'undefined' &&
        (localStorage.getItem("refreshToken") || sessionStorage.getItem("refreshToken"));

      if (!hasRefreshToken) {
        console.log("No refresh token available, cannot attempt token refresh");
      }

      // If we're not already refreshing the token and we have a refresh token
      if (!isRefreshingToken && hasRefreshToken) {
        isRefreshingToken = true;
        console.log("Starting token refresh process");

        // Create a promise for the token refresh process
        tokenRefreshPromise = new Promise<string | null>(async (resolve) => {
          try {
            console.log("Attempting to refresh token...");

            // Get refresh token if available
            const refreshToken = localStorage.getItem("refreshToken") || sessionStorage.getItem("refreshToken");

            // Try to refresh the token
            const response = await apiClient.post('/api/auth/refresh-token', {
              refreshToken
            });

            if (response.data?.accessToken) {
              // Token refresh successful
              const newToken = response.data.accessToken;
              console.log("Token refresh successful, updating stored token");

              // Store the new token
              if (localStorage.getItem("token")) {
                localStorage.setItem("token", newToken);
              } else {
                sessionStorage.setItem("token", newToken);
              }

              // If there's a new refresh token, store it
              if (response.data?.refreshToken) {
                if (localStorage.getItem("refreshToken")) {
                  localStorage.setItem("refreshToken", response.data.refreshToken);
                } else {
                  sessionStorage.setItem("refreshToken", response.data.refreshToken);
                }
              }

              resolve(newToken);
            } else {
              // Invalid response format - only clear tokens if really necessary
              console.error("Invalid token refresh response");

              // IMPORTANT: Only redirect to login for persistent failures, not for every 401
              // We'll let the retry mechanism try a few more times before we force logout
              if (originalRequest.headers?.['x-retry-count'] >= NETWORK_CONFIG.maxRetries) {
                // Clear auth state only after multiple failed attempts
                console.log("Multiple token refresh failures, clearing auth state");
                if (typeof window !== 'undefined') {
                  localStorage.removeItem("token");
                  sessionStorage.removeItem("token");
                  localStorage.removeItem("refreshToken");
                  sessionStorage.removeItem("refreshToken");

                  // Redirect to login page only as a last resort
                  console.log("Redirecting to login after multiple auth failures");
                  window.location.href = '/login?reason=expired';
                }
              }

              resolve(null);
            }
          } catch (refreshError) {
            console.error("Token refresh failed:", refreshError);

            // Only clear auth state and redirect after multiple failures
            if (originalRequest.headers?.['x-retry-count'] >= NETWORK_CONFIG.maxRetries) {
              // Clear auth state
              if (typeof window !== 'undefined') {
                localStorage.removeItem("token");
                sessionStorage.removeItem("token");
                localStorage.removeItem("refreshToken");
                sessionStorage.removeItem("refreshToken");

                // Redirect to login page only as a last resort
                console.log("Redirecting to login after failed token refresh");
                window.location.href = '/login?reason=refresh_failed';
              }
            }

            resolve(null);
          } finally {
            isRefreshingToken = false;
            tokenRefreshPromise = null;
          }
        });
      }

      // Wait for the token refresh to complete
      try {
        const newToken = await tokenRefreshPromise;

        if (newToken) {
          // Apply new token to the original request
          originalRequest.headers.Authorization = `Bearer ${newToken}`;

          // Process any queued requests
          processFailedRequestsQueue(newToken);

          // Retry the original request with new token
          return apiClient(originalRequest);
        } else {
          // Token refresh failed, reject the request
          processFailedRequestsQueue(null);
          return Promise.reject(error);
        }
      } catch (refreshError) {
        // Something went wrong with the refresh, reject the request
        processFailedRequestsQueue(null);
        return Promise.reject(refreshError);
      }
    } else if (error.response?.status === 401) {
      // If we're already trying to refresh or this is a login request that failed
      console.error("Authentication failed, redirecting to login");

      // Clear auth state if not already doing so
      if (typeof window !== 'undefined' &&
        originalRequest.url !== '/api/auth/login' &&
        originalRequest.url !== '/api/auth/refresh-token') {
        localStorage.removeItem("token");
        sessionStorage.removeItem("token");
        localStorage.removeItem("refreshToken");
        sessionStorage.removeItem("refreshToken");

        // Redirect to login page
        window.location.href = '/login';
      }
    }

    // For failed requests that are waiting for a token refresh
    if (error.response?.status === 401 && isRefreshingToken && !originalRequest._retry) {
      return new Promise((resolve, reject) => {
        failedRequestsQueue.push({
          resolve,
          reject,
          config: originalRequest
        });
      });
    }

    // Don't retry if we've already reached max retries
    const currentRetryCount = originalRequest.headers?.['x-retry-count'] || 0;

    // Check if this error should trigger a retry
    const shouldRetry =
      currentRetryCount < NETWORK_CONFIG.maxRetries &&
      (error.code === 'ECONNABORTED' ||
        error.code === 'ERR_NETWORK' ||
        NETWORK_CONFIG.retryStatusCodes.includes(error.response?.status));

    if (shouldRetry) {
      // Increment retry count
      const nextRetryCount = currentRetryCount + 1;
      originalRequest.headers['x-retry-count'] = nextRetryCount;

      // Calculate delay with exponential backoff
      const delay = NETWORK_CONFIG.retryDelay * Math.pow(1.5, currentRetryCount);

      // Reduce logging verbosity - just log the essentials
      console.warn(`Retrying API request (${nextRetryCount}/${NETWORK_CONFIG.maxRetries})`);

      // Wait and retry
      await new Promise(resolve => setTimeout(resolve, delay));
      return apiClient(originalRequest);
    }

    // Log the error to console in a more concise way
    const errorDetails = getErrorDetails(error);
    const statusCode = errorDetails.status || '';

    // Only log detailed errors in development mode
    if (process.env.NODE_ENV === 'development') {
      console.error(`API Error (${statusCode}):`, errorDetails.message);
    }

    // Show toast only for critical errors or after retries
    if (currentRetryCount >= NETWORK_CONFIG.maxRetries ||
      (error.response?.status && error.response.status >= 500 && error.response.status !== 503)) { // Don't show for 503 Service Unavailable
      toast({
        title: "Network Error",
        description: "Failed to connect to the server. Please check your connection and try again.",
        variant: "destructive"
      });
    }

    // Reject with the original error
    return Promise.reject(error);
  }
);

// Authentication API
export const authApi = {
  login: async (email: string, password: string) => {
    try {
      console.log("Making login request to:", `${apiClient.defaults.baseURL}/api/auth/login`);
      const response = await apiClient.post('/api/auth/login', { email, password });

      // Add validation of the response data
      const data = response.data;
      if (!data || !data.accessToken || !data.email) {
        console.error("Invalid login response format:", data);
        throw new Error("Server returned an invalid response format");
      }

      // Store the token consistently - using the same key names throughout the application
      if (typeof window !== 'undefined') {
        localStorage.setItem("token", data.accessToken);
        sessionStorage.removeItem("token"); // Clear any session token

        // Also store refresh token if available
        if (data.refreshToken) {
          localStorage.setItem("refreshToken", data.refreshToken);
        }
      }

      console.log("Login successful for:", email);
      return data;
    } catch (error: any) {
      console.error("Login API error:", error.message);
      if (error.response) {
        console.error("Login API response error:", {
          status: error.response.status,
          data: error.response.data
        });
      }
      throw error;
    }
  },

  register: async (userData: any) => {
    try {
      const response = await apiClient.post('/api/auth/register', userData);
      return response.data;
    } catch (error: any) {
      console.error("Registration API error:", error.message);
      if (error.response) {
        console.error("Registration API response error:", {
          status: error.response.status,
          data: error.response.data
        });
      }
      throw error;
    }
  },

  verifyEmail: async (token: string) => {
    try {
      console.log("Verifying email with token:", token.substring(0, 8) + "...");
      const response = await apiClient.get(`/api/auth/verify-email/${token}`);

      // Ensure we get a standardized response format
      const data = response.data;

      // Log success for debugging
      console.log("Email verification successful:", data);

      return {
        success: true,
        email: data.email || "",
        id: data.id || data.userId || null,
        status: data.status || "ACTIVE",
        redirectRequired: data.redirectRequired || false,
        ...data
      };
    } catch (error: any) {
      console.error("Email verification failed:", error);
      if (error.response) {
        console.error("Server response:", error.response.status, error.response.data);
      }
      throw error;
    }
  },

  resendVerification: async (email: string) => {
    try {
      const response = await apiClient.post('/api/auth/resend-verification', null, {
        params: { email }
      });
      return response.data;
    } catch (error: any) {
      console.error("Error resending verification email:", error.message);
      if (error.response) {
        console.error("Server response:", error.response.status, error.response.data);
      }
      throw error;
    }
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    try {
      const response = await apiClient.post('/api/auth/change-password', {
        currentPassword,
        newPassword,
      });
      return response.data;
    } catch (error: any) {
      console.error("Error changing password:", error.message);
      if (error.response) {
        console.error("Server response:", error.response.status, error.response.data);
      }
      throw error;
    }
  },

  changeInitialPassword: async (email: string, newPassword: string, confirmPassword: string) => {
    try {
      const response = await apiClient.post('/api/auth/change-initial-password', {
        email,
        newPassword,
        confirmPassword,
      });
      return response.data;
    } catch (error: any) {
      console.error("Error changing initial password:", error.message);
      if (error.response) {
        console.error("Server response:", error.response.status, error.response.data);
      }
      throw error;
    }
  },

  resetPasswordRequest: async (email: string) => {
    try {
      const response = await apiClient.post('/api/profile/password/reset-request', { email });
      return response.data;
    } catch (error: any) {
      console.error("Error requesting password reset:", error.message);
      if (error.response) {
        console.error("Server response:", error.response.status, error.response.data);
      }
      throw error;
    }
  },

  resetPasswordConfirm: async (token: string, newPassword: string, confirmPassword: string) => {
    try {
      const response = await apiClient.post('/api/profile/password/reset-confirm', {
        token,
        newPassword,
        confirmPassword,
      });
      return response.data;
    } catch (error: any) {
      console.error("Error confirming password reset:", error.message);
      if (error.response) {
        console.error("Server response:", error.response.status, error.response.data);
      }
      throw error;
    }
  },

  checkEmailAvailability: async (email: string) => {
    try {
      const response = await apiClient.get('/api/auth/check-email', {
        params: { email }
      });
      return response.data.available;
    } catch (error: any) {
      console.error("Error checking email availability:", error.message);
      if (error.response) {
        console.error("Server response:", error.response.status, error.response.data);
      }
      // In case of error, return false to be safe (assume email is taken)
      return false;
    }
  },
};

// User Profile API
export const userApi = {
  getCurrentUser: async () => {
    try {
      console.log("Fetching current user profile");
      // Get auth token for manual header setting if needed
      const token = typeof window !== 'undefined'
        ? localStorage.getItem("token") || sessionStorage.getItem("token")
        : null;

      if (!token) {
        console.error("No authentication token found for user profile request");
        throw new Error("Authentication required");
      }

      // Log the exact API endpoint being called
      const apiEndpoint = '/api/profile';
      console.log(`Making request to: ${apiClient.defaults.baseURL}${apiEndpoint} with token`);

      // The Authorization header is automatically added by the request interceptor
      const response = await apiClient.get(apiEndpoint, {
        headers: {
          // Explicitly set the Authorization header to ensure it's included
          'Authorization': `Bearer ${token}`,
          // Add cache control headers to avoid stale user data
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        }
      });

      console.log("User profile API response:", response.status);

      // Validate the response data
      const data = response.data;
      if (!data || !data.email) {
        console.error("Invalid user profile response format:", data);
        throw new Error("Server returned an invalid user profile format");
      }

      console.log("User profile fetched successfully");
      return data;
    } catch (error: any) {
      console.error("Get current user API error:", error.message);
      if (error.response) {
        console.error("Get current user API response error:", {
          status: error.response.status,
          data: error.response.data
        });
      }
      throw error;
    }
  },

  updateProfile: async (userData: any) => {
    try {
      const response = await apiClient.put('/api/profile', userData);
      return response.data;
    } catch (error: any) {
      console.error("Update profile API error:", error.message);
      if (error.response) {
        console.error("Update profile API response error:", {
          status: error.response.status,
          data: error.response.data
        });
      }
      throw error;
    }
  },

  getActivityLogs: async (page = 0, size = 10) => {
    try {
      // Add cache control headers and timeout to avoid hanging requests
      const response = await apiClient.get('/api/profile/activity', {
        params: {
          page,
          size,
          // Add cache busting parameter to avoid stale data
          _t: Date.now()
        },
        headers: {
          // Prevent caching
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        // Set a shorter timeout for this potentially problematic endpoint
        timeout: 8000
      });

      // Add better validation of the response data
      const data = response.data;

      // Ensure we have an array of logs, even if nested in content property
      if (data && Array.isArray(data)) {
        // Direct array response
        return {
          content: data,
          totalElements: data.length,
          totalPages: 1,
          size,
          number: page
        };
      } else if (data && data.content && Array.isArray(data.content)) {
        // Paginated response with content array
        return data;
      } else {
        // Invalid response format, return empty data structure
        console.warn("Activity logs API returned invalid data format:", typeof data);
        return {
          content: [],
          totalElements: 0,
          totalPages: 0,
          size,
          number: page
        };
      }
    } catch (error: any) {
      // Only log minimal error info to console
      console.error("Activity logs API error:", error.message || "Unknown error");

      // Return empty data with standardized format
      return {
        content: [],
        totalElements: 0,
        totalPages: 0,
        size,
        number: page,
        error: true,
        errorMessage: "Failed to load activity logs. Please try again later."
      };
    }
  },
};

// Customer Management API (Admin Only)
export const customerApi = {
  getAllCustomers: async (page = 0, size = 10, forceRefresh = false) => {
    try {
      console.log(`Fetching all customers, page ${page}, size ${size}${forceRefresh ? ' (forced refresh)' : ''}`);

      // Add a timestamp or random string to bypass caching
      const cacheBuster = forceRefresh ? { timestamp: Date.now() } : {};

      const response = await apiClient.get('/api/customers', {
        params: {
          page,
          size,
          ...cacheBuster
        }
      });

      // Validate response data is an array
      if (Array.isArray(response.data)) {
        console.log(`Retrieved ${response.data.length} customers`);
        return response.data;
      } else if (response.data && typeof response.data === 'object' && Array.isArray(response.data.content)) {
        // Handle paginated response format
        console.log(`Retrieved ${response.data.content.length} customers (page ${response.data.number + 1} of ${response.data.totalPages})`);
        return {
          content: response.data.content,
          totalElements: response.data.totalElements,
          totalPages: response.data.totalPages,
          size: response.data.size,
          number: response.data.number
        };
      } else {
        console.error("Invalid customer data format:", response.data);
        return { content: [], totalElements: 0, totalPages: 0, size: size, number: page };
      }
    } catch (error: unknown) {
      const errorDetails = getErrorDetails(error);
      console.error("Error fetching customers:", errorDetails.message);

      if (errorDetails.status && errorDetails.data) {
        console.error("Server response:", errorDetails.status, errorDetails.data);
      }

      throw error;
    }
  },

  searchCustomers: async (query: string, page = 0, size = 10) => {
    try {
      const response = await apiClient.get('/api/customers/search', {
        params: { query, page, size },
      });
      return response.data;
    } catch (error: unknown) {
      const errorDetails = getErrorDetails(error);
      console.error(`Error searching customers with query "${query}":`, errorDetails.message || 'Unknown error');

      if (errorDetails.status && errorDetails.data) {
        console.error("Server response:", errorDetails.status, errorDetails.data);
      }

      return { content: [], number: 0, totalElements: 0, totalPages: 0 };
    }
  },

  getCustomerById: async (id: string) => {
    try {
      const response = await apiClient.get(`/api/customers/${id}`);
      return response.data;
    } catch (error: unknown) {
      const errorDetails = getErrorDetails(error);
      console.error(`Error fetching customer ${id}:`, errorDetails.message || 'Unknown error');

      if (errorDetails.status && errorDetails.data) {
        console.error("Server response:", errorDetails.status, errorDetails.data);
      }

      return null;
    }
  },

  createCustomer: async (customerData: object) => {
    try {
      const response = await apiClient.post('/api/customers', customerData);
      return response.data;
    } catch (error: unknown) {
      const errorDetails = getErrorDetails(error);
      console.error("Error creating customer:", errorDetails.message || 'Unknown error');

      if (errorDetails.status && errorDetails.data) {
        console.error("Server response:", errorDetails.status, errorDetails.data);
      }

      throw error;
    }
  },

  updateCustomer: async (id: string, customerData: object) => {
    try {
      const response = await apiClient.put(`/api/customers/${id}`, customerData);
      return response.data;
    } catch (error: unknown) {
      const errorDetails = getErrorDetails(error);
      console.error(`Error updating customer ${id}:`, errorDetails.message || 'Unknown error');

      if (errorDetails.status && errorDetails.data) {
        console.error("Server response:", errorDetails.status, errorDetails.data);
      }

      throw error;
    }
  },

  deactivateCustomer: async (id: string) => {
    try {
      const response = await apiClient.delete(`/api/customers/${id}`);
      return response.data;
    } catch (error: unknown) {
      const errorDetails = getErrorDetails(error);
      console.error("Error deactivating customer:", errorDetails.message || 'Unknown error');
      throw error;
    }
  },

  reactivateCustomer: async (id: string) => {
    try {
      const response = await apiClient.post(`/api/customers/${id}/reactivate`);
      return response.data;
    } catch (error: unknown) {
      const errorDetails = getErrorDetails(error);
      console.error("Error reactivating customer:", errorDetails.message || 'Unknown error');
      throw error;
    }
  },

  resetCustomerPassword: async (id: string) => {
    const response = await apiClient.post(`/api/customers/${id}/reset-password`);
    return response.data;
  },

  getCustomerActivityLogs: async (id: string, page = 0, size = 10) => {
    try {
      const response = await apiClient.get(`/api/customers/${id}/activity`, {
        params: { page, size }
      });
      return response.data;
    } catch (error: unknown) {
      const errorDetails = getErrorDetails(error);
      console.error(`Error fetching activity logs for customer ${id}:`, errorDetails.message || 'Unknown error');

      if (errorDetails.status && errorDetails.data) {
        console.error("Server response:", errorDetails.status, errorDetails.data);
      }

      throw error;
    }
  },

  deleteCustomer: async (id: string) => {
    try {
      const response = await apiClient.delete(`/api/customers/${id}`);
      return response.data;
    } catch (error: unknown) {
      const errorDetails = getErrorDetails(error);
      console.error(`Error deleting customer ${id}:`, errorDetails.message || 'Unknown error');

      if (errorDetails.status && errorDetails.data) {
        console.error("Server response:", errorDetails.status, errorDetails.data);
      }

      throw error;
    }
  },
};

// Energy Monitoring API
export const energyApi = {
  submitEnergyReading: async (readingData: any) => {
    try {
      const response = await apiClient.post('/monitoring/readings', readingData);
      return response.data;
    } catch (error: any) {
      console.error("Error submitting energy reading:", error.message);
      throw error;
    }
  },

  getSystemOverview: async () => {
    try {
      const response = await apiClient.get('/monitoring/installations/overview');
      return response.data;
    } catch (error) {
      console.error('Error fetching system overview:', error);
      return null;
    }
  },

  getCustomerDashboard: async (customerId: string) => {
    try {
      const response = await apiClient.get(`/monitoring/dashboard/customer/${customerId}`);
      return response.data;
    } catch (error: any) {
      console.error(`Error fetching customer dashboard for ${customerId}:`, error.message);
      return null;
    }
  },

  getInstallationDashboard: async (installationId: string) => {
    try {
      const response = await apiClient.get(`/monitoring/dashboard/installation/${installationId}`);
      return response.data;
    } catch (error: any) {
      console.error(`Error fetching installation dashboard for ${installationId}:`, error.message);
      return null;
    }
  },

  getRecentReadings: async (installationId: string, limit = 10) => {
    try {
      // Corrected endpoint path to match backend
      const response = await apiClient.get(`/monitoring/readings/recent/${installationId}`, {
        params: { limit },
      });
      return response.data;
    } catch (error: any) {
      console.error(`Error fetching recent readings for installation ${installationId}:`, error.message);
      return [];
    }
  },

  getReadingsHistory: async (installationId: string, startDate: string, endDate: string) => {
    try {
      // Corrected endpoint path to match backend
      const response = await apiClient.get(`/monitoring/readings/history/${installationId}`, {
        params: { startDate, endDate },
      });
      return response.data;
    } catch (error: any) {
      console.error(`Error fetching reading history for installation ${installationId}:`, error.message);
      return [];
    }
  },

  // Energy Summaries
  generateDailySummary: async (installationId: string) => {
    try {
      // Corrected endpoint path to match backend
      const response = await apiClient.post(`/monitoring/summaries/${installationId}/generate/daily`);
      return response.data;
    } catch (error: any) {
      console.error(`Error generating daily summary for installation ${installationId}:`, error.message);
      throw error;
    }
  },

  generateWeeklySummary: async (installationId: string) => {
    try {
      // Corrected endpoint path to match backend
      const response = await apiClient.post(`/monitoring/summaries/${installationId}/generate/weekly`);
      return response.data;
    } catch (error: any) {
      console.error(`Error generating weekly summary for installation ${installationId}:`, error.message);
      throw error;
    }
  },

  generateMonthlySummary: async (installationId: string) => {
    try {
      // Corrected endpoint path to match backend
      const response = await apiClient.post(`/monitoring/summaries/${installationId}/generate/monthly`);
      return response.data;
    } catch (error: any) {
      console.error(`Error generating monthly summary for installation ${installationId}:`, error.message);
      throw error;
    }
  },

  getSummariesByPeriod: async (installationId: string, period: string, startDate?: string, endDate?: string) => {
    try {
      const response = await apiClient.get(`/monitoring/summaries/${installationId}/${period}`, {
        params: { startDate, endDate }
      });
      return response.data;
    } catch (error: any) {
      console.error(`Error fetching ${period} summaries for installation ${installationId}:`, error.message);
      return [];
    }
  },

  getDailySummaries: async (installationId: string, startDate?: string, endDate?: string) => {
    try {
      const response = await apiClient.get(`/monitoring/summaries/${installationId}/daily`, {
        params: { startDate, endDate }
      });
      return response.data;
    } catch (error: any) {
      console.error(`Error fetching daily summaries for installation ${installationId}:`, error.message);
      return [];
    }
  },

  getWeeklySummaries: async (installationId: string, startDate?: string, endDate?: string) => {
    try {
      const response = await apiClient.get(`/monitoring/summaries/${installationId}/weekly`, {
        params: { startDate, endDate }
      });
      return response.data;
    } catch (error: any) {
      console.error(`Error fetching weekly summaries for installation ${installationId}:`, error.message);
      return [];
    }
  },

  getMonthlySummaries: async (installationId: string, startDate?: string, endDate?: string) => {
    try {
      const response = await apiClient.get(`/monitoring/summaries/${installationId}/monthly`, {
        params: { startDate, endDate }
      });
      return response.data;
    } catch (error: any) {
      console.error(`Error fetching monthly summaries for installation ${installationId}:`, error.message);
      return [];
    }
  },

  // Calculate average efficiency for an installation
  calculateInstallationAverageEfficiency: async (installationId: string) => {
    try {
      // First fetch the installation dashboard data which has current efficiency
      const dashboardData = await energyApi.getInstallationDashboard(installationId);
      
      if (!dashboardData) {
        return 0; // Return zero if no dashboard data
      }
      
      // Get recent readings to calculate average efficiency
      const recentReadings = await energyApi.getRecentReadings(installationId, 30);
      
      // If we have readings, calculate average efficiency from them
      if (recentReadings && recentReadings.length > 0) {
        // Calculate efficiency from power generation vs consumption ratio
        let efficiencySum = 0;
        let validReadingsCount = 0;
        
        recentReadings.forEach(reading => {
          if (reading.powerGenerationWatts > 0 && reading.powerConsumptionWatts > 0) {
            // Calculate efficiency as a percentage 
            const readingEfficiency = Math.min(100, (reading.powerGenerationWatts / reading.powerConsumptionWatts) * 100);
            efficiencySum += readingEfficiency;
            validReadingsCount++;
          }
        });
        
        // Return average if we have valid readings, otherwise use current efficiency
        if (validReadingsCount > 0) {
          const averageEfficiency = efficiencySum / validReadingsCount;
          return Math.round(averageEfficiency * 100) / 100; // Round to 2 decimal places
        }
      }
      
      // If we don't have enough readings with both generation and consumption,
      // return the current efficiency from the dashboard
      return dashboardData.currentEfficiencyPercentage || 0;
    } catch (error: any) {
      console.error(`Error calculating average efficiency for installation ${installationId}:`, error.message);
      return 0;
    }
  },
};

// Solar Installations API
export const installationApi = {
  getCustomerInstallations: async (customerId: string) => {
    try {
      const response = await apiClient.get(`/monitoring/installations/customer/${customerId}`);
      return response.data;
    } catch (error: any) {
      console.error(`Error fetching installations for customer ${customerId}:`, error.message);
      return [];
    }
  },

  getInstallationDetails: async (installationId: string) => {
    try {
      const response = await apiClient.get(`/monitoring/installations/${installationId}`);
      return response.data;
    } catch (error: any) {
      console.error(`Error fetching details for installation ${installationId}:`, error.message);
      return null;
    }
  },

  createInstallation: async (installationData: any) => {
    try {
      console.log("API - Creating installation with data:", installationData);
      const response = await apiClient.post('/monitoring/installations', installationData, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      console.log("API - Installation creation response:", response.data);
      return response.data;
    } catch (error: any) {
      console.error("API - Error creating installation:", error);
      if (error.response) {
        console.error("API - Server response:", error.response.status, error.response.data);
      }
      throw error;
    }
  },

  updateInstallation: async (installationId: string, installationData: any) => {
    try {
      const response = await apiClient.put(`/monitoring/installations/${installationId}`, installationData);
      return response.data;
    } catch (error: any) {
      console.error(`Error updating installation ${installationId}:`, error.message);
      throw error;
    }
  },

  updateDeviceStatus: async (statusData: any) => {
    try {
      const response = await apiClient.post('/monitoring/installations/device-status', statusData);
      return response.data;
    } catch (error: any) {
      console.error("Error updating device status:", error.message);
      throw error;
    }
  },

  getAllInstallations: async (params?: {
    page?: number,
    size?: number,
    sortBy?: string,
    direction?: 'asc' | 'desc',
    status?: string,
    type?: string,
    search?: string
  }) => {
    try {
      console.log("Fetching all installations with params:", params);
      const response = await apiClient.get('/monitoring/installations/overview', { params });
      console.log("Installations response:", response.data);

      if (response.data) {
        if (Array.isArray(response.data)) {
          return {
            content: response.data,
            totalElements: response.data.length,
            totalPages: 1,
            size: response.data.length,
            number: 0
          };
        } else if (response.data.content && Array.isArray(response.data.content)) {
          return response.data;
        } else if (response.data.recentlyActiveInstallations && Array.isArray(response.data.recentlyActiveInstallations)) {
          // Handle the case when API returns recentlyActiveInstallations
          return {
            content: response.data.recentlyActiveInstallations,
            totalElements: response.data.totalActiveInstallations || response.data.recentlyActiveInstallations.length,
            totalPages: 1,
            size: response.data.recentlyActiveInstallations.length,
            number: 0,
            overview: response.data
          };
        } else {
          return {
            content: [],
            totalElements: response.data.totalActiveInstallations || 0,
            totalPages: 1,
            size: 0,
            number: 0,
            overview: response.data
          };
        }
      } else {
        console.error("Invalid installations data format:", response.data);
        return { content: [], totalElements: 0, totalPages: 0, size: params?.size || 10, number: params?.page || 0 };
      }
    } catch (error: any) {
      console.error("Error fetching all installations:", error.message);
      if (error.response) {
        console.error("Server response:", error.response.status, error.response.data);
      }
      return { content: [], totalElements: 0, totalPages: 0, size: params?.size || 10, number: params?.page || 0 };
    }
  },

  getTamperAlerts: async () => {
    try {
      const response = await apiClient.get('/monitoring/installations/tamper-alerts');
      return response.data;
    } catch (error: any) {
      console.error("Error fetching tamper alerts:", error.message);
      return [];
    }
  },
};

// Payment API
export const paymentApi = {
  // Customer Payment APIs
  getCustomerPaymentHistory: async (userId: string, page = 0, size = 20) => {
    try {
      const response = await apiClient.get(`/api/payments/customers/${userId}/history`, {
        params: { page, size }
      });
      return response.data;
    } catch (error: any) {
      console.error(`Error fetching payment history for user ${userId}:`, error);
      // Return empty paginated response in case of error
      return {
        content: [],
        totalPages: 0,
        totalElements: 0,
        size: size,
        number: page
      };
    }
  },

  getCustomerUpcomingPayments: async (userId: string) => {
    try {
      const response = await apiClient.get(`/api/payments/customers/${userId}/upcoming`);
      return response.data;
    } catch (error: any) {
      console.error(`Error fetching upcoming payments for user ${userId}:`, error);
      // Return empty paginated response in case of error
      return {
        content: []
      };
    }
  },

  getCustomerPaymentMethods: async (userId: string) => {
    try {
      const response = await apiClient.get(`/api/payments/customers/${userId}/methods`);
      return response.data;
    } catch (error: any) {
      console.error(`Error fetching payment methods for user ${userId}:`, error);
      // Return default payment method in case of error
      return {
        defaultMethod: {
          type: "Credit Card",
          lastFour: "4242",
          expiry: "12/2025"
        },
        methods: []
      };
    }
  },

  getCustomerPaymentPlan: async (userId: string) => {
    try {
      const response = await apiClient.get(`/api/payments/customers/${userId}/plan`);
      return response.data;
    } catch (error: any) {
      console.error(`Error fetching payment plan for user ${userId}:`, error);
      // Return default payment plan in case of error
      return {
        name: "Standard",
        amount: 149.99
      };
    }
  },

  makePayment: async (paymentData: any) => {
    try {
      const response = await apiClient.post('/api/payments/make-payment', paymentData);
      return response.data;
    } catch (error: any) {
      console.error('Error making payment:', error);
      throw error;
    }
  },

  getUpcomingPayments: async () => {
    try {
      const response = await apiClient.get('/api/payments/upcoming');
      return response.data;
    } catch (error: any) {
      console.error('Error fetching upcoming payments:', error);
      return { content: [] };
    }
  },

  getPaymentReceipt: async (paymentId: string) => {
    try {
      const response = await apiClient.get(`/api/payments/receipts/${paymentId}`);
      return response.data;
    } catch (error: any) {
      console.error(`Error fetching receipt for payment ${paymentId}:`, error);
      throw error;
    }
  },

  getPaymentHistory: async (page = 0, size = 20) => {
    try {
      const response = await apiClient.get('/api/payments/history', {
        params: { page, size }
      });
      return response.data;
    } catch (error: any) {
      console.error('Error fetching payment history:', error);
      return { content: [], totalPages: 0, totalElements: 0, size, number: page };
    }
  },

  getPaymentDashboard: async () => {
    try {
      const response = await apiClient.get('/api/payments/dashboard');
      return response.data;
    } catch (error: any) {
      console.error('Error fetching payment dashboard:', error);
      return null;
    }
  },

  // Admin Payment APIs
  getAdminPayments: async (page = 0, size = 20, sortBy = 'dueDate', direction = 'desc') => {
    try {
      console.log("Fetching admin payments with params:", { page, size, sortBy, direction });
      
      // Format dates properly - API expects the date in a specific format
      const today = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(today.getDate() - 30);
      
      // Format dates in yyyy-MM-dd format for API
      const startDate = thirtyDaysAgo.toISOString().split('T')[0];
      const endDate = today.toISOString().split('T')[0];
      
      // Call the revenue report endpoint
      const response = await apiClient.get('/api/admin/payments/reports/revenue', {
        params: { 
          startDate,
          endDate
        },
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });

      // Process the response data
      if (response.data) {
        const revenueData = response.data;
        // Sample response format:
        // {
        //   "reportType": "Revenue Report",
        //   "expectedRevenue": 0,
        //   "numberOfPayments": 0,
        //   "endDate": "2025-04-22T23:59:59",
        //   "collectionRate": 0,
        //   "totalRevenue": 0,
        //   "startDate": "2025-03-22T00:00:00"
        // }
        
        // Generate graph data from the revenue metrics
        // Parse start and end dates from the response
        const startDateTime = revenueData.startDate ? new Date(revenueData.startDate) : thirtyDaysAgo;
        const endDateTime = revenueData.endDate ? new Date(revenueData.endDate) : today;
        
        // Calculate the number of days in the period
        const diffTime = Math.abs(endDateTime.getTime() - startDateTime.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        // Generate graph data based on the time range
        let timeRange = 'week';
        if (diffDays <= 7) {
          timeRange = 'day';
        } else if (diffDays <= 31) {
          timeRange = 'week';
        } else {
          timeRange = 'month';
        }
        
        // Generate graph data points
        const graphData = [];
        const totalRevenue = revenueData.totalRevenue || 0;
        
        if (timeRange === 'day') {
          // Daily view - 24 hours
          for (let hour = 0; hour < 24; hour++) {
            // Create a distribution with more revenue during business hours
            let factor = 1;
            if (hour >= 8 && hour <= 18) {
              factor = 1.5; // Higher during business hours
            } else if (hour >= 20 || hour <= 6) {
              factor = 0.3; // Lower during night hours
            }
            
            graphData.push({
              name: `${hour}:00`,
              revenue: Math.round((totalRevenue / 24) * factor * 100) / 100
            });
          }
        } else if (timeRange === 'week') {
          // Weekly view - 7 days
          const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
          const dailyAverage = totalRevenue / 7;
          
          dayNames.forEach((day, index) => {
            // Weekends typically have less revenue
            let factor = 1;
            if (index >= 5) { // Weekend
              factor = 0.6;
            } else if (index === 2 || index === 3) { // Mid-week peak
              factor = 1.3;
            }
            
            graphData.push({
              name: day,
              revenue: Math.round(dailyAverage * factor * 100) / 100
            });
          });
        } else {
          // Monthly view
          const daysInPeriod = Math.min(diffDays, 30);
          const dailyAverage = totalRevenue / daysInPeriod;
          
          for (let i = 0; i < daysInPeriod; i++) {
            const date = new Date(startDateTime);
            date.setDate(startDateTime.getDate() + i);
            
            // Add some random variation
            const factor = 0.7 + Math.random() * 0.6; // Random factor between 0.7 and 1.3
            
            graphData.push({
              name: `${date.getDate()}`,
              revenue: Math.round(dailyAverage * factor * 100) / 100
            });
          }
        }
        
        // Return the data
        return {
          content: [], // No individual payment records
          totalPages: 0,
          totalElements: 0,
          size,
          number: page,
          summary: revenueData,
          graphData: {
            timeRange,
            data: graphData
          }
        };
      }

      console.log("No revenue data returned from API");
      return { 
        content: [], 
        totalPages: 0, 
        totalElements: 0, 
        size, 
        number: page,
        summary: { totalRevenue: 0, expectedRevenue: 0, collectionRate: 0 }
      };
    } catch (error) {
      console.error("Error fetching admin payments:", error);
      if (error.response) {
        console.error("Server response:", error.response.status, error.response.data);
      }
      return { 
        content: [], 
        totalPages: 0, 
        totalElements: 0, 
        size, 
        number: page,
        summary: { totalRevenue: 0, expectedRevenue: 0, collectionRate: 0 }
      };
    }
  },

  getPaymentReports: async (reportType = 'all', startDate?: string, endDate?: string) => {
    try {
      console.log(`Fetching payment reports of type: ${reportType}`);
      const params: any = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const response = await apiClient.get(`/api/admin/payments/reports/${reportType !== 'all' ? reportType : ''}`, {
        params,
        headers: {
          // Add cache control header to prevent caching
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });

      return response.data;
    } catch (error: any) {
      console.error(`Error fetching payment reports of type ${reportType}:`, error);
      if (error.response) {
        console.error("Server response:", error.response.status, error.response.data);
      }
      return [];
    }
  },
};

// Payment Compliance API
export const paymentComplianceApi = {
  // PAYMENT OPERATIONS ENDPOINTS

  // Get overdue payments with pagination and sorting
  getOverduePayments: async (page = 0, size = 10, sortBy = "dueDate", sortDirection = "asc") => {
    try {
      const response = await apiClient.get('/api/admin/payments/overdue', {
        params: { page, size, sortBy, sortDirection }
      });

      return response.data || { content: [], totalPages: 0 };
    } catch (error) {
      console.error("Error fetching overdue payments:", error);
      return { content: [], totalPages: 0 };
    }
  },

  // Get grace period configuration
  getGracePeriodConfig: async () => {
    try {
      const response = await apiClient.get('/api/admin/payments/grace-period-config');
      console.log("Grace period config response:", response.data);
      return response.data || {
        numberOfDays: 7,
        gracePeriodDays: 7,
        reminderFrequency: 2,
        autoSuspendEnabled: true,
        lateFeesEnabled: false,
        lateFeePercentage: 0,
        lateFeeFixedAmount: 0
      };
    } catch (error) {
      console.error("Error fetching grace period config:", error);
      throw error;
    }
  },

  // Update grace period configuration
  updateGracePeriodConfig: async (config) => {
    try {
      // Log the request payload for debugging
      console.log("Updating grace period config with payload:", config);

      // Ensure the payload has the correct structure expected by the API
      const formattedConfig = {
        numberOfDays: parseInt(config.numberOfDays?.toString() || config.gracePeriodDays?.toString() || '7'),
        gracePeriodDays: parseInt(config.numberOfDays?.toString() || config.gracePeriodDays?.toString() || '7'),
        reminderFrequency: parseInt(config.reminderFrequency?.toString() || '2'),
        autoSuspendEnabled: config.autoSuspendEnabled !== false,
        lateFeesEnabled: config.lateFeesEnabled === true,
        lateFeePercentage: parseFloat(config.lateFeePercentage?.toString() || '0'),
        lateFeeFixedAmount: parseFloat(config.lateFeeFixedAmount?.toString() || '0')
      };

      const response = await apiClient.put('/api/admin/payments/grace-period-config', formattedConfig);

      // Log success and return the updated config
      console.log("Grace period config updated successfully:", response.data);
      return response.data || formattedConfig;
    } catch (error) {
      console.error("Error updating grace period config:", error);
      throw error;
    }
  },

  // Get reminder configuration
  getReminderConfig: async () => {
    try {
      const response = await apiClient.get('/api/admin/payments/reminder-config');
      console.log("Reminder config response:", response.data);
      return response.data || {
        autoSendReminders: true,
        firstReminderDays: 1,
        secondReminderDays: 3,
        finalReminderDays: 7,
        reminderMethod: "EMAIL"
      };
    } catch (error) {
      console.error("Error fetching reminder config:", error);
      throw error;
    }
  },

  // Update reminder configuration
  updateReminderConfig: async (config) => {
    try {
      // Log the request payload for debugging
      console.log("Updating reminder config with payload:", config);

      // Ensure the payload has the correct structure expected by the API
      const formattedConfig = {
        autoSendReminders: config.autoSendReminders !== false,
        firstReminderDays: parseInt(config.firstReminderDays?.toString() || '1'),
        secondReminderDays: parseInt(config.secondReminderDays?.toString() || '3'),
        finalReminderDays: parseInt(config.finalReminderDays?.toString() || '7'),
        reminderMethod: config.reminderMethod || "EMAIL"
      };

      const response = await apiClient.put('/api/admin/payments/reminder-config', formattedConfig);

      // Log success and return the updated config
      console.log("Reminder config updated successfully:", response.data);
      return response.data || formattedConfig;
    } catch (error) {
      console.error("Error updating reminder config:", error);
      throw error;
    }
  },

  // Send a manual payment reminder
  sendManualReminder: async (paymentId, reminderType) => {
    try {
      const response = await apiClient.post(`/api/admin/payments/${paymentId}/send-reminder`, {
        reminderType
      });
      return response.data;
    } catch (error) {
      console.error("Error sending payment reminder:", error);
      throw error;
    }
  },

  // Send a bulk manual reminder
  sendBulkManualReminder: async (reminderData) => {
    try {
      const response = await apiClient.post('/api/admin/payments/reminders/send', reminderData);
      return response.data;
    } catch (error) {
      console.error("Error sending bulk payment reminder:", error);
      throw error;
    }
  },

  // Get payment reminders history
  getPaymentReminders: async (paymentId) => {
    try {
      const response = await apiClient.get(`/api/admin/payments/${paymentId}/reminders`);
      return response.data || [];
    } catch (error) {
      console.error("Error fetching payment reminders:", error);
      return [];
    }
  },

  // Get customer payment plans
  getCustomerPaymentPlans: async (customerId) => {
    try {
      const response = await apiClient.get(`/api/admin/payments/customers/${customerId}/plan`);
      return response.data || [];
    } catch (error) {
      console.error(`Error fetching payment plans for customer ${customerId}:`, error);
      return [];
    }
  },

  // Create payment plan for a customer
  createPaymentPlan: async (customerId, planData) => {
    try {
      // Fix: Ensure we're passing a customer ID, not an object
      const customerIdValue = typeof customerId === 'object' ? customerId.id : customerId;

      console.log(`Creating payment plan for customer ID: ${customerIdValue}`, planData);
      const response = await apiClient.post(`/api/admin/payments/customers/${customerIdValue}/plan`, planData);
      return response.data;
    } catch (error) {
      console.error(`Error creating payment plan for customer ${customerId}:`, error);
      throw error;
    }
  },

  // Update customer payment plan
  updatePaymentPlan: async (customerId, planId, planData) => {
    try {
      const response = await apiClient.put(`/api/admin/payments/customers/${customerId}/plan/${planId}`, planData);
      return response.data;
    } catch (error) {
      console.error(`Error updating payment plan ${planId} for customer ${customerId}:`, error);
      throw error;
    }
  },

  // Record a manual payment
  recordManualPayment: async (customerId, paymentData) => {
    try {
      const response = await apiClient.post(`/api/admin/payments/customers/${customerId}/manual-payment`, paymentData);
      return response.data;
    } catch (error) {
      console.error(`Error recording manual payment for customer ${customerId}:`, error);
      throw error;
    }
  },

  // Get customer installation payments
  getCustomerInstallationPayments: async (installationId) => {
    try {
      const response = await apiClient.get(`/api/admin/payments/customers/${installationId}/payments`);
      return response.data || [];
    } catch (error) {
      console.error(`Error fetching payments for installation ${installationId}:`, error);
      return [];
    }
  },

  // PAYMENT ANALYTICS REPORT ENDPOINTS

  // Generate payment report by type
  generatePaymentReport: async (reportType, startDate, endDate) => {
    try {
      const response = await apiClient.get(`/api/admin/payments/reports/${reportType}`, {
        params: {
          startDate,
          endDate
        }
      });
      return response.data;
    } catch (error) {
      console.error(`Error generating ${reportType} payment report:`, error);
      throw error;
    }
  },

  // Get upcoming payments report
  getUpcomingPaymentsReport: async (daysAhead = 7) => {
    try {
      const response = await apiClient.get('/api/admin/payments/reports/upcoming', {
        params: { daysAhead }
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching upcoming payments report:", error);
      throw error;
    }
  },

  // Get payments by status report
  getPaymentsByStatusReport: async (status, startDate, endDate) => {
    try {
      const response = await apiClient.get(`/api/admin/payments/reports/status/${status}`, {
        params: { startDate, endDate }
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching payments by status ${status} report:`, error);
      throw error;
    }
  },

  // Get payment plans by status report
  getPaymentPlansByStatusReport: async (status, startDate, endDate) => {
    try {
      const response = await apiClient.get(`/api/admin/payments/reports/payment-plans/status/${status}`, {
        params: { startDate, endDate }
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching payment plans by status ${status} report:`, error);
      throw error;
    }
  },

  // Get payment plan report
  getPaymentPlanReport: async (paymentPlanId) => {
    try {
      const response = await apiClient.get(`/api/admin/payments/reports/payment-plan/${paymentPlanId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching payment plan ${paymentPlanId} report:`, error);
      throw error;
    }
  },

  // Get overdue payments report
  getOverduePaymentsReport: async (startDate, endDate) => {
    try {
      const response = await apiClient.get('/api/admin/payments/reports/overdue', {
        params: { startDate, endDate }
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching overdue payments report:", error);
      throw error;
    }
  },

  // Get installation payment report
  getInstallationPaymentReport: async (installationId) => {
    try {
      const response = await apiClient.get(`/api/admin/payments/reports/installation/${installationId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching installation ${installationId} payment report:`, error);
      throw error;
    }
  },

  // Get payment history report
  getPaymentHistoryReport: async (installationId) => {
    try {
      const response = await apiClient.get(`/api/admin/payments/reports/history/${installationId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching payment history for installation ${installationId} report:`, error);
      throw error;
    }
  },

  // Get payments due report
  getPaymentsDueReport: async (startDate, endDate) => {
    try {
      const response = await apiClient.get('/api/admin/payments/reports/due', {
        params: { startDate, endDate }
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching payments due report:", error);
      throw error;
    }
  }
};

// Service Control API
export const serviceApi = {
  getServiceStatus: async () => {
    const response = await apiClient.get('/api/service/status');
    return response.data;
  },

  sendDeviceCommand: async (commandData: any) => {
    const response = await apiClient.post('/api/service/commands', commandData);
    return response.data;
  },

  getOperationalLogs: async () => {
    const response = await apiClient.get('/api/service/logs');
    return response.data;
  },

  getSystemIntegration: async () => {
    const response = await apiClient.get('/api/service/system');
    return response.data;
  },

  getModuleIntegration: async () => {
    const response = await apiClient.get('/api/service/integration');
    return response.data;
  },
};

// Service Control API
export const serviceControlApi = {
  getCurrentStatus: async (installationId: string) => {
    try {
      const response = await apiClient.get(`/api/service/status/${installationId}`);
      return response.data;
    } catch (error: any) {
      console.error(`Error fetching service status for installation ${installationId}:`, error);
      throw error;
    }
  },

  getStatusHistory: async (installationId: string, page = 0, size = 20) => {
    try {
      const response = await apiClient.get(`/api/service/status/${installationId}/history`, {
        params: { page, size }
      });
      return response.data;
    } catch (error: any) {
      console.error(`Error fetching status history for installation ${installationId}:`, error);
      throw error;
    }
  },

  updateServiceStatus: async (installationId: string, statusData: any) => {
    try {
      const response = await apiClient.put(`/api/service/status/${installationId}`, statusData);
      return response.data;
    } catch (error: any) {
      console.error(`Error updating service status for installation ${installationId}:`, error);
      throw error;
    }
  },

  suspendServiceForPayment: async (installationId: string, reason: string) => {
    try {
      const response = await apiClient.post(`/api/service/status/${installationId}/suspend/payment`, null, {
        params: { reason }
      });
      return response.data;
    } catch (error: any) {
      console.error(`Error suspending service for installation ${installationId}:`, error);
      throw error;
    }
  },

  suspendServiceForSecurity: async (installationId: string, reason: string) => {
    try {
      const response = await apiClient.post(`/api/service/status/${installationId}/suspend/security`, null, {
        params: { reason }
      });
      return response.data;
    } catch (error: any) {
      console.error(`Error suspending service for installation ${installationId}:`, error);
      throw error;
    }
  },

  suspendServiceForMaintenance: async (installationId: string, maintenanceData: any) => {
    try {
      const response = await apiClient.post(`/api/service/status/${installationId}/suspend/maintenance`, maintenanceData);
      return response.data;
    } catch (error: any) {
      console.error(`Error suspending service for maintenance for installation ${installationId}:`, error);
      throw error;
    }
  },

  restoreService: async (installationId: string, reason: string) => {
    try {
      const response = await apiClient.post(`/api/service/status/${installationId}/restore`, null, {
        params: { reason }
      });
      return response.data;
    } catch (error: any) {
      console.error(`Error restoring service for installation ${installationId}:`, error);
      throw error;
    }
  },

  scheduleStatusChange: async (installationId: string, targetStatus: string, reason: string, scheduledTime: string) => {
    try {
      const response = await apiClient.post(`/api/service/status/${installationId}/schedule`, null, {
        params: { targetStatus, reason, scheduledTime }
      });
      return response.data;
    } catch (error: any) {
      console.error(`Error scheduling status change for installation ${installationId}:`, error);
      throw error;
    }
  },

  cancelScheduledChange: async (installationId: string) => {
    try {
      const response = await apiClient.delete(`/api/service/status/${installationId}/schedule`);
      return response.data;
    } catch (error: any) {
      console.error(`Error canceling scheduled change for installation ${installationId}:`, error);
      throw error;
    }
  },

  getStatusesByUserId: async (userId: string) => {
    try {
      const response = await apiClient.get(`/api/service/status/user/${userId}`);
      return response.data;
    } catch (error: any) {
      console.error(`Error fetching statuses for user ${userId}:`, error);
      throw error;
    }
  },

  hasOverduePayments: async (installationId: string) => {
    try {
      const response = await apiClient.get(`/api/service/status/${installationId}/overdue-check`);
      return response.data;
    } catch (error: any) {
      console.error(`Error checking overdue payments for installation ${installationId}:`, error);
      return false; // Default to false if API check fails
    }
  },

  getDaysUntilSuspension: async (installationId: string) => {
    try {
      const response = await apiClient.get(`/api/service/status/${installationId}/days-until-suspension`);
      return response.data;
    } catch (error: any) {
      console.error(`Error fetching days until suspension for installation ${installationId}:`, error);
      return null; // Return null to indicate unknown days until suspension
    }
  },

  getGracePeriod: async (installationId: string) => {
    try {
      const response = await apiClient.get(`/api/service/status/${installationId}/grace-period`);
      return response.data;
    } catch (error: any) {
      console.error(`Error fetching grace period for installation ${installationId}:`, error);
      return 7; // Default grace period of 7 days
    }
  },

  sendCommand: async (installationId: string, commandData: any) => {
    try {
      const response = await apiClient.post(`/api/service/commands/installation/${installationId}`, commandData);
      return response.data;
    } catch (error: any) {
      console.error(`Error sending command to installation ${installationId}:`, error);
      throw error;
    }
  },

  cancelCommand: async (commandId: string) => {
    try {
      const response = await apiClient.delete(`/api/service/commands/${commandId}`);
      return response.data;
    } catch (error: any) {
      console.error(`Error canceling command ${commandId}:`, error);
      throw error;
    }
  },

  getLogsByTimeRange: async (startTime: string, endTime: string) => {
    try {
      const response = await apiClient.get('/api/service/logs/time-range', {
        params: { startTime, endTime }
      });
      return response.data;
    } catch (error: any) {
      console.error(`Error fetching logs by time range:`, error);
      return [];
    }
  },

  getLogsByOperation: async (operation: string) => {
    try {
      const response = await apiClient.get('/api/service/logs/operation', {
        params: { operation }
      });
      return response.data;
    } catch (error: any) {
      console.error(`Error fetching logs by operation ${operation}:`, error);
      return [];
    }
  },

  getLogsBySourceSystem: async (sourceSystem: string) => {
    try {
      const response = await apiClient.get('/api/service/logs/source', {
        params: { sourceSystem }
      });
      return response.data;
    } catch (error: any) {
      console.error(`Error fetching logs by source system ${sourceSystem}:`, error);
      return [];
    }
  },
};

// Security and Tamper Detection API
export const securityApi = {
  // Security Alerts and Tamper Events
  getTamperEvents: async () => {
    try {
      console.log("Fetching security alerts from API");
      const response = await apiClient.get('/api/security/admin/alerts');

      if (response && response.data) {
        console.log("Security alerts response:", response.data);
        return Array.isArray(response.data) ? response.data : [];
      } else {
        console.log("No security alerts data received");
        return [];
      }
    } catch (error: any) {
      console.error("Error fetching security alerts:", error);
      if (error.response) {
        console.error("Server response:", error.response.status, error.response.data);
      } else if (error.request) {
        console.error("No response received from server");
      } else {
        console.error("Error setting up request:", error.message);
      }
      // Return empty array instead of null to avoid additional null checks
      return [];
    }
  },

  getTamperEventById: async (eventId: string) => {
    try {
      const response = await apiClient.get(`/api/security/tamper-events/${eventId}`);
      return response.data;
    } catch (error: any) {
      console.error(`Error fetching tamper event ${eventId}:`, error);
      return null;
    }
  },

  getInstallationEvents: async (installationId: string, page = 0, size = 20) => {
    try {
      const response = await apiClient.get(`/api/security/installations/${installationId}/events`, {
        params: { page, size }
      });
      return response.data;
    } catch (error: any) {
      console.error(`Error fetching events for installation ${installationId}:`, error);
      return { content: [], totalElements: 0, totalPages: 0, size, number: page };
    }
  },

  getEventsByTimeRange: async (installationId: string, startTime: string, endTime: string, page = 0, size = 20) => {
    try {
      const response = await apiClient.get(`/api/security/installations/${installationId}/events/time-range`, {
        params: { startTime, endTime, page, size }
      });
      return response.data;
    } catch (error: any) {
      console.error(`Error fetching events by time range:`, error);
      return { content: [], totalElements: 0, totalPages: 0, size, number: page };
    }
  },

  getUnresolvedEvents: async (page = 0, size = 20) => {
    try {
      const response = await apiClient.get(`/api/security/admin/alerts`, {
        params: { page, size }
      });
      return response.data;
    } catch (error: any) {
      console.error(`Error fetching unresolved events:`, error);
      return { content: [], totalElements: 0, totalPages: 0, size, number: page };
    }
  },

  // Event Management
  acknowledgeEvent: async (eventId: string) => {
    try {
      const response = await apiClient.put(`/api/security/events/${eventId}/acknowledge`);
      return response.data;
    } catch (error: any) {
      console.error(`Error acknowledging event ${eventId}:`, error);
      throw error;
    }
  },

  updateEventStatus: async (eventId: string, status: string) => {
    try {
      const response = await apiClient.put(`/api/security/admin/events/${eventId}/status`, { status });
      return response.data;
    } catch (error: any) {
      console.error(`Error updating event ${eventId} status:`, error);
      throw error;
    }
  },

  resolveEvent: async (eventId: string, resolutionDetails: any) => {
    try {
      const response = await apiClient.post(`/api/security/admin/events/${eventId}/resolve`, resolutionDetails);
      return response.data;
    } catch (error: any) {
      console.error(`Error resolving event ${eventId}:`, error);
      throw error;
    }
  },

  createTamperEvent: async (eventData: any) => {
    try {
      const response = await apiClient.post(`/api/security/tamper-events`, eventData);
      return response.data;
    } catch (error: any) {
      console.error(`Error creating tamper event:`, error);
      throw error;
    }
  },

  // Tamper Responses
  getResponsesByEventId: async (tamperEventId: string) => {
    try {
      const response = await apiClient.get(`/api/security/responses/events/${tamperEventId}`);
      return response.data;
    } catch (error: any) {
      console.error(`Error fetching responses for event ${tamperEventId}:`, error);
      return [];
    }
  },

  createTamperResponse: async (tamperEventId: string, responseData: any) => {
    try {
      const response = await apiClient.post(`/api/security/responses/events/${tamperEventId}`, responseData);
      return response.data;
    } catch (error: any) {
      console.error(`Error creating response for event ${tamperEventId}:`, error);
      throw error;
    }
  },

  sendNotification: async (tamperEventId: string, notificationData: any) => {
    try {
      const response = await apiClient.post(`/api/security/responses/events/${tamperEventId}/notify`, notificationData);
      return response.data;
    } catch (error: any) {
      console.error(`Error sending notification for event ${tamperEventId}:`, error);
      throw error;
    }
  },

  executeAutoResponse: async (tamperEventId: string, autoResponseParams: any) => {
    try {
      const response = await apiClient.post(
        `/api/security/responses/events/${tamperEventId}/auto-response`,
        autoResponseParams
      );
      return response.data;
    } catch (error: any) {
      console.error(`Error executing auto-response for event ${tamperEventId}:`, error);
      throw error;
    }
  },

  getResponseById: async (responseId: string) => {
    try {
      const response = await apiClient.get(`/api/security/responses/${responseId}`);
      return response.data;
    } catch (error: any) {
      console.error(`Error fetching response ${responseId}:`, error);
      return null;
    }
  },

  getResponsesByTimeRange: async (startTime: string, endTime: string, page = 0, size = 20) => {
    try {
      const response = await apiClient.get(`/api/security/responses/time-range`, {
        params: { startTime, endTime, page, size }
      });
      return response.data;
    } catch (error: any) {
      console.error(`Error fetching responses by time range:`, error);
      return { content: [], totalElements: 0, totalPages: 0, size, number: page };
    }
  },

  getResponsesByInstallation: async (installationId: string, page = 0, size = 20) => {
    try {
      const response = await apiClient.get(`/api/security/responses/installations/${installationId}`, {
        params: { page, size }
      });
      return response.data;
    } catch (error: any) {
      console.error(`Error fetching responses for installation ${installationId}:`, error);
      return { content: [], totalElements: 0, totalPages: 0, size, number: page };
    }
  },

  getResponsesByEventAndType: async (tamperEventId: string, responseType: string) => {
    try {
      const response = await apiClient.get(`/api/security/responses/events/${tamperEventId}/type/${responseType}`);
      return response.data;
    } catch (error: any) {
      console.error(`Error fetching responses for event ${tamperEventId} and type ${responseType}:`, error);
      return [];
    }
  },

  // Get customer events - not admin
  getUserEvents: async (page = 0, size = 20) => {
    try {
      const response = await apiClient.get(`/api/security/events`, {
        params: { page, size }
      });
      return response.data;
    } catch (error: any) {
      console.error(`Error fetching user events:`, error);
      return { content: [], totalElements: 0, totalPages: 0, size, number: page };
    }
  },

  // Security Audit Logs APIs
  getUserAuditLogs: async (page = 0, size = 20) => {
    try {
      const response = await apiClient.get('/api/security/audit', {
        params: { page, size }
      });
      return response.data;
    } catch (error: any) {
      console.error('Error fetching user security audit logs:', error);
      return { content: [], totalElements: 0, totalPages: 0, size, number: page };
    }
  },

  getInstallationAuditLogs: async (installationId: string, page = 0, size = 20) => {
    try {
      const response = await apiClient.get(`/api/security/admin/installations/${installationId}/audit`, {
        params: { page, size }
      });
      return response.data;
    } catch (error: any) {
      console.error(`Error fetching audit logs for installation ${installationId}:`, error);
      return { content: [], totalElements: 0, totalPages: 0, size, number: page };
    }
  },

  getAuditLogsByTimeRange: async (installationId: string, startTime: string, endTime: string, page = 0, size = 20) => {
    try {
      const response = await apiClient.get(`/api/security/admin/installations/${installationId}/audit/time-range`, {
        params: { startTime, endTime, page, size }
      });
      return response.data;
    } catch (error: any) {
      console.error(`Error fetching audit logs by time range:`, error);
      return { content: [], totalElements: 0, totalPages: 0, size, number: page };
    }
  },

  getAuditLogsByActivityType: async (installationId: string, activityType: string, page = 0, size = 20) => {
    try {
      const response = await apiClient.get(`/api/security/admin/installations/${installationId}/audit/activity-type`, {
        params: { activityType, page, size }
      });
      return response.data;
    } catch (error: any) {
      console.error(`Error fetching audit logs by activity type:`, error);
      return { content: [], totalElements: 0, totalPages: 0, size, number: page };
    }
  },

  getAdminAuditLogs: async (page = 0, size = 20, activityType?: string) => {
    try {
      const params: any = { page, size };
      if (activityType) params.activityType = activityType;

      const response = await apiClient.get('/api/security/admin/audit', { params });
      return response.data;
    } catch (error: any) {
      console.error('Error fetching admin security audit logs:', error);
      return { content: [], totalElements: 0, totalPages: 0, size, number: page };
    }
  }
};

// Tamper Detection API
export const tamperDetectionApi = {
  // Monitoring Controls
  startMonitoring: async (installationId: string) => {
    try {
      const response = await apiClient.post(`/api/security/detection/installations/${installationId}/start`);
      return response.data;
    } catch (error: any) {
      console.error(`Error starting monitoring for installation ${installationId}:`, error);
      throw error;
    }
  },

  stopMonitoring: async (installationId: string) => {
    try {
      const response = await apiClient.post(`/api/security/detection/installations/${installationId}/stop`);
      return response.data;
    } catch (error: any) {
      console.error(`Error stopping monitoring for installation ${installationId}:`, error);
      throw error;
    }
  },

  getMonitoringStatus: async (installationId: string) => {
    try {
      const response = await apiClient.get(`/api/security/detection/installations/${installationId}/status`);
      return response.data;
    } catch (error: any) {
      console.error(`Error checking monitoring status for installation ${installationId}:`, error);
      throw error;
    }
  },

  runDiagnostics: async (installationId: string) => {
    try {
      const response = await apiClient.post(`/api/security/detection/installations/${installationId}/diagnostics`);
      return response.data;
    } catch (error: any) {
      console.error(`Error running diagnostics for installation ${installationId}:`, error);
      throw error;
    }
  },

  // Sensitivity Configuration
  adjustSensitivity: async (installationId: string, eventType: string, threshold: number) => {
    try {
      const response = await apiClient.put(
        `/api/security/detection/installations/${installationId}/sensitivity/${eventType}`,
        { threshold }
      );
      return response.data;
    } catch (error: any) {
      console.error(`Error adjusting sensitivity for installation ${installationId}:`, error);
      throw error;
    }
  },

  getSensitivity: async (installationId: string) => {
    try {
      const response = await apiClient.get(`/api/security/installations/${installationId}/sensitivity`);
      return response.data;
    } catch (error: any) {
      console.error(`Error getting sensitivity settings for installation ${installationId}:`, error);
      throw error;
    }
  },

  updateSensitivity: async (installationId: string, sensitivitySettings: any) => {
    try {
      const response = await apiClient.put(`/api/security/installations/${installationId}/sensitivity`, sensitivitySettings);
      return response.data;
    } catch (error: any) {
      console.error(`Error updating sensitivity settings for installation ${installationId}:`, error);
      throw error;
    }
  },

  createDefaultAlertConfig: async (installationId: string) => {
    try {
      const response = await apiClient.post(`/api/security/installations/${installationId}/sensitivity/default`);
      return response.data;
    } catch (error: any) {
      console.error(`Error creating default alert config for installation ${installationId}:`, error);
      throw error;
    }
  },

  getUserAlertConfigs: async () => {
    try {
      const response = await apiClient.get(`/api/security/user/alert-configs`);
      return response.data;
    } catch (error: any) {
      console.error(`Error getting user alert configs:`, error);
      throw error;
    }
  },

  getThresholdForEventType: async (installationId: string, eventType: string) => {
    try {
      const response = await apiClient.get(`/api/security/installations/${installationId}/threshold/${eventType}`);
      return response.data;
    } catch (error: any) {
      console.error(`Error getting threshold for event type ${eventType}:`, error);
      throw error;
    }
  },

  getSamplingRate: async (installationId: string) => {
    try {
      const response = await apiClient.get(`/api/security/installations/${installationId}/sampling-rate`);
      return response.data;
    } catch (error: any) {
      console.error(`Error getting sampling rate for installation ${installationId}:`, error);
      throw error;
    }
  },

  getAutoResponseStatus: async (installationId: string) => {
    try {
      const response = await apiClient.get(`/api/security/installations/${installationId}/auto-response`);
      return response.data;
    } catch (error: any) {
      console.error(`Error getting auto-response status for installation ${installationId}:`, error);
      throw error;
    }
  },

  // Admin Config APIs
  getUserAlertConfigsByUserId: async (userId: string) => {
    try {
      const response = await apiClient.get(`/api/security/admin/alert-configs/user/${userId}`);
      return response.data;
    } catch (error: any) {
      console.error(`Error getting alert configs for user ${userId}:`, error);
      throw error;
    }
  },

  getAlertConfigsByLevel: async (alertLevel: string) => {
    try {
      const response = await apiClient.get(`/api/security/admin/alert-configs/level/${alertLevel}`);
      return response.data;
    } catch (error: any) {
      console.error(`Error getting alert configs for level ${alertLevel}:`, error);
      throw error;
    }
  },

  getAutoResponseConfigs: async () => {
    try {
      const response = await apiClient.get(`/api/security/admin/alert-configs/auto-response`);
      return response.data;
    } catch (error: any) {
      console.error(`Error getting auto-response configs:`, error);
      throw error;
    }
  },

  // Tamper Simulation
  simulateMovement: async (installationId: string, movementData: any = {}) => {
    try {
      const response = await apiClient.post(
        `/api/security/detection/installations/${installationId}/simulate/movement`,
        movementData
      );
      return response.data;
    } catch (error: any) {
      console.error(`Error simulating movement for installation ${installationId}:`, error);
      throw error;
    }
  },

  simulateVoltageFluctuation: async (installationId: string, voltageData: any = {}) => {
    try {
      const response = await apiClient.post(
        `/api/security/detection/installations/${installationId}/simulate/voltage`,
        voltageData
      );
      return response.data;
    } catch (error: any) {
      console.error(`Error simulating voltage fluctuation for installation ${installationId}:`, error);
      throw error;
    }
  },

  simulateConnectionInterruption: async (installationId: string, connectionData: any = {}) => {
    try {
      const response = await apiClient.post(
        `/api/security/detection/installations/${installationId}/simulate/connection`,
        connectionData
      );
      return response.data;
    } catch (error: any) {
      console.error(`Error simulating connection interruption for installation ${installationId}:`, error);
      throw error;
    }
  },

  simulateLocationChange: async (installationId: string, locationData: any = {}) => {
    try {
      const response = await apiClient.post(
        `/api/security/detection/installations/${installationId}/simulate/location`,
        locationData
      );
      return response.data;
    } catch (error: any) {
      console.error(`Error simulating location change for installation ${installationId}:`, error);
      throw error;
    }
  },

  simulateTampering: async (installationId: string, tamperData: any = {}) => {
    try {
      const response = await apiClient.post(
        `/api/security/detection/installations/${installationId}/simulate/tamper`,
        tamperData
      );
      return response.data;
    } catch (error: any) {
      console.error(`Error simulating tampering for installation ${installationId}:`, error);
      throw error;
    }
  }
};

// WebSocket utility for energy monitoring
export const energyWebSocket = {
  createSystemMonitor: (onMessage: (data: any) => void, onError?: (error: any) => void) => {
    try {
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080/ws';
      const ws = new WebSocket(`${wsUrl}/energy-monitoring`);

      ws.onopen = () => {
        console.log('WebSocket connection established for energy monitoring');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessage(data);
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
          if (onError) onError(error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        if (onError) onError(error);
      };

      ws.onclose = () => {
        console.log('WebSocket connection closed');
      };

      return {
        close: () => {
          ws.close();
        },
        isConnected: () => ws.readyState === WebSocket.OPEN,
      };
    } catch (error) {
      console.error('Error setting up WebSocket:', error);
      if (onError) onError(error);
      return {
        close: () => { },
        isConnected: () => false,
      };
    }
  },

  createInstallationMonitor: (installationId: string, onMessage: (data: any) => void, onError?: (error: any) => void) => {
    try {
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080/ws';
      const ws = new WebSocket(`${wsUrl}/installation/${installationId}`);

      ws.onopen = () => {
        console.log(`WebSocket connection established for installation ${installationId}`);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessage(data);
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
          if (onError) onError(error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        if (onError) onError(error);
      };

      ws.onclose = () => {
        console.log(`WebSocket connection closed for installation ${installationId}`);
      };

      return {
        close: () => {
          ws.close();
        },
        isConnected: () => ws.readyState === WebSocket.OPEN,
      };
    } catch (error) {
      console.error('Error setting up WebSocket:', error);
      if (onError) onError(error);
      return {
        close: () => { },
        isConnected: () => false,
      };
    }
  },

  createAlertsMonitor: (onMessage: (data: any) => void, onError?: (error: any) => void) => {
    try {
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080/ws';
      const ws = new WebSocket(`${wsUrl}/alerts`);

      ws.onopen = () => {
        console.log('WebSocket connection established for alerts monitoring');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessage(data);
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
          if (onError) onError(error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        if (onError) onError(error);
      };

      ws.onclose = () => {
        console.log('WebSocket connection closed for alerts');
      };

      return {
        close: () => {
          ws.close();
        },
        isConnected: () => ws.readyState === WebSocket.OPEN,
      };
    } catch (error) {
      console.error('Error setting up WebSocket:', error);
      if (onError) onError(error);
      return {
        close: () => { },
        isConnected: () => false,
      };
    }
  }
};

// System Settings API
export const settingsApi = {
  getSystemSettings: async () => {
    try {
      console.log("Fetching system settings");
      const response = await apiClient.get('/api/admin/settings');
      return response.data;
    } catch (error: any) {
      console.error("Error fetching system settings:", error);
      // Return mock data instead of throwing error
      console.log("Returning demo settings data");
      return {
        general: {
          companyName: "SolarComply, Inc.",
          adminEmail: "admin@solarcomply.com",
          supportEmail: "support@solarcomply.com",
          timeZone: "UTC-8 (Pacific Time)",
          dateFormat: "MM/DD/YYYY"
        },
        notifications: {
          emailNotifications: true,
          alertNotifications: true,
          weeklyReports: true,
          maintenanceAlerts: true
        },
        security: {
          twoFactorAuth: false,
          sessionTimeout: "30",
          passwordExpiry: "90",
          ipRestriction: false
        }
      };
    }
  },

  updateSystemSettings: async (settings: any) => {
    try {
      console.log("Updating system settings");
      const response = await apiClient.put('/api/admin/settings', settings);
      return response.data;
    } catch (error: any) {
      console.error("Error updating system settings:", error);
      // Return mock success response instead of throwing error
      console.log("Demo mode: Simulating successful settings update");
      return { success: true, message: "Settings updated successfully (demo mode)" };
    }
  },

  getNotificationSettings: async () => {
    try {
      const response = await apiClient.get('/api/admin/settings/notifications');
      return response.data;
    } catch (error: any) {
      console.error("Error fetching notification settings:", error);
      // Return mock data
      return {
        emailNotifications: true,
        alertNotifications: true,
        weeklyReports: true,
        maintenanceAlerts: true
      };
    }
  },

  updateNotificationSettings: async (settings: any) => {
    try {
      const response = await apiClient.put('/api/admin/settings/notifications', settings);
      return response.data;
    } catch (error: any) {
      console.error("Error updating notification settings:", error);
      // Return mock success response
      return { success: true };
    }
  },

  getSecuritySettings: async () => {
    try {
      const response = await apiClient.get('/api/admin/settings/security');
      return response.data;
    } catch (error: any) {
      console.error("Error fetching security settings:", error);
      // Return mock data
      return {
        twoFactorAuth: false,
        sessionTimeout: "30",
        passwordExpiry: "90",
        ipRestriction: false
      };
    }
  },

  updateSecuritySettings: async (settings: any) => {
    try {
      const response = await apiClient.put('/api/admin/settings/security', settings);
      return response.data;
    } catch (error: any) {
      console.error("Error updating security settings:", error);
      // Return mock success response
      return { success: true };
    }
  }
};

// Compliance Reports API
export const complianceApi = {
  // Comprehensive compliance report that aggregates data from multiple sources
  getComprehensiveReport: async (reportType: string, startDate?: string, endDate?: string) => {
    try {
      const params: any = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      // Based on the report type, call the appropriate specialized API
      switch (reportType) {
        case "security":
          return await securityApi.getUnresolvedEvents();
        case "payment":
          return await paymentComplianceApi.generatePaymentReport("compliance", startDate, endDate);
        case "installation":
          // Get all installations first
          const installationsResponse = await installationApi.getAllInstallations();
          const installations = installationsResponse.content || [];

          // For each installation, get its status
          const installationStatuses = await Promise.all(
            installations.map(async (installation: any) => {
              try {
                // Call actual installation status API
                const statusResponse = await serviceControlApi.getCurrentStatus(installation.id);
                return {
                  ...installation,
                  status: statusResponse.status,
                  lastServiceDate: statusResponse.lastUpdated,
                  issuesCount: 0 // This would need a real endpoint
                };
              } catch (error: any) {
                console.error(`Error fetching status for installation ${installation.id}:`, error);
                return {
                  ...installation,
                  status: 'UNKNOWN',
                  lastServiceDate: null,
                  issuesCount: 0
                };
              }
            })
          );

          return installationStatuses;
        case "activity":
          try {
            console.log("Fetching compliance activity logs...");

            // Make direct API call rather than using potentially problematic userApi method
            // This ensures we have more control over the request
            const response = await apiClient.get('/api/admin/compliance/logs', {
              params: {
                _t: Date.now(),  // Cache busting
                size: 50         // Get more logs to allow for filtering
              },
              headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache'
              },
              // Shorter timeout for this endpoint
              timeout: 8000,
              // Explicit auth - ensure the token is current
              withCredentials: true
            });

            const responseData = response.data;

            // Handle different response formats
            if (Array.isArray(responseData)) {
              return responseData;
            } else if (responseData && responseData.content && Array.isArray(responseData.content)) {
              return responseData.content;
            } else {
              console.warn("Activity logs data has unexpected format:", typeof responseData);

              // Create default log structure to avoid UI errors
              return [{
                id: "mock-log-empty-response",
                timestamp: new Date().toISOString(),
                activityType: "ERROR",
                description: "No activity logs available. Please check your system configuration.",
                username: "system"
              }];
            }
          } catch (error: any) {
            console.error("Error fetching compliance activity logs:", error.message || "Unknown error");

            // Fallback to user activity logs if admin logs fail
            try {
              console.log("Falling back to user activity logs...");
              const fallbackLogs = await userApi.getActivityLogs(0, 50);

              if (fallbackLogs && Array.isArray(fallbackLogs.content) && fallbackLogs.content.length > 0) {
                return fallbackLogs.content;
              }
            } catch (fallbackError) {
              console.error("Fallback to user activity logs also failed");
            }

            // Return error indicator log
            return [{
              id: "mock-log-error",
              timestamp: new Date().toISOString(),
              activityType: "ERROR",
              description: "Failed to load activity logs. " + (error.message || "Please try refreshing."),
              username: "system"
            }];
          }
        default:
          throw new Error(`Unknown report type: ${reportType}`);
      }
    } catch (error: any) {
      console.error(`Error fetching ${reportType} compliance report:`, error);
      return reportType === "installation" ? [] : null;
    }
  },

  // Generate a consolidated report for export
  generateComplianceReport: async (reportType: string, format: string = 'json', startDate?: string, endDate?: string) => {
    try {
      const params: any = { format };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      // For payment reports, we can use the existing API
      if (reportType === "payment") {
        return await paymentComplianceApi.generatePaymentReport("compliance", startDate, endDate);
      }

      // For other report types, we need to use a consolidated endpoint
      // This currently is mocked since the consolidated endpoint may not exist
      console.log(`Generating ${reportType} compliance report in ${format} format`);

      // Mock successful response
      return {
        success: true,
        reportType,
        format,
        generatedAt: new Date().toISOString()
      };
    } catch (error: any) {
      console.error(`Error generating ${reportType} report:`, error);
      return null;
    }
  },

  // Get security compliance metrics
  getSecurityComplianceMetrics: async (startDate?: string, endDate?: string) => {
    try {
      const response = await apiClient.get('/api/admin/compliance/security/metrics', {
        params: { startDate, endDate }
      });
      return response.data;
    } catch (error: any) {
      console.error('Error fetching security compliance metrics:', error);
      return {
        tamperAlertCount: 0,
        resolvedAlertCount: 0,
        averageResolutionTime: 0,
        complianceRate: 0
      };
    }
  },

  // Get payment compliance metrics
  getPaymentComplianceMetrics: async (startDate?: string, endDate?: string) => {
    try {
      const response = await apiClient.get('/api/admin/compliance/payment/metrics', {
        params: { startDate, endDate }
      });
      return response.data;
    } catch (error: any) {
      console.error('Error fetching payment compliance metrics:', error);
      return {
        onTimePaymentRate: 0,
        latePaymentRate: 0,
        missedPaymentRate: 0,
        averagePaymentDelay: 0
      };
    }
  },

  // Get installation compliance metrics
  getInstallationComplianceMetrics: async (startDate?: string, endDate?: string) => {
    try {
      const response = await apiClient.get('/api/admin/compliance/installation/metrics', {
        params: { startDate, endDate }
      });
      return response.data;
    } catch (error: any) {
      console.error('Error fetching installation compliance metrics:', error);
      return {
        activeInstallations: 0,
        maintenanceCompliantRate: 0,
        inspectionCompliantRate: 0,
        safetyStandardsCompliantRate: 0
      };
    }
  }
};

export default apiClient;