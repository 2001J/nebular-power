import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './Login';
import EmailVerification from './EmailVerification';
import PasswordChange from './PasswordChange';
import AuthService from './AuthService';

// Protected route component
const ProtectedRoute = ({ children }) => {
  const isLoggedIn = AuthService.isLoggedIn();
  const currentUser = AuthService.getCurrentUser();

  // If not logged in, redirect to login
  if (!isLoggedIn) {
    return <Navigate to="/login" />;
  }

  // If password change required, redirect to password change page
  if (currentUser && currentUser.passwordChangeRequired) {
    return <Navigate to={`/change-password?email=${encodeURIComponent(currentUser.email)}`} />;
  }

  return children;
};

const App = () => {
  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/verify/:token" element={<EmailVerification />} />
        <Route path="/change-password" element={<PasswordChange />} />

        {/* Protected routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <div>Dashboard (Protected)</div>
            </ProtectedRoute>
          }
        />

        {/* Default redirect */}
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
};

export default App; 