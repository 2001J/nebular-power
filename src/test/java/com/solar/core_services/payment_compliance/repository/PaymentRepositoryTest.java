package com.solar.core_services.payment_compliance.repository;

import com.solar.core_services.energy_monitoring.model.SolarInstallation;
import com.solar.core_services.energy_monitoring.repository.SolarInstallationRepository;
import com.solar.core_services.payment_compliance.model.Payment;
import com.solar.core_services.payment_compliance.model.PaymentPlan;
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
import java.util.Arrays;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

// Add import for InstallationStatus enum
import com.solar.core_services.energy_monitoring.model.SolarInstallation.InstallationStatus;

/**
 * Test class for PaymentRepository
 * Source file: src/main/java/com/solar/core_services/payment_compliance/repository/PaymentRepository.java
 */
@DataJpaTest
@ActiveProfiles("test")
public class PaymentRepositoryTest {

    @Autowired
    private PaymentRepository paymentRepository;

    @Autowired
    private PaymentPlanRepository paymentPlanRepository;

    @Autowired
    private SolarInstallationRepository installationRepository;

    private SolarInstallation testInstallation;
    private PaymentPlan testPaymentPlan;
    private Payment testPayment1;
    private Payment testPayment2;
    private Payment testPayment3;

    @BeforeEach
    void setUp() {
        // Clear any existing data
        paymentRepository.deleteAll();
        paymentPlanRepository.deleteAll();
        
        // Create test installation
        testInstallation = new SolarInstallation();
        testInstallation.setCapacity(5.0);
        testInstallation.setInstallationDate(LocalDateTime.now().minusMonths(6));
        testInstallation.setStatus(InstallationStatus.ACTIVE);
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
                .dueDate(today.minusDays(30))
                .paidAt(today.minusDays(28))
                .status(Payment.PaymentStatus.PAID)
                .statusReason("Payment received")
                .statusUpdatedAt(today.minusDays(28))
                .daysOverdue(0)
                .transactionId("TX123456")
                .paymentMethod("CREDIT_CARD")
                .notes("First payment")
                .build();
        
        testPayment2 = Payment.builder()
                .installation(testInstallation)
                .paymentPlan(testPaymentPlan)
                .amount(new BigDecimal("416.67"))
                .dueDate(today)
                .status(Payment.PaymentStatus.DUE_TODAY)
                .statusReason("Payment due today")
                .statusUpdatedAt(today.minusDays(1))
                .daysOverdue(0)
                .notes("Second payment")
                .build();
        
        testPayment3 = Payment.builder()
                .installation(testInstallation)
                .paymentPlan(testPaymentPlan)
                .amount(new BigDecimal("416.67"))
                .dueDate(today.plusDays(30))
                .status(Payment.PaymentStatus.UPCOMING)
                .statusReason("Upcoming payment")
                .statusUpdatedAt(today.minusDays(1))
                .daysOverdue(0)
                .notes("Third payment")
                .build();
        
        paymentRepository.saveAll(Arrays.asList(testPayment1, testPayment2, testPayment3));
    }

    @Test
    @DisplayName("Should find payments by installation")
    void shouldFindPaymentsByInstallation() {
        // When
        List<Payment> foundPayments = paymentRepository.findByInstallation(testInstallation);
        
        // Then
        assertThat(foundPayments).hasSize(3);
        assertThat(foundPayments).contains(testPayment1, testPayment2, testPayment3);
    }

    @Test
    @DisplayName("Should find payments by due date before and status")
    void shouldFindPaymentsByDueDateBeforeAndStatus() {
        // Given
        LocalDateTime cutoffDate = LocalDateTime.now();
        
        // When
        List<Payment> overduePayments = paymentRepository.findByDueDateBeforeAndStatus(cutoffDate, Payment.PaymentStatus.PAID);
        
        // Then
        assertThat(overduePayments).hasSize(1);
        assertThat(overduePayments.get(0)).isEqualTo(testPayment1);
    }

