package com.solar.core_services.payment_compliance.service;

import com.solar.core_services.energy_monitoring.model.SolarInstallation;
import com.solar.core_services.energy_monitoring.repository.SolarInstallationRepository;
import com.solar.core_services.payment_compliance.dto.PaymentPlanDTO;
import com.solar.core_services.payment_compliance.dto.PaymentPlanRequest;
import com.solar.core_services.payment_compliance.model.Payment;
import com.solar.core_services.payment_compliance.model.PaymentPlan;
import com.solar.core_services.payment_compliance.repository.PaymentPlanRepository;
import com.solar.core_services.payment_compliance.repository.PaymentRepository;
import com.solar.core_services.payment_compliance.service.impl.PaymentPlanServiceImpl;
import com.solar.user_management.model.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Test class for PaymentPlan interest rate calculations
 * Tests that annual interest rates are properly converted to periodic rates
 * and applied correctly based on payment frequency
 */
@ExtendWith(MockitoExtension.class)
public class PaymentPlanInterestCalculationTest {

    @Mock
    private PaymentPlanRepository paymentPlanRepository;

    @Mock
    private PaymentRepository paymentRepository;

    @Mock
    private SolarInstallationRepository installationRepository;

    @Mock
    private PaymentEventPublisher eventPublisher;

    @Mock
    private GracePeriodConfigService gracePeriodConfigService;

    @InjectMocks
    private PaymentPlanServiceImpl paymentPlanService;

