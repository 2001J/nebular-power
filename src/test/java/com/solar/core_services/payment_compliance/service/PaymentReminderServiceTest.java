package com.solar.core_services.payment_compliance.service;

import com.solar.core_services.energy_monitoring.model.SolarInstallation;
import com.solar.user_management.model.User;
import com.solar.core_services.payment_compliance.dto.PaymentReminderDTO;
import com.solar.core_services.payment_compliance.model.Payment;
import com.solar.core_services.payment_compliance.model.PaymentPlan;
import com.solar.core_services.payment_compliance.model.PaymentReminder;
import com.solar.core_services.payment_compliance.repository.PaymentReminderRepository;
import com.solar.core_services.payment_compliance.repository.PaymentRepository;
import com.solar.core_services.payment_compliance.service.impl.PaymentReminderServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

// Add import for InstallationStatus enum
import com.solar.core_services.energy_monitoring.model.SolarInstallation.InstallationStatus;

/**
 * Test class for PaymentReminderService
 * Source file: src/main/java/com/solar/core_services/payment_compliance/service/PaymentReminderService.java
 * Implementation: src/main/java/com/solar/core_services/payment_compliance/service/impl/PaymentReminderServiceImpl.java
 */
@ExtendWith(MockitoExtension.class)
public class PaymentReminderServiceTest {

    @Mock
    private PaymentReminderRepository reminderRepository;

    @Mock
    private PaymentRepository paymentRepository;

    @Mock
    private GracePeriodConfigService gracePeriodConfigService;

    @InjectMocks
    private PaymentReminderServiceImpl reminderService;

    private User testUser;
    private SolarInstallation testInstallation;
    private Payment testPayment;
    private PaymentReminder testReminder1;
    private PaymentReminder testReminder2;

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
        
        // Create test payment
        PaymentPlan testPaymentPlan = PaymentPlan.builder()
                .id(1L)
                .installation(testInstallation)
                .name("Test Payment Plan")
                .build();
        
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
        
        // Create test reminders
        testReminder1 = new PaymentReminder();
        testReminder1.setId(1L);
        testReminder1.setPayment(testPayment);
        testReminder1.setSentDate(LocalDateTime.now().minusDays(3));
        testReminder1.setReminderType(PaymentReminder.ReminderType.DUE_TODAY);
        testReminder1.setDeliveryStatus(PaymentReminder.DeliveryStatus.DELIVERED);
        testReminder1.setDeliveryChannel("EMAIL");
        testReminder1.setRecipientAddress("test@example.com");
        testReminder1.setMessageContent("Your payment is due today");
        testReminder1.setRetryCount(0);
        
