import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AuthService from './AuthService';

const EmailVerification = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying');
  const [message, setMessage] = useState('Verifying your email address...');

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        const result = await AuthService.verifyEmail(token);

        if (result.success) {
          setStatus('success');
          setMessage(result.message || 'Email verified successfully!');

          // If redirection is required (for password change)
          if (result.redirectRequired) {
            setMessage('Email verified successfully! You will be redirected to set your password...');
            setTimeout(() => {
              navigate(result.redirectUrl);
            }, 3000);
          } else {
            // Redirect to login page after a delay
            setMessage('Email verified successfully! You will be redirected to the login page...');
            setTimeout(() => {
              navigate('/login');
            }, 3000);
          }
        } else {
          setStatus('error');
          setMessage(result.message || 'Email verification failed.');

          // Check if the message indicates a new verification email was sent
          if (result.message && result.message.includes('A new verification email has been sent')) {
            setMessage('Your verification link has expired. A new verification email has been sent to your inbox.');
          }
        }
      } catch (error) {
        setStatus('error');
        setMessage('An error occurred during verification.');
      }
    };

    verifyEmail();
  }, [token, navigate]);

  return (
    <div className="email-verification-container">
      <div className="email-verification-card">
        <h2>Email Verification</h2>

        {status === 'verifying' && (
          <div className="verification-status verifying">
            <div className="spinner"></div>
            <p>{message}</p>
          </div>
        )}

        {status === 'success' && (
          <div className="verification-status success">
            <div className="success-icon">✓</div>
            <p>{message}</p>
          </div>
        )}

        {status === 'error' && (
          <div className="verification-status error">
            <div className="error-icon">✗</div>
            <p>{message}</p>
            <button
              className="btn btn-primary"
              onClick={() => navigate('/login')}
            >
              Go to Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmailVerification; 