package com.solar.core_services.payment_compliance.repository;

import com.solar.core_services.energy_monitoring.model.SolarInstallation;
import com.solar.core_services.energy_monitoring.repository.SolarInstallationRepository;
import com.solar.core_services.payment_compliance.model.PaymentPlan;
import com.solar.core_services.energy_monitoring.model.SolarInstallation.InstallationStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Test class for PaymentPlanRepository
 * Source file: src/main/java/com/solar/core_services/payment_compliance/repository/PaymentPlanRepository.java
 */
@DataJpaTest
@ActiveProfiles("test")
public class PaymentPlanRepositoryTest {

    @Autowired
    private PaymentPlanRepository paymentPlanRepository;

    @Autowired
    private SolarInstallationRepository installationRepository;

    private SolarInstallation testInstallation1;
    private SolarInstallation testInstallation2;
    private PaymentPlan testPaymentPlan1;
    private PaymentPlan testPaymentPlan2;
    private PaymentPlan testPaymentPlan3;

    @BeforeEach
    void setUp() {
        // Clear any existing data
        paymentPlanRepository.deleteAll();
        
        // Create test installations
        testInstallation1 = new SolarInstallation();
        testInstallation1.setCapacity(5.0);
        testInstallation1.setInstallationDate(LocalDateTime.now().minusMonths(6));
        testInstallation1.setStatus(InstallationStatus.ACTIVE);
        testInstallation1.setLocation("Test Location 1");
        testInstallation1.setName("Test Installation 1");
        testInstallation1 = installationRepository.save(testInstallation1);
        
        testInstallation2 = new SolarInstallation();
        testInstallation2.setCapacity(3.5);
        testInstallation2.setInstallationDate(LocalDateTime.now().minusMonths(3));
        testInstallation2.setStatus(InstallationStatus.ACTIVE);
        testInstallation2.setLocation("Test Location 2");
        testInstallation2.setName("Test Installation 2");
        testInstallation2 = installationRepository.save(testInstallation2);
        
        // Create test payment plans
        LocalDateTime now = LocalDateTime.now();
        
        testPaymentPlan1 = PaymentPlan.builder()
                .installation(testInstallation1)
                .name("Standard Monthly Plan")
                .description("Standard monthly payment plan")
                .totalAmount(new BigDecimal("10000.00"))
                .remainingAmount(new BigDecimal("8000.00"))
                .numberOfPayments(24)
                .installmentAmount(new BigDecimal("416.67"))
                .frequency(PaymentPlan.PaymentFrequency.MONTHLY)
                .startDate(now.minusMonths(2))
                .endDate(now.plusMonths(22))
                .status(PaymentPlan.PaymentPlanStatus.ACTIVE)
                .interestRate(new BigDecimal("5.0"))
                .lateFeeAmount(new BigDecimal("25.00"))
                .gracePeriodDays(7)
                .build();
        
        testPaymentPlan2 = PaymentPlan.builder()
                .installation(testInstallation2)
                .name("Quarterly Plan")
                .description("Quarterly payment plan")
                .totalAmount(new BigDecimal("7500.00"))
                .remainingAmount(new BigDecimal("7500.00"))
                .numberOfPayments(12)
                .installmentAmount(new BigDecimal("625.00"))
                .frequency(PaymentPlan.PaymentFrequency.QUARTERLY)
                .startDate(now.plusDays(15))
                .endDate(now.plusYears(3))
                .status(PaymentPlan.PaymentPlanStatus.ACTIVE)
                .interestRate(new BigDecimal("4.5"))
                .lateFeeAmount(new BigDecimal("30.00"))
                .gracePeriodDays(10)
                .build();
        
        testPaymentPlan3 = PaymentPlan.builder()
                .installation(testInstallation1)
                .name("Old Plan")
                .description("Old completed payment plan")
                .totalAmount(new BigDecimal("5000.00"))
                .remainingAmount(new BigDecimal("0.00"))
                .numberOfPayments(12)
                .installmentAmount(new BigDecimal("416.67"))
                .frequency(PaymentPlan.PaymentFrequency.MONTHLY)
                .startDate(now.minusYears(2))
                .endDate(now.minusYears(1))
                .status(PaymentPlan.PaymentPlanStatus.COMPLETED)
                .interestRate(new BigDecimal("5.5"))
                .lateFeeAmount(new BigDecimal("20.00"))
                .gracePeriodDays(5)
                .build();
        
        paymentPlanRepository.save(testPaymentPlan1);
        paymentPlanRepository.save(testPaymentPlan2);
        paymentPlanRepository.save(testPaymentPlan3);
    }

    @Test
    @DisplayName("Should find payment plans by installation")
    void shouldFindPaymentPlansByInstallation() {
        // When
        List<PaymentPlan> foundPlans = paymentPlanRepository.findByInstallation(testInstallation1);
        
        // Then
        assertThat(foundPlans).hasSize(2);
        assertThat(foundPlans).extracting("name").contains("Standard Monthly Plan", "Old Plan");
    }

