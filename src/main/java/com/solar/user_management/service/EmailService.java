package com.solar.user_management.service;

import com.solar.user_management.model.User;

public interface EmailService {
    void sendVerificationEmail(User user, String token);
    void sendPasswordResetEmail(User user, String token);
    void sendAccountStatusChangeEmail(User user, User.AccountStatus newStatus);
    void sendPaymentReminderEmail(User user);
    void sendSystemHealthAlert(User user, String alertMessage);
    void sendLoginAttemptWarning(User user, int attemptCount);
} 