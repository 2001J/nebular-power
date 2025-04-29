package com.solar.core_services.payment_compliance.service;

import com.solar.core_services.energy_monitoring.model.SolarInstallation;
import com.solar.user_management.model.User;
import com.solar.core_services.energy_monitoring.repository.SolarInstallationRepository;
import com.solar.core_services.payment_compliance.model.Payment;
import com.solar.core_services.payment_compliance.model.PaymentPlan;
import com.solar.core_services.payment_compliance.repository.PaymentPlanRepository;
import com.solar.core_services.payment_compliance.repository.PaymentRepository;
import com.solar.core_services.payment_compliance.service.impl.PaymentReportServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.HashMap;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.spy;
import static org.mockito.Mockito.lenient;

// Add import for InstallationStatus enum
import com.solar.core_services.energy_monitoring.model.SolarInstallation.InstallationStatus;

/**
 * Test class for PaymentReportService
 * Source file: src/main/java/com/solar/core_services/payment_compliance/service/PaymentReportService.java
 * Implementation: src/main/java/com/solar/core_services/payment_compliance/service/impl/PaymentReportServiceImpl.java
 */
@ExtendWith(MockitoExtension.class)
public class PaymentReportServiceTest {

    @Mock
    private PaymentRepository paymentRepository;

    @Mock
    private PaymentPlanRepository paymentPlanRepository;

    @Mock
    private SolarInstallationRepository installationRepository;

    @InjectMocks
    private PaymentReportServiceImpl paymentReportService;

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
    @DisplayName("Should generate installation payment report")
    void shouldGenerateInstallationPaymentReport() {
        // Given
        when(installationRepository.findById(testInstallation.getId())).thenReturn(Optional.of(testInstallation));
        when(paymentRepository.findByInstallation(testInstallation))
                .thenReturn(Arrays.asList(testPayment1, testPayment2, testPayment3));
        
        // When
        List<Payment> report = paymentReportService.generateInstallationPaymentReport(testInstallation.getId());
        
        // Then
        assertNotNull(report);
        assertEquals(3, report.size());
        verify(installationRepository, times(1)).findById(testInstallation.getId());
        verify(paymentRepository, times(1)).findByInstallation(testInstallation);
    }

    @Test
    @DisplayName("Should generate payments by status report")
    void shouldGeneratePaymentsByStatusReport() {
        // Given
        when(paymentRepository.findByStatus(Payment.PaymentStatus.PAID))
                .thenReturn(Collections.singletonList(testPayment1));
        
        // When
        List<Payment> report = paymentReportService.generatePaymentsByStatusReport(Payment.PaymentStatus.PAID);
        
        // Then
        assertNotNull(report);
        assertEquals(1, report.size());
        assertEquals(testPayment1.getId(), report.get(0).getId());
        verify(paymentRepository, times(1)).findByStatus(Payment.PaymentStatus.PAID);
    }

    @Test
    @DisplayName("Should generate payments due report")
    void shouldGeneratePaymentsDueReport() {
        // Given
        LocalDateTime startDate = LocalDateTime.now().minusDays(1);
        LocalDateTime endDate = LocalDateTime.now().plusDays(1);
        
        List<Payment.PaymentStatus> relevantStatuses = Arrays.asList(
            Payment.PaymentStatus.PENDING,
            Payment.PaymentStatus.SCHEDULED,
            Payment.PaymentStatus.UPCOMING,
            Payment.PaymentStatus.DUE_TODAY,
            Payment.PaymentStatus.PAID,
            Payment.PaymentStatus.PARTIALLY_PAID,
            Payment.PaymentStatus.OVERDUE,
            Payment.PaymentStatus.GRACE_PERIOD
        );
        
        when(paymentRepository.findByDueDateBetweenAndStatusIn(eq(startDate), eq(endDate), eq(relevantStatuses)))
                .thenReturn(Collections.singletonList(testPayment2));
        
        // When
        List<Payment> report = paymentReportService.generatePaymentsDueReport(startDate, endDate);
        
        // Then
        assertNotNull(report);
        assertEquals(1, report.size());
        assertEquals(testPayment2.getId(), report.get(0).getId());
        verify(paymentRepository, times(1)).findByDueDateBetweenAndStatusIn(eq(startDate), eq(endDate), eq(relevantStatuses));
    }

