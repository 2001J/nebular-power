package com.solar.user_management.service.impl;

import com.solar.user_management.model.User;
import com.solar.user_management.service.EmailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
@Profile("!dev")
public class EmailServiceImpl implements EmailService {

    private final JavaMailSender mailSender;

    @Value("${app.frontend-url}")
    private String frontendUrl;

    @Value("${spring.mail.username}")
    private String fromEmail;

    @Override
    public void sendVerificationEmail(User user, String token) {
        String subject = "Verify your Solar Energy Monitoring System account";
        String verificationUrl = frontendUrl + "/verify?token=" + token;
        String body = String.format("""
            Dear %s,
            
            Welcome to the Solar Energy Monitoring System! Please verify your email address by clicking the link below:
            
            %s
            
            This link will expire in 24 hours.
            
            After verification, you will need to change your temporary password before accessing your account.
            
            If you did not create this account, please ignore this email.
            
            Best regards,
            Solar Energy Monitoring Team
            """, user.getFullName(), verificationUrl);

        sendEmail(user.getEmail(), subject, body);
        log.info("Verification email sent to {}", user.getEmail());
    }

    @Override
    public void sendPasswordResetEmail(User user, String token) {
        String subject = "Reset your Solar Energy Monitoring System password";
        String resetUrl = frontendUrl + "/reset-password?token=" + token;
        String body = String.format("""
            Dear %s,
            
            We received a request to reset your password. Your temporary password is:
            
            %s
            
            Please log in with this temporary password and you will be prompted to change it immediately.
            
            If you didn't request this, please contact our support team immediately.
            
            Best regards,
            Solar Energy Monitoring Team
            """, user.getFullName(), token);

        sendEmail(user.getEmail(), subject, body);
        log.info("Password reset email sent to {}", user.getEmail());
    }

    @Override
    public void sendAccountStatusChangeEmail(User user, User.AccountStatus newStatus) {
        String subject = "Your Solar Energy Monitoring System Account Status Update";
        String body = String.format("""
            Dear %s,
            
            Your account status has been updated to: %s
            
            %s
            
            If you have any questions, please contact our support team.
            
            Best regards,
            Solar Energy Monitoring Team
            """,
                user.getFullName(),
                newStatus,
                getStatusMessage(newStatus));

        sendEmail(user.getEmail(), subject, body);
        log.info("Account status change email sent to {}. New status: {}", user.getEmail(), newStatus);
    }

    @Override
    public void sendPaymentReminderEmail(User user) {
        String subject = "Payment Reminder - Solar Energy Monitoring System";
        String body = String.format("""
            Dear %s,
            
            This is a reminder that your payment is due soon. Please log in to your account to view the details and make the payment.
            
            %s/login
            
            Best regards,
            Solar Energy Monitoring Team
            """, user.getFullName(), frontendUrl);

        sendEmail(user.getEmail(), subject, body);
        log.info("Payment reminder email sent to {}", user.getEmail());
    }

    @Override
    public void sendSystemHealthAlert(User user, String alertMessage) {
        String subject = "System Health Alert - Solar Energy Monitoring System";
        String body = String.format("""
            Dear %s,
            
            We detected an issue with your solar installation:
            
            %s
            
            Please log in to your account to view more details.
            
            Best regards,
            Solar Energy Monitoring Team
            """, user.getFullName(), alertMessage);

        sendEmail(user.getEmail(), subject, body);
        log.info("System health alert sent to {}", user.getEmail());
    }

    @Override
    public void sendLoginAttemptWarning(User user, int attemptCount) {
        String subject = "Security Alert - Failed Login Attempts";
        String body = String.format("""
            Dear %s,
            
            We detected %d failed login attempts on your account. If this wasn't you, please reset your password immediately.
            
            %s/reset-password
            
            Best regards,
            Solar Energy Monitoring Team
            """, user.getFullName(), attemptCount, frontendUrl);

        sendEmail(user.getEmail(), subject, body);
        log.info("Login attempt warning sent to {}", user.getEmail());
    }

    private void sendEmail(String to, String subject, String body) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(to);
            message.setSubject(subject);
            message.setText(body);
            mailSender.send(message);
        } catch (Exception e) {
            log.error("Failed to send email to {}: {}", to, e.getMessage());
        }
    }

    private String getStatusMessage(User.AccountStatus status) {
        return switch (status) {
            case ACTIVE -> "Your account is now active and you can access all features.";
            case SUSPENDED -> "Your account has been suspended. Please contact support for more information.";
            case LOCKED -> "Your account has been locked due to security concerns. Please reset your password.";
            case PENDING_VERIFICATION -> "Please verify your email address to activate your account.";
        };
    }
} 