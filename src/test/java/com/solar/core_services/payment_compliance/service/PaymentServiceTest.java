package com.solar.core_services.payment_compliance.service;

import com.solar.core_services.energy_monitoring.model.SolarInstallation;
import com.solar.user_management.model.User;
import com.solar.core_services.energy_monitoring.repository.SolarInstallationRepository;
import com.solar.core_services.payment_compliance.dto.MakePaymentRequest;
import com.solar.core_services.payment_compliance.dto.PaymentDTO;
import com.solar.core_services.payment_compliance.dto.PaymentDashboardDTO;
import com.solar.core_services.payment_compliance.model.Payment;
import com.solar.core_services.payment_compliance.model.PaymentPlan;
import com.solar.core_services.payment_compliance.repository.PaymentRepository;
import com.solar.core_services.payment_compliance.repository.PaymentPlanRepository;
import com.solar.user_management.repository.UserRepository;
import com.solar.core_services.payment_compliance.service.impl.PaymentServiceImpl;
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
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.solar.core_services.energy_monitoring.model.SolarInstallation.InstallationStatus;

/**
 * Test class for PaymentService
 * Source file: src/main/java/com/solar/core_services/payment_compliance/service/PaymentService.java
 * Implementation: src/main/java/com/solar/core_services/payment_compliance/service/impl/PaymentServiceImpl.java
 */
@ExtendWith(MockitoExtension.class)
public class PaymentServiceTest {

    @Mock
    private PaymentRepository paymentRepository;

    @Mock
    private SolarInstallationRepository installationRepository;
    
    @Mock
    private PaymentPlanRepository paymentPlanRepository;
    
    @Mock
    private UserRepository userRepository;

    @Mock
    private PaymentPlanService paymentPlanService;

    @Mock
    private PaymentEventPublisher paymentEventPublisher;

    @Mock
    private PaymentReminderService reminderService;

    @Mock
    private GracePeriodConfigService gracePeriodConfigService;

    @InjectMocks
    private PaymentServiceImpl paymentService;

    private User testUser;
    private SolarInstallation testInstallation;
    private PaymentPlan testPaymentPlan;
    private Payment testPayment1;
    private Payment testPayment2;
    private Payment testPayment3;

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
        
        // Create test payments
        LocalDateTime now = LocalDateTime.now();
        
        testPayment1 = Payment.builder()
                .id(1L)
                .installation(testInstallation)
                .paymentPlan(testPaymentPlan)
                .amount(new BigDecimal("416.67"))
                .dueDate(now.minusDays(30))
                .paidAt(now.minusDays(28))
                .status(Payment.PaymentStatus.PAID)
                .statusReason("Payment received")
                .statusUpdatedAt(now.minusDays(28))
                .daysOverdue(0)
                .transactionId("TX123456")
                .paymentMethod("CREDIT_CARD")
                .build();
        
        testPayment2 = Payment.builder()
                .id(2L)
                .installation(testInstallation)
                .paymentPlan(testPaymentPlan)
                .amount(new BigDecimal("416.67"))
                .dueDate(now)
                .status(Payment.PaymentStatus.DUE_TODAY)
                .statusReason("Payment due today")
                .statusUpdatedAt(now.minusDays(1))
                .daysOverdue(0)
                .build();
        