    @Test
    @DisplayName("Should generate overdue payments report")
    void shouldGenerateOverduePaymentsReport() {
        // Given
        List<Payment.PaymentStatus> expectedStatuses = Arrays.asList(
            Payment.PaymentStatus.PENDING, 
            Payment.PaymentStatus.PARTIALLY_PAID,
            Payment.PaymentStatus.OVERDUE,
            Payment.PaymentStatus.GRACE_PERIOD,
            Payment.PaymentStatus.SUSPENSION_PENDING,
            Payment.PaymentStatus.DUE_TODAY
        );
        
        when(paymentRepository.findOverduePayments(any(LocalDateTime.class), eq(expectedStatuses)))
            .thenReturn(Collections.singletonList(testPayment3));
        
        // When
        List<Payment> report = paymentReportService.generateOverduePaymentsReport();
        
        // Then
        assertNotNull(report);
        assertEquals(1, report.size());
        assertEquals(testPayment3.getId(), report.get(0).getId());
        verify(paymentRepository, times(1)).findOverduePayments(any(LocalDateTime.class), eq(expectedStatuses));
    }

    @Test
    @DisplayName("Should generate upcoming payments report")
    void shouldGenerateUpcomingPaymentsReport() {
        // Given
        int daysAhead = 30;
        
        List<Payment.PaymentStatus> upcomingStatuses = Arrays.asList(
            Payment.PaymentStatus.PENDING,
            Payment.PaymentStatus.SCHEDULED,
            Payment.PaymentStatus.UPCOMING,
            Payment.PaymentStatus.DUE_TODAY
        );
        
        doReturn(Collections.singletonList(testPayment3))
            .when(paymentRepository).findUpcomingPaymentsByStatuses(any(LocalDateTime.class), eq(upcomingStatuses));
        
        // When
        List<Payment> report = paymentReportService.generateUpcomingPaymentsReport(daysAhead);
        
        // Then
        assertNotNull(report);
        assertEquals(1, report.size());
        assertEquals(testPayment3.getId(), report.get(0).getId());
        verify(paymentRepository, times(1)).findUpcomingPaymentsByStatuses(any(LocalDateTime.class), eq(upcomingStatuses));
    }

    @Test
    @DisplayName("Should generate payment plan report")
    void shouldGeneratePaymentPlanReport() {
        // Given
        when(paymentPlanRepository.findById(testPaymentPlan.getId())).thenReturn(Optional.of(testPaymentPlan));
        when(paymentRepository.findByPaymentPlan(testPaymentPlan))
                .thenReturn(Arrays.asList(testPayment1, testPayment2, testPayment3));
        
        // When
        List<Payment> report = paymentReportService.generatePaymentPlanReport(testPaymentPlan.getId());
        
        // Then
        assertNotNull(report);
        assertEquals(3, report.size());
        verify(paymentPlanRepository, times(1)).findById(testPaymentPlan.getId());
        verify(paymentRepository, times(1)).findByPaymentPlan(testPaymentPlan);
    }