        testReminder2 = new PaymentReminder();
        testReminder2.setId(2L);
        testReminder2.setPayment(testPayment);
        testReminder2.setSentDate(LocalDateTime.now().minusDays(1));
        testReminder2.setReminderType(PaymentReminder.ReminderType.OVERDUE);
        testReminder2.setDeliveryStatus(PaymentReminder.DeliveryStatus.DELIVERED);
        testReminder2.setDeliveryChannel("SMS");
        testReminder2.setRecipientAddress("+1234567890");
        testReminder2.setMessageContent("Your payment is overdue");
        testReminder2.setRetryCount(0);
    }

    @Test
    @DisplayName("Should send payment reminder")
    void shouldSendPaymentReminder() {
        // Given
        when(reminderRepository.save(any(PaymentReminder.class))).thenReturn(testReminder1);
        when(reminderRepository.countRecentRemindersByType(any(Payment.class), any(PaymentReminder.ReminderType.class), any(LocalDateTime.class))).thenReturn(0L);
        
        // When
        reminderService.sendPaymentReminder(testPayment, PaymentReminder.ReminderType.DUE_TODAY);
        
        // Then
        // Verify save is called twice: once before sending and once after updating the status
        verify(reminderRepository, times(2)).save(any(PaymentReminder.class));
    }

    @Test
    @DisplayName("Should process failed reminders")
    void shouldProcessFailedReminders() {
        // Given
        PaymentReminder failedReminder = new PaymentReminder();
        failedReminder.setId(3L);
        failedReminder.setPayment(testPayment);
        failedReminder.setReminderType(PaymentReminder.ReminderType.OVERDUE);
        failedReminder.setDeliveryStatus(PaymentReminder.DeliveryStatus.FAILED);
        failedReminder.setRetryCount(1);
        
        when(reminderRepository.findFailedRemindersForRetry(eq(PaymentReminder.DeliveryStatus.FAILED), any(Integer.class)))
                .thenReturn(Collections.singletonList(failedReminder));
        when(reminderRepository.save(any(PaymentReminder.class))).thenReturn(failedReminder);
        
        // When
        reminderService.processFailedReminders();
        
        // Then
        verify(reminderRepository, times(1)).findFailedRemindersForRetry(eq(PaymentReminder.DeliveryStatus.FAILED), any(Integer.class));
        verify(reminderRepository, times(1)).save(any(PaymentReminder.class));
    }

    @Test
    @DisplayName("Should get reminders by payment")
    void shouldGetRemindersByPayment() {
        // Given
        when(paymentRepository.findById(testPayment.getId())).thenReturn(Optional.of(testPayment));
        when(reminderRepository.findByPayment(testPayment))
                .thenReturn(Arrays.asList(testReminder1, testReminder2));
        
        // When
        List<PaymentReminderDTO> reminders = reminderService.getRemindersByPayment(testPayment.getId());
        
        // Then
        assertNotNull(reminders);
        assertEquals(2, reminders.size());
        verify(paymentRepository, times(1)).findById(testPayment.getId());
        verify(reminderRepository, times(1)).findByPayment(testPayment);
    }

    @Test
    @DisplayName("Should get reminders by user")
    void shouldGetRemindersByUser() {
        // Given
        Pageable pageable = PageRequest.of(0, 10);
        Page<PaymentReminder> pagedReminders = new PageImpl<>(Arrays.asList(testReminder1, testReminder2));
        
        when(reminderRepository.findByUserId(testUser.getId(), pageable)).thenReturn(pagedReminders);
        
        // When
        Page<PaymentReminderDTO> reminders = reminderService.getRemindersByUser(testUser.getId(), pageable);
        
        // Then
        assertNotNull(reminders);
        assertEquals(2, reminders.getTotalElements());
        verify(reminderRepository, times(1)).findByUserId(testUser.getId(), pageable);
    }

    @Test
    @DisplayName("Should send manual reminder")
    void shouldSendManualReminder() {
        // Given
        when(paymentRepository.findById(testPayment.getId())).thenReturn(Optional.of(testPayment));
        when(reminderRepository.save(any(PaymentReminder.class))).thenReturn(testReminder2);
        when(reminderRepository.countRecentRemindersByType(any(Payment.class), any(PaymentReminder.ReminderType.class), any(LocalDateTime.class))).thenReturn(0L);
        
        // When
        reminderService.sendManualReminder(testPayment.getId(), PaymentReminder.ReminderType.OVERDUE);
        
        // Then
        verify(paymentRepository, times(1)).findById(testPayment.getId());
        // Verify save is called twice: once before sending and once after updating the status
        verify(reminderRepository, times(2)).save(any(PaymentReminder.class));
    }

    @Test
    @DisplayName("Should check if has recent reminder of type - true")
    void shouldCheckIfHasRecentReminderOfTypeTrue() {
        // Given
        LocalDateTime cutoffDate = LocalDateTime.now().minusHours(24);
        
        when(reminderRepository.countRecentRemindersByType(
                eq(testPayment), 
                eq(PaymentReminder.ReminderType.OVERDUE), 
                any(LocalDateTime.class))).thenReturn(1L);
        
        // When
        boolean hasRecent = reminderService.hasRecentReminderOfType(testPayment, PaymentReminder.ReminderType.OVERDUE);
        
        // Then
        assertTrue(hasRecent);
        verify(reminderRepository, times(1)).countRecentRemindersByType(
                eq(testPayment), 
                eq(PaymentReminder.ReminderType.OVERDUE), 
                any(LocalDateTime.class));
    }

    @Test
    @DisplayName("Should check if has recent reminder of type - false")
    void shouldCheckIfHasRecentReminderOfTypeFalse() {
        // Given
        LocalDateTime cutoffDate = LocalDateTime.now().minusHours(24);
        
        when(reminderRepository.countRecentRemindersByType(
                eq(testPayment), 
                eq(PaymentReminder.ReminderType.OVERDUE), 
                any(LocalDateTime.class))).thenReturn(0L);
        
        // When
        boolean hasRecent = reminderService.hasRecentReminderOfType(testPayment, PaymentReminder.ReminderType.OVERDUE);
        
        // Then
        assertFalse(hasRecent);
        verify(reminderRepository, times(1)).countRecentRemindersByType(
                eq(testPayment), 
                eq(PaymentReminder.ReminderType.OVERDUE), 
                any(LocalDateTime.class));
    }
} 