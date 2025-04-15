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
        return paymentRepository.findByDueDateBetweenAndStatus(startDate, endDate, Payment.PaymentStatus.PENDING);
    }

    @Override
    public List<Payment> generateOverduePaymentsReport() {
        LocalDateTime now = LocalDateTime.now();
        List<Payment.PaymentStatus> statuses = Arrays.asList(Payment.PaymentStatus.PENDING, Payment.PaymentStatus.PARTIALLY_PAID);
        return paymentRepository.findOverduePayments(now, statuses);
    }

    @Override
    public List<Payment> generateUpcomingPaymentsReport(int daysAhead) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime futureDate = now.plusDays(daysAhead);
        return paymentRepository.findUpcomingPayments(futureDate, Payment.PaymentStatus.PENDING);
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
            long count = paymentRepository.findByStatus(status).size();
            summary.put(status.name(), count);
        }
        
        // Count overdue payments
        LocalDateTime now = LocalDateTime.now();
        List<Payment.PaymentStatus> overdueStatuses = Arrays.asList(Payment.PaymentStatus.PENDING, Payment.PaymentStatus.PARTIALLY_PAID);
        long overdueCount = paymentRepository.findOverduePayments(now, overdueStatuses).size();
        summary.put("OVERDUE_COUNT", overdueCount);
        
        // Count upcoming payments (next 7 days)
        LocalDateTime nextWeek = now.plusDays(7);
        long upcomingCount = paymentRepository.findUpcomingPayments(nextWeek, Payment.PaymentStatus.PENDING).size();
        summary.put("UPCOMING_7_DAYS", upcomingCount);
        
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