        testPayment3 = Payment.builder()
                .id(3L)
                .installation(testInstallation)
                .paymentPlan(testPaymentPlan)
                .amount(new BigDecimal("416.67"))
                .dueDate(now.plusDays(30))
                .status(Payment.PaymentStatus.UPCOMING)
                .statusReason("Upcoming payment")
                .statusUpdatedAt(now.minusDays(1))
                .daysOverdue(0)
                .build();
    }

    @Test
    @DisplayName("Should get customer dashboard")
    void shouldGetCustomerDashboard() {
        // Given
        when(installationRepository.findByUserId(testUser.getId())).thenReturn(Collections.singletonList(testInstallation));
        when(paymentRepository.findByInstallation(eq(testInstallation), any(Pageable.class)))
                .thenReturn(new PageImpl<>(Arrays.asList(testPayment1, testPayment2)));
        when(paymentRepository.findUpcomingPayments(any(LocalDateTime.class), eq(Payment.PaymentStatus.SCHEDULED)))
                .thenReturn(Collections.emptyList());
        when(paymentRepository.countOverduePaymentsByInstallation(eq(testInstallation), any(List.class)))
                .thenReturn(0L);
        when(paymentPlanRepository.findActivePaymentPlan(eq(testInstallation), any(LocalDateTime.class)))
                .thenReturn(Optional.of(testPaymentPlan));
        
        // When
        PaymentDashboardDTO dashboard = paymentService.getCustomerDashboard(testUser.getId());
        
        // Then
        assertNotNull(dashboard);
        assertEquals(2, dashboard.getRecentPayments().size());
        assertEquals(0, dashboard.getUpcomingPayments().size());
        assertEquals(false, dashboard.isHasOverduePayments());
        verify(installationRepository, times(1)).findByUserId(testUser.getId());
        verify(paymentRepository, times(1)).findByInstallation(eq(testInstallation), any(Pageable.class));
        verify(paymentRepository, times(1)).findUpcomingPayments(any(LocalDateTime.class), eq(Payment.PaymentStatus.SCHEDULED));
        verify(paymentRepository, times(1)).countOverduePaymentsByInstallation(eq(testInstallation), any(List.class));
        verify(paymentPlanRepository, times(1)).findActivePaymentPlan(eq(testInstallation), any(LocalDateTime.class));
    }

    @Test
    @DisplayName("Should get payment history")
    void shouldGetPaymentHistory() {
        // Given
        Long userId = 1L;
        Pageable pageable = PageRequest.of(0, 10);
        
        when(installationRepository.findByUserId(userId)).thenReturn(Collections.singletonList(testInstallation));
        List<Payment> payments = Arrays.asList(testPayment1, testPayment2);
        Page<Payment> pagedPayments = new PageImpl<>(payments, pageable, payments.size());
        when(paymentRepository.findByInstallation(eq(testInstallation), any(Pageable.class))).thenReturn(pagedPayments);
        
        // When
        List<PaymentDTO> result = paymentService.getPaymentHistory(userId, pageable);
        
        // Then
        assertNotNull(result);
        assertEquals(2, result.size());
        verify(installationRepository, times(1)).findByUserId(userId);
        verify(paymentRepository, times(1)).findByInstallation(eq(testInstallation), any(Pageable.class));
    }

    @Test
    @DisplayName("Should get upcoming payments")
    void shouldGetUpcomingPayments() {
        // Given
        when(installationRepository.findByUserId(testUser.getId()))
                .thenReturn(Collections.singletonList(testInstallation));
        
        // The actual implementation uses findUpcomingPayments
        when(paymentRepository.findUpcomingPayments(any(LocalDateTime.class), eq(Payment.PaymentStatus.SCHEDULED)))
                .thenReturn(Collections.emptyList());
        
        // When
        List<PaymentDTO> upcomingPayments = paymentService.getUpcomingPayments(testUser.getId());
        
        // Then
        assertNotNull(upcomingPayments);
        assertEquals(0, upcomingPayments.size());
        verify(installationRepository, times(1)).findByUserId(testUser.getId());
        verify(paymentRepository, times(1)).findUpcomingPayments(any(LocalDateTime.class), eq(Payment.PaymentStatus.SCHEDULED));
    }

    @Test
    @DisplayName("Should make payment")
    void shouldMakePayment() {
        // Given
        MakePaymentRequest request = MakePaymentRequest.builder()
                .paymentId(testPayment2.getId())
                .amount(new BigDecimal("416.67"))
                .paymentMethod("CREDIT_CARD")
                .transactionId("TX789012")
                .build();
        
        when(paymentRepository.findById(testPayment2.getId())).thenReturn(Optional.of(testPayment2));
        when(paymentRepository.save(any(Payment.class))).thenReturn(testPayment2);
        when(userRepository.findById(testUser.getId())).thenReturn(Optional.of(testUser));
        
        // Set up the payment plan and installation for the test payment
        testPayment2.setPaymentPlan(testPaymentPlan);
        testPayment2.setInstallation(testInstallation);
        testInstallation.setStatus(SolarInstallation.InstallationStatus.SUSPENDED);
        
        // Mock the payment plan service
        doNothing().when(paymentPlanService).updateRemainingAmount(anyLong(), any(BigDecimal.class));
        
        // When
        PaymentDTO result = paymentService.makePayment(testUser.getId(), request);
        
        // Then
        assertNotNull(result);
        assertEquals(testPayment2.getId(), result.getId());
        verify(paymentRepository, times(1)).findById(testPayment2.getId());
        verify(paymentRepository, times(1)).save(any(Payment.class));
        verify(paymentEventPublisher, times(1)).publishPaymentReceived(any(Payment.class));
    }

    @Test
    @DisplayName("Should get overdue payments")
    void shouldGetOverduePayments() {
        // Given
        Pageable pageable = PageRequest.of(0, 10);
        List<Payment> overduePayments = Collections.singletonList(testPayment3);
        
        // The actual implementation uses findByStatusIn
        List<Payment.PaymentStatus> overdueStatuses = Arrays.asList(
                Payment.PaymentStatus.OVERDUE,
                Payment.PaymentStatus.GRACE_PERIOD,
                Payment.PaymentStatus.SUSPENSION_PENDING
        );
        when(paymentRepository.findByStatusIn(eq(overdueStatuses))).thenReturn(overduePayments);
        
        // When
        Page<PaymentDTO> result = paymentService.getOverduePayments(pageable);
        
        // Then
        assertNotNull(result);
        assertEquals(1, result.getTotalElements());
        assertEquals(testPayment3.getId(), result.getContent().get(0).getId());
        verify(paymentRepository, times(1)).findByStatusIn(eq(overdueStatuses));
    }

    @Test
    @DisplayName("Should record manual payment")
    void shouldRecordManualPayment() {
        // Given
        MakePaymentRequest request = MakePaymentRequest.builder()
                .paymentId(testPayment2.getId())
                .amount(new BigDecimal("416.67"))
                .paymentMethod("CASH")
                .transactionId("MANUAL123")
                .build();
        
        when(paymentRepository.findById(testPayment2.getId())).thenReturn(Optional.of(testPayment2));
        when(paymentRepository.save(any(Payment.class))).thenReturn(testPayment2);
        
        // Set up the payment plan and installation for the test payment
        testPayment2.setPaymentPlan(testPaymentPlan);
        testPayment2.setInstallation(testInstallation);
        testInstallation.setStatus(SolarInstallation.InstallationStatus.SUSPENDED);
        
        // Mock the payment plan service
        doNothing().when(paymentPlanService).updateRemainingAmount(anyLong(), any(BigDecimal.class));
        
        // When
        PaymentDTO result = paymentService.recordManualPayment(testPayment2.getId(), request);
        
        // Then
        assertNotNull(result);
        assertEquals(testPayment2.getId(), result.getId());
        verify(paymentRepository, times(1)).findById(testPayment2.getId());
        verify(paymentRepository, times(1)).save(any(Payment.class));
        verify(paymentEventPublisher, times(1)).publishPaymentReceived(any(Payment.class));
    }

    @Test
    @DisplayName("Should update payment status")
    void shouldUpdatePaymentStatus() {
        // Given
        when(paymentRepository.save(any(Payment.class))).thenReturn(testPayment1);
        
        // When
        paymentService.updatePaymentStatus(testPayment1, Payment.PaymentStatus.PAID, "Payment received");
        
        // Then
        assertEquals(Payment.PaymentStatus.PAID, testPayment1.getStatus());
        assertEquals("Payment received", testPayment1.getStatusReason());
        assertNotNull(testPayment1.getStatusUpdatedAt());
        verify(paymentRepository, times(1)).save(testPayment1);
    }

    @Test
    @DisplayName("Should get payment by ID")
    void shouldGetPaymentById() {
        // Given
        when(paymentRepository.findById(testPayment1.getId())).thenReturn(Optional.of(testPayment1));
        
        // When
        Payment result = paymentService.getPaymentById(testPayment1.getId());
        
        // Then
        assertNotNull(result);
        assertEquals(testPayment1.getId(), result.getId());
        verify(paymentRepository, times(1)).findById(testPayment1.getId());
    }

    @Test
    @DisplayName("Should throw exception when payment not found")
    void shouldThrowExceptionWhenPaymentNotFound() {
        // Given
        when(paymentRepository.findById(anyLong())).thenReturn(Optional.empty());
        
        // When/Then
        assertThrows(RuntimeException.class, () -> {
            paymentService.getPaymentById(999L);
        });
        
        verify(paymentRepository, times(1)).findById(999L);
    }

    @Test
    @DisplayName("Should flag accounts for suspension")
    void shouldFlagAccountsForSuspension() {
        // Given
        when(gracePeriodConfigService.isAutoSuspendEnabled()).thenReturn(true);
        when(gracePeriodConfigService.getGracePeriodDays()).thenReturn(14);
        when(paymentRepository.findByStatus(Payment.PaymentStatus.GRACE_PERIOD))
                .thenReturn(Collections.singletonList(testPayment3));
        
        // Set up the test payment
        testPayment3.setDaysOverdue(15); // More than grace period
        
        // When
        paymentService.flagAccountsForSuspension();
        
        // Then
        verify(paymentRepository, times(1)).findByStatus(Payment.PaymentStatus.GRACE_PERIOD);
        verify(paymentRepository, times(1)).save(testPayment3);
        verify(paymentEventPublisher, times(1)).publishGracePeriodExpired(testPayment3);
    }

    @Test
    @DisplayName("Should not flag accounts when auto-suspend is disabled")
    void shouldNotFlagAccountsWhenAutoSuspendDisabled() {
        // Given
        when(gracePeriodConfigService.isAutoSuspendEnabled()).thenReturn(false);
        
        // When
        paymentService.flagAccountsForSuspension();
        
        // Then
        verify(gracePeriodConfigService, times(1)).isAutoSuspendEnabled();
        verify(paymentRepository, times(0)).findByStatus(any(Payment.PaymentStatus.class));
        verify(paymentEventPublisher, times(0)).publishGracePeriodExpired(any(Payment.class));
    }
} 