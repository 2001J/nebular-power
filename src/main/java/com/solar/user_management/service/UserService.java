package com.solar.user_management.service;

import com.solar.user_management.dto.auth.AuthResponse;
import com.solar.user_management.dto.auth.LoginRequest;
import com.solar.user_management.dto.auth.SignupRequest;
import com.solar.user_management.dto.user.UpdateProfileRequest;
import com.solar.user_management.model.User;
import java.util.List;

public interface UserService {
    // Authentication operations
    AuthResponse authenticateUser(LoginRequest loginRequest);

    // Admin operations
    User registerCustomer(SignupRequest signupRequest);
    void updateCustomer(User user);
    void deactivateCustomer(Long userId);
    void reactivateCustomer(Long userId);
    List<User> getAllCustomers();
    User getCustomerById(Long id);
    List<User> searchCustomers(String query);

    // Profile management
    User getCurrentUser();
    User updateProfile(UpdateProfileRequest request);
    User verifyEmail(String token);
    void resendVerificationEmail(User user);
    boolean isEmailVerified(String email);

    // Password management
    void initiatePasswordReset(String email);
    User completePasswordReset(String token, String newPassword, String confirmPassword);
    void changePassword(User user, String currentPassword, String newPassword);
    void resetCustomerPassword(Long userId);
    void changeInitialPassword(String email, String newPassword, String confirmPassword);
    boolean isPasswordChangeRequired(String email);

    // Security operations
    void incrementFailedLoginAttempts(String email);
    void resetFailedLoginAttempts(String email);
    boolean isAccountLocked(String email);
    void unlockAccount(String email);

    // Utility operations
    boolean existsByEmail(String email);
    User findByEmail(String email);
    void updateLastLogin(String email);
    void checkAccountStatus(User user);
} 