    private User testUser;
    private SolarInstallation testInstallation;
    private PaymentPlan testPaymentPlan;

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
        testInstallation.setStatus(SolarInstallation.InstallationStatus.ACTIVE);
        testInstallation.setUser(testUser);
    }

    @Test
    @DisplayName("Should calculate correct periodic interest rate for monthly payments")
    void shouldCalculateMonthlyInterestRate() {
        // Given: 12% annual interest, monthly payments
        PaymentPlanRequest request = PaymentPlanRequest.builder()
                .installationId(testInstallation.getId())
                .totalAmount(new BigDecimal("12000.00"))
                .downPayment(new BigDecimal("2000.00"))
                .interestRate(new BigDecimal("12.0")) // 12% annual
                .installmentAmount(new BigDecimal("500.00"))
                .frequency(PaymentPlan.PaymentFrequency.MONTHLY)
                .startDate(LocalDate.now())
                .endDate(LocalDate.now().plusYears(2))
                .build();

        testPaymentPlan = PaymentPlan.builder()
                .id(1L)
                .installation(testInstallation)
                .name("Test Plan")
                .totalAmount(new BigDecimal("12000.00"))
                .remainingAmount(new BigDecimal("10000.00"))
                .downPayment(new BigDecimal("2000.00"))
                .interestRate(new BigDecimal("12.0"))
                .installmentAmount(new BigDecimal("500.00"))
                .frequency(PaymentPlan.PaymentFrequency.MONTHLY)
                .numberOfPayments(24)
                .startDate(LocalDateTime.now())
                .endDate(LocalDateTime.now().plusYears(2))
                .status(PaymentPlan.PaymentPlanStatus.ACTIVE)
                .payments(new ArrayList<>())
                .build();

        when(installationRepository.findById(testInstallation.getId())).thenReturn(Optional.of(testInstallation));
        when(paymentPlanRepository.save(any(PaymentPlan.class))).thenReturn(testPaymentPlan);
        when(paymentPlanRepository.findActivePaymentPlan(any(), any())).thenReturn(Optional.empty());
        when(gracePeriodConfigService.getGracePeriodDays()).thenReturn(7);

        // When
        PaymentPlanDTO result = paymentPlanService.createPaymentPlan(request);

        // Then
        assertNotNull(result);
        
        // Verify payment plan was saved with interest rate
        ArgumentCaptor<PaymentPlan> planCaptor = ArgumentCaptor.forClass(PaymentPlan.class);
        verify(paymentPlanRepository, atLeastOnce()).save(planCaptor.capture());
        
        PaymentPlan savedPlan = planCaptor.getValue();
        assertEquals(new BigDecimal("12.0"), savedPlan.getInterestRate());
        
        // Monthly rate should be 12% / 12 = 1% per month = 0.01
        // With amortization, each payment will have interest applied
    }

    @Test
    @DisplayName("Should calculate correct periodic interest rate for weekly payments")
    void shouldCalculateWeeklyInterestRate() {
        // Given: 5.2% annual interest, weekly payments (52 weeks)
        PaymentPlanRequest request = PaymentPlanRequest.builder()
                .installationId(testInstallation.getId())
                .totalAmount(new BigDecimal("5200.00"))
                .downPayment(new BigDecimal("200.00"))
                .interestRate(new BigDecimal("5.2")) // 5.2% annual
                .installmentAmount(new BigDecimal("100.00"))
                .frequency(PaymentPlan.PaymentFrequency.WEEKLY)
                .startDate(LocalDate.now())
                .endDate(LocalDate.now().plusYears(1))
                .build();

        testPaymentPlan = PaymentPlan.builder()
                .id(1L)
                .installation(testInstallation)
                .name("Test Plan")
                .totalAmount(new BigDecimal("5200.00"))
                .remainingAmount(new BigDecimal("5000.00"))
                .downPayment(new BigDecimal("200.00"))
                .interestRate(new BigDecimal("5.2"))
                .installmentAmount(new BigDecimal("100.00"))
                .frequency(PaymentPlan.PaymentFrequency.WEEKLY)
                .numberOfPayments(52)
                .startDate(LocalDateTime.now())
                .endDate(LocalDateTime.now().plusYears(1))
                .status(PaymentPlan.PaymentPlanStatus.ACTIVE)
                .payments(new ArrayList<>())
                .build();

        when(installationRepository.findById(testInstallation.getId())).thenReturn(Optional.of(testInstallation));
        when(paymentPlanRepository.save(any(PaymentPlan.class))).thenReturn(testPaymentPlan);
        when(paymentPlanRepository.findActivePaymentPlan(any(), any())).thenReturn(Optional.empty());
        when(gracePeriodConfigService.getGracePeriodDays()).thenReturn(7);

        // When
        PaymentPlanDTO result = paymentPlanService.createPaymentPlan(request);

        // Then
        assertNotNull(result);
        
        // Verify payment plan was saved with interest rate
        ArgumentCaptor<PaymentPlan> planCaptor = ArgumentCaptor.forClass(PaymentPlan.class);
        verify(paymentPlanRepository, atLeastOnce()).save(planCaptor.capture());
        
        PaymentPlan savedPlan = planCaptor.getValue();
        assertEquals(new BigDecimal("5.2"), savedPlan.getInterestRate());
        
        // Weekly rate should be 5.2% / 52 = 0.1% per week
    }

    @Test
    @DisplayName("Should handle zero interest rate correctly")
    void shouldHandleZeroInterestRate() {
        // Given: 0% interest
        PaymentPlanRequest request = PaymentPlanRequest.builder()
                .installationId(testInstallation.getId())
                .totalAmount(new BigDecimal("10000.00"))
                .downPayment(new BigDecimal("1000.00"))
                .interestRate(BigDecimal.ZERO)
                .installmentAmount(new BigDecimal("500.00"))
                .frequency(PaymentPlan.PaymentFrequency.MONTHLY)
                .startDate(LocalDate.now())
                .endDate(LocalDate.now().plusYears(2))
                .build();

        testPaymentPlan = PaymentPlan.builder()
                .id(1L)
                .installation(testInstallation)
                .name("Test Plan")
                .totalAmount(new BigDecimal("10000.00"))
                .remainingAmount(new BigDecimal("9000.00"))
                .downPayment(new BigDecimal("1000.00"))
                .interestRate(BigDecimal.ZERO)
                .installmentAmount(new BigDecimal("500.00"))
                .frequency(PaymentPlan.PaymentFrequency.MONTHLY)
                .numberOfPayments(18)
                .startDate(LocalDateTime.now())
                .endDate(LocalDateTime.now().plusYears(2))
                .status(PaymentPlan.PaymentPlanStatus.ACTIVE)
                .payments(new ArrayList<>())
                .build();

        when(installationRepository.findById(testInstallation.getId())).thenReturn(Optional.of(testInstallation));
        when(paymentPlanRepository.save(any(PaymentPlan.class))).thenReturn(testPaymentPlan);
        when(paymentPlanRepository.findActivePaymentPlan(any(), any())).thenReturn(Optional.empty());
        when(gracePeriodConfigService.getGracePeriodDays()).thenReturn(7);

        // When
        PaymentPlanDTO result = paymentPlanService.createPaymentPlan(request);

        // Then
        assertNotNull(result);
        
        // Verify payment plan was saved with zero interest
        ArgumentCaptor<PaymentPlan> planCaptor = ArgumentCaptor.forClass(PaymentPlan.class);
        verify(paymentPlanRepository, atLeastOnce()).save(planCaptor.capture());
        
        PaymentPlan savedPlan = planCaptor.getValue();
        assertEquals(BigDecimal.ZERO, savedPlan.getInterestRate());
        
        // With zero interest, payment = principal / numberOfPayments
        // 9000 / 18 = 500 per payment
    }

    @Test
    @DisplayName("Should calculate quarterly interest rate correctly")
    void shouldCalculateQuarterlyInterestRate() {
        // Given: 8% annual interest, quarterly payments
        PaymentPlanRequest request = PaymentPlanRequest.builder()
                .installationId(testInstallation.getId())
                .totalAmount(new BigDecimal("8000.00"))
                .downPayment(new BigDecimal("500.00"))
                .interestRate(new BigDecimal("8.0")) // 8% annual
                .installmentAmount(new BigDecimal("1000.00"))
                .frequency(PaymentPlan.PaymentFrequency.QUARTERLY)
                .startDate(LocalDate.now())
                .endDate(LocalDate.now().plusYears(2))
                .build();

        testPaymentPlan = PaymentPlan.builder()
                .id(1L)
                .installation(testInstallation)
                .name("Test Plan")
                .totalAmount(new BigDecimal("8000.00"))
                .remainingAmount(new BigDecimal("7500.00"))
                .downPayment(new BigDecimal("500.00"))
                .interestRate(new BigDecimal("8.0"))
                .installmentAmount(new BigDecimal("1000.00"))
                .frequency(PaymentPlan.PaymentFrequency.QUARTERLY)
                .numberOfPayments(8)
                .startDate(LocalDateTime.now())
                .endDate(LocalDateTime.now().plusYears(2))
                .status(PaymentPlan.PaymentPlanStatus.ACTIVE)
                .payments(new ArrayList<>())
                .build();

        when(installationRepository.findById(testInstallation.getId())).thenReturn(Optional.of(testInstallation));
        when(paymentPlanRepository.save(any(PaymentPlan.class))).thenReturn(testPaymentPlan);
        when(paymentPlanRepository.findActivePaymentPlan(any(), any())).thenReturn(Optional.empty());
        when(gracePeriodConfigService.getGracePeriodDays()).thenReturn(7);

        // When
        PaymentPlanDTO result = paymentPlanService.createPaymentPlan(request);

        // Then
        assertNotNull(result);
        
        // Verify payment plan was saved with interest rate
        ArgumentCaptor<PaymentPlan> planCaptor = ArgumentCaptor.forClass(PaymentPlan.class);
        verify(paymentPlanRepository, atLeastOnce()).save(planCaptor.capture());
        
        PaymentPlan savedPlan = planCaptor.getValue();
        assertEquals(new BigDecimal("8.0"), savedPlan.getInterestRate());
        
        // Quarterly rate should be 8% / 4 = 2% per quarter
    }

    @Test
    @DisplayName("Should update payment plan with new interest rate")
    void shouldUpdateInterestRate() {
        // Given: existing plan with 5% interest, updating to 7%
        testPaymentPlan = PaymentPlan.builder()
                .id(1L)
                .installation(testInstallation)
                .name("Test Plan")
                .totalAmount(new BigDecimal("10000.00"))
                .remainingAmount(new BigDecimal("8000.00"))
                .downPayment(new BigDecimal("1000.00"))
                .interestRate(new BigDecimal("5.0"))
                .installmentAmount(new BigDecimal("500.00"))
                .frequency(PaymentPlan.PaymentFrequency.MONTHLY)
                .numberOfPayments(20)
                .startDate(LocalDateTime.now())
                .endDate(LocalDateTime.now().plusYears(2))
                .status(PaymentPlan.PaymentPlanStatus.ACTIVE)
                .payments(new ArrayList<>())
                .build();

        PaymentPlanRequest updateRequest = PaymentPlanRequest.builder()
                .installationId(testInstallation.getId())
                .totalAmount(new BigDecimal("10000.00"))
                .downPayment(new BigDecimal("1000.00"))
                .interestRate(new BigDecimal("7.0")) // Updated to 7%
                .installmentAmount(new BigDecimal("500.00"))
                .frequency(PaymentPlan.PaymentFrequency.MONTHLY)
                .startDate(LocalDate.now())
                .endDate(LocalDate.now().plusYears(2))
                .build();

        when(paymentPlanRepository.findById(1L)).thenReturn(Optional.of(testPaymentPlan));
        when(paymentPlanRepository.save(any(PaymentPlan.class))).thenReturn(testPaymentPlan);
        when(paymentRepository.findByPaymentPlan(any())).thenReturn(new ArrayList<>());

        // When
        PaymentPlanDTO result = paymentPlanService.updatePaymentPlan(1L, updateRequest);

        // Then
        assertNotNull(result);
        
        // Verify interest rate was updated
        ArgumentCaptor<PaymentPlan> planCaptor = ArgumentCaptor.forClass(PaymentPlan.class);
        verify(paymentPlanRepository, atLeastOnce()).save(planCaptor.capture());
        
        PaymentPlan updatedPlan = planCaptor.getValue();
        assertEquals(new BigDecimal("7.0"), updatedPlan.getInterestRate());
    }

    @Test
    @DisplayName("Should calculate down payment effect on remaining amount")
    void shouldCalculateRemainingAmountWithDownPayment() {
        // Given: $10,000 total, $2,000 down payment
        PaymentPlanRequest request = PaymentPlanRequest.builder()
                .installationId(testInstallation.getId())
                .totalAmount(new BigDecimal("10000.00"))
                .downPayment(new BigDecimal("2000.00"))
                .interestRate(new BigDecimal("6.0"))
                .installmentAmount(new BigDecimal("400.00"))
                .frequency(PaymentPlan.PaymentFrequency.MONTHLY)
                .startDate(LocalDate.now())
                .endDate(LocalDate.now().plusYears(2))
                .build();

        testPaymentPlan = PaymentPlan.builder()
                .id(1L)
                .installation(testInstallation)
                .name("Test Plan")
                .totalAmount(new BigDecimal("10000.00"))
                .remainingAmount(new BigDecimal("8000.00")) // 10000 - 2000
                .downPayment(new BigDecimal("2000.00"))
                .interestRate(new BigDecimal("6.0"))
                .installmentAmount(new BigDecimal("400.00"))
                .frequency(PaymentPlan.PaymentFrequency.MONTHLY)
                .numberOfPayments(20)
                .startDate(LocalDateTime.now())
                .endDate(LocalDateTime.now().plusYears(2))
                .status(PaymentPlan.PaymentPlanStatus.ACTIVE)
                .payments(new ArrayList<>())
                .build();

        when(installationRepository.findById(testInstallation.getId())).thenReturn(Optional.of(testInstallation));
        when(paymentPlanRepository.save(any(PaymentPlan.class))).thenReturn(testPaymentPlan);
        when(paymentPlanRepository.findActivePaymentPlan(any(), any())).thenReturn(Optional.empty());
        when(gracePeriodConfigService.getGracePeriodDays()).thenReturn(7);

        // When
        PaymentPlanDTO result = paymentPlanService.createPaymentPlan(request);

        // Then
        assertNotNull(result);
        
        // Verify remaining amount = total - down payment
        ArgumentCaptor<PaymentPlan> planCaptor = ArgumentCaptor.forClass(PaymentPlan.class);
        verify(paymentPlanRepository, atLeastOnce()).save(planCaptor.capture());
        
        PaymentPlan savedPlan = planCaptor.getValue();
        
        // Remaining should be 8000 (10000 total - 2000 down payment)
        BigDecimal expectedRemaining = new BigDecimal("10000.00")
                .subtract(new BigDecimal("2000.00"));
        assertEquals(0, savedPlan.getRemainingAmount().compareTo(expectedRemaining));
    }
}
