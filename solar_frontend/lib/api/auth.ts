import { apiClient, makeApiRequest } from './client';
import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  User,
  ApiResponse,
} from './types';

export const authApi = {
  /**
   * Authenticate user with email and password
   * Accepts either a credentials object or (email, password) for convenience.
   */
  async login(
    credentialsOrEmail: LoginRequest | string,
    password?: string
  ): Promise<LoginResponse> {
    const credentials: LoginRequest =
      typeof credentialsOrEmail === 'string'
        ? { email: credentialsOrEmail, password: password ?? '' }
        : credentialsOrEmail;

    const raw = await makeApiRequest<any>(() =>
      apiClient.post('/api/auth/login', credentials)
    );

    // Normalize backend AuthResponse -> LoginResponse used by the app/tests
    if (raw && typeof raw === 'object' && 'accessToken' in raw) {
      const user: User = {
        id: (raw.id ?? '').toString(),
        email: raw.email ?? '',
        name: raw.fullName ?? raw.email ?? '',
        role: raw.role === 'ADMIN' ? 'ADMIN' : 'CUSTOMER',
      };

      const normalized: LoginResponse = {
        token: raw.accessToken ?? '',
        refreshToken: raw.refreshToken ?? '',
        user,
        expiresIn: raw.expiresIn ?? 0,
      };
      return normalized;
    }

    // Already in expected shape (e.g., in tests)
    return raw as LoginResponse;
  },

  /**
   * Set initial password after email verification (legacy helper)
   * Falls back to reset-password flow on backends that support it.
   */
  async changeInitialPassword(email: string, newPassword: string, confirmPassword: string) {
    // Prefer a dedicated endpoint if available
    try {
      return await makeApiRequest(() =>
        apiClient.post('/api/auth/change-initial-password', { email, newPassword, confirmPassword })
      )
    } catch (e) {
      // As a fallback, attempt reset-password-like flow if a token is present in storage
      const token = typeof window !== 'undefined' ? (sessionStorage.getItem('passwordResetToken') || '') : ''
      if (token) {
        return makeApiRequest(() =>
          apiClient.post('/api/auth/reset-password', { token, newPassword })
        )
      }
      throw e
    }
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
   * Resend verification email
   */
  async resendVerification(email: string): Promise<ApiResponse<{ message: string }>> {
    return makeApiRequest(() =>
      apiClient.post<ApiResponse<{ message: string }>>('/api/auth/resend-verification', { email })
    );
  },

  /**
   * Change password for authenticated user
   * @param email - User's email address
   * @param currentPassword - Current password (sent as query parameter)
   * @param newPassword - New password to set
   * @param confirmPassword - Confirmation of new password
   */
  async changePassword(
    email: string,
    currentPassword: string,
    newPassword: string,
    confirmPassword: string
  ): Promise<ApiResponse<{ message: string }>> {
    return makeApiRequest(() =>
      apiClient.post<ApiResponse<{ message: string }>>(
        '/api/auth/change-password',
        { email, newPassword, confirmPassword },
        { params: { currentPassword } }
      )
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
