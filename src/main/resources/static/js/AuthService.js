import axios from 'axios';

const API_URL = '/api';

class AuthService {
  async login(email, password) {
    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        email,
        password
      });

      if (response.data.accessToken) {
        localStorage.setItem('user', JSON.stringify(response.data));

        // Check if password change is required
        if (response.data.passwordChangeRequired) {
          return {
            success: true,
            redirectRequired: true,
            redirectUrl: `/change-password?email=${encodeURIComponent(response.data.email)}`
          };
        }
      }

      return { success: true, user: response.data };
    } catch (error) {
      // Handle specific error messages from the backend
      const errorMessage = error.response?.data?.message || 'Login failed. Please check your credentials.';

      // Check for specific error messages
      if (errorMessage.includes('verify your email')) {
        return {
          success: false,
          message: errorMessage,
          requiresVerification: true
        };
      } else if (errorMessage.includes('change your temporary password')) {
        return {
          success: false,
          message: errorMessage,
          requiresPasswordChange: true,
          email: email
        };
      }

      return {
        success: false,
        message: errorMessage
      };
    }
  }

  logout() {
    localStorage.removeItem('user');
  }

  getCurrentUser() {
    return JSON.parse(localStorage.getItem('user'));
  }

  isLoggedIn() {
    const user = this.getCurrentUser();
    return !!user && !!user.accessToken;
  }

  async verifyEmail(token) {
    try {
      const response = await axios.get(`${API_URL}/auth/verify-email/${token}`);

      // Check if redirection is required for password change
      if (response.data.redirectRequired) {
        return {
          success: true,
          redirectRequired: true,
          redirectUrl: `${response.data.redirectUrl}?email=${encodeURIComponent(response.data.email)}`
        };
      }

      return { success: true, message: response.data.message };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Email verification failed.'
      };
    }
  }

  async resendVerification(email) {
    try {
      const response = await axios.post(`${API_URL}/auth/resend-verification?email=${encodeURIComponent(email)}`);
      return {
        success: true,
        message: response.data.message || 'Verification email has been sent. Please check your inbox.'
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to resend verification email.'
      };
    }
  }

  async changeInitialPassword(email, newPassword, confirmPassword) {
    try {
      const response = await axios.post(`${API_URL}/auth/change-initial-password`, {
        email,
        newPassword,
        confirmPassword
      });

      return {
        success: true,
        message: response.data.message || 'Password changed successfully.'
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Password change failed.'
      };
    }
  }

  getAuthHeader() {
    const user = this.getCurrentUser();

    if (user && user.accessToken) {
      return { Authorization: `Bearer ${user.accessToken}` };
    } else {
      return {};
    }
  }
}

export default new AuthService(); 