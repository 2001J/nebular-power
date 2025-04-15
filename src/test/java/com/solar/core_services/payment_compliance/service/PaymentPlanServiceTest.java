package com.solar.core_services.payment_compliance.service;

import com.solar.core_services.energy_monitoring.model.SolarInstallation;
import com.solar.user_management.model.User;
import com.solar.core_services.energy_monitoring.repository.SolarInstallationRepository;
import com.solar.core_services.payment_compliance.dto.PaymentPlanDTO;
import com.solar.core_services.payment_compliance.dto.PaymentPlanRequest;
import com.solar.core_services.payment_compliance.model.PaymentPlan;
import com.solar.core_services.payment_compliance.repository.PaymentPlanRepository;
import com.solar.core_services.payment_compliance.repository.PaymentRepository;
import com.solar.core_services.payment_compliance.service.impl.PaymentPlanServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.solar.core_services.energy_monitoring.model.SolarInstallation.InstallationStatus;

/**
 * Test class for PaymentPlanService
 * Source file: src/main/java/com/solar/core_services/payment_compliance/service/PaymentPlanService.java
 * Implementation: src/main/java/com/solar/core_services/payment_compliance/service/impl/PaymentPlanServiceImpl.java
 */
@ExtendWith(MockitoExtension.class)
public class PaymentPlanServiceTest {

    @Mock
    private PaymentPlanRepository paymentPlanRepository;

    @Mock
    private PaymentRepository paymentRepository;

    @Mock
    private SolarInstallationRepository installationRepository;

    @Mock
    private PaymentEventPublisher eventPublisher;

    @InjectMocks
    private PaymentPlanServiceImpl paymentPlanService;

    private User testUser;
    private SolarInstallation testInstallation;
    private PaymentPlan testPaymentPlan1;
    private PaymentPlan testPaymentPlan2;
    private PaymentPlanRequest testPaymentPlanRequest;

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
        
        // Create test payment plans
        LocalDateTime now = LocalDateTime.now();
        
        testPaymentPlan1 = PaymentPlan.builder()
                .id(1L)
                .installation(testInstallation)
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
                .id(2L)
                .installation(testInstallation)
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
        
