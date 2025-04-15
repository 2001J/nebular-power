package com.solar.core_services.payment_compliance.repository;

import com.solar.core_services.energy_monitoring.model.SolarInstallation;
import com.solar.user_management.model.User;
import com.solar.core_services.energy_monitoring.repository.SolarInstallationRepository;
import com.solar.user_management.repository.UserRepository;
import com.solar.core_services.payment_compliance.model.Payment;
import com.solar.core_services.payment_compliance.model.PaymentPlan;
import com.solar.core_services.payment_compliance.model.PaymentReminder;
import com.solar.core_services.energy_monitoring.model.SolarInstallation.InstallationStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Test class for PaymentReminderRepository
 * Source file: src/main/java/com/solar/core_services/payment_compliance/repository/PaymentReminderRepository.java
 */
@DataJpaTest
@ActiveProfiles("test")
public class PaymentReminderRepositoryTest {

    @Autowired
    private PaymentReminderRepository paymentReminderRepository;

    @Autowired
    private PaymentRepository paymentRepository;

    @Autowired
    private PaymentPlanRepository paymentPlanRepository;

    @Autowired
    private SolarInstallationRepository installationRepository;

    @Autowired
    private UserRepository userRepository;

    private User testUser;
    private SolarInstallation testInstallation;
    private PaymentPlan testPaymentPlan;
    private Payment testPayment1;
    private Payment testPayment2;
    private PaymentReminder testReminder1;
    private PaymentReminder testReminder2;
    private PaymentReminder testReminder3;

    @BeforeEach
    void setUp() {
        // Clear any existing data
        paymentReminderRepository.deleteAll();
        paymentRepository.deleteAll();
        paymentPlanRepository.deleteAll();
        
        // Create test user
        testUser = new User();
        testUser.setEmail("test@example.com");
        testUser.setFullName("Test User");
        testUser.setPassword("password123");
        testUser.setPhoneNumber("+1234567890");
        testUser.setEnabled(true);
        testUser.setEmailVerified(true);
        testUser.setRole(User.UserRole.CUSTOMER);
        testUser = userRepository.save(testUser);
        
        // Create test installation
        testInstallation = new SolarInstallation();
        testInstallation.setCapacity(5.0);
        testInstallation.setInstallationDate(LocalDateTime.now().minusMonths(6));
        testInstallation.setStatus(InstallationStatus.ACTIVE);
        testInstallation.setUser(testUser);
        testInstallation.setLocation("Test Location");
        testInstallation.setName("Test Installation");
        testInstallation = installationRepository.save(testInstallation);
        
        // Create test payment plan
        testPaymentPlan = PaymentPlan.builder()
                .installation(testInstallation)
                .name("Test Payment Plan")
                .description("Test Payment Plan Description")
                .totalAmount(new BigDecimal("10000.00"))
                .remainingAmount(new BigDecimal("8000.00"))
                .numberOfPayments(24)
                .installmentAmount(new BigDecimal("416.67"))
                .frequency(PaymentPlan.PaymentFrequency.MONTHLY)
                .startDate(LocalDateTime.now().minusMonths(2))
                .endDate(LocalDateTime.now().plusMonths(22))
                .status(PaymentPlan.PaymentPlanStatus.ACTIVE)
                .interestRate(new BigDecimal("5.0"))
                .lateFeeAmount(new BigDecimal("25.00"))
                .gracePeriodDays(7)
                .build();
        testPaymentPlan = paymentPlanRepository.save(testPaymentPlan);
        
        // Create test payments
        LocalDateTime today = LocalDateTime.of(LocalDate.now(), LocalTime.MIDNIGHT);
        
        testPayment1 = Payment.builder()
                .installation(testInstallation)
                .paymentPlan(testPaymentPlan)
                .amount(new BigDecimal("416.67"))
                .dueDate(today.minusDays(5))
                .status(Payment.PaymentStatus.OVERDUE)
                .statusReason("Payment overdue")
                .statusUpdatedAt(today.minusDays(1))
                .daysOverdue(5)
                .notes("Overdue payment")
                .build();
        
        testPayment2 = Payment.builder()
                .installation(testInstallation)
                .paymentPlan(testPaymentPlan)
                .amount(new BigDecimal("416.67"))
                .dueDate(today.plusDays(2))
                .status(Payment.PaymentStatus.UPCOMING)
                .statusReason("Upcoming payment")
                .statusUpdatedAt(today.minusDays(1))
                .daysOverdue(0)
                .notes("Upcoming payment")
                .build();
        
        testPayment1 = paymentRepository.save(testPayment1);
        testPayment2 = paymentRepository.save(testPayment2);
        
        // Create test reminders
        testReminder1 = new PaymentReminder();
        testReminder1.setPayment(testPayment1);
        testReminder1.setSentDate(LocalDateTime.now().minusDays(3));
        testReminder1.setReminderType(PaymentReminder.ReminderType.DUE_TODAY);
        testReminder1.setDeliveryStatus(PaymentReminder.DeliveryStatus.DELIVERED);
        testReminder1.setDeliveryChannel("EMAIL");
        testReminder1.setRecipientAddress("test@example.com");
        testReminder1.setMessageContent("Your payment is due today");
        testReminder1.setRetryCount(0);
        
        testReminder2 = new PaymentReminder();
        testReminder2.setPayment(testPayment1);
        testReminder2.setSentDate(LocalDateTime.now().minusDays(1));
        testReminder2.setReminderType(PaymentReminder.ReminderType.OVERDUE);
        testReminder2.setDeliveryStatus(PaymentReminder.DeliveryStatus.DELIVERED);
        testReminder2.setDeliveryChannel("SMS");
        testReminder2.setRecipientAddress("+1234567890");
        testReminder2.setMessageContent("Your payment is overdue");
        testReminder2.setRetryCount(0);
        
        testReminder3 = new PaymentReminder();
        testReminder3.setPayment(testPayment2);
        testReminder3.setSentDate(LocalDateTime.now().minusDays(2));
        testReminder3.setReminderType(PaymentReminder.ReminderType.UPCOMING_PAYMENT);
        testReminder3.setDeliveryStatus(PaymentReminder.DeliveryStatus.FAILED);
        testReminder3.setDeliveryChannel("EMAIL");
        testReminder3.setRecipientAddress("test@example.com");
        testReminder3.setMessageContent("Your payment is coming up");
        testReminder3.setRetryCount(2);
        testReminder3.setLastRetryDate(LocalDateTime.now().minusDays(1));
        testReminder3.setErrorMessage("Delivery failed: mailbox full");
        
        paymentReminderRepository.save(testReminder1);
        paymentReminderRepository.save(testReminder2);
        paymentReminderRepository.save(testReminder3);
    }

