import { apiClient, makeApiRequest } from './client';
import type { 
  LoginRequest, 
  LoginResponse, 
  RegisterRequest, 
  User,
  ApiResponse 
} from './types';

export const authApi = {
  /**
   * Authenticate user with email and password
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    return makeApiRequest(() => 
      apiClient.post<LoginResponse>('/api/auth/login', credentials)
    );
  },

  /**
   * Register a new user account
   */
  async register(userData: RegisterRequest): Promise<ApiResponse<User>> {
    return makeApiRequest(() =>
      apiClient.post<ApiResponse<User>>('/api/auth/register', userData)
    );
  },

  /**
   * Refresh authentication token
   */
  async refreshToken(refreshToken: string): Promise<LoginResponse> {
    return makeApiRequest(() =>
      apiClient.post<LoginResponse>('/api/auth/refresh', { refreshToken })
    );
  },

  /**
   * Logout and invalidate tokens
   */
  async logout(): Promise<void> {
    const refreshToken = typeof window !== 'undefined'
      ? (localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken'))
      : null;
    
    try {
      await makeApiRequest(() =>
        apiClient.post('/api/auth/logout', { refreshToken })
      );
    } finally {
      // Always clear local tokens, even if logout fails
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('refreshToken');
      }
    }
  },

  /**
   * Verify email address with token
   */
  async verifyEmail(token: string): Promise<ApiResponse<{ email: string }>> {
    return makeApiRequest(() =>
      apiClient.get<ApiResponse<{ email: string }>>(`/api/auth/verify-email/${token}`)
    );
  },

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<ApiResponse<{ message: string }>> {
    return makeApiRequest(() =>
      apiClient.post<ApiResponse<{ message: string }>>('/api/auth/forgot-password', { email })
    );
  },

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<ApiResponse<{ message: string }>> {
    return makeApiRequest(() =>
      apiClient.post<ApiResponse<{ message: string }>>('/api/auth/reset-password', {
        token,
        newPassword
      })
    );
  },

  /**
   * Change password for authenticated user
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<ApiResponse<{ message: string }>> {
    return makeApiRequest(() =>
      apiClient.post<ApiResponse<{ message: string }>>('/api/auth/change-password', {
        currentPassword,
        newPassword
      })
    );
  },

  /**
   * Validate current session
   */
  async validateSession(): Promise<ApiResponse<User>> {
    return makeApiRequest(() =>
      apiClient.get<ApiResponse<User>>('/api/auth/validate')
    );
  },

  /**
   * Get current user profile
   */
  async getCurrentUser(): Promise<User> {
    return makeApiRequest(() =>
      apiClient.get<User>('/api/auth/me')
    );
  }
};