    @Test
    @DisplayName("Should find payment plan by installation and end date after")
    void shouldFindPaymentPlanByInstallationAndEndDateAfter() {
        // Given
        LocalDateTime currentDate = LocalDateTime.now();
        
        // When
        Optional<PaymentPlan> foundPlan = paymentPlanRepository.findByInstallationAndEndDateAfter(
                testInstallation1, currentDate);
        
        // Then
        assertThat(foundPlan).isPresent();
        assertThat(foundPlan.get().getName()).isEqualTo("Standard Monthly Plan");
    }

    @Test
    @DisplayName("Should find active payment plan")
    void shouldFindActivePaymentPlan() {
        // Given
        LocalDateTime currentDate = LocalDateTime.now();
        
        // When
        Optional<PaymentPlan> activePlan = paymentPlanRepository.findActivePaymentPlan(
                testInstallation1, currentDate);
        
        // Then
        assertThat(activePlan).isPresent();
        assertThat(activePlan.get().getName()).isEqualTo("Standard Monthly Plan");
    }

    @Test
    @DisplayName("Should get total remaining amount by installation")
    void shouldGetTotalRemainingAmountByInstallation() {
        // When
        BigDecimal totalRemaining = paymentPlanRepository.getTotalRemainingAmountByInstallation(testInstallation1);
        
        // Then
        assertThat(totalRemaining).isEqualByComparingTo(new BigDecimal("8000.00"));
    }

    @Test
    @DisplayName("Should find payment plans by status")
    void shouldFindPaymentPlansByStatus() {
        // When
        List<PaymentPlan> activePlans = paymentPlanRepository.findByStatus(PaymentPlan.PaymentPlanStatus.ACTIVE);
        List<PaymentPlan> completedPlans = paymentPlanRepository.findByStatus(PaymentPlan.PaymentPlanStatus.COMPLETED);
        
        // Then
        assertThat(activePlans).hasSize(2);
        assertThat(completedPlans).hasSize(1);
        assertThat(completedPlans.get(0).getName()).isEqualTo("Old Plan");
    }

    @Test
    @DisplayName("Should find payment plans by installation and status")
    void shouldFindPaymentPlansByInstallationAndStatus() {
        // When
        List<PaymentPlan> activePlans = paymentPlanRepository.findByInstallationAndStatus(
                testInstallation1, PaymentPlan.PaymentPlanStatus.ACTIVE);
        
        // Then
        assertThat(activePlans).hasSize(1);
        assertThat(activePlans.get(0).getName()).isEqualTo("Standard Monthly Plan");
    }

    @Test
    @DisplayName("Should find active payment plans")
    void shouldFindActivePaymentPlans() {
        // When
        List<PaymentPlan> activePlans = paymentPlanRepository.findActivePaymentPlans(testInstallation1);
        
        // Then
        assertThat(activePlans).hasSize(1);
        assertThat(activePlans.get(0).getName()).isEqualTo("Standard Monthly Plan");
    }

    @Test
    @DisplayName("Should find payment plans by frequency")
    void shouldFindPaymentPlansByFrequency() {
        // When
        List<PaymentPlan> monthlyPlans = paymentPlanRepository.findByFrequency(PaymentPlan.PaymentFrequency.MONTHLY);
        List<PaymentPlan> quarterlyPlans = paymentPlanRepository.findByFrequency(PaymentPlan.PaymentFrequency.QUARTERLY);
        
        // Then
        assertThat(monthlyPlans).hasSize(2);
        assertThat(quarterlyPlans).hasSize(1);
        assertThat(quarterlyPlans.get(0).getName()).isEqualTo("Quarterly Plan");
    }

    @Test
    @DisplayName("Should find payment plans by total amount greater than")
    void shouldFindPaymentPlansByTotalAmountGreaterThan() {
        // When
        List<PaymentPlan> expensivePlans = paymentPlanRepository.findByTotalAmountGreaterThan(8000.0);
        
        // Then
        assertThat(expensivePlans).hasSize(1);
        assertThat(expensivePlans.get(0).getName()).isEqualTo("Standard Monthly Plan");
    }

    @Test
    @DisplayName("Should find payment plans by total amount less than")
    void shouldFindPaymentPlansByTotalAmountLessThan() {
        // When
        List<PaymentPlan> cheaperPlans = paymentPlanRepository.findByTotalAmountLessThan(6000.0);
        
        // Then
        assertThat(cheaperPlans).hasSize(1);
        assertThat(cheaperPlans.get(0).getName()).isEqualTo("Old Plan");
    }

    @Test
    @DisplayName("Should find payment plans by name containing")
    void shouldFindPaymentPlansByNameContaining() {
        // When
        List<PaymentPlan> plansWithPlan = paymentPlanRepository.findByNameContaining("Plan");
        List<PaymentPlan> monthlyPlans = paymentPlanRepository.findByNameContaining("Monthly");
        
        // Then
        assertThat(plansWithPlan).hasSize(3);
        assertThat(monthlyPlans).hasSize(1);
        assertThat(monthlyPlans.get(0).getName()).isEqualTo("Standard Monthly Plan");
    }
} 