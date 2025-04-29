package com.solar.core_services.payment_compliance.service.impl;

import com.solar.core_services.energy_monitoring.model.SolarInstallation;
import com.solar.core_services.energy_monitoring.repository.SolarInstallationRepository;
import com.solar.core_services.payment_compliance.model.Payment;
import com.solar.core_services.payment_compliance.model.PaymentPlan;
import com.solar.core_services.payment_compliance.repository.PaymentPlanRepository;
import com.solar.core_services.payment_compliance.repository.PaymentRepository;
import com.solar.core_services.payment_compliance.service.PaymentReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class PaymentReportServiceImpl implements PaymentReportService {

    private final PaymentRepository paymentRepository;
    private final PaymentPlanRepository paymentPlanRepository;
    private final SolarInstallationRepository installationRepository;

    @Override
    public List<Payment> generateInstallationPaymentReport(Long installationId) {
        SolarInstallation installation = installationRepository.findById(installationId)
                .orElseThrow(() -> new IllegalArgumentException("Installation not found with ID: " + installationId));
        return paymentRepository.findByInstallation(installation);
    }

    @Override
    public List<Payment> generatePaymentsByStatusReport(Payment.PaymentStatus status) {
        return paymentRepository.findByStatus(status);
    }

    @Override
    public List<Payment> generatePaymentsDueReport(LocalDateTime startDate, LocalDateTime endDate) {
        // Include all relevant statuses to capture all payments due in the date range
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
        
        // Add debug logging
        System.out.println("Generating payments due report for period: " + startDate + " to " + endDate);
        
        // Use the method that allows multiple statuses
        List<Payment> payments = paymentRepository.findByDueDateBetweenAndStatusIn(startDate, endDate, relevantStatuses);
        System.out.println("Found " + payments.size() + " payments due in the period with statuses: " + relevantStatuses);
        
        return payments;
    }

    @Override
    public List<Payment> generateOverduePaymentsReport() {
        LocalDateTime now = LocalDateTime.now();
        // Include more statuses to capture all potentially overdue payments
        List<Payment.PaymentStatus> statuses = Arrays.asList(
            Payment.PaymentStatus.PENDING, 
            Payment.PaymentStatus.PARTIALLY_PAID,
            Payment.PaymentStatus.OVERDUE,
            Payment.PaymentStatus.GRACE_PERIOD,
            Payment.PaymentStatus.SUSPENSION_PENDING,
            Payment.PaymentStatus.DUE_TODAY
        );
        
        // Add debug log
        List<Payment> overduePayments = paymentRepository.findOverduePayments(now, statuses);
        System.out.println("Found " + overduePayments.size() + " overdue payments with statuses: " + statuses);
        return overduePayments;
    }

    @Override
    public List<Payment> generateUpcomingPaymentsReport(int daysAhead) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime futureDate = now.plusDays(daysAhead);
        
        // Include all relevant upcoming payment statuses
        List<Payment.PaymentStatus> upcomingStatuses = Arrays.asList(
            Payment.PaymentStatus.PENDING,
            Payment.PaymentStatus.SCHEDULED,
            Payment.PaymentStatus.UPCOMING,
            Payment.PaymentStatus.DUE_TODAY
        );
        
        System.out.println("Generating upcoming payments report for next " + daysAhead + " days (until " + futureDate + ")");
        
        List<Payment> upcomingPayments = paymentRepository.findUpcomingPaymentsByStatuses(futureDate, upcomingStatuses);
        System.out.println("Found " + upcomingPayments.size() + " upcoming payments with statuses: " + upcomingStatuses);
        
        return upcomingPayments;
    }

    @Override
    public List<Payment> generatePaymentPlanReport(Long paymentPlanId) {
        PaymentPlan paymentPlan = paymentPlanRepository.findById(paymentPlanId)
                .orElseThrow(() -> new IllegalArgumentException("Payment plan not found with ID: " + paymentPlanId));
        return paymentRepository.findByPaymentPlan(paymentPlan);
    }

    @Override
    public Map<String, Object> generatePaymentSummaryReport() {
        Map<String, Object> summary = new HashMap<>();
        
        // Count payments by status
        for (Payment.PaymentStatus status : Payment.PaymentStatus.values()) {
            long count = paymentRepository.countByStatus(status);
            summary.put(status.name(), count);
            // Add debug log
            System.out.println("Status " + status.name() + " count: " + count);
        }
        
        // Count overdue payments with expanded status list
        LocalDateTime now = LocalDateTime.now();
        List<Payment.PaymentStatus> overdueStatuses = Arrays.asList(
            Payment.PaymentStatus.PENDING, 
            Payment.PaymentStatus.PARTIALLY_PAID,
            Payment.PaymentStatus.OVERDUE,
            Payment.PaymentStatus.GRACE_PERIOD, 
            Payment.PaymentStatus.SUSPENSION_PENDING
        );
        
        List<Payment> overduePayments = paymentRepository.findOverduePayments(now, overdueStatuses);
        long overdueCount = overduePayments.size();
        summary.put("OVERDUE_COUNT", overdueCount);
        System.out.println("Total overdue count: " + overdueCount);
        
        // Count upcoming payments (next 7 days)
        LocalDateTime nextWeek = now.plusDays(7);
        List<Payment.PaymentStatus> upcomingStatuses = Arrays.asList(
            Payment.PaymentStatus.PENDING,
            Payment.PaymentStatus.SCHEDULED,
            Payment.PaymentStatus.UPCOMING,
            Payment.PaymentStatus.DUE_TODAY
        );
        List<Payment> upcomingPayments = paymentRepository.findUpcomingPaymentsByStatuses(nextWeek, upcomingStatuses);
        long upcomingCount = upcomingPayments.size();
        summary.put("UPCOMING_7_DAYS", upcomingCount);
        System.out.println("Total upcoming (7 days) count: " + upcomingCount);
        
        // Add more useful metrics
        // Count due today payments
        LocalDateTime startOfToday = now.toLocalDate().atStartOfDay();
        LocalDateTime endOfToday = startOfToday.plusDays(1).minusNanos(1);
        List<Payment.PaymentStatus> dueTodayStatuses = Arrays.asList(
            Payment.PaymentStatus.PENDING,
            Payment.PaymentStatus.SCHEDULED,
            Payment.PaymentStatus.UPCOMING,
            Payment.PaymentStatus.DUE_TODAY
        );
        List<Payment> dueTodayPayments = paymentRepository.findByDueDateBetweenAndStatusIn(
            startOfToday, endOfToday, dueTodayStatuses);
        long dueTodayCount = dueTodayPayments.size();
        summary.put("DUE_TODAY_COUNT", dueTodayCount);
        System.out.println("Due today count: " + dueTodayCount);
        
        return summary;
    }

    @Override
    public List<Payment> generatePaymentHistoryReport(Long installationId, LocalDateTime startDate, LocalDateTime endDate) {
        SolarInstallation installation = installationRepository.findById(installationId)
                .orElseThrow(() -> new IllegalArgumentException("Installation not found with ID: " + installationId));
        return paymentRepository.findByInstallationAndDueDateBetween(installation, startDate, endDate);
    }

    @Override
    public List<PaymentPlan> generatePaymentPlansByStatusReport(PaymentPlan.PaymentPlanStatus status) {
        return paymentPlanRepository.findByStatus(status);
    }
} 