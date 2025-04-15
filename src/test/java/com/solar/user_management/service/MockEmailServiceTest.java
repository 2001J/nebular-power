// Testing: com.solar.user_management.service.impl.MockEmailServiceImpl from src/main/java/com/solar/user_management/service/impl/MockEmailServiceImpl.java
// Public methods being tested: sendVerificationEmail, sendPasswordResetEmail, sendAccountStatusChangeEmail, 
// sendPaymentReminderEmail, sendSystemHealthAlert, sendLoginAttemptWarning

package com.solar.user_management.service;

import com.solar.user_management.model.User;
import com.solar.user_management.service.impl.MockEmailServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
public class MockEmailServiceTest {

    @InjectMocks
    private MockEmailServiceImpl mockEmailService;

    private User testUser;

    @BeforeEach
    void setUp() {
        // Set up test data
        testUser = new User();
        testUser.setId(1L);
        testUser.setEmail("test@example.com");
        testUser.setFullName("Test User");
    }

    @Test
    void sendVerificationEmail_Success() {
        // Act - This should not throw any exceptions
        mockEmailService.sendVerificationEmail(testUser, "verification-token-123");
    }

    @Test
    void sendPasswordResetEmail_Success() {
        // Act - This should not throw any exceptions
        mockEmailService.sendPasswordResetEmail(testUser, "reset-token-123");
    }

    @Test
    void sendAccountStatusChangeEmail_Success() {
        // Act - This should not throw any exceptions
        mockEmailService.sendAccountStatusChangeEmail(testUser, User.AccountStatus.ACTIVE);
    }

    @Test
    void sendPaymentReminderEmail_Success() {
        // Act - This should not throw any exceptions
        mockEmailService.sendPaymentReminderEmail(testUser);
    }

    @Test
    void sendSystemHealthAlert_Success() {
        // Act - This should not throw any exceptions
        mockEmailService.sendSystemHealthAlert(testUser, "Critical system alert: Low battery");
    }

    @Test
    void sendLoginAttemptWarning_Success() {
        // Act - This should not throw any exceptions
        mockEmailService.sendLoginAttemptWarning(testUser, 3);
    }
} 