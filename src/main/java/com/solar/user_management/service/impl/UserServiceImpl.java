package com.solar.user_management.service.impl;

import com.solar.user_management.dto.auth.AuthResponse;
import com.solar.user_management.dto.auth.LoginRequest;
import com.solar.user_management.dto.auth.SignupRequest;
import com.solar.user_management.dto.user.UpdateProfileRequest;
import com.solar.user_management.model.User;
import com.solar.user_management.repository.UserRepository;
import com.solar.user_management.security.JwtTokenProvider;
import com.solar.user_management.service.EmailService;
import com.solar.user_management.service.UserService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class UserServiceImpl implements UserService {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;
    private final EmailService emailService;

    @Value("${app.password-reset.token.expiration}")
    private int passwordResetTokenExpirationMinutes;

    @Override
    public AuthResponse authenticateUser(LoginRequest loginRequest) {
        try {
            System.out.println("Authentication attempt for: " + loginRequest.getEmail());

            // Find user by email
            User user = userRepository.findByEmail(loginRequest.getEmail())
                    .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + loginRequest.getEmail()));

            System.out.println("User found, current lastLogin: " + user.getLastLogin());

            // Check account status before authentication
            checkAccountStatus(user);

            // Attempt authentication
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            loginRequest.getEmail(),
                            loginRequest.getPassword()
                    )
            );

            System.out.println("Authentication successful for: " + loginRequest.getEmail());

            // If authentication is successful, reset failed attempts and update last login
            resetFailedLoginAttempts(user.getEmail());
            System.out.println("Calling updateLastLogin for: " + loginRequest.getEmail());
            updateLastLogin(user.getEmail());

            // Refresh user data after updates
            System.out.println("Refreshing user data for: " + loginRequest.getEmail());
            user = userRepository.findByEmail(loginRequest.getEmail())
                    .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + loginRequest.getEmail()));
            System.out.println("Updated user data, lastLogin now: " + user.getLastLogin());

            // Generate JWT token
            String jwt = tokenProvider.generateToken(authentication);

            System.out.println("Token generated, returning auth response with lastLogin: " + user.getLastLogin());
            // Create and return auth response
            return AuthResponse.fromUserAndToken(jwt, user);
        } catch (BadCredentialsException e) {
            System.out.println("Bad credentials for: " + loginRequest.getEmail());
            // Increment failed login attempts on bad credentials
            incrementFailedLoginAttempts(loginRequest.getEmail());
            throw e;
        } catch (Exception e) {
            System.out.println("Authentication error for: " + loginRequest.getEmail() + " - " + e.getMessage());
            throw e;
        }
    }

    @Override
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public User registerCustomer(SignupRequest signupRequest) {
        if (userRepository.existsByEmail(signupRequest.getEmail())) {
            throw new RuntimeException("Email is already registered");
        }

        User user = new User();
        user.setFullName(signupRequest.getFullName());
        user.setEmail(signupRequest.getEmail());
        user.setPassword(passwordEncoder.encode(signupRequest.getPassword()));
        user.setPhoneNumber(signupRequest.getPhoneNumber());
        user.setRole(User.UserRole.CUSTOMER);
        user.setEnabled(true);
        user.setEmailVerified(false);
        user.setPasswordChangeRequired(true);

        String verificationToken = generateToken();
        user.setVerificationToken(verificationToken);
        user.setVerificationTokenExpiry(LocalDateTime.now().plusHours(24));

        user = userRepository.save(user);
        emailService.sendVerificationEmail(user, verificationToken);

        return user;
    }

    @Override
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public void updateCustomer(User user) {
        User existingUser = userRepository.findById(user.getId())
                .orElseThrow(() -> new EntityNotFoundException("Customer not found"));

        if (user.getRole() != User.UserRole.CUSTOMER) {
            throw new IllegalArgumentException("Can only update customer accounts");
        }

        if (user.getPassword() == null || user.getPassword().trim().isEmpty()) {
            user.setPassword(existingUser.getPassword());
        } else {
            user.setPassword(passwordEncoder.encode(user.getPassword()));
        }

        user.setCreatedAt(existingUser.getCreatedAt());
        userRepository.save(user);
    }

    @Override
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public void deactivateCustomer(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("Customer not found"));

        if (user.getRole() != User.UserRole.CUSTOMER) {
            throw new IllegalArgumentException("Can only deactivate customer accounts");
        }

        user.setEnabled(false);
        userRepository.save(user);
        emailService.sendAccountStatusChangeEmail(user, User.AccountStatus.SUSPENDED);
    }

    @Override
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public void reactivateCustomer(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("Customer not found"));

        if (user.getRole() != User.UserRole.CUSTOMER) {
            throw new IllegalArgumentException("Can only reactivate customer accounts");
        }

        user.setEnabled(true);
        user.setAccountLocked(false);
        user.setFailedLoginAttempts(0);
        userRepository.save(user);
        emailService.sendAccountStatusChangeEmail(user, User.AccountStatus.ACTIVE);
    }

    @Override
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional(readOnly = true)
    public List<User> getAllCustomers() {
        return userRepository.findByRole(User.UserRole.CUSTOMER);
    }

    @Override
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional(readOnly = true)
    public User getCustomerById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Customer not found"));

        if (user.getRole() != User.UserRole.CUSTOMER) {
            throw new IllegalArgumentException("User is not a customer");
        }

        return user;
    }

    @Override
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional(readOnly = true)
    public List<User> searchCustomers(String query) {
        // Implementation depends on your search requirements
        return userRepository.findByRole(User.UserRole.CUSTOMER);
    }

    @Override
    @Transactional(readOnly = true)
    public User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String currentUserEmail = authentication.getName();
        return userRepository.findByEmail(currentUserEmail)
                .orElseThrow(() -> new EntityNotFoundException("Current user not found"));
    }

    @Override
    @Transactional
    public User updateProfile(UpdateProfileRequest request) {
        User currentUser = getCurrentUser();

        if (!currentUser.getEmail().equals(request.getEmail())) {
            if (request.getCurrentPassword() == null) {
                throw new IllegalArgumentException("Current password is required to change email");
            }
            if (!passwordEncoder.matches(request.getCurrentPassword(), currentUser.getPassword())) {
                throw new BadCredentialsException("Current password is incorrect");
            }
            if (userRepository.existsByEmail(request.getEmail())) {
                throw new RuntimeException("Email is already in use");
            }
            currentUser.setEmail(request.getEmail());
            currentUser.setEmailVerified(false);

            String verificationToken = generateToken();
            currentUser.setVerificationToken(verificationToken);
            currentUser.setVerificationTokenExpiry(LocalDateTime.now().plusHours(24));
            emailService.sendVerificationEmail(currentUser, verificationToken);
        }

        currentUser.setFullName(request.getFullName());
        currentUser.setPhoneNumber(request.getPhoneNumber());

        if (request.getNewPassword() != null && !request.getNewPassword().isEmpty()) {
            if (request.getCurrentPassword() == null) {
                throw new IllegalArgumentException("Current password is required to change password");
            }
            if (!passwordEncoder.matches(request.getCurrentPassword(), currentUser.getPassword())) {
                throw new BadCredentialsException("Current password is incorrect");
            }
            currentUser.setPassword(passwordEncoder.encode(request.getNewPassword()));
        }

        return userRepository.save(currentUser);
    }

    @Override
    @Transactional
    public User verifyEmail(String token) {
        User user = userRepository.findByVerificationToken(token)
                .orElseThrow(() -> new EntityNotFoundException("Invalid verification token"));

        if (user.getVerificationTokenExpiry().isBefore(LocalDateTime.now())) {
            // Generate a new token and update the expiry
            String newToken = generateToken();
            user.setVerificationToken(newToken);
            user.setVerificationTokenExpiry(LocalDateTime.now().plusHours(24));
            user = userRepository.save(user);

            // Send a new verification email
            emailService.sendVerificationEmail(user, newToken);

            throw new RuntimeException("Verification token has expired. A new verification email has been sent.");
        }

        user.setEmailVerified(true);
        user.setVerificationToken(null);
        user.setVerificationTokenExpiry(null);

        return userRepository.save(user);
    }

    @Override
    @Transactional
    public void resendVerificationEmail(User user) {
        if (user.isEmailVerified()) {
            throw new IllegalStateException("Email is already verified");
        }

        String verificationToken = generateToken();
        user.setVerificationToken(verificationToken);
        user.setVerificationTokenExpiry(LocalDateTime.now().plusHours(24));
        userRepository.save(user);

        emailService.sendVerificationEmail(user, verificationToken);
    }

    @Override
    @Transactional
    public void initiatePasswordReset(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new EntityNotFoundException("User not found"));

        String resetToken = generateToken();
        user.setResetToken(resetToken);
        user.setResetTokenExpiry(LocalDateTime.now().plusMinutes(passwordResetTokenExpirationMinutes));
        userRepository.save(user);

        emailService.sendPasswordResetEmail(user, resetToken);
    }

    @Override
    @Transactional
    public User completePasswordReset(String token, String newPassword, String confirmPassword) {
        if (!newPassword.equals(confirmPassword)) {
            throw new IllegalArgumentException("Passwords do not match");
        }

        User user = userRepository.findByResetToken(token)
                .orElseThrow(() -> new EntityNotFoundException("Invalid reset token"));

        if (user.getResetTokenExpiry().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Reset token has expired");
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        user.setResetToken(null);
        user.setResetTokenExpiry(null);
        user.setAccountLocked(false);
        user.setFailedLoginAttempts(0);

        return userRepository.save(user);
    }

    @Override
    @Transactional
    public void changePassword(User user, String currentPassword, String newPassword) {
        if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
            throw new BadCredentialsException("Current password is incorrect");
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }

    @Override
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public void resetCustomerPassword(Long userId) {
        User user = getCustomerById(userId);
        String tempPassword = generateTemporaryPassword();
        user.setPassword(passwordEncoder.encode(tempPassword));
        user.setAccountLocked(false);
        user.setFailedLoginAttempts(0);
        user.setPasswordChangeRequired(true);
        userRepository.save(user);

        // Send email with temporary password
        emailService.sendPasswordResetEmail(user, tempPassword);
    }

    @Override
    @Transactional
    public void incrementFailedLoginAttempts(String email) {
        userRepository.findByEmail(email).ifPresent(user -> {
            user.setFailedLoginAttempts(user.getFailedLoginAttempts() + 1);
            if (user.getFailedLoginAttempts() >= 5) {
                user.setAccountLocked(true);
                user.setLockTime(LocalDateTime.now());
                emailService.sendLoginAttemptWarning(user, user.getFailedLoginAttempts());
            }
            userRepository.save(user);
        });
    }

    @Override
    @Transactional
    public void resetFailedLoginAttempts(String email) {
        userRepository.findByEmail(email).ifPresent(user -> {
            user.setFailedLoginAttempts(0);
            user.setAccountLocked(false);
            user.setLockTime(null);
            userRepository.save(user);
        });
    }

    @Override
    @Transactional(readOnly = true)
    public boolean isAccountLocked(String email) {
        return userRepository.findByEmail(email)
                .map(User::isAccountLocked)
                .orElse(false);
    }

    @Override
    @Transactional
    public void unlockAccount(String email) {
        userRepository.findByEmail(email).ifPresent(user -> {
            user.setAccountLocked(false);
            user.setFailedLoginAttempts(0);
            user.setLockTime(null);
            userRepository.save(user);
        });
    }

    @Override
    @Transactional(readOnly = true)
    public boolean existsByEmail(String email) {
        return userRepository.existsByEmail(email);
    }

    @Override
    @Transactional(readOnly = true)
    public User findByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new EntityNotFoundException("User not found with email: " + email));
    }

    @Override
    @Transactional
    public void updateLastLogin(String email) {
        try {
            User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + email));

            // Log original value
            System.out.println("Updating last login for user: " + email + ", current value: " + user.getLastLogin());

            // Set the new value with the current time
            LocalDateTime now = LocalDateTime.now();
            System.out.println("Setting lastLogin to: " + now);
            user.setLastLogin(now);

            // Explicitly flush the transaction to ensure it's persisted
            User savedUser = userRepository.saveAndFlush(user);
            System.out.println("Updated and flushed last login for user: " + email + ", new value: " + savedUser.getLastLogin());

            // Double-check the update by fetching again
            User verifiedUser = userRepository.findById(user.getId()).orElse(null);
            if (verifiedUser != null) {
                System.out.println("Verified lastLogin value after update: " + verifiedUser.getLastLogin());
            } else {
                System.out.println("Failed to verify lastLogin update - user not found");
            }
        } catch (Exception e) {
            System.err.println("Error updating last login for " + email + ": " + e.getMessage());
            e.printStackTrace();
        }
    }

    @Override
    @Transactional(readOnly = true)
    public void checkAccountStatus(User user) {
        if (!user.isEnabled()) {
            throw new RuntimeException("Account is suspended");
        }
        if (!user.isEmailVerified()) {
            throw new RuntimeException("Email is not verified");
        }
        if (user.isAccountLocked()) {
            throw new RuntimeException("Account is locked");
        }
        if (user.isPasswordChangeRequired()) {
            throw new RuntimeException("Please change your temporary password before logging in");
        }
    }

    @Override
    @Transactional
    public void changeInitialPassword(String email, String newPassword, String confirmPassword) {
        if (!newPassword.equals(confirmPassword)) {
            throw new IllegalArgumentException("Passwords do not match");
        }

        if (newPassword.length() < 6) {
            throw new IllegalArgumentException("Password must be at least 6 characters long");
        }

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new EntityNotFoundException("User not found"));

        user.setPassword(passwordEncoder.encode(newPassword));
        user.setPasswordChangeRequired(false);
        userRepository.save(user);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean isPasswordChangeRequired(String email) {
        return userRepository.findByEmail(email)
                .map(User::isPasswordChangeRequired)
                .orElse(false);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean isEmailVerified(String email) {
        return userRepository.findByEmail(email)
                .map(User::isEmailVerified)
                .orElse(false);
    }

    private String generateToken() {
        return UUID.randomUUID().toString();
    }

    private String generateTemporaryPassword() {
        return UUID.randomUUID().toString().substring(0, 8);
    }
} 
