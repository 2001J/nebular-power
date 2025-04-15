import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthService from './AuthService';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [verificationNeeded, setVerificationNeeded] = useState(false);
  const [passwordChangeNeeded, setPasswordChangeNeeded] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setVerificationNeeded(false);
    setPasswordChangeNeeded(false);

    try {
      const result = await AuthService.login(formData.email, formData.password);

      if (result.success) {
        if (result.redirectRequired) {
          // Redirect to password change page if required
          navigate(result.redirectUrl);
        } else {
          // Redirect to dashboard or home page
          navigate('/dashboard');
        }
      } else {
        setError(result.message);

        // Handle specific error cases
        if (result.requiresVerification) {
          setVerificationNeeded(true);
        } else if (result.requiresPasswordChange) {
          setPasswordChangeNeeded(true);
          // Redirect to password change page
          navigate(`/change-password?email=${encodeURIComponent(result.email)}`);
        }
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setLoading(true);
    try {
      const result = await AuthService.resendVerification(formData.email);

      if (result.success) {
        setError(result.message);
        setVerificationNeeded(false);
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('Failed to resend verification email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-form">
        <h2>Login</h2>

        {error && <div className="alert alert-danger">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="form-control"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="form-control"
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        {verificationNeeded && (
          <div className="mt-3 text-center">
            <p>Your email is not verified.</p>
            <button
              onClick={handleResendVerification}
              className="btn btn-secondary"
              disabled={loading}
            >
              Resend Verification Email
            </button>
          </div>
        )}

        <div className="mt-3 text-center">
          <a href="/forgot-password">Forgot Password?</a>
        </div>
      </div>
    </div>
  );
};

export default Login; 