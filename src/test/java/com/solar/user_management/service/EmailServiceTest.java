// Testing: com.solar.user_management.service.impl.EmailServiceImpl from src/main/java/com/solar/user_management/service/impl/EmailServiceImpl.java
// Public methods being tested: sendVerificationEmail, sendPasswordResetEmail, sendAccountStatusChangeEmail, 
// sendPaymentReminderEmail, sendSystemHealthAlert, sendLoginAttemptWarning

package com.solar.user_management.service;

import com.solar.user_management.model.User;
import com.solar.user_management.service.impl.EmailServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.util.ReflectionTestUtils;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
public class EmailServiceTest {

    @Mock
    private JavaMailSender mailSender;

    @InjectMocks
    private EmailServiceImpl emailService;

    private User testUser;

    @BeforeEach
    void setUp() {
        // Set up test data
        testUser = new User();
        testUser.setId(1L);
        testUser.setEmail("test@example.com");
        testUser.setFullName("Test User");

        // Set private field values using ReflectionTestUtils
        ReflectionTestUtils.setField(emailService, "frontendUrl", "http://localhost:3000");
        ReflectionTestUtils.setField(emailService, "fromEmail", "noreply@solar.com");
    }

    @Test
    void sendVerificationEmail_Success() {
        // Act
        emailService.sendVerificationEmail(testUser, "verification-token-123");

        // Assert
        verify(mailSender).send(any(SimpleMailMessage.class));
    }

    @Test
    void sendPasswordResetEmail_Success() {
        // Act
        emailService.sendPasswordResetEmail(testUser, "reset-token-123");

        // Assert
        verify(mailSender).send(any(SimpleMailMessage.class));
    }

    @Test
    void sendAccountStatusChangeEmail_Active() {
        // Act
        emailService.sendAccountStatusChangeEmail(testUser, User.AccountStatus.ACTIVE);

        // Assert
        verify(mailSender).send(any(SimpleMailMessage.class));
    }

    @Test
    void sendAccountStatusChangeEmail_Suspended() {
        // Act
        emailService.sendAccountStatusChangeEmail(testUser, User.AccountStatus.SUSPENDED);

        // Assert
        verify(mailSender).send(any(SimpleMailMessage.class));
    }

    @Test
    void sendAccountStatusChangeEmail_Locked() {
        // Act
        emailService.sendAccountStatusChangeEmail(testUser, User.AccountStatus.LOCKED);

        // Assert
        verify(mailSender).send(any(SimpleMailMessage.class));
    }

    @Test
    void sendAccountStatusChangeEmail_PendingVerification() {
        // Act
        emailService.sendAccountStatusChangeEmail(testUser, User.AccountStatus.PENDING_VERIFICATION);

        // Assert
        verify(mailSender).send(any(SimpleMailMessage.class));
    }

    @Test
    void sendPaymentReminderEmail_Success() {
        // Act
        emailService.sendPaymentReminderEmail(testUser);

        // Assert
        verify(mailSender).send(any(SimpleMailMessage.class));
    }

    @Test
    void sendSystemHealthAlert_Success() {
        // Act
        emailService.sendSystemHealthAlert(testUser, "Critical system alert: Low battery");

        // Assert
        verify(mailSender).send(any(SimpleMailMessage.class));
    }

    @Test
    void sendLoginAttemptWarning_Success() {
        // Act
        emailService.sendLoginAttemptWarning(testUser, 3);

        // Assert
        verify(mailSender).send(any(SimpleMailMessage.class));
    }
} 