package com.solar.core_services.payment_compliance.service;

import com.solar.core_services.energy_monitoring.model.SolarInstallation;
import com.solar.core_services.payment_compliance.model.Payment;
import com.solar.core_services.payment_compliance.model.PaymentPlan;
import com.solar.core_services.payment_compliance.service.impl.PaymentEventPublisherImpl;
import com.solar.core_services.payment_compliance.service.impl.PaymentEventPublisherImpl.GracePeriodExpiredEvent;
import com.solar.core_services.payment_compliance.service.impl.PaymentEventPublisherImpl.PaymentPlanUpdatedEvent;
import com.solar.core_services.payment_compliance.service.impl.PaymentEventPublisherImpl.PaymentReceivedEvent;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Comprehensive test for PaymentEventPublisherImpl that covers:
 * 1. Successful event publishing
 * 2. Error handling during publishing
 * 3. Validation of event object properties
 * 4. Service control action confirmation
 */
@ExtendWith(MockitoExtension.class)
class PaymentEventPublisherImplTest {

    @Mock
    private ApplicationEventPublisher applicationEventPublisher;

    @InjectMocks
    private PaymentEventPublisherImpl paymentEventPublisher;

    // Test data
    private Payment payment;
    private PaymentPlan paymentPlan;
    private SolarInstallation installation;

    @BeforeEach
    void setUp() {
        // Create test installation
        installation = new SolarInstallation();
        installation.setId(1L);
        installation.setName("Test Installation");

        // Create test payment
        payment = new Payment();
        payment.setId(100L);
        payment.setInstallation(installation);
        payment.setAmount(new BigDecimal("100.00"));

        // Create test payment plan
        paymentPlan = new PaymentPlan();
        paymentPlan.setId(200L);
        paymentPlan.setInstallation(installation);
    }

    @Test
    @DisplayName("Should successfully publish payment received event")
    void publishPaymentReceived_Success() {
        // Given - setUp provides the necessary objects

        // When
        paymentEventPublisher.publishPaymentReceived(payment);

        // Then
        // Verify that the event was published with correct data
        ArgumentCaptor<PaymentReceivedEvent> eventCaptor = ArgumentCaptor.forClass(PaymentReceivedEvent.class);
        verify(applicationEventPublisher).publishEvent(eventCaptor.capture());
        
        PaymentReceivedEvent capturedEvent = eventCaptor.getValue();
        assertEquals(installation.getId(), capturedEvent.getInstallationId());
        assertEquals(payment.getId(), capturedEvent.getPaymentId());
        assertEquals(paymentEventPublisher, capturedEvent.getSource());
    }

    @Test
    @DisplayName("Should handle exceptions when publishing payment received event")
    void publishPaymentReceived_HandlesException() {
        // Given
        doThrow(new RuntimeException("Test exception")).when(applicationEventPublisher).publishEvent(any(PaymentReceivedEvent.class));

        // When
        // This should not throw an exception due to internal error handling
        paymentEventPublisher.publishPaymentReceived(payment);

        // Then
        // Verify the event publishing was attempted
        verify(applicationEventPublisher).publishEvent(any(PaymentReceivedEvent.class));
        // No assertions needed on returned value as the method is void and we're testing it doesn't throw
    }

    @Test
    @DisplayName("Should successfully publish grace period expired event")
    void publishGracePeriodExpired_Success() {
        // Given - setUp provides the necessary objects

        // When
        paymentEventPublisher.publishGracePeriodExpired(payment);

        // Then
        // Verify that the event was published with correct data
        ArgumentCaptor<GracePeriodExpiredEvent> eventCaptor = ArgumentCaptor.forClass(GracePeriodExpiredEvent.class);
        verify(applicationEventPublisher).publishEvent(eventCaptor.capture());
        
        GracePeriodExpiredEvent capturedEvent = eventCaptor.getValue();
        assertEquals(installation.getId(), capturedEvent.getInstallationId());
        assertEquals(payment.getId(), capturedEvent.getPaymentId());
        assertEquals(paymentEventPublisher, capturedEvent.getSource());
    }