    @Test
    @DisplayName("Should find reminders by payment")
    void shouldFindRemindersByPayment() {
        // When
        List<PaymentReminder> reminders = paymentReminderRepository.findByPayment(testPayment1);
        
        // Then
        assertThat(reminders).hasSize(2);
        assertThat(reminders).extracting("reminderType")
                .contains(PaymentReminder.ReminderType.DUE_TODAY, PaymentReminder.ReminderType.OVERDUE);
    }

    @Test
    @DisplayName("Should find reminders by payment and reminder type")
    void shouldFindRemindersByPaymentAndReminderType() {
        // When
        List<PaymentReminder> overdueReminders = paymentReminderRepository.findByPaymentAndReminderType(
                testPayment1, PaymentReminder.ReminderType.OVERDUE);
        
        // Then
        assertThat(overdueReminders).hasSize(1);
        assertThat(overdueReminders.get(0).getDeliveryChannel()).isEqualTo("SMS");
    }

    @Test
    @DisplayName("Should find reminders by delivery status")
    void shouldFindRemindersByDeliveryStatus() {
        // When
        List<PaymentReminder> failedReminders = paymentReminderRepository.findByDeliveryStatus(
                PaymentReminder.DeliveryStatus.FAILED);
        
        // Then
        assertThat(failedReminders).hasSize(1);
        assertThat(failedReminders.get(0).getReminderType()).isEqualTo(PaymentReminder.ReminderType.UPCOMING_PAYMENT);
    }

    @Test
    @DisplayName("Should find failed reminders for retry")
    void shouldFindFailedRemindersForRetry() {
        // When
        List<PaymentReminder> remindersForRetry = paymentReminderRepository.findFailedRemindersForRetry(
                PaymentReminder.DeliveryStatus.FAILED, 3);
        
        // Then
        assertThat(remindersForRetry).hasSize(1);
        assertThat(remindersForRetry.get(0).getRetryCount()).isEqualTo(2);
    }

    @Test
    @DisplayName("Should find reminders by installation ID")
    void shouldFindRemindersByInstallationId() {
        // When
        List<PaymentReminder> installationReminders = paymentReminderRepository.findByInstallationId(
                testInstallation.getId());
        
        // Then
        assertThat(installationReminders).hasSize(3);
    }

    @Test
    @DisplayName("Should find reminders by user ID with pagination")
    void shouldFindRemindersByUserIdWithPagination() {
        // Given
        PageRequest pageRequest = PageRequest.of(0, 10);
        
        // When
        Page<PaymentReminder> userReminders = paymentReminderRepository.findByUserId(
                testUser.getId(), pageRequest);
        
        // Then
        assertThat(userReminders.getTotalElements()).isEqualTo(3);
        assertThat(userReminders.getContent()).hasSize(3);
    }

    @Test
    @DisplayName("Should count recent reminders by type")
    void shouldCountRecentRemindersByType() {
        // Given
        LocalDateTime cutoffDate = LocalDateTime.now().minusDays(2);
        
        // When
        Long recentOverdueCount = paymentReminderRepository.countRecentRemindersByType(
                testPayment1, PaymentReminder.ReminderType.OVERDUE, cutoffDate);
        
        // Then
        assertThat(recentOverdueCount).isEqualTo(1);
    }
} 