    @Test
    @DisplayName("Should generate payment summary report")
    void shouldGeneratePaymentSummaryReport() {
        // Given
        // Mock countByStatus instead of findByStatus for each status
        for (Payment.PaymentStatus status : Payment.PaymentStatus.values()) {
            if (status == Payment.PaymentStatus.PAID) {
                when(paymentRepository.countByStatus(status)).thenReturn(1L);
            } else if (status == Payment.PaymentStatus.PENDING) {
                when(paymentRepository.countByStatus(status)).thenReturn(1L);
            } else if (status == Payment.PaymentStatus.PARTIALLY_PAID) {
                when(paymentRepository.countByStatus(status)).thenReturn(1L);
            } else {
                when(paymentRepository.countByStatus(status)).thenReturn(0L);
            }
        }
        
        // Mock overdue payments with expanded status list
        List<Payment.PaymentStatus> expectedOverdueStatuses = Arrays.asList(
            Payment.PaymentStatus.PENDING, 
            Payment.PaymentStatus.PARTIALLY_PAID,
            Payment.PaymentStatus.OVERDUE,
            Payment.PaymentStatus.GRACE_PERIOD, 
            Payment.PaymentStatus.SUSPENSION_PENDING
        );
        
        doReturn(Arrays.asList(testPayment2, testPayment3))
            .when(paymentRepository).findOverduePayments(any(LocalDateTime.class), anyList());
        
        // Mock upcoming payments with expanded status list
        List<Payment.PaymentStatus> expectedUpcomingStatuses = Arrays.asList(
            Payment.PaymentStatus.PENDING,
            Payment.PaymentStatus.SCHEDULED,
            Payment.PaymentStatus.UPCOMING,
            Payment.PaymentStatus.DUE_TODAY
        );
        
        doReturn(Collections.singletonList(testPayment2))
            .when(paymentRepository).findUpcomingPaymentsByStatuses(any(LocalDateTime.class), anyList());
        
        // Mock due today payments
        doReturn(Collections.singletonList(testPayment2))
            .when(paymentRepository).findByDueDateBetweenAndStatusIn(any(LocalDateTime.class), any(LocalDateTime.class), anyList());
        
        // When
        Map<String, Object> summary = paymentReportService.generatePaymentSummaryReport();
        
        // Then
        assertNotNull(summary);
        
        // Debug: Print all keys in the summary map
        System.out.println("Summary keys: " + summary.keySet());
        
        // Check for specific keys that are actually present in the implementation
        assertTrue(summary.containsKey("PAID"), "Summary should contain 'PAID' key");
        assertTrue(summary.containsKey("PENDING"), "Summary should contain 'PENDING' key");
        assertTrue(summary.containsKey("PARTIALLY_PAID"), "Summary should contain 'PARTIALLY_PAID' key");
        assertTrue(summary.containsKey("CANCELLED"), "Summary should contain 'CANCELLED' key");
        assertTrue(summary.containsKey("OVERDUE_COUNT"), "Summary should contain 'OVERDUE_COUNT' key");
        assertTrue(summary.containsKey("UPCOMING_7_DAYS"), "Summary should contain 'UPCOMING_7_DAYS' key");
        assertTrue(summary.containsKey("DUE_TODAY_COUNT"), "Summary should contain 'DUE_TODAY_COUNT' key");
        
        assertEquals(1L, summary.get("PAID"));
        assertEquals(1L, summary.get("PENDING"));
        assertEquals(1L, summary.get("PARTIALLY_PAID"));
        assertEquals(0L, summary.get("CANCELLED"));
        assertEquals(2L, summary.get("OVERDUE_COUNT"));
        assertEquals(1L, summary.get("UPCOMING_7_DAYS"));
        assertEquals(1L, summary.get("DUE_TODAY_COUNT"));
        
        // Verify repository method calls
        verify(paymentRepository, times(Payment.PaymentStatus.values().length)).countByStatus(any(Payment.PaymentStatus.class));
        verify(paymentRepository).findOverduePayments(any(LocalDateTime.class), anyList());
        verify(paymentRepository).findUpcomingPaymentsByStatuses(any(LocalDateTime.class), anyList());
        verify(paymentRepository).findByDueDateBetweenAndStatusIn(any(LocalDateTime.class), any(LocalDateTime.class), anyList());
    }

    @Test
    @DisplayName("Should generate payment history report")
    void shouldGeneratePaymentHistoryReport() {
        // Given
        LocalDateTime startDate = LocalDateTime.now().minusDays(60);
        LocalDateTime endDate = LocalDateTime.now().plusDays(60);
        
        when(installationRepository.findById(testInstallation.getId())).thenReturn(Optional.of(testInstallation));
        when(paymentRepository.findByInstallationAndDueDateBetween(testInstallation, startDate, endDate))
                .thenReturn(Arrays.asList(testPayment1, testPayment2, testPayment3));
        
        // When
        List<Payment> report = paymentReportService.generatePaymentHistoryReport(
                testInstallation.getId(), startDate, endDate);
        
        // Then
        assertNotNull(report);
        assertEquals(3, report.size());
        verify(installationRepository, times(1)).findById(testInstallation.getId());
        verify(paymentRepository, times(1)).findByInstallationAndDueDateBetween(testInstallation, startDate, endDate);
    }

    @Test
    @DisplayName("Should generate payment plans by status report")
    void shouldGeneratePaymentPlansByStatusReport() {
        // Given
        when(paymentPlanRepository.findByStatus(PaymentPlan.PaymentPlanStatus.ACTIVE))
                .thenReturn(Collections.singletonList(testPaymentPlan));
        
        // When
        List<PaymentPlan> report = paymentReportService.generatePaymentPlansByStatusReport(
                PaymentPlan.PaymentPlanStatus.ACTIVE);
        
        // Then
        assertNotNull(report);
        assertEquals(1, report.size());
        assertEquals(testPaymentPlan.getId(), report.get(0).getId());
        verify(paymentPlanRepository, times(1)).findByStatus(PaymentPlan.PaymentPlanStatus.ACTIVE);
    }
} 