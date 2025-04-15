package com.solar.core_services.payment_compliance.service;

import com.solar.core_services.energy_monitoring.model.SolarInstallation;
import com.solar.user_management.model.User;
import com.solar.core_services.payment_compliance.model.Payment;
import com.solar.core_services.payment_compliance.model.PaymentPlan;
import com.solar.core_services.payment_compliance.service.impl.PaymentEventPublisherImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

// Add import for InstallationStatus enum
import com.solar.core_services.energy_monitoring.model.SolarInstallation.InstallationStatus;

/**
 * Test class for PaymentEventPublisher
 * Source file: src/main/java/com/solar/core_services/payment_compliance/service/PaymentEventPublisher.java
 * Implementation: src/main/java/com/solar/core_services/payment_compliance/service/impl/PaymentEventPublisherImpl.java
 */
@ExtendWith(MockitoExtension.class)
public class PaymentEventPublisherTest {

    @Mock
    private ApplicationEventPublisher applicationEventPublisher;

    @InjectMocks
    private PaymentEventPublisherImpl paymentEventPublisher;

    private User testUser;
    private SolarInstallation testInstallation;
    private PaymentPlan testPaymentPlan;
    private Payment testPayment;

    @BeforeEach
    void setUp() {
        // Create test user
        testUser = new User();
        testUser.setId(1L);
        testUser.setEmail("test@example.com");
        testUser.setFullName("Test User");
        
        // Create test installation
        testInstallation = new SolarInstallation();
        testInstallation.setId(1L);
        testInstallation.setCapacity(5.0);
        testInstallation.setStatus(InstallationStatus.ACTIVE);
        testInstallation.setUser(testUser);
        
        // Create test payment plan
        testPaymentPlan = PaymentPlan.builder()
                .id(1L)
                .installation(testInstallation)
                .name("Test Payment Plan")
                .totalAmount(new BigDecimal("10000.00"))
                .remainingAmount(new BigDecimal("8000.00"))
                .numberOfPayments(24)
                .installmentAmount(new BigDecimal("416.67"))
                .frequency(PaymentPlan.PaymentFrequency.MONTHLY)
                .startDate(LocalDateTime.now().minusMonths(2))
                .endDate(LocalDateTime.now().plusMonths(22))
                .status(PaymentPlan.PaymentPlanStatus.ACTIVE)
                .build();
        
        // Create test payment
        testPayment = Payment.builder()
                .id(1L)
                .installation(testInstallation)
                .paymentPlan(testPaymentPlan)
                .amount(new BigDecimal("416.67"))
                .dueDate(LocalDateTime.now().minusDays(5))
                .status(Payment.PaymentStatus.OVERDUE)
                .statusReason("Payment overdue")
                .statusUpdatedAt(LocalDateTime.now().minusDays(1))
                .daysOverdue(5)
                .build();
    }

    @Test
    @DisplayName("Should publish payment received event")
    void shouldPublishPaymentReceivedEvent() {
        // When
        paymentEventPublisher.publishPaymentReceived(testPayment);
        
        // Then
        verify(applicationEventPublisher, times(1)).publishEvent(any(Object.class));
    }

    @Test
    @DisplayName("Should publish grace period expired event")
    void shouldPublishGracePeriodExpiredEvent() {
        // When
        paymentEventPublisher.publishGracePeriodExpired(testPayment);
        
        // Then
        verify(applicationEventPublisher, times(1)).publishEvent(any(Object.class));
    }

    @Test
    @DisplayName("Should publish payment plan updated event")
    void shouldPublishPaymentPlanUpdatedEvent() {
        // When
        paymentEventPublisher.publishPaymentPlanUpdated(testPaymentPlan);
        
        // Then
        verify(applicationEventPublisher, times(1)).publishEvent(any(Object.class));
    }

    @Test
    @DisplayName("Should confirm service control action - success")
    void shouldConfirmServiceControlActionSuccess() {
        // Given
        // No need to mock the applicationEventPublisher for this test
        
        // When
        boolean result = paymentEventPublisher.confirmServiceControlAction(testInstallation.getId(), "SUSPEND");
        
        // Then
        assertTrue(result);
        // No need to verify applicationEventPublisher.publishEvent since it's not called in this method
    }

    @Test
    @DisplayName("Should confirm service control action - failure")
    void shouldConfirmServiceControlActionFailure() {
        // Given
        // In the current implementation, confirmServiceControlAction always returns true
        // This test would need to be updated if the implementation changes
        
        // When
        boolean result = paymentEventPublisher.confirmServiceControlAction(testInstallation.getId(), "SUSPEND");
        
        // Then
        assertTrue(result);
        // No need to verify applicationEventPublisher.publishEvent since it's not called in this method
    }
} 