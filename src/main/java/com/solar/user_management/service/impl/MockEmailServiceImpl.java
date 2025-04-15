package com.solar.user_management.service.impl;

import com.solar.user_management.model.User;
import com.solar.user_management.service.EmailService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

/**
 * Mock implementation of EmailService that logs emails instead of sending them.
 * This is useful for development and testing environments.
 */
@Service
@Slf4j
@Profile("dev")
public class MockEmailServiceImpl implements EmailService {

    @Override
    public void sendVerificationEmail(User user, String token) {
        log.info("MOCK EMAIL: Verification email sent to {} with token {}", user.getEmail(), token);
    }

    @Override
    public void sendPasswordResetEmail(User user, String token) {
        log.info("MOCK EMAIL: Password reset email sent to {} with token {}", user.getEmail(), token);
    }

    @Override
    public void sendAccountStatusChangeEmail(User user, User.AccountStatus newStatus) {
        log.info("MOCK EMAIL: Account status change email sent to {}. New status: {}", user.getEmail(), newStatus);
    }

    @Override
    public void sendPaymentReminderEmail(User user) {
        log.info("MOCK EMAIL: Payment reminder email sent to {}", user.getEmail());
    }

    @Override
    public void sendSystemHealthAlert(User user, String alertMessage) {
        log.info("MOCK EMAIL: System health alert sent to {}. Message: {}", user.getEmail(), alertMessage);
    }

    @Override
    public void sendLoginAttemptWarning(User user, int attemptCount) {
        log.info("MOCK EMAIL: Login attempt warning sent to {}. Attempt count: {}", user.getEmail(), attemptCount);
    }
} 