    @Test
    @DisplayName("Should find payments by installation and status")
    void shouldFindPaymentsByInstallationAndStatus() {
        // When
        List<Payment> duePayments = paymentRepository.findByInstallationAndStatus(testInstallation, Payment.PaymentStatus.DUE_TODAY);
        
        // Then
        assertThat(duePayments).hasSize(1);
        assertThat(duePayments.get(0)).isEqualTo(testPayment2);
    }

    @Test
    @DisplayName("Should find payments due today")
    void shouldFindDueTodayPayments() {
        // Given
        LocalDateTime startOfDay = LocalDateTime.of(LocalDate.now(), LocalTime.MIDNIGHT);
        LocalDateTime endOfDay = LocalDateTime.of(LocalDate.now(), LocalTime.MAX);
        
        // When
        List<Payment> dueTodayPayments = paymentRepository.findDueTodayPayments(
                startOfDay, endOfDay, Payment.PaymentStatus.DUE_TODAY);
        
        // Then
        assertThat(dueTodayPayments).hasSize(1);
        assertThat(dueTodayPayments.get(0)).isEqualTo(testPayment2);
    }

    @Test
    @DisplayName("Should find overdue payments")
    void shouldFindOverduePayments() {
        // Given
        LocalDateTime cutoffDate = LocalDateTime.now();
        List<Payment.PaymentStatus> statuses = List.of(Payment.PaymentStatus.PAID);
        
        // When
        List<Payment> overduePayments = paymentRepository.findOverduePayments(cutoffDate, statuses);
        
        // Then
        assertThat(overduePayments).hasSize(1);
        assertThat(overduePayments.get(0)).isEqualTo(testPayment1);
    }

    @Test
    @DisplayName("Should find payments by payment plan")
    void shouldFindPaymentsByPaymentPlan() {
        // When
        List<Payment> planPayments = paymentRepository.findByPaymentPlan(testPaymentPlan);
        
        // Then
        assertThat(planPayments).hasSize(3);
        assertThat(planPayments).contains(testPayment1, testPayment2, testPayment3);
    }

    @Test
    @DisplayName("Should find payments by payment plan and status")
    void shouldFindPaymentsByPaymentPlanAndStatus() {
        // When
        List<Payment> upcomingPayments = paymentRepository.findByPaymentPlanAndStatus(
                testPaymentPlan, Payment.PaymentStatus.UPCOMING);
        
        // Then
        assertThat(upcomingPayments).hasSize(1);
        assertThat(upcomingPayments.get(0)).isEqualTo(testPayment3);
    }

    @Test
    @DisplayName("Should find payments for a specific installation with pagination")
    void shouldFindPaymentsByInstallationWithPagination() {
        // Given
        PageRequest pageRequest = PageRequest.of(0, 2);
        
        // When
        Page<Payment> pagedPayments = paymentRepository.findByInstallation(testInstallation, pageRequest);
        
        // Then
        assertThat(pagedPayments.getTotalElements()).isEqualTo(3);
        assertThat(pagedPayments.getContent()).hasSize(2);
        assertThat(pagedPayments.getTotalPages()).isEqualTo(2);
    }

    @Test
    @DisplayName("Should find upcoming payments")
    void shouldFindUpcomingPayments() {
        // Given
        LocalDateTime futureDate = LocalDateTime.now().plusDays(60);
        List<Payment.PaymentStatus> statuses = List.of(Payment.PaymentStatus.UPCOMING);
        
        // When
        List<Payment> upcomingPayments = paymentRepository.findUpcomingPaymentsByStatuses(
                futureDate, statuses);
        
        // Then
        assertThat(upcomingPayments).hasSize(1);
        assertThat(upcomingPayments.get(0)).isEqualTo(testPayment3);
    }

    @Test
    @DisplayName("Should count overdue payments by installation")
    void shouldCountOverduePaymentsByInstallation() {
        // Given
        List<Payment.PaymentStatus> statuses = List.of(Payment.PaymentStatus.PAID);
        
        // When
        Long count = paymentRepository.countOverduePaymentsByInstallation(testInstallation, statuses);
        
        // Then
        assertThat(count).isEqualTo(1);
    }
} 