    @Test
    @DisplayName("Should handle exceptions when publishing grace period expired event")
    void publishGracePeriodExpired_HandlesException() {
        // Given
        doThrow(new RuntimeException("Test exception")).when(applicationEventPublisher).publishEvent(any(GracePeriodExpiredEvent.class));

        // When
        // This should not throw an exception due to internal error handling
        paymentEventPublisher.publishGracePeriodExpired(payment);

        // Then
        // Verify the event publishing was attempted
        verify(applicationEventPublisher).publishEvent(any(GracePeriodExpiredEvent.class));
        // No assertions needed on returned value as the method is void and we're testing it doesn't throw
    }

    @Test
    @DisplayName("Should successfully publish payment plan updated event")
    void publishPaymentPlanUpdated_Success() {
        // Given - setUp provides the necessary objects

        // When
        paymentEventPublisher.publishPaymentPlanUpdated(paymentPlan);

        // Then
        // Verify that the event was published with correct data
        ArgumentCaptor<PaymentPlanUpdatedEvent> eventCaptor = ArgumentCaptor.forClass(PaymentPlanUpdatedEvent.class);
        verify(applicationEventPublisher).publishEvent(eventCaptor.capture());
        
        PaymentPlanUpdatedEvent capturedEvent = eventCaptor.getValue();
        assertEquals(installation.getId(), capturedEvent.getInstallationId());
        assertEquals(paymentPlan.getId(), capturedEvent.getPaymentPlanId());
        assertEquals(paymentEventPublisher, capturedEvent.getSource());
    }

    @Test
    @DisplayName("Should handle exceptions when publishing payment plan updated event")
    void publishPaymentPlanUpdated_HandlesException() {
        // Given
        doThrow(new RuntimeException("Test exception")).when(applicationEventPublisher).publishEvent(any(PaymentPlanUpdatedEvent.class));

        // When
        // This should not throw an exception due to internal error handling
        paymentEventPublisher.publishPaymentPlanUpdated(paymentPlan);

        // Then
        // Verify the event publishing was attempted
        verify(applicationEventPublisher).publishEvent(any(PaymentPlanUpdatedEvent.class));
        // No assertions needed on returned value as the method is void and we're testing it doesn't throw
    }

    @Test
    @DisplayName("Should confirm service control action")
    void confirmServiceControlAction_ReturnsTrue() {
        // Given
        Long installationId = 1L;
        String actionType = "SUSPEND_SERVICE";

        // When
        boolean result = paymentEventPublisher.confirmServiceControlAction(installationId, actionType);

        // Then
        // In the current implementation, this always returns true
        assertTrue(result);
    }
    
    @Test
    @DisplayName("Payment Received Event should have correct properties")
    void paymentReceivedEvent_HasCorrectProperties() {
        // Given
        Object source = new Object();
        Long installationId = 1L;
        Long paymentId = 100L;
        
        // When
        PaymentReceivedEvent event = new PaymentReceivedEvent(source, installationId, paymentId);
        
        // Then
        assertEquals(source, event.getSource());
        assertEquals(installationId, event.getInstallationId());
        assertEquals(paymentId, event.getPaymentId());
    }
    
    @Test
    @DisplayName("Grace Period Expired Event should have correct properties")
    void gracePeriodExpiredEvent_HasCorrectProperties() {
        // Given
        Object source = new Object();
        Long installationId = 1L;
        Long paymentId = 100L;
        
        // When
        GracePeriodExpiredEvent event = new GracePeriodExpiredEvent(source, installationId, paymentId);
        
        // Then
        assertEquals(source, event.getSource());
        assertEquals(installationId, event.getInstallationId());
        assertEquals(paymentId, event.getPaymentId());
    }
    
    @Test
    @DisplayName("Payment Plan Updated Event should have correct properties")
    void paymentPlanUpdatedEvent_HasCorrectProperties() {
        // Given
        Object source = new Object();
        Long installationId = 1L;
        Long paymentPlanId = 200L;
        
        // When
        PaymentPlanUpdatedEvent event = new PaymentPlanUpdatedEvent(source, installationId, paymentPlanId);
        
        // Then
        assertEquals(source, event.getSource());
        assertEquals(installationId, event.getInstallationId());
        assertEquals(paymentPlanId, event.getPaymentPlanId());
    }
} 