        // Create test payment plan request
        testPaymentPlanRequest = PaymentPlanRequest.builder()
                .installationId(testInstallation.getId())
                .installmentAmount(new BigDecimal("500.00"))
                .frequency(PaymentPlan.PaymentFrequency.MONTHLY)
                .startDate(LocalDate.now())
                .endDate(LocalDate.now().plusYears(2))
                .totalAmount(new BigDecimal("12000.00"))
                .build();
    }

    @Test
    @DisplayName("Should create payment plan")
    void shouldCreatePaymentPlan() {
        // Given
        when(installationRepository.findById(testInstallation.getId())).thenReturn(Optional.of(testInstallation));
        when(paymentPlanRepository.save(any(PaymentPlan.class))).thenReturn(testPaymentPlan1);
        
        // When
        PaymentPlanDTO result = paymentPlanService.createPaymentPlan(testPaymentPlanRequest);
        
        // Then
        assertNotNull(result);
        assertEquals(testPaymentPlan1.getId(), result.getId());
        verify(installationRepository, times(1)).findById(testInstallation.getId());
        verify(paymentPlanRepository, times(1)).save(any(PaymentPlan.class));
        verify(eventPublisher, times(1)).publishPaymentPlanUpdated(any(PaymentPlan.class));
    }

    @Test
    @DisplayName("Should update payment plan")
    void shouldUpdatePaymentPlan() {
        // Given
        when(paymentPlanRepository.findById(testPaymentPlan1.getId())).thenReturn(Optional.of(testPaymentPlan1));
        when(paymentPlanRepository.save(any(PaymentPlan.class))).thenReturn(testPaymentPlan1);
        
        // When
        PaymentPlanDTO result = paymentPlanService.updatePaymentPlan(testPaymentPlan1.getId(), testPaymentPlanRequest);
        
        // Then
        assertNotNull(result);
        assertEquals(testPaymentPlan1.getId(), result.getId());
        verify(paymentPlanRepository, times(1)).findById(testPaymentPlan1.getId());
        verify(paymentPlanRepository, times(1)).save(any(PaymentPlan.class));
        verify(eventPublisher, times(1)).publishPaymentPlanUpdated(any(PaymentPlan.class));
    }

    @Test
    @DisplayName("Should get payment plan by ID")
    void shouldGetPaymentPlanById() {
        // Given
        when(paymentPlanRepository.findById(testPaymentPlan1.getId())).thenReturn(Optional.of(testPaymentPlan1));
        
        // When
        PaymentPlanDTO result = paymentPlanService.getPaymentPlanById(testPaymentPlan1.getId());
        
        // Then
        assertNotNull(result);
        assertEquals(testPaymentPlan1.getId(), result.getId());
        verify(paymentPlanRepository, times(1)).findById(testPaymentPlan1.getId());
    }

    @Test
    @DisplayName("Should get payment plans by installation")
    void shouldGetPaymentPlansByInstallation() {
        // Given
        when(installationRepository.findById(testInstallation.getId())).thenReturn(Optional.of(testInstallation));
        when(paymentPlanRepository.findByInstallation(testInstallation))
                .thenReturn(Arrays.asList(testPaymentPlan1, testPaymentPlan2));
        
        // When
        List<PaymentPlanDTO> results = paymentPlanService.getPaymentPlansByInstallation(testInstallation.getId());
        
        // Then
        assertNotNull(results);
        assertEquals(2, results.size());
        verify(installationRepository, times(1)).findById(testInstallation.getId());
        verify(paymentPlanRepository, times(1)).findByInstallation(testInstallation);
    }

    @Test
    @DisplayName("Should get active payment plan")
    void shouldGetActivePaymentPlan() {
        // Given
        when(installationRepository.findById(testInstallation.getId())).thenReturn(Optional.of(testInstallation));
        when(paymentPlanRepository.findActivePaymentPlan(any(), any())).thenReturn(Optional.of(testPaymentPlan1));
        
        // When
        PaymentPlanDTO result = paymentPlanService.getActivePaymentPlan(testInstallation.getId());
        
        // Then
        assertNotNull(result);
        assertEquals(testPaymentPlan1.getId(), result.getId());
        verify(installationRepository, times(1)).findById(testInstallation.getId());
        verify(paymentPlanRepository, times(1)).findActivePaymentPlan(any(), any());
    }

    @Test
    @DisplayName("Should update remaining amount")
    void shouldUpdateRemainingAmount() {
        // Given
        BigDecimal paymentAmount = new BigDecimal("500.00");
        BigDecimal expectedRemainingAmount = new BigDecimal("7500.00");
        
        when(paymentPlanRepository.findById(testPaymentPlan1.getId())).thenReturn(Optional.of(testPaymentPlan1));
        when(paymentPlanRepository.save(any(PaymentPlan.class))).thenReturn(testPaymentPlan1);
        
        // When
        paymentPlanService.updateRemainingAmount(testPaymentPlan1.getId(), paymentAmount);
        
        // Then
        assertEquals(expectedRemainingAmount, testPaymentPlan1.getRemainingAmount());
        verify(paymentPlanRepository, times(1)).findById(testPaymentPlan1.getId());
        verify(paymentPlanRepository, times(1)).save(testPaymentPlan1);
    }

    @Test
    @DisplayName("Should get payment plan entity by ID")
    void shouldGetPaymentPlanEntityById() {
        // Given
        when(paymentPlanRepository.findById(testPaymentPlan1.getId())).thenReturn(Optional.of(testPaymentPlan1));
        
        // When
        PaymentPlan result = paymentPlanService.getPaymentPlanEntityById(testPaymentPlan1.getId());
        
        // Then
        assertNotNull(result);
        assertEquals(testPaymentPlan1.getId(), result.getId());
        verify(paymentPlanRepository, times(1)).findById(testPaymentPlan1.getId());
    }

    @Test
    @DisplayName("Should throw exception when payment plan not found")
    void shouldThrowExceptionWhenPaymentPlanNotFound() {
        // Given
        when(paymentPlanRepository.findById(anyLong())).thenReturn(Optional.empty());
        
        // When/Then
        assertThrows(RuntimeException.class, () -> {
            paymentPlanService.getPaymentPlanEntityById(999L);
        });
        
        verify(paymentPlanRepository, times(1)).findById(999L);
    }

    @Test
    @DisplayName("Should generate payment schedule")
    void shouldGeneratePaymentSchedule() {
        // Given
        when(paymentRepository.saveAll(any())).thenReturn(Collections.emptyList());
        
        // When
        paymentPlanService.generatePaymentSchedule(testPaymentPlan1);
        
        // Then
        verify(paymentRepository, times(1)).saveAll(any());